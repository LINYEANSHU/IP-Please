import {describe,it,expect} from 'vitest';
import {loadRun,saveRun,SAVE_KEY} from '../../src/storage/session';
import {newRun,reduceRun} from '../../src/domain/run';
import type {ActionBody,RunAction,RunState} from '../../src/domain/run';
import {DAY_ONE_CASES,requiredDecision} from '../../src/domain/day-one';
class Store {
  data=new Map<string,string>();
  writes=0;
  getItem(k:string){return this.data.get(k)??null;}
  setItem(k:string,v:string){this.writes++;this.data.set(k,v);}
  seed(raw:string){this.data.set(SAVE_KEY,raw);}
}
it('空档不自动建局，完整快照可读',()=>{
  const store=new Store();expect(loadRun(store).kind).toBe('empty');
  const s=newRun('standard','saved');expect(saveRun(s,store)).toEqual({ok:true});
  expect(loadRun(store)).toEqual({kind:'valid',state:s});
});
it.each(['{bad','{"schemaVersion":99}','{"schemaVersion":1,"runId":"broken"}'])('异常数据保留原文 %s',raw=>{
  const store=new Store();store.setItem(SAVE_KEY,raw);
  expect(loadRun(store)).toMatchObject({kind:'invalid',raw});
  expect(store.getItem(SAVE_KEY)).toBe(raw);
});
it('配额失败如实返回，不覆写旧快照',()=>{
  const store=new Store();saveRun(newRun('standard','old'),store);
  store.setItem=()=>{throw new Error('QuotaExceededError');};
  expect(saveRun(newRun('relaxed','new'),store)).toMatchObject({ok:false});
  expect(loadRun(store)).toMatchObject({kind:'valid',state:{runId:'old'}});
});
it('损坏嵌套账目、模式、印章及家庭状态必须拒绝',()=>{
  for(const mutate of [
    (s:any)=>s.balance='20', (s:any)=>s.mode='easy', (s:any)=>s.family.father=null,
    (s:any)=>s.ledger=[{id:'bad',amount:Infinity}], (s:any)=>s.book.x=-10000,
    (s:any)=>s.decisions['D01-S01']={decision:'maybe'},
  ]){
    const store=new Store();const s=newRun('standard','bad');mutate(s);store.setItem(SAVE_KEY,JSON.stringify(s));
    expect(loadRun(store).kind).toBe('invalid');
  }
});
let actionSeq=0;
const step=(s:RunState,a:ActionBody)=>reduceRun(s,{...a,actionId:`test-${actionSeq++}`} as RunAction).state;
const deskState=(mode:'standard'|'relaxed'='standard',runId='run')=>step(step(newRun(mode,runId),{type:'go-desk'}),{type:'dismiss',reason:'briefing'});
function processCase(s:RunState,index:number,decision=requiredDecision(DAY_ONE_CASES[index])){
  s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});
  s=step(s,{type:'stamp',caseId:DAY_ONE_CASES[index].id,decision});
  s=step(s,{type:'dismiss',reason:'citation'});
  return step(s,{type:'return',caseId:DAY_ONE_CASES[index].id});
}
function stampedFirst(){
  let s=step(deskState('standard','stamp-one'),{type:'call'});
  s=step(s,{type:'dismiss',reason:'tutorial'});
  return step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
}
function nextDaySnapshot(mode:'standard'|'relaxed'){
  let s=deskState(mode,`next-${mode}`);
  for(let i=0;i<8;i++)s=processCase(s,i);
  s=step(s,{type:'settle'});
  s=step(s,{type:'supply',choice:{electricity:true,tokens:true}});
  return step(s,{type:'next-day'});
}
function seededState(state:unknown){const store=new Store();const raw=JSON.stringify(state);store.seed(raw);return {store,raw};}
function expectInvalidRaw(raw:string){
  const store=new Store();store.seed(raw);
  expect(loadRun(store).kind).toBe('invalid');
  expect(store.getItem(SAVE_KEY)).toBe(raw);
  expect(store.writes).toBe(0);
}
describe('续玩快照的语义一致性',()=>{
  it('拒绝余额与初始金加账本不一致',()=>{
    const base=stampedFirst();expect(base.balance).toBe(25);
    expect(loadRun(seededState(base).store)).toMatchObject({kind:'valid'});
    const inflated=structuredClone(base);inflated.balance=30;
    expectInvalidRaw(JSON.stringify(inflated));
    const dropped=structuredClone(base);dropped.ledger=[];
    expectInvalidRaw(JSON.stringify(dropped));
    const edited=structuredClone(base);edited.ledger[0].amount=100;
    expectInvalidRaw(JSON.stringify(edited));
  });
  it('拒绝裁决与退件顺序不可能',()=>{
    let base=deskState('standard','order');
    for(let i=0;i<3;i++)base=processCase(base,i);
    expect(loadRun(seededState(base).store).kind).toBe('valid');
    const reordered=structuredClone(base);reordered.returned=['D01-S02','D01-S01','D01-S03'];
    expectInvalidRaw(JSON.stringify(reordered));
    const extraDecision=structuredClone(base);extraDecision.decisions['D01-S05']=structuredClone(base.decisions['D01-S03']);
    expectInvalidRaw(JSON.stringify(extraDecision));
  });
  it('拒绝 returning 案已退件',()=>{
    const base=stampedFirst();expect(base.phase).toBe('returning');
    const impossible=structuredClone(base);impossible.returned=['D01-S01'];
    expectInvalidRaw(JSON.stringify(impossible));
  });
  it.each(['standard','relaxed'] as const)('合法 %s D2 班前待续快照可读',mode=>{
    const d2=nextDaySnapshot(mode);
    expect(d2).toMatchObject({day:2,phase:'newspaper',rentPaid:false});
    expect(d2.supply).toBeNull();expect(d2.history[0].supply).toEqual({electricity:true,tokens:true});
    expect(loadRun(seededState(d2).store)).toEqual({kind:'valid',state:d2});
  });
  it('拒绝 next-day 仍是第一天或缺少供养',()=>{
    const d2=nextDaySnapshot('standard');
    const dayOne=structuredClone(d2);dayOne.day=1;
    expectInvalidRaw(JSON.stringify(dayOne));
    const noSupply=structuredClone(d2);noSupply.history[0].supply=null as any;
    expectInvalidRaw(JSON.stringify(noSupply));
  });
  it('兼容仅缺 mark 的旧版合法裁决并只在内存补齐',()=>{
    const legacy:any=JSON.parse(JSON.stringify(stampedFirst()));
    legacy.schemaVersion=1;delete legacy.decisions['D01-S01'].mark;
    const raw=JSON.stringify(legacy);expect(raw).not.toContain('"mark"');
    const store=new Store();store.seed(raw);
    const loaded=loadRun(store);
    expect(loaded).toMatchObject({kind:'valid'});
    if(loaded.kind!=='valid')throw new Error('expected valid');
    expect(loaded.state.decisions['D01-S01'].mark).toEqual({x:165,y:113});
    expect(store.getItem(SAVE_KEY)).toBe(raw);
    expect(store.writes).toBe(0);
    expect(saveRun(loaded.state,store)).toEqual({ok:true});
  });
  it('已有 mark 类型或数值错误以及其它字段损坏仍拒绝',()=>{
    const base=stampedFirst();
    for(const mark of [null,'center',{x:'165',y:113},{x:165,y:113.5},{x:165,y:120},{x:157,y:113},{x:165},[165,113]] as any[]){
      const bad:any=structuredClone(base);bad.decisions['D01-S01'].mark=mark;
      expectInvalidRaw(JSON.stringify(bad));
    }
    const legacy:any=JSON.parse(JSON.stringify(base));legacy.schemaVersion=1;delete legacy.decisions['D01-S01'].mark;legacy.balance=99;
    expectInvalidRaw(JSON.stringify(legacy));
  });
  it('ledger 类型、金额与关联案号必须合理',()=>{
    const base=stampedFirst();
    const duplicate:any=structuredClone(base);duplicate.ledger.push({...duplicate.ledger[0]});duplicate.balance+=5;
    expectInvalidRaw(JSON.stringify(duplicate));
    const wrongAmount:any=structuredClone(base);wrongAmount.ledger[0].amount=6;wrongAmount.balance=26;
    expectInvalidRaw(JSON.stringify(wrongAmount));
    const emptyId:any=structuredClone(base);emptyId.ledger[0].id='';
    expectInvalidRaw(JSON.stringify(emptyId));
    let fine=deskState('standard','fine');fine=processCase(fine,0);fine=processCase(fine,1);
    fine=step(fine,{type:'call'});fine=step(fine,{type:'dismiss',reason:'tutorial'});
    fine=step(fine,{type:'stamp',caseId:'D01-S03',decision:'allow'});
    expect(fine.ledger.some(e=>e.kind==='fine')).toBe(true);
    const mislinked:any=structuredClone(fine);mislinked.ledger.find((e:any)=>e.kind==='fine').caseId='D01-S01';
    expectInvalidRaw(JSON.stringify(mislinked));
    const wrongFine=structuredClone(fine);const fineEntry=wrongFine.ledger.find(e=>e.kind==='fine')!;
    fineEntry.amount=-5;wrongFine.balance+=5;
    expectInvalidRaw(JSON.stringify(wrongFine));
    let night=deskState('standard','rent');for(let i=0;i<8;i++)night=processCase(night,i);
    expect(night.phase).toBe('night');
    const caseLinkedRent:any=structuredClone(night);caseLinkedRent.ledger.push({id:'day:1:rent',kind:'rent',amount:-20,caseId:'D01-S01'});caseLinkedRent.balance-=20;
    expectInvalidRaw(JSON.stringify(caseLinkedRent));
    const wrongRent:any=structuredClone(night);wrongRent.ledger.push({id:'x',kind:'rent',amount:-19});wrongRent.balance-=19;
    expectInvalidRaw(JSON.stringify(wrongRent));
  });
  it('接受设置与后台暂停中的正常快照',()=>{
    let s=step(deskState('standard','paused'),{type:'call'});
    s=step(s,{type:'dismiss',reason:'tutorial'});
    s=step(s,{type:'pause',reason:'settings',paused:true});
    s=step(s,{type:'pause',reason:'background',paused:true});
    const store=new Store();expect(saveRun(s,store)).toEqual({ok:true});
    const loaded=loadRun(store);expect(loaded).toMatchObject({kind:'valid'});
    if(loaded.kind!=='valid')throw new Error('expected valid');
    expect(loaded.state.pauses).toEqual([]);
  });
  it('接受未扣租的夜间快照',()=>{
    let s=deskState('standard','unpaid');for(let i=0;i<8;i++)s=processCase(s,i);
    expect(s).toMatchObject({phase:'night',rentPaid:false,balance:60});
    const store=new Store();expect(saveRun(s,store)).toEqual({ok:true});
    expect(loadRun(store)).toMatchObject({kind:'valid',state:{phase:'night',rentPaid:false}});
  });
  it('正确拒绝计件并可在返还中续玩',()=>{
    let s=deskState('standard','reject');s=processCase(s,0);s=processCase(s,1);
    s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});
    s=step(s,{type:'stamp',caseId:'D01-S03',decision:'reject'});
    expect(s.decisions['D01-S03']).toMatchObject({decision:'reject',correct:true,penalty:0});
    expect(s.ledger.find(e=>e.caseId==='D01-S03'&&e.kind==='wage')).toMatchObject({amount:5});
    expect(s.balance).toBe(35);
    expect(loadRun(seededState(s).store)).toEqual({kind:'valid',state:s});
  });
});
