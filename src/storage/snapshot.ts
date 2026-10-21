import {newRun,advanceDay,prepareDay} from '../domain/run';
import {campaign} from '../domain/campaign';
import type {RunState} from '../domain/run';
import {getDay} from '../domain/week';
import {loadLegacy} from './legacy';
import {validRun} from './validate';
export const SAVE_KEY='ip-please:run:v1';
type Store=Pick<Storage,'getItem'|'setItem'>;
export type LoadResult={kind:'empty'}|{kind:'valid';state:RunState}|{kind:'invalid';raw:string;reason:string};
export type SaveResult={ok:true}|{ok:false;reason:string};
function migrate(old:any):RunState {
  const s=Object.assign(newRun(old.mode,old.runId),structuredClone(old),{schemaVersion:2}) as RunState;
  const oldNext=old.phase==='next-day';if(oldNext){s.day=1;s.phase='family';}
  s.startBalance=old.mode==='standard'?20:50;s.caseRuntime={};s.papers={};s.history=[];
  s.paperOrder=s.topPaper==='rule'?['book','rule']:['rule','book'];
  s.story={oldRulesReceived:false,guardAlive:true,incidentLine:0};s.briefingStep=0;
  for(let i=0;i<=old.caseIndex;i++){
    const c=getDay(1).cases[i];s.caseRuntime[c.id]={delivered:c.initialPapers.map(p=>p.id),asked:false,bookReturned:old.returned.includes(c.id),returnedPapers:[]};
  }
  if(oldNext)advanceDay(s);
  return s;
}
function dropLegacyPaperStack(value:any):void {
  const papers=value?.papers;
  if(!papers||typeof papers!=='object'||Array.isArray(papers))return;
  for(const placement of Object.values(papers)){
    if(placement&&typeof placement==='object'&&!Array.isArray(placement)&&Object.prototype.hasOwnProperty.call(placement,'stacked')&&typeof (placement as any).stacked==='boolean')delete (placement as any).stacked;
  }
}
export function loadRun(store?:Store):LoadResult {
  let raw='';try{
    const source=store??localStorage,found=source.getItem(SAVE_KEY);if(found===null)return {kind:'empty'};raw=found;
    let value:any=JSON.parse(raw);
    if(value?.schemaVersion===1){const old=loadLegacy(source);if(old.kind!=='valid')return old;value=migrate(old.state);}
    if(value?.schemaVersion===2)dropLegacyPaperStack(value);
    if(!validRun(value))return {kind:'invalid',raw,reason:'续玩数据结构或版本不受支持。原数据已保留，未覆盖。'};
    if(value.phase==='next-day'&&value.day===8){campaign(value);prepareDay(value);}
    if(value.shiftDurationMs===undefined){
      if(['newspaper','desk','returning'].includes(value.phase)&&value.remainingMs>0)value.remainingMs=Math.min(90000,value.remainingMs+30000);
      value.shiftDurationMs=90000;
    }
    if(['desk','returning'].includes(value.phase)){value.notice=null;value.pauses=value.pauses.filter(p=>p!=='citation');}
    value.pauses=value.pauses.filter(p=>!['background','settings','reader','manual'].includes(p));
    return {kind:'valid',state:value};
  }catch(e){return {kind:'invalid',raw,reason:`无法读取续玩记录：${String(e)}。原数据未覆盖。`};}
}
export function saveRun(state:RunState,store?:Store):SaveResult {
  try{if(!validRun(state))return {ok:false,reason:'新状态校验失败，尚未保存。'};(store??localStorage).setItem(SAVE_KEY,JSON.stringify(state));return {ok:true};}
  catch(e){return {ok:false,reason:`无法保存：${String(e)}。请检查此站点的存储权限或磁盘空间，再重试。`};}
}
