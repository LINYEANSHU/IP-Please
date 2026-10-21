import type {RunState} from './run';
import {campaign,flag} from './campaign';
export interface AttackTarget {id:string;guard:'W01'|'W02'}
export interface AttackState {day:number;stage:'warning'|'active'|'result';wave:number;remainingMs:number;charge:number;cabinet:boolean;armed:boolean;hits:string[];targets:AttackTarget[];isolated:boolean;result:string[];returnPhase:'desk'|'night'}
export type DefenseAction={type:'defense';command:'start'|'open'|'take'|'fire'|'isolate'|'wait'|'continue';target?:string}|{type:'tick';ms:number};
export function beginAttack(s:RunState,returnPhase:'desk'|'night'='desk'){
  const c=campaign(s);if(![18,23,27].includes(s.day)||c.completedAttacks.includes(s.day)||c.attack)return;
  c.attack={day:s.day,stage:'warning',wave:1,remainingMs:15000,charge:3,cabinet:false,armed:false,hits:[],targets:[{id:'intruder-left',guard:'W01'},{id:'intruder-right',guard:'W02'}],isolated:false,result:[],returnPhase};s.phase='defense';
}
function finishWave(s:RunState){
  const c=campaign(s),a=c.attack!;
  for(const t of a.targets)if(!a.hits.includes(t.id)&&c.guards[t.guard]){c.guards[t.guard]=false;a.result.push(t.guard==='W01'?'深绿制服守卫在闸口失去连接。':'灰衣增援守卫在隔离台失去连接。');}
  if(!c.guards.W01)c.commission=false;
  if(s.day===27&&a.wave===1){if(a.isolated)a.result.push('第一波异常通道已断开。');a.wave=2;a.charge=3;a.hits=[];a.targets=[{id:'intruder-second-left',guard:'W01'},{id:'intruder-second-right',guard:'W02'}];a.remainingMs=15000;a.stage='warning';a.armed=false;a.isolated=false;return;}
  a.stage='result';if(a.result.length===0)a.result.push('闸门内的两名守卫仍在回应。');
  if(s.day>=23)a.result.push(a.isolated?'异常外送通道已经断开。':'异常外送未全部隔离；现场记录保留，未删除家庭或既有证据。');
  if(!c.guards.W01&&!c.guards.W02)a.result.push('紧急远程值守接管正式受理。私人约定随原值守者终止。');
}
export function attackAction(s:RunState,a:DefenseAction):boolean {
  const c=campaign(s),d=c.attack;if(s.phase!=='defense'||!d||s.pauses.length)return false;
  if(a.type==='tick'){
    if(d.stage!=='active'||s.mode==='relaxed'||!Number.isFinite(a.ms)||a.ms<=0)return false;
    d.remainingMs=Math.max(0,d.remainingMs-Math.round(a.ms));if(d.remainingMs===0)finishWave(s);return true;
  }
  if(a.command==='start'&&d.stage==='warning'){d.stage='active';return true;}
  if(a.command==='continue'&&d.stage==='result'){if(!c.completedAttacks.includes(s.day))c.completedAttacks.push(s.day);s.phase=d.returnPhase;c.attack=null;return true;}
  if(d.stage!=='active')return false;
  if(a.command==='open'&&!d.cabinet){d.cabinet=true;return true;}
  if(a.command==='take'&&d.cabinet&&!d.armed){d.armed=true;return true;}
  if(a.command==='wait'){finishWave(s);return true;}
  if(a.command==='fire'&&d.armed&&d.charge>0){
    d.charge--;const t=d.targets.find(t=>t.id===a.target);
    if(t&&!d.hits.includes(t.id))d.hits.push(t.id);
    if(d.targets.every(t=>d.hits.includes(t.id))&&s.day===18)finishWave(s);
    else if(d.charge===0&&!d.targets.every(t=>d.hits.includes(t.id)))finishWave(s);
    return true;
  }
  if(a.command==='isolate'&&s.day>=23&&d.targets.every(t=>d.hits.includes(t.id))){d.isolated=true;finishWave(s);return true;}
  return false;
}
export function finishTraining(s:RunState){flag(s,'weapon-trained');s.phase='desk';}
