import {describe,it,expect} from 'vitest';
import {newRun,reduceRun,currentCase} from '../../src/domain/run';
import type {ActionBody,RunState} from '../../src/domain/run';
import {evaluateCase} from '../../src/domain/rules';
import {pendingMail} from '../../src/domain/campaign';
import {validRun} from '../../src/storage/validate';
import {saveRun,loadRun,SAVE_KEY} from '../../src/storage/snapshot';

let seq=0;
export function step(s:RunState,a:ActionBody):RunState {
  const next=reduceRun(s,{...a,actionId:`campaign-${seq++}`}).state;
  expect(validRun(next),`D${next.day} ${next.phase} ${a.type} ${'id' in a?a.id:''}`).toBe(true);return next;
}
export function paperwork(s:RunState,select:(id:string)=>string=()=> 'return'){
  s=step(s,{type:'go-desk'});
  while(s.pauses.includes('briefing'))s=step(s,{type:'dismiss',reason:'briefing'});
  while(s.phase==='correspondence'){
    const m=pendingMail(s);
    if(!m){s=step(s,{type:'finish-mail'});break;}
    const requested=select(m.id),option=m.options.find(o=>o.id===requested)?.id??m.options.find(o=>['return','retain'].includes(o.id))?.id??m.options[0].id;
    s=step(s,{type:'mail',id:m.id,option});
  }
  if(s.phase==='training')for(const command of ['open','take','fire','isolate','finish'] as const)s=step(s,{type:'train',command});
  return s;
}
export function rescue(s:RunState){
  while(s.phase==='defense'){
    const a=s.campaign!.attack!;
    if(a.stage==='warning')s=step(s,{type:'defense',command:'start'});
    else if(a.stage==='result')s=step(s,{type:'defense',command:'continue'});
    else {
      if(!a.cabinet)s=step(s,{type:'defense',command:'open'});
      s=step(s,{type:'defense',command:'take'});
      for(const t of a.targets)s=step(s,{type:'defense',command:'fire',target:t.id});
      if(s.campaign!.attack!.stage==='active')s=step(s,{type:'defense',command:'isolate'});
    }
  }return s;
}
export function work(s:RunState){
  while(['desk','returning','defense'].includes(s.phase)){
    if(s.phase==='defense'){s=rescue(s);continue;}
    s=step(s,{type:'call'});if(s.pauses.includes('tutorial'))s=step(s,{type:'dismiss',reason:'tutorial'});
    s=step(s,{type:'ask'});const c=currentCase(s)!,e=evaluateCase(s.day,c,s.caseRuntime[c.id].delivered);
    if(s.caseRuntime[c.id].appeal)s=step(s,{type:'procedure',caseId:c.id,disposition:'review'});
    else if(e.disposition==='ban')s=step(s,{type:'procedure',caseId:c.id,disposition:'ban'});
    else {s=step(s,{type:'stamp',caseId:c.id,decision:e.decision});s=step(s,{type:'return',caseId:c.id});for(const id of Object.keys(s.papers))s=step(s,{type:'return-paper',paperId:id});}
  }
  if(s.notice)s=step(s,{type:'dismiss',reason:'citation'});
  if(s.phase==='incident')for(let i=0;i<3;i++)s=step(s,{type:'advance-scene'});
  return s;
}
describe('完整流程事务',()=>{
  it.each(['standard','relaxed'] as const)('%s 从真实新局连续31日进入E01；每步存储校验通过',mode=>{
    let s=newRun(mode,'full-month');
    for(let day=1;day<=31;day++){
      expect(s.day).toBe(day);s=work(paperwork(s));s=step(s,{type:'settle'});
      expect(s.ending).toBeNull();s=step(s,{type:'supply',choice:{electricity:true,tokens:true}});
      if(day<31)s=step(s,{type:'next-day'});
    }
    expect(s.ending).toBe('E01');expect(Object.keys(s.decisions)).toHaveLength(368);
    expect(s.balance).toBe(mode==='standard'?930:960);
    expect(s.ledger.filter(e=>e.kind==='rent')).toHaveLength(31);expect(s.campaign!.completedAttacks).toEqual([18,23,27]);
    const store=new Map<string,string>();const storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
    expect(saveRun(s,storage)).toEqual({ok:true});expect(loadRun(storage)).toMatchObject({kind:'valid',state:{ending:'E01'}});
  },30000);
});
