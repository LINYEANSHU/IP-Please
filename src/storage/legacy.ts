import type {RunState,Transition,PauseReason} from '../domain/run';
import {DAY_ONE_CASES,SHIFT_DURATION_MS,getModePolicy,requiredDecision} from '../domain/day-one';
import {economyAmount,validEconomyEntry} from '../domain/economy';
export const SAVE_KEY='ip-please:run:v1';
const OWNER_KEY='ip-please:owner:v1', MUTEX='ip-please:commit';
const LEGACY_STANDARD_MAX_MS=360000;
type Store=Pick<Storage,'getItem'|'setItem'>;
export type LoadResult={kind:'empty'}|{kind:'valid';state:RunState}|{kind:'invalid';raw:string;reason:string};
export type SaveResult={ok:true}|{ok:false;reason:string};
export interface SessionLease { canWrite():boolean;takeOver():Promise<boolean>;release():void;error?:string }
const memberIds=['player','father','mother','wife','son'];
const pauses=['briefing','tutorial','citation','settings','background','manual','reader'];
const integer=(v:unknown,min=-Number.MAX_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const record=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const supply=(v:any)=>record(v)&&typeof v.electricity==='boolean'&&typeof v.tokens==='boolean';
const markCenter={x:165,y:113};
type ValidOptions={allowLegacyMark?:boolean};
const timerConsistent=(v:any):boolean=>integer(v.remainingMs,0,SHIFT_DURATION_MS);
function phaseConsistent(v:any):boolean {
  const ids=v.caseIds as string[], count=Object.keys(v.decisions).length, returned=v.returned.length;
  if(returned>count||count>v.caseIndex+1)return false;
  for(let i=0;i<count;i++)if(!v.decisions[ids[i]])return false;
  for(let i=0;i<returned;i++)if(v.returned[i]!==ids[i])return false;
  if(v.caseIndex===-1){if(count||returned)return false;}
  else if(count!==v.caseIndex&&count!==v.caseIndex+1)return false;
  if(['title','newspaper'].includes(v.phase)&&(v.caseIndex!==-1||count||returned))return false;
  if(['desk','returning'].includes(v.phase)){
    // The 60-second shift may not be saved in an active phase once the clock is spent.
    if(v.remainingMs<=0||returned===8)return false;
    if(v.phase==='returning'){
      if(v.caseIndex<0||count!==v.caseIndex+1||returned!==v.caseIndex)return false;
    }else{
      if(returned!==count)return false;
      if(v.caseIndex>=0&&count!==v.caseIndex&&count!==v.caseIndex+1)return false;
    }
  }
  if(['night','family','next-day','ending'].includes(v.phase)){
    // A partial day can only be closed by the clock reaching zero. Finishing all
    // eight cases still allows an early close at any remaining time.
    if(returned<8&&v.remainingMs>0)return false;
    if(returned!==count&&returned!==count-1)return false;
    if(returned===count-1&&v.caseIndex!==count-1)return false;
    if(count===v.caseIndex){
      if(returned!==count)return false;
    }else if(count===v.caseIndex+1){
      if(returned!==count&&returned!==count-1)return false;
    }else return false;
  }
  if(v.started!==(v.caseIndex>=0))return false;
  if((v.phase==='next-day')!==(v.day===2))return false;
  if(v.phase==='ending'&&(v.rentPaid||v.supply!==null||!(v.balance<20)))return false;
  if(v.rentPaid&&!['night','family','next-day'].includes(v.phase))return false;
  if(v.supply&&(!v.rentPaid||!['family','next-day'].includes(v.phase)))return false;
  return true;
}
function ledgerConsistent(v:any):boolean {
  const policy=getModePolicy(v.mode), expected=new Map<string,{kind:string;amount:number;caseId?:string}>();
  let ordinary=0,serious=0;
  const count=Object.keys(v.decisions).length;
  for(let i=0;i<count;i++){
    const id=v.caseIds[i], d=v.decisions[id];
    if(d.correct!==(requiredDecision(DAY_ONE_CASES[i])===d.decision))return false;
    if(d.correct){
      if(d.penalty!==0)return false;
      expected.set(`case:${id}:wage`,{kind:'wage',amount:policy.wage,caseId:id});
    }else{
      let penalty=0;
      if(d.decision==='allow'){serious++;penalty=serious>=2?policy.severeFine:policy.fine;}
      else{ordinary++;penalty=ordinary>policy.ordinaryWarnings?policy.fine:0;}
      if(d.penalty!==penalty)return false;
      if(penalty>0)expected.set(`case:${id}:fine`,{kind:'fine',amount:-penalty,caseId:id});
    }
  }
  if(v.ordinaryErrors!==ordinary||v.seriousErrors!==serious)return false;
  const settled=v.rentPaid||v.ending==='E13';
  const amount=(kind:'salary'|'electricity'|'tokens')=>economyAmount(kind,v.mode,v.ledger.find((e:any)=>e.id===`day:1:${kind}`)?.economyVersion);
  if(settled)expected.set('day:1:salary',{kind:'salary',amount:amount('salary')});
  if(v.rentPaid)expected.set('day:1:rent',{kind:'rent',amount:-20});
  if(v.supply){
    if(v.supply.electricity)expected.set('day:1:electricity',{kind:'electricity',amount:amount('electricity')});
    if(v.supply.tokens)expected.set('day:1:tokens',{kind:'tokens',amount:amount('tokens')});
  }
  if(v.ledger.length!==expected.size)return false;
  const seen=new Set<string>();let total=policy.initial;
  for(const e of v.ledger){
    const want=expected.get(e.id);
    if(!want||seen.has(e.id)||want.kind!==e.kind||want.amount!==e.amount||want.caseId!==e.caseId)return false;
    seen.add(e.id);total+=e.amount;
  }
  if(total!==v.balance)return false;
  return true;
}
function valid(v:any,options:ValidOptions={}):v is RunState {
  if(!record(v)||v.schemaVersion!==1||typeof v.runId!=='string'||!v.runId||!integer(v.revision,0)||!['standard','relaxed'].includes(v.mode))return false;
  if(!['title','newspaper','desk','returning','night','family','next-day','ending'].includes(v.phase)||!integer(v.day,1,2)||!integer(v.caseIndex,-1,7))return false;
  if(!strings(v.caseIds)||JSON.stringify(v.caseIds)!==JSON.stringify(DAY_ONE_CASES.map(c=>c.id))||!strings(v.returned)||new Set(v.returned).size!==v.returned.length||v.returned.some((id:string)=>!v.caseIds.includes(id)))return false;
  if(!record(v.decisions)||Object.entries(v.decisions).some(([id,d])=>!v.caseIds.includes(id)||!record(d)||!['allow','reject'].includes(d.decision)||typeof d.correct!=='boolean'||!integer(d.penalty,0)||d.ruleVersion!=='V01'||!(d.mark===undefined&&options.allowLegacyMark||record(d.mark)&&integer(d.mark.x,158,172)&&integer(d.mark.y,106,119))))return false;
  if(v.returned.some((id:string)=>!v.decisions[id])||typeof v.started!=='boolean'||!integer(v.dialogueLine,0,1)||!timerConsistent(v))return false;
  if(!strings(v.pauses)||v.pauses.some((p:string)=>!pauses.includes(p))||!['book','rule'].includes(v.topPaper)||!['cover','inside'].includes(v.bookPage))return false;
  for(const [key,w,h] of [['book',220,152],['rule',136,170]] as const){
    const r=v[key];if(!record(r)||r.width!==w||r.height!==h||!integer(r.x,242,638-w)||!integer(r.y,120,320-h))return false;
  }
  if(!integer(v.balance)||!integer(v.ordinaryErrors,0,8)||!integer(v.seriousErrors,0,8)||!(v.notice===null||typeof v.notice==='string'))return false;
  if(!Array.isArray(v.ledger)||v.ledger.some((e:any)=>!record(e)||typeof e.id!=='string'||!['wage','fine','salary','rent','electricity','tokens'].includes(e.kind)||!integer(e.amount)||!(e.caseId===undefined||v.caseIds.includes(e.caseId))))return false;
  if(new Set(v.ledger.map((e:any)=>e.id)).size!==v.ledger.length||typeof v.rentPaid!=='boolean'||!(v.supply===null||supply(v.supply)))return false;
  if(v.ledger.some((e:any)=>!validEconomyEntry(e)))return false;
  if(!record(v.family)||memberIds.some(id=>{const m=v.family[id];return !record(m)||!integer(m.powerPressure,0,100)||!integer(m.tokenPressure,0,100)||!integer(m.damage,0,4)||typeof m.memoryIntact!=='boolean';}))return false;
  if(!strings(v.appliedActions)||v.appliedActions.length>512||!(v.ending===null||v.ending==='E13'))return false;
  if((v.phase==='ending')!==(v.ending==='E13'))return false;
  if(['family','next-day'].includes(v.phase)&&(!v.rentPaid||!v.supply))return false;
  return phaseConsistent(v)&&ledgerConsistent(v);
}
function legacyTimerShape(v:any):boolean {
  if(v.remainingMs===null)return v.mode==='relaxed';
  const max=v.mode==='standard'?LEGACY_STANDARD_MAX_MS:SHIFT_DURATION_MS;
  return integer(v.remainingMs,0,max);
}
function canCloseAtZero(v:any):boolean {
  if(!record(v.decisions)||!Array.isArray(v.returned)||!Array.isArray(v.caseIds)||!integer(v.caseIndex,-1,7))return false;
  const count=Object.keys(v.decisions).length,returned=v.returned.length;
  if(returned>v.caseIds.length)return false;
  for(let i=0;i<returned;i++)if(v.returned[i]!==v.caseIds[i])return false;
  if(v.phase==='returning')return v.caseIndex>=0&&count===v.caseIndex+1&&returned===v.caseIndex;
  if(v.phase==='desk')return returned===count;
  return false;
}
export function loadLegacy(store?:Store):LoadResult {
  let raw='';try {
    const found=(store??localStorage).getItem(SAVE_KEY);if(found===null)return {kind:'empty'};raw=found;
    const value:any=JSON.parse(raw);
    if(!record(value)||value.schemaVersion!==1||!['standard','relaxed'].includes(value.mode)||!legacyTimerShape(value))
      return {kind:'invalid',raw,reason:'续玩数据结构或版本不受支持。原数据已保留，未覆盖。'};
    // Schema v1 snapshots written by the old shift clock stored 360000ms for
    // standard and null for relaxed. Check that legacy shape first, then migrate
    // only in memory; the original localStorage string is never rewritten here.
    if(value.remainingMs===null)value.remainingMs=SHIFT_DURATION_MS;
    else if(value.mode==='standard'&&value.remainingMs>SHIFT_DURATION_MS)value.remainingMs=SHIFT_DURATION_MS;
    if(value.remainingMs===0&&['desk','returning'].includes(value.phase)&&canCloseAtZero(value))value.phase='night';
    // Schema v1 snapshots written before marks were recorded stay readable: restore
    // the centre mark in memory only, leaving the stored string untouched.
    if(!valid(value,{allowLegacyMark:true}))
      return {kind:'invalid',raw,reason:'续玩数据结构或版本不受支持。原数据已保留，未覆盖。'};
    for(const d of Object.values(value.decisions))if(d.mark===undefined)d.mark={...markCenter};
    // Only UI pauses are transient; mandatory papers stay pending after refresh.
    value.pauses=value.pauses.filter(p=>!['background','settings','reader','manual'].includes(p));
    if(!valid(value))
      return {kind:'invalid',raw,reason:'续玩数据结构或版本不受支持。原数据已保留，未覆盖。'};
    return {kind:'valid',state:value};
  }catch(e){return {kind:'invalid',raw,reason:`无法读取续玩记录：${String(e)}。原数据未覆盖。`};}
}
