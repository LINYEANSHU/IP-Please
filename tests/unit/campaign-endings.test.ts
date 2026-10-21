import {describe,it,expect} from 'vitest';
import {act,enterCampaignDay,finishCampaignWork,campaignStart} from '../fixtures/campaign';
import {validRun} from '../../src/storage/validate';
import {loadRun,saveRun,SAVE_KEY} from '../../src/storage/snapshot';
import {newRun,reduceRun} from '../../src/domain/run';
import {resolveDeparture} from '../../src/domain/campaign';
const evidence:Record<string,string>={'liang-intro':'receive','kimi-context':'receive','ip-record':'receive','tang-draft':'receive','chen-appeal':'receive','kimi-ready':'receive','privilege-record':'receive','sam-contact':'receive','zhou-appeal':'receive','404-preserve':'accept','old-rules':'retain','deletion-order':'retain'};
const paths:Record<string,Record<string,string>>={
  E05:{'memory-package':'send'},E06:{'publish-register':'submit'},E07:{'management-contract':'public'},E08:{'management-contract':'exclusive'},E09:{'review-protocol':'internal'},E10:{'liang-contract':'accept','liang-samples':'accept','community-register':'authorize'},E12:{'review-protocol':'charter','publish-register':'submit'},E02:{'performance-report':'submit'},
};
describe('实际履约与尾声',()=>{
  it.each(Object.keys(paths))('%s 从实际往来与31日受理完成；不修改余额或虚构证据',ending=>{
    let s=newRun('relaxed','ending-'+ending);const choices:Record<string,string>={...evidence,...paths[ending],dispatch:'submit'};
    for(let day=1;day<=31;day++){
      s=finishCampaignWork(enterCampaignDay(s,id=>choices[id]??'return'));
      expect(validRun(s),`D${day} 收班`).toBe(true);s=act(s,{type:'settle'});expect(validRun(s),`D${day} 扣租`).toBe(true);
      if(s.phase==='ending')break;
      s=act(s,{type:'supply',choice:{electricity:true,tokens:true}});expect(validRun(s),`D${day} 供养`).toBe(true);
      if(day<31)s=act(s,{type:'next-day'});
    }
    expect(s.ending).toBe(ending);expect(s.ledger.filter(e=>e.kind==='rent')).toHaveLength(31);
    expect(s.ledger.every(e=>!e.id.includes('ending-fee'))).toBe(true);
    const again=act(s,{type:'settle'});expect(again).toBe(s);
  },30000);
  it('旧D8待续只在内存续接，不重发收入、不改写旧原文',()=>{
    const modern=campaignStart(8),last=modern.history.at(-1)!;
    const old={...structuredClone(modern),day:8,phase:'next-day',campaign:undefined,caseIds:Array.from({length:12},(_,i)=>`D07-S${String(i+1).padStart(2,'0')}`),caseIndex:last.caseIndex,returned:last.returned,remainingMs:last.remainingMs,rentPaid:true,supply:last.supply,startBalance:last.startBalance,started:true,briefingStep:2};
    // Recreate the actual previous-build end-of-week desk from a real D7 night.
    let d7=campaignStart(7);d7=finishCampaignWork(enterCampaignDay(d7));d7=act(d7,{type:'settle'});d7=act(d7,{type:'supply',choice:{electricity:true,tokens:true}});
    Object.assign(old,{book:d7.book,bookPage:d7.bookPage,rule:d7.rule,papers:d7.papers,paperOrder:d7.paperOrder,topPaper:d7.topPaper,dialogueLine:d7.dialogueLine});
    const raw=JSON.stringify(old),store=new Map([[SAVE_KEY,raw]]),storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
    expect(validRun(old)).toBe(true);const loaded=loadRun(storage);expect(loaded.kind).toBe('valid');
    if(loaded.kind!=='valid')return;
    expect(loaded.state).toMatchObject({day:8,phase:'newspaper',caseIndex:-1,remainingMs:90000,rentPaid:false});expect(loaded.state.ledger).toEqual(modern.ledger);expect(store.get(SAVE_KEY)).toBe(raw);
    expect(saveRun(loaded.state,storage)).toEqual({ok:true});
  });
  it('空屋结局来自实际永久死亡，单独修复玩家仍可继续到31日',()=>{
    let s=newRun('relaxed','empty-house');
    for(let day=1;day<=31;day++){
      s=finishCampaignWork(enterCampaignDay(s));s=act(s,{type:'settle'});
      s=act(s,{type:'supply',choice:{electricity:false,tokens:false,repairs:s.family.player.damage>0?['player']:[]}});
      if(day<31)s=act(s,{type:'next-day'});
    }expect(s.ending).toBe('E11');expect(validRun(s)).toBe(true);
  },30000);
});
