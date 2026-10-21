import type {RunState,LedgerEntry} from '../domain/run';
import {ENDING_TEXT,resolveDeparture,resolveStaying} from '../domain/campaign';
import {getCaseById} from '../domain/week';
const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const list=(v:any)=>Array.isArray(v)&&v.every(x=>typeof x==='string')&&new Set(v).size===v.length;
const num=(v:any,min:number,max:number)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validCampaign(s:RunState):boolean {
  const c=s.campaign;if(!c)return s.day<=7||s.phase==='next-day';
  if(c.version!==1||!['flags','evidence','partners','banned','reviews','outgoing','waivedRecords'].every(k=>list((c as any)[k]))||!Array.isArray(c.mail)||!Array.isArray(c.audit)||!list(c.completedAttacks?.map(String)))return false;
  if(!c.completedAttacks.every(d=>[18,23,27].includes(d)&&d<=s.day)||!object(c.guards)||typeof c.guards.W01!=='boolean'||typeof c.guards.W02!=='boolean'||typeof c.commission!=='boolean'||c.commission&&!c.guards.W01)return false;
  if(![null,'player','office','kimi'].includes(c.oldRulesOwner)||![null,'archive','public','gateway','exclusive','internal','community'].includes(c.arrangement)||!num(c.endingLine,0,3))return false;
  if(c.evidence.some(x=>!['ip','privilege','association','oldRules','deletion'].includes(x)))return false;
  if(![c.auditDue,c.waiverDay].every(x=>x===null||num(x,1,33)))return false;
  if(new Set(c.mail.map(m=>m.id)).size!==c.mail.length||c.mail.some(m=>!object(m)||typeof m.id!=='string'||typeof m.option!=='string'||!num(m.day,8,s.day)))return false;
  if(new Set(c.audit.map(m=>m.id)).size!==c.audit.length||c.audit.some(m=>!object(m)||typeof m.id!=='string'||typeof m.reason!=='string'||m.points!==2||!num(m.day,8,s.day)))return false;
  const a=c.attack;
  if((s.phase==='defense')!==!!a)return false;
  if(a){
    if(a.day!==s.day||![18,23,27].includes(a.day)||!['warning','active','result'].includes(a.stage)||!num(a.wave,1,s.day===27?2:1)||!num(a.remainingMs,0,15000)||!num(a.charge,0,3)||!list(a.hits)||!Array.isArray(a.targets)||a.targets.length!==2||!list(a.result)||!['desk','night'].includes(a.returnPhase))return false;
    if(!['cabinet','armed','isolated'].every(k=>typeof (a as any)[k]==='boolean')||a.armed&&!a.cabinet||a.hits.some(h=>!a.targets.some(t=>t.id===h))||a.hits.length>3-a.charge)return false;
    if(a.targets.some(t=>!object(t)||!['W01','W02'].includes(t.guard)||typeof t.id!=='string'))return false;
  }
  if(s.ending&&!Object.hasOwn(ENDING_TEXT,s.ending))return false;
  if(s.ending&&['E05','E06','E07','E08','E09','E10','E12'].includes(s.ending)&&(!s.rentPaid||resolveDeparture(s)!==s.ending))return false;
  if(s.ending&&['E01','E02','E11'].includes(s.ending)&&(s.day!==31||!s.supply||resolveStaying(s)!==s.ending))return false;
  if(s.ending==='E03'&&(c.auditDue===null||c.auditDue>s.day))return false;
  return true;
}
export interface CampaignPayment {day:number;entry:LedgerEntry}
export function campaignPayments(s:RunState):CampaignPayment[]|null {
  const c=s.campaign;if(!c)return [];
  const result:CampaignPayment[]=[];
  const payments:Record<string,[number,number,string]>={'liang-contract':[15,20,'accept'],'liang-samples':[23,30,'accept'],'404-preserve':[22,25,'accept'],'lin-thanks':[11,10,'receive'],'zhou-thanks':[16,15,'receive'],'cousin-thanks':[21,20,'accept']};
  for(const [id,[day,amount,option]] of Object.entries(payments))if(c.mail.some(m=>m.id===id&&m.option===option&&m.day===day))result.push({day,entry:{id:`story:${id}`,kind:'transfer',amount}});
  for(const [id,target,day,amount] of [['elliot-offer','D09-S02',9,25],['nora-offer','D13-S03',13,35]] as const){
    const decided=s.decisions[target],r=s.caseRuntime[target],closed=s.day>day||!['desk','returning','defense'].includes(s.phase);
    if(c.mail.some(m=>m.id===id&&m.option==='accept'&&m.day===day)&&decided?.decision==='allow'&&(r?.bookReturned||closed))result.push({day,entry:{id:`story:${id}`,kind:'transfer',amount}});
  }
  const accounts=new Set<string>();
  for(const e of s.ledger.filter(e=>e.kind==='commission')){
    const def=e.caseId?getCaseById(e.caseId):undefined,day=Number(e.caseId?.slice(1,3)),d=e.caseId?s.decisions[e.caseId]:undefined;
    const agreement=c.mail.filter(m=>['commission','commission-renew'].includes(m.id)&&m.day<=day).at(-1);
    if(!def||!d||d.disposition!=='ban'||agreement?.option!=='accept'||accounts.has(def.account)||e.amount!==10||e.id!==`commission:${def.id}`)return null;
    accounts.add(def.account);result.push({day,entry:{id:e.id,kind:'commission',amount:10,caseId:e.caseId}});
  }
  return result;
}
