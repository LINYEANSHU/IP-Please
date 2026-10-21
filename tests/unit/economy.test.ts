import {describe,it,expect} from 'vitest';
import {getModePolicy} from '../../src/domain/day-one';
import {newRun} from '../../src/domain/run';
import type {RunState} from '../../src/domain/run';
import {projectFamily} from '../../src/domain/family';
import {previewSupply,submitSupply} from '../../src/domain/night';
import {loadRun,saveRun} from '../../src/storage/snapshot';
import {validRun} from '../../src/storage/validate';
import {atDay,enterDay,closeDay,step} from '../fixtures/week';

// Recreate the previous tariff from real completed days, including opening balances.
function oldTariff(source:RunState):RunState {
  const s=structuredClone(source);
  for(const entry of s.ledger){
    delete (entry as any).economyVersion;
    if(entry.kind==='salary')entry.amount=s.mode==='standard'?0:10;
    if(entry.kind==='electricity'||entry.kind==='tokens')entry.amount=-20;
  }
  const initial=s.mode==='standard'?20:50;
  const entryDay=(id:string)=>Number(id.match(/^(?:day:|case:D)(\d+)/)?.[1]);
  for(const h of [...s.history,s])h.startBalance=initial+s.ledger.filter(e=>entryDay(e.id)<h.day).reduce((sum,e)=>sum+e.amount,0);
  s.balance=initial+s.ledger.reduce((sum,e)=>sum+e.amount,0);
  return s;
}
function storeFor(state:unknown){
  let raw=JSON.stringify(state),writes=0;
  return {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;writes++;},get raw(){return raw;},get writes(){return writes;}};
}

describe('每日底薪和全家供养的新金额',()=>{
  it.each(['standard','relaxed'] as const)('%s 底薪 10，两项各 10，预览和实扣一致且只结算一次',mode=>{
    expect(getModePolicy(mode).salary).toBe(10);
    const night=closeDay(enterDay(atDay(1,mode)));
    const initial=mode==='standard'?20:50;
    expect(night.balance).toBe(initial+40+10-20);
    expect(night.ledger.find(e=>e.kind==='salary')?.amount).toBe(10);
    expect(projectFamily(night.family,{electricity:true,tokens:false}).cost).toBe(10);
    expect(projectFamily(night.family,{electricity:false,tokens:true}).cost).toBe(10);
    const choice={electricity:true,tokens:true};
    const preview=previewSupply(night,choice);
    expect(preview.balance).toBe(night.balance-20);
    const after=submitSupply(night,choice,'new-prices').state;
    expect(after.balance).toBe(preview.balance);
    expect(after.ledger.filter(e=>['electricity','tokens'].includes(e.kind)).map(e=>e.amount)).toEqual([-10,-10]);
    expect(validRun(after)).toBe(true);
    expect(submitSupply(after,choice,'repeat').state).toBe(after);
    expect(step(after,{type:'settle'})).toBe(after);
  });

  it('两项总价恰好 20 可支付，19 不可支付',()=>{
    const night=closeDay(enterDay(atDay(1)));
    for(const balance of [19,20]){
      const s={...night,balance};
      expect(previewSupply(s,{electricity:true,tokens:true}).affordable).toBe(balance===20);
    }
  });

  it.each(['standard','relaxed'] as const)('%s 旧历史原样续玩，后续底薪和供养采用新金额',mode=>{
    const old=oldTariff(atDay(2,mode)),store=storeFor(old),raw=store.raw;
    expect(validRun(old)).toBe(true);
    const loaded=loadRun(store);expect(loaded.kind).toBe('valid');if(loaded.kind!=='valid')return;
    expect(store.raw).toBe(raw);expect(store.writes).toBe(0);
    expect(loaded.state.ledger).toEqual(old.ledger);expect(loaded.state.balance).toBe(old.balance);
    let s=closeDay(enterDay(loaded.state));
    s=submitSupply(s,{electricity:true,tokens:true},'second-day').state;
    expect(s.balance).toBe(old.balance+60+10-20-20);
    expect(s.ledger.slice(0,old.ledger.length)).toEqual(old.ledger);
    expect(saveRun(s,store)).toEqual({ok:true});
    expect(loadRun(store)).toEqual({kind:'valid',state:s});
  });

  it('旧版已发底薪的当晚不补发，尚未购买的供养按每项 10 收费',()=>{
    const old=oldTariff(closeDay(enterDay(atDay(1,'standard'))));
    const loaded=loadRun(storeFor(old));expect(loaded.kind).toBe('valid');if(loaded.kind!=='valid')return;
    expect(step(loaded.state,{type:'settle'})).toBe(loaded.state);
    const after=submitSupply(loaded.state,{electricity:true,tokens:true},'mixed-night').state;
    expect(after.balance).toBe(old.balance-20);
    expect(after.ledger.find(e=>e.kind==='salary')?.amount).toBe(0);
    expect(validRun(after)).toBe(true);
  });

  it.each(['standard','relaxed'] as const)('%s schema1 旧供养账本仍能迁移，金额和家属保持不变',mode=>{
    let old=closeDay(enterDay(atDay(1,mode)));
    old=oldTariff(submitSupply(old,{electricity:true,tokens:true},'old-supply').state);
    const store=storeFor({...old,schemaVersion:1}),raw=store.raw;
    const loaded=loadRun(store);expect(loaded.kind).toBe('valid');if(loaded.kind!=='valid')return;
    expect(loaded.state.balance).toBe(old.balance);expect(loaded.state.ledger).toEqual(old.ledger);
    expect(loaded.state.family).toEqual(old.family);expect(store.raw).toBe(raw);expect(store.writes).toBe(0);
  });

  it('改价后的账目金额被改写仍拒绝保存',()=>{
    let s=closeDay(enterDay(newRun('standard','tampered-economy')));
    s=submitSupply(s,{electricity:true,tokens:true},'pay').state;
    for(const kind of ['salary','electricity','tokens']){
      const copy=structuredClone(s),entry=copy.ledger.find(e=>e.kind===kind)!;
      entry.amount+=1;copy.balance+=1;
      expect(validRun(copy)).toBe(false);
    }
    for(const version of [null,1,3,'2']){
      const copy=structuredClone(s);
      (copy.ledger.find(e=>e.kind==='salary')! as any).economyVersion=version;
      expect(validRun(copy)).toBe(false);
    }
    const copy=structuredClone(s);copy.ledger.find(e=>e.kind==='rent')!.economyVersion=2;
    expect(validRun(copy)).toBe(false);
  });
});
