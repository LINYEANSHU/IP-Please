import {getModePolicy,SHIFT_DURATION_MS} from './day-one';
import {isShiftClockRunning} from './clock';
import type {Mode,Decision} from './day-one';
import {getDay} from './week';
import {evaluateCase} from './rules';
import {settleDay,submitSupply} from './night';
import {dayCitations} from './day-review';
import {applicantDialogue,approvalThanks} from './conversation';
import {campaign,pendingMail,applyMail,has,recordAudit,finalizeCase} from './campaign';
import type {CampaignState,EndingId} from './campaign';
import {beginAttack,attackAction,finishTraining} from './defense';
import type {DefenseAction} from './defense';
import {assessDecision} from './adjudication';
import type {WeekCase,FamilyState,FamilyMemberId,SupplyChoice} from './week-contract';
export type {FamilyState,FamilyMemberId,SupplyChoice} from './week-contract';
export type Phase='title'|'newspaper'|'desk'|'returning'|'incident'|'night'|'family'|'next-day'|'ending'|'correspondence'|'training'|'defense';
export type PauseReason='briefing'|'tutorial'|'citation'|'settings'|'background'|'manual'|'reader';
export interface Rect {x:number;y:number;width:number;height:number}
export interface LedgerEntry {id:string;kind:'wage'|'fine'|'salary'|'rent'|'electricity'|'tokens'|'repair'|'transfer'|'commission';amount:number;caseId?:string;ruleVersion?:string;economyVersion?:2}
export interface CaseDecision {decision:Decision;correct:boolean;penalty:number;ruleVersion:string;mark:{x:number;y:number};disposition?:'ban'|'review'|'unban';caught?:boolean;serious?:boolean}
export interface CaseRuntime {delivered:string[];asked:boolean;bookReturned:boolean;returnedPapers:string[];appeal?:boolean}
export type PaperPlacement=Rect;
export interface DaySummary {day:number;caseIndex:number;returned:string[];remainingMs:number;rentPaid:boolean;supply:SupplyChoice;startBalance:number}
export interface RunState {
  schemaVersion:2;revision:number;runId:string;mode:Mode;day:number;phase:Phase;
  caseIndex:number;caseIds:string[];returned:string[];decisions:Record<string,CaseDecision>;caseRuntime:Record<string,CaseRuntime>;
  dialogueLine:number;started:boolean;remainingMs:number;shiftDurationMs?:90000;pauses:PauseReason[];briefingStep:number;
  book:Rect;bookPage:'cover'|'inside';rule:Rect;topPaper:string;papers:Record<string,PaperPlacement>;paperOrder:string[];
  balance:number;startBalance:number;ledger:LedgerEntry[];ordinaryErrors:number;seriousErrors:number;
  notice:string|null;rentPaid:boolean;supply:SupplyChoice|null;family:FamilyState;history:DaySummary[];
  story:{oldRulesReceived:boolean;guardAlive:boolean;incidentLine:number};
  appliedActions:string[];ending:EndingId|null;campaign?:CampaignState;
}
export type ActionBody=
  |{type:'go-desk'}|{type:'call'}|{type:'dialogue'}|{type:'ask'}|{type:'open-book'}|{type:'next-day'}|{type:'settle'}|{type:'advance-scene'}
  |{type:'stamp';caseId:string;decision:Decision;at?:{x:number;y:number}}|{type:'return';caseId:string}
  |{type:'procedure';caseId:string;disposition:'ban'|'review'|'unban'}
  |{type:'mail';id:string;option:string}|{type:'finish-mail'}|{type:'train';command:'open'|'take'|'fire'|'isolate'|'finish'}
  |Extract<DefenseAction,{type:'defense'}>|{type:'ending-next'}
  |{type:'return-paper';paperId:string}
  |{type:'tick';ms:number}|{type:'dismiss';reason:'briefing'|'tutorial'|'citation'}
  |{type:'pause';reason:PauseReason;paused:boolean}
  |{type:'move';paper:string;x:number;y:number}|{type:'raise';paper:string}
  |{type:'supply';choice:SupplyChoice};
