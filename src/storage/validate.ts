import {validCampaign,campaignPayments} from './campaign-validation';
import {assessDecision} from '../domain/adjudication';
import {ENDING_TEXT} from '../domain/campaign';
import type {RunState,CaseRuntime,DaySummary} from '../domain/run';
import {getModePolicy} from '../domain/day-one';
import {economyAmount,validEconomyEntry} from '../domain/economy';
import {getDay,getCaseById} from '../domain/week';
import {evaluateCase} from '../domain/rules';
import {REPAIR_COST} from '../domain/family';
import {applicantDialogue} from '../domain/conversation';
export const integer=(v:unknown,min=-Number.MAX_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export const record=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string')&&new Set(v).size===v.length;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const memberIds=['player','father','mother','wife','son'];
function supply(v:any):boolean{return record(v)&&typeof v.electricity==='boolean'&&typeof v.tokens==='boolean'&&(v.repairs===undefined||strings(v.repairs)&&v.repairs.every((id:string)=>memberIds.includes(id)));}
function rect(r:any,w:number,h:number){return record(r)&&r.width===w&&r.height===h&&!Object.prototype.hasOwnProperty.call(r,'stacked')&&integer(r.x,0,640-w)&&integer(r.y,0,360-h);}
export function validRun(v:any):v is RunState {
  try{return check(v);}catch{return false;}
}
function check(v:any):v is RunState {
  if(!record(v)||v.schemaVersion!==2||typeof v.runId!=='string'||!v.runId||!integer(v.revision,0)||!['standard','relaxed'].includes(v.mode)||!integer(v.day,1,31))return false;
  if(!['title','newspaper','desk','returning','incident','night','family','next-day','ending','correspondence','training','defense'].includes(v.phase)||!integer(v.remainingMs,0,90000)||!integer(v.balance)||!integer(v.startBalance))return false;
  if(v.shiftDurationMs!==undefined&&v.shiftDurationMs!==90000)return false;
  const legacyNext=v.phase==='next-day',day=legacyNext?7:v.day,def=getDay(day),ids=def.cases.map(c=>c.id);
  if(!equal(v.caseIds,ids)||!integer(v.caseIndex,-1,ids.length-1)||!strings(v.returned)||!equal(v.returned,ids.slice(0,v.returned.length)))return false;
  if(!record(v.decisions)||!record(v.caseRuntime)||!Array.isArray(v.history)||v.history.length!==v.day-1)return false;
  if(!strings(v.pauses)||v.pauses.some((p:string)=>!['briefing','tutorial','citation','settings','background','manual','reader'].includes(p)))return false;
  if(!rect(v.book,220,152)||!rect(v.rule,136,170)||!['cover','inside'].includes(v.bookPage)||!record(v.papers)||!strings(v.paperOrder)||typeof v.topPaper!=='string'||!v.paperOrder.includes(v.topPaper))return false;
  if(!integer(v.briefingStep,0,def.scene.length)||typeof v.started!=='boolean'||v.started!==(v.caseIndex>=0)||!integer(v.dialogueLine,0)||!(v.notice===null||typeof v.notice==='string'))return false;
  if(!strings(v.appliedActions)||v.appliedActions.length>512||typeof v.rentPaid!=='boolean'||!(v.supply===null||supply(v.supply)))return false;
  if(!record(v.family)||memberIds.some(id=>{const m=v.family[id];return !record(m)||!integer(m.powerPressure,0,100)||!integer(m.tokenPressure,0,100)||!integer(m.damage,0,4)||typeof m.memoryIntact!=='boolean';}))return false;
  if(!record(v.story)||typeof v.story.oldRulesReceived!=='boolean'||typeof v.story.guardAlive!=='boolean'||!integer(v.story.incidentLine,0,3)||v.story.guardAlive!==(v.story.incidentLine<3))return false;
  if(day<7&&(v.story.oldRulesReceived||v.story.incidentLine))return false;
  if((v.phase==='ending')!==(v.ending!==null)||!(v.ending===null||Object.hasOwn(ENDING_TEXT,v.ending)))return false;
  if(!validCampaign(v as RunState))return false;
  if(!Array.isArray(v.ledger)||v.ledger.some((e:any)=>!record(e)||!validEconomyEntry(e)))return false;
  const economyVersions=new Map<string,2|undefined>(v.ledger.map((e:any)=>[e.id,e.economyVersion]));
  if(legacyNext&&v.day!==8)return false;
  const expected=new Map<string,{kind:string;amount:number;caseId?:string;ruleVersion?:string}>();
  const runtimeIds=new Set<string>(),decisionIds=new Set<string>();let currentOrdinary=0,currentSerious=0;
  const activeBans=new Set<string>();
  const policy=getModePolicy(v.mode);
  const summaries:DaySummary[]=[...v.history];
  if(!legacyNext)summaries.push({day:v.day,caseIndex:v.caseIndex,returned:v.returned,remainingMs:v.remainingMs,rentPaid:v.rentPaid,supply:v.supply,startBalance:v.startBalance} as DaySummary);
  const transfers=campaignPayments(v as RunState);if(transfers===null)return false;
  let runningBalance=policy.initial;
  for(let j=0;j<summaries.length;j++){
    const h=summaries[j],past=j<v.history.length,d=getDay(j+1),caseIds=d.cases.map(c=>c.id);
    if(!record(h)||h.day!==j+1||!integer(h.caseIndex,-1,caseIds.length-1)||!strings(h.returned)||!equal(h.returned,caseIds.slice(0,h.returned.length))||!integer(h.remainingMs,0,90000)||h.startBalance!==runningBalance)return false;
    if(past&&(!h.rentPaid||!supply(h.supply)||h.returned.length<caseIds.length&&h.remainingMs>0))return false;
    for(const t of transfers.filter(t=>t.day===h.day)){expected.set(t.entry.id,t.entry);runningBalance+=t.entry.amount;}
    let ordinary=0,serious=0,count=0;
    for(let i=0;i<=h.caseIndex;i++){
      const c=d.cases[i],r=v.caseRuntime[c.id] as CaseRuntime;
      if(!record(r)||typeof r.asked!=='boolean'||typeof r.bookReturned!=='boolean'||!strings(r.delivered)||!strings(r.returnedPapers))return false;
      if(r.appeal!==undefined&&typeof r.appeal!=='boolean'||d.day>=8&&!!r.appeal!==activeBans.has(c.account))return false;
      if(!equal(r.delivered,[...c.initialPapers,...(r.asked?c.askedPapers:[])].map(p=>p.id)))return false;
      if(r.returnedPapers.some(id=>!r.delivered.includes(id)||[...c.initialPapers,...c.askedPapers].find(p=>p.id===id)?.kind==='passport'))return false;
      runtimeIds.add(c.id);const decision=v.decisions[c.id];
      const complete=r.bookReturned&&r.delivered.every(id=>[...c.initialPapers,...c.askedPapers].find(p=>p.id===id)?.kind==='passport'||r.returnedPapers.includes(id));
      if(complete!==h.returned.includes(c.id))return false;
      if(!decision){if(i!==h.caseIndex||r.bookReturned||r.returnedPapers.length)return false;continue;}
      if(count!==i||!record(decision)||!['allow','reject'].includes(decision.decision)||typeof decision.correct!=='boolean'||!integer(decision.penalty,0)||decision.ruleVersion!==d.version||!record(decision.mark)||!integer(decision.mark.x,158,172)||!integer(decision.mark.y,106,119))return false;
      count++;decisionIds.add(c.id);
      const assessment=assessDecision({runId:v.runId,day:d.day},c,r.delivered,decision.decision,decision.disposition,r.appeal);
      if(decision.correct!==assessment.correct||decision.caught!==undefined&&decision.caught!==assessment.caught||decision.serious!==undefined&&decision.serious!==assessment.serious)return false;
      if(decision.disposition&&!['ban','review','unban'].includes(decision.disposition))return false;
      if(decision.disposition==='ban'){if(activeBans.has(c.account))return false;activeBans.add(c.account);}
      if(decision.disposition==='unban'&&decision.correct)activeBans.delete(c.account);
      let penalty=0;
      if(decision.correct||!assessment.caught){if(decision.penalty)return false;expected.set(`case:${c.id}:wage`,{kind:'wage',amount:5,caseId:c.id,ruleVersion:d.version});runningBalance+=5;}
      else{
        if(assessment.serious){serious++;penalty=serious>=2?policy.severeFine:policy.fine;}else{ordinary++;penalty=ordinary>policy.ordinaryWarnings?policy.fine:0;}
        if(decision.penalty!==penalty)return false;
        if(penalty){expected.set(`case:${c.id}:fine`,{kind:'fine',amount:-penalty,caseId:c.id,ruleVersion:d.version});runningBalance-=penalty;}
      }
      if(i<h.caseIndex&&!complete)return false;
    }
    if(h.day===day){currentOrdinary=ordinary;currentSerious=serious;}
    const settled=h.rentPaid||!past&&v.ending==='E13';
    if(settled){const id=`day:${h.day}:salary`,amount=economyAmount('salary',v.mode,economyVersions.get(id));expected.set(id,{kind:'salary',amount});runningBalance+=amount;}
    if(h.rentPaid){expected.set(`day:${h.day}:rent`,{kind:'rent',amount:-20});runningBalance-=20;}
    if(h.supply){
      if(!h.rentPaid||!supply(h.supply))return false;
      for(const kind of ['electricity','tokens'] as const)if(h.supply[kind]){const id=`day:${h.day}:${kind}`,amount=economyAmount(kind,v.mode,economyVersions.get(id));expected.set(id,{kind,amount});runningBalance+=amount;}
      for(const id of h.supply.repairs??[]){const cost=REPAIR_COST[id];expected.set(`day:${h.day}:repair:${id}`,{kind:'repair',amount:-cost});runningBalance-=cost;}
    }
  }
  if(Object.keys(v.caseRuntime).length!==runtimeIds.size||Object.keys(v.decisions).length!==decisionIds.size||v.ordinaryErrors!==currentOrdinary||v.seriousErrors!==currentSerious||runningBalance!==v.balance)return false;
  if(v.campaign&&!equal([...v.campaign.banned].sort(),[...activeBans].sort()))return false;
  if(!Array.isArray(v.ledger)||v.ledger.length!==expected.size)return false;
  const seen=new Set<string>();
  for(const e of v.ledger){const want=expected.get(e.id);if(!record(e)||seen.has(e.id)||!want||e.kind!==want.kind||e.amount!==want.amount||e.caseId!==want.caseId||e.ruleVersion!==want.ruleVersion)return false;seen.add(e.id);}
  const c=def.cases[v.caseIndex],r=c?v.caseRuntime[c.id]:undefined;
  if(v.dialogueLine>(c?applicantDialogue(c,v.runId).length:1)-1)return false;
  const paperDefs=c?[...c.initialPapers,...c.askedPapers].filter(p=>r.delivered.includes(p.id)&&p.kind!=='passport'):[];
  if(Object.keys(v.papers).length!==paperDefs.length||!equal([...v.paperOrder].sort(),['rule','book',...paperDefs.map(p=>p.id)].sort()))return false;
  for(const p of paperDefs){const position=v.papers[p.id];if(!record(position)||!integer(position.width,80,160)||!integer(position.height,70,150)||!rect(position,position.width,position.height))return false;}
  if(['title','newspaper'].includes(v.phase)&&(v.caseIndex!==-1||v.returned.length||v.rentPaid||v.supply))return false;
  if(['desk','returning'].includes(v.phase)){
    if(v.remainingMs===0||v.returned.length===ids.length||v.rentPaid||v.supply)return false;
    if(v.phase==='returning'&&(!c||!v.decisions[c.id]||v.returned.includes(c.id)))return false;
    if(v.phase==='desk'&&c&&v.decisions[c.id]&&!v.returned.includes(c.id))return false;
  }
  if(['incident','night','family','next-day','ending'].includes(v.phase)&&v.returned.length<ids.length&&v.remainingMs>0)return false;
  if(v.phase==='incident'&&(day!==7||v.rentPaid||v.story.incidentLine>=3))return false;
  if(day===7&&['night','family','next-day','ending'].includes(v.phase)&&v.story.incidentLine!==3)return false;
  if(v.rentPaid&&!['night','family','next-day','ending'].includes(v.phase))return false;
  if(v.supply&&!['family','next-day','ending'].includes(v.phase))return false;
  if(['family','next-day'].includes(v.phase)&&(!v.rentPaid||!v.supply))return false;
  if(v.ending==='E13'&&(v.rentPaid||v.supply||v.balance>=20))return false;
  if(v.ending==='E04'&&(!v.rentPaid||!v.supply||v.family.player.damage!==4))return false;
  return true;
}
