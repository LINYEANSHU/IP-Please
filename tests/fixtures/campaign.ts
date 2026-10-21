import {newRun,reduceRun,currentCase} from '../../src/domain/run';
import type {ActionBody,RunState} from '../../src/domain/run';
import type {Mode} from '../../src/domain/day-one';
import {evaluateCase} from '../../src/domain/rules';
import {pendingMail} from '../../src/domain/campaign';
let seq=0;
export const act=(s:RunState,a:ActionBody)=>reduceRun(s,{...a,actionId:`fixture-${seq++}`}).state;
export function enterCampaignDay(s:RunState,select:(id:string)=>string=()=> 'return'){
  s=act(s,{type:'go-desk'});
  while(s.pauses.includes('briefing'))s=act(s,{type:'dismiss',reason:'briefing'});
  while(s.phase==='correspondence'){
    const m=pendingMail(s);if(!m){s=act(s,{type:'finish-mail'});break;}
    const option=m.options.find(o=>o.id===select(m.id))??m.options.find(o=>['return','retain'].includes(o.id))??m.options[0];
    s=act(s,{type:'mail',id:m.id,option:option.id});
  }
  if(s.phase==='training')for(const command of ['open','take','fire','isolate','finish'] as const)s=act(s,{type:'train',command});
  return s;
}
export function rescueCampaign(s:RunState,save=true){
  while(s.phase==='defense'){
    const a=s.campaign!.attack!;
    if(a.stage==='warning')s=act(s,{type:'defense',command:'start'});
    else if(a.stage==='result')s=act(s,{type:'defense',command:'continue'});
    else if(!save)s=act(s,{type:'defense',command:'wait'});
    else{if(!a.cabinet)s=act(s,{type:'defense',command:'open'});s=act(s,{type:'defense',command:'take'});for(const t of a.targets)s=act(s,{type:'defense',command:'fire',target:t.id});if(s.campaign!.attack!.stage==='active')s=act(s,{type:'defense',command:'isolate'});}
  }return s;
}
export function finishCampaignWork(s:RunState,saveGuards=true){
  let limit=0;
  while(['desk','returning','defense'].includes(s.phase)){
    if(++limit>50)throw Error('受理未推进');
    if(s.phase==='defense'){s=rescueCampaign(s,saveGuards);continue;}
    s=act(s,{type:'call'});if(s.pauses.includes('tutorial'))s=act(s,{type:'dismiss',reason:'tutorial'});
    s=act(s,{type:'ask'});const c=currentCase(s)!;const e=evaluateCase(s.day,c,s.caseRuntime[c.id].delivered);
    if(s.caseRuntime[c.id].appeal)s=act(s,{type:'procedure',caseId:c.id,disposition:'review'});
    else if(e.disposition==='ban')s=act(s,{type:'procedure',caseId:c.id,disposition:'ban'});
    else{s=act(s,{type:'stamp',caseId:c.id,decision:e.decision});s=act(s,{type:'return',caseId:c.id});for(const id of Object.keys(s.papers))s=act(s,{type:'return-paper',paperId:id});}
  }
  if(s.notice)s=act(s,{type:'dismiss',reason:'citation'});
  if(s.phase==='incident')for(let i=0;i<3;i++)s=act(s,{type:'advance-scene'});
  return s;
}
export function campaignStart(day:number,mode:Mode='relaxed',select?:(id:string)=>string):RunState {
  let s=newRun(mode,`campaign-fixture-${mode}`);
  for(let i=1;i<day;i++){
    s=finishCampaignWork(enterCampaignDay(s,select));s=act(s,{type:'settle'});s=act(s,{type:'supply',choice:{electricity:true,tokens:true}});s=act(s,{type:'next-day'});
    if(s.ending)throw Error(`D${i}: ${s.ending}`);
  }return s;
}