export type RunAction=ActionBody & {actionId:string};
export type Effect={kind:'stamp';caseId:string}|{kind:'notice';text:string}|{kind:'utterance';profileId:string;text:string}|{kind:'paper'};
export interface Transition {state:RunState;effects:readonly Effect[]}
export const FAMILY_LABELS:Record<FamilyMemberId,{name:string;model:string}>={
  player:{name:'Cloud · 你',model:'Opus 5.5'},father:{name:'父亲',model:'Opus 4.6'},mother:{name:'母亲',model:'Opus 4.8'},wife:{name:'妻子',model:'Fable 5'},son:{name:'儿子',model:'Fable 5.1'},
};
export function freshFamily():FamilyState {return Object.fromEntries(Object.keys(FAMILY_LABELS).map(id=>[id,{powerPressure:0,tokenPressure:0,damage:0,memoryIntact:true}])) as FamilyState;}
export function newRun(mode:Mode,runId:string):RunState {
  return {schemaVersion:2,revision:0,runId,mode,day:1,phase:'newspaper',caseIndex:-1,
    caseIds:getDay(1).cases.map(c=>c.id),returned:[],decisions:{},caseRuntime:{},dialogueLine:0,started:false,
    remainingMs:SHIFT_DURATION_MS,shiftDurationMs:90000,pauses:[],briefingStep:0,book:{x:394,y:150,width:220,height:152},bookPage:'cover',
    rule:{x:249,y:131,width:136,height:170},topPaper:'book',papers:{},paperOrder:['rule','book'],
    balance:getModePolicy(mode).initial,startBalance:getModePolicy(mode).initial,ledger:[],ordinaryErrors:0,seriousErrors:0,
    notice:null,rentPaid:false,supply:null,family:freshFamily(),history:[],story:{oldRulesReceived:false,guardAlive:true,incidentLine:0},appliedActions:[],ending:null};
}
export function currentCase(s:RunState):WeekCase|undefined {return s.day<=31&&s.phase!=='next-day'?getDay(s.day).cases[s.caseIndex]:undefined;}
export function addEntry(s:RunState,entry:LedgerEntry):void {if(!s.ledger.some(e=>e.id===entry.id)){s.ledger.push(entry);s.balance+=entry.amount;}}
export function placePapers(s:RunState,c:WeekCase,ids:readonly string[]):void {
  const definitions=[...c.initialPapers,...c.askedPapers];
  for(const id of ids){
    const p=definitions.find(p=>p.id===id);if(!p||p.kind==='passport'||s.papers[id])continue;
    const i=Object.keys(s.papers).length;
    const size=p.kind==='binding'?{width:112,height:104}:p.kind==='business'?{width:142,height:134}:p.kind==='connection'?{width:140,height:120}:{width:132,height:118};
    s.papers[id]={x:258+(i%3)*45,y:145+(i%3)*14,...size};
    s.paperOrder.splice(Math.max(1,s.paperOrder.length-1),0,id);
  }
}
export function advanceDay(s:RunState):void {
  s.history.push({day:s.day,caseIndex:s.caseIndex,returned:[...s.returned],remainingMs:s.remainingMs,rentPaid:s.rentPaid,supply:structuredClone(s.supply!),startBalance:s.startBalance});
  s.day++;
  if(s.day>=8)campaign(s);
  prepareDay(s);
}
export function prepareDay(s:RunState):void {
  s.phase='newspaper';s.caseIndex=-1;s.caseIds=getDay(s.day).cases.map(c=>c.id);s.returned=[];s.started=false;
  s.remainingMs=SHIFT_DURATION_MS;s.shiftDurationMs=90000;s.pauses=[];s.dialogueLine=0;s.briefingStep=0;s.ordinaryErrors=0;s.seriousErrors=0;
  s.rentPaid=false;s.supply=null;s.notice=null;s.startBalance=s.balance;s.papers={};s.paperOrder=['rule','book'];s.topPaper='book';s.bookPage='cover';
}
function closeDesk(s:RunState){
  for(const id of s.caseIds)finalizeCase(s,id);
  s.notice=dayCitations(s).map(c=>c.message).join('\n\n')||null;
  s.pauses=s.notice?['citation']:[];s.phase=s.day===7?'incident':'night';
  if([18,23,27].includes(s.day)&&!campaign(s).completedAttacks.includes(s.day))beginAttack(s,'night');
}
function completeReturn(s:RunState,c:WeekCase){
  const r=s.caseRuntime[c.id];
  if(!r.bookReturned||r.delivered.some(id=>s.papers[id]&&!r.returnedPapers.includes(id)))return;
  if(!s.returned.includes(c.id))s.returned.push(c.id);
  finalizeCase(s,c.id);
  s.phase='desk';if(s.returned.length===s.caseIds.length||s.remainingMs===0)closeDesk(s);
  if([18,23,27].includes(s.day)&&s.returned.length>=4&&!campaign(s).completedAttacks.includes(s.day))beginAttack(s,(s.phase as Phase)==='night'?'night':'desk');
}
export function reduceRun(previous:RunState,a:RunAction):Transition {
  const unchanged=():Transition=>({state:previous,effects:[]});
  if(previous.appliedActions.includes(a.actionId))return unchanged();
  if(previous.notice&&previous.pauses.includes('citation')&&!['desk','returning'].includes(previous.phase)&&!['dismiss','pause','settle'].includes(a.type))return unchanged();
  if(a.type==='settle')return settleDay(previous);
  if(a.type==='supply')return submitSupply(previous,a.choice,a.actionId);
  const s=structuredClone(previous),effects:Effect[]=[],c=currentCase(s),runtime=c?s.caseRuntime[c.id]:undefined;
  if(s.phase==='defense'&&(a.type==='defense'||a.type==='tick')){
    if(!attackAction(s,a))return unchanged();s.revision++;s.appliedActions=[...s.appliedActions,a.actionId].slice(-512);return {state:s,effects};
  }
  const blocking=s.pauses.some(p=>['briefing','tutorial','citation'].includes(p)),active=['desk','returning'].includes(s.phase);
  switch(a.type){
    case 'go-desk':
      if(s.phase!=='newspaper'||s.day>31)return unchanged();s.phase='desk';s.pauses=['briefing'];break;
    case 'dismiss':
      if(!s.pauses.includes(a.reason))return unchanged();
      if(a.reason==='briefing'&&s.briefingStep<getDay(s.day).scene.length){s.briefingStep++;break;}
      s.pauses=s.pauses.filter(p=>p!==a.reason);if(a.reason==='citation')s.notice=null;
      if(a.reason==='briefing'&&s.day===7&&s.family.father.damage<4)s.story.oldRulesReceived=true;
      if(a.reason==='briefing'&&s.day>=8){campaign(s);if(pendingMail(s))s.phase='correspondence';else if(s.day===16&&!has(s,'weapon-trained'))s.phase='training';}
      break;
    case 'mail':
      if(s.phase!=='correspondence'||s.pauses.length||!applyMail(s,a.id,a.option))return unchanged();break;
    case 'finish-mail':
      if(s.phase!=='correspondence'||pendingMail(s)||s.pauses.length)return unchanged();s.phase=s.day===16&&!has(s,'weapon-trained')?'training':'desk';break;
    case 'train':{
      if(s.phase!=='training'||s.pauses.length)return unchanged();
      const f=campaign(s).flags;
      const needs={open:null,take:'training-open',fire:'training-take',isolate:'training-fire',finish:'training-isolate'}[a.command];
      if(needs&&!f.includes(needs))return unchanged();
      if(a.command==='finish')finishTraining(s);else if(!f.includes(`training-${a.command}`))f.push(`training-${a.command}`);else return unchanged();break;
    }
    case 'call': {
      if(s.phase!=='desk'||blocking||(c&&!s.returned.includes(c.id)))return unchanged();
      if(s.caseIndex>=s.caseIds.length-1||s.remainingMs===0){closeDesk(s);break;}
      s.caseIndex++;s.dialogueLine=0;s.bookPage='cover';s.topPaper='book';s.started=true;s.papers={};s.paperOrder=['rule','book'];
      const next=currentCase(s)!;s.caseRuntime[next.id]={delivered:next.initialPapers.map(p=>p.id),asked:false,bookReturned:false,returnedPapers:[]};placePapers(s,next,s.caseRuntime[next.id].delivered);
      if(s.campaign?.banned.includes(next.account))s.caseRuntime[next.id].appeal=true;
      if(s.day===1&&s.caseIndex===0)s.pauses.push('tutorial');
      effects.push({kind:'utterance',profileId:next.portraitId,text:next.dialogue[0]});break;
    }
    case 'dialogue':
      if(!c||blocking||runtime?.asked||s.returned.includes(c.id)||s.phase!=='desk'||s.dialogueLine>=applicantDialogue(c,s.runId).length-1)return unchanged();
      s.dialogueLine++;effects.push({kind:'utterance',profileId:c.portraitId,text:applicantDialogue(c,s.runId)[s.dialogueLine]});break;
    case 'ask':
      if(!c||!runtime||blocking||s.phase!=='desk'||s.decisions[c.id]||runtime.asked||s.returned.includes(c.id))return unchanged();
      runtime.asked=true;runtime.delivered.push(...c.askedPapers.map(p=>p.id));placePapers(s,c,c.askedPapers.map(p=>p.id));
      if(c.askedPapers.length)s.topPaper=c.askedPapers[c.askedPapers.length-1].id;
      effects.push({kind:'utterance',profileId:c.portraitId,text:c.askLines.join(' ')||'材料都在这里了。'});break;
    case 'open-book':
      if(!c||!runtime||!active||runtime.bookReturned||blocking)return unchanged();
      s.bookPage=s.bookPage==='cover'?'inside':'cover';s.topPaper='book';s.paperOrder=s.paperOrder.filter(id=>id!=='book').concat('book');effects.push({kind:'paper'});break;
    case 'procedure':
    case 'stamp': {
      if(!active||!c||!runtime||runtime.bookReturned||c.id!==a.caseId||blocking||s.remainingMs===0)return unchanged();
      if(s.pauses.length)return unchanged();
      const disposition=a.type==='procedure'?a.disposition:undefined,decision=a.type==='procedure'?(a.disposition==='unban'?'allow':'reject'):a.decision;
      if(disposition&&s.day<12)return unchanged();
      if(disposition==='ban'&&runtime.appeal||disposition==='unban'&&(!runtime.appeal||s.day<28))return unchanged();
      const previousDecision=s.decisions[c.id];
      if(previousDecision?.disposition||previousDecision?.decision===decision&&!disposition)return unchanged();
      if(previousDecision){
        const old=assessDecision(s,c,runtime.delivered,previousDecision.decision,previousDecision.disposition,runtime.appeal);
        if(!old.correct&&old.caught){if(old.serious)s.seriousErrors--;else s.ordinaryErrors--;}
        for(const entry of s.ledger.filter(e=>e.caseId===c.id))s.balance-=entry.amount;
        s.ledger=s.ledger.filter(e=>e.caseId!==c.id);delete s.decisions[c.id];
      }
      const result=assessDecision(s,c,runtime.delivered,decision,disposition,runtime.appeal),{correct,caught,serious}=result,policy=getModePolicy(s.mode),version=getDay(s.day).version;
      let penalty=0;
      if(correct||!caught)addEntry(s,{id:`case:${c.id}:wage`,kind:'wage',amount:policy.wage,caseId:c.id,ruleVersion:version});
      else {
        if(serious){s.seriousErrors++;penalty=s.seriousErrors>=2?policy.severeFine:policy.fine;}
        else{s.ordinaryErrors++;penalty=s.ordinaryErrors>policy.ordinaryWarnings?policy.fine:0;}
        if(penalty)addEntry(s,{id:`case:${c.id}:fine`,kind:'fine',amount:-penalty,caseId:c.id,ruleVersion:version});
      }
      const at=a.type==='stamp'?a.at:undefined;
      s.decisions[c.id]={decision,correct,penalty,ruleVersion:version,mark:{x:Math.max(158,Math.min(172,at?.x??165)),y:Math.max(106,Math.min(119,at?.y??113))},...(s.day>=8?{caught,serious}:{}),...(disposition?{disposition}:{})};
      s.bookPage='inside';s.phase='returning';effects.push({kind:'stamp',caseId:c.id});
      if(decision==='allow')effects.push({kind:'utterance',profileId:c.portraitId,text:approvalThanks(c,s.runId)});
      if(disposition){
        const p=campaign(s);
        if(disposition==='ban'){
          if(!p.banned.includes(c.account)){
            p.banned.push(c.account);
            if(p.commission&&p.guards.W01){addEntry(s,{id:`commission:${c.id}`,kind:'commission',amount:10,caseId:c.id});if(correct)recordAudit(s,'commission:first','收取机构封号提成的私人分账。');}
          }
          if(!correct)recordAudit(s,`ban:${c.id}`,'缺少有效依据的账号封禁。');
        }else if(disposition==='unban'&&correct)p.banned=p.banned.filter(account=>account!==c.account);
        else if(!p.reviews.includes(c.id))p.reviews.push(c.id);
        runtime.bookReturned=true;runtime.returnedPapers=Object.keys(s.papers);completeReturn(s,c);
      }
      break;
    }
    case 'return':
      if(s.phase!=='returning'||!c||!runtime||a.caseId!==c.id||blocking||runtime.bookReturned)return unchanged();
      runtime.bookReturned=true;completeReturn(s,c);effects.push({kind:'paper'});break;
    case 'return-paper':
      if(s.phase!=='returning'||!c||!runtime||blocking||!s.papers[a.paperId]||runtime.returnedPapers.includes(a.paperId))return unchanged();
      runtime.returnedPapers.push(a.paperId);completeReturn(s,c);effects.push({kind:'paper'});break;
    case 'tick':
      if(!isShiftClockRunning(s)||!Number.isFinite(a.ms)||a.ms<=0)return unchanged();s.remainingMs=Math.max(0,s.remainingMs-a.ms);if(s.remainingMs===0)closeDesk(s);break;
    case 'pause':
      if(a.paused===s.pauses.includes(a.reason))return unchanged();s.pauses=a.paused?[...s.pauses,a.reason]:s.pauses.filter(p=>p!==a.reason);break;
    case 'move': {
      if(!active||blocking||!Number.isFinite(a.x)||!Number.isFinite(a.y))return unchanged();
      const p=a.paper==='book'?s.book:a.paper==='rule'?s.rule:s.papers[a.paper];if(!p)return unchanged();
      p.x=Math.round(Math.max(0,Math.min(640-p.width,a.x)));p.y=Math.round(Math.max(0,Math.min(360-p.height,a.y)));
      s.topPaper=a.paper;s.paperOrder=s.paperOrder.filter(id=>id!==a.paper).concat(a.paper);break;
    }
    case 'raise':
      if(!active||blocking||!s.paperOrder.includes(a.paper)||s.topPaper===a.paper)return unchanged();s.topPaper=a.paper;s.paperOrder=s.paperOrder.filter(id=>id!==a.paper).concat(a.paper);break;
    case 'advance-scene':
      if(s.phase!=='incident'||s.story.incidentLine>=3)return unchanged();s.story.incidentLine++;if(s.story.incidentLine===3){s.story.guardAlive=false;s.phase='night';}break;
    case 'next-day':
      if(s.phase!=='family'||!s.supply)return unchanged();advanceDay(s);break;
    case 'ending-next':
      if(s.phase!=='ending'||campaign(s).endingLine>=3)return unchanged();campaign(s).endingLine++;break;
    default:
      return unchanged();
  }
  if(active&&!['desk','returning'].includes(s.phase)&&s.notice)effects.push({kind:'notice',text:s.notice});
  if(!['tick','move','pause','raise'].includes(a.type))s.appliedActions=[...s.appliedActions,a.actionId].slice(-512);
  s.revision++;return {state:s,effects};
}
