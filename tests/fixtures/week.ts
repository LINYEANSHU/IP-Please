import {newRun,reduceRun,currentCase} from '../../src/domain/run';
import type {RunState,ActionBody,SupplyChoice} from '../../src/domain/run';
const EXPECTED=['AARAARAA','RARRAARRARAA','AAARRAAARRAR','AAARARRRAAAR','AAARARRAARRA','AARRAARARRAA','AARARARRAARA'];
let sequence=0;
export const step=(s:RunState,a:ActionBody)=>reduceRun(s,{...a,actionId:`fixture-week-${sequence++}`}).state;
export function enterDay(s:RunState){s=step(s,{type:'go-desk'});while(s.pauses.includes('briefing'))s=step(s,{type:'dismiss',reason:'briefing'});return s;}
export function finishCase(s:RunState){
  s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});s=step(s,{type:'ask'});
  const c=currentCase(s)!;s=step(s,{type:'stamp',caseId:c.id,decision:EXPECTED[s.day-1][s.caseIndex]==='A'?'allow':'reject'});
  for(const id of Object.keys(s.papers))s=step(s,{type:'return-paper',paperId:id});
  return step(s,{type:'return',caseId:c.id});
}
export function closeDay(s:RunState){while(s.phase==='desk')s=finishCase(s);while(s.phase==='incident')s=step(s,{type:'advance-scene'});return step(s,{type:'settle'});}
export function atDay(day:number,mode:'standard'|'relaxed'='relaxed',choice:SupplyChoice={electricity:true,tokens:true}):RunState {
  let s=newRun(mode,`fixture-week-${day}-${mode}`);
  for(let i=1;i<day;i++){s=closeDay(enterDay(s));s=step(s,{type:'supply',choice});s=step(s,{type:'next-day'});}
  return s;
}
export function atCase(day:number,index=0):RunState {
  let s=enterDay(atDay(day));for(let i=0;i<index;i++)s=finishCase(s);
  s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});return step(s,{type:'open-book'});
}
