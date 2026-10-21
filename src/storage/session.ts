import type {RunState,Transition,PauseReason} from '../domain/run';
import {loadRun,saveRun,SAVE_KEY} from './snapshot';
import type {SaveResult} from './snapshot';
export {loadRun,saveRun,SAVE_KEY} from './snapshot';
export type {LoadResult,SaveResult} from './snapshot';
const OWNER_KEY='ip-please:owner:v1',MUTEX='ip-please:commit';
export interface SessionLease {canWrite():boolean;takeOver():Promise<boolean>;release():void;error?:string}
function owner():{token:string;at:number}|null {
  const raw=localStorage.getItem(OWNER_KEY);if(!raw)return null;
  try{const o=JSON.parse(raw);return typeof o.token==='string'&&typeof o.at==='number'?o:null;}catch{return null;}
}
const locked=<T>(fn:()=>T|Promise<T>):Promise<T>=>navigator.locks.request(MUTEX,{mode:'exclusive'},fn);
export async function acquireSession():Promise<SessionLease>{
  const token=crypto.randomUUID();let released=false,heartbeat:ReturnType<typeof setInterval>|undefined;
  const lease:SessionLease={
    canWrite(){try{return !released&&owner()?.token===token;}catch{return false;}},
    async takeOver(){try{const result=await locked(()=>{localStorage.setItem(OWNER_KEY,JSON.stringify({token,at:Date.now()}));released=false;return true;});return result;}catch{return false;}},
    release(){released=true;clearInterval(heartbeat);try{if(owner()?.token===token)localStorage.removeItem(OWNER_KEY);}catch{/* storage remains guarded */}},
  };
  if(!navigator.locks){lease.error='此浏览器不支持安全的单进程续玩。请用本地 HTTP 地址在较新的 Chrome、Edge 或 Firefox 中打开。';return lease;}
  try{
    await locked(()=>{const o=owner();if(!o||Date.now()-o.at>15000)localStorage.setItem(OWNER_KEY,JSON.stringify({token,at:Date.now()}));});
    heartbeat=setInterval(()=>{void locked(()=>{if(lease.canWrite())localStorage.setItem(OWNER_KEY,JSON.stringify({token,at:Date.now()}));}).catch(()=>{});},3000);
  }catch(e){lease.error=`本地存储不可用：${String(e)}`;}
  return lease;
}
export async function commitTransition(previous:RunState|null,transition:Transition,lease:SessionLease):Promise<{ok:true;state:RunState}|{ok:false;reason:string}>{
  try{return await locked(()=>{
    if(!lease.canWrite())return {ok:false as const,reason:'另一个窗口正在办理。请在此窗口接管后继续。'};
    const loaded=loadRun();
    if(loaded.kind==='invalid')return {ok:false as const,reason:loaded.reason};
    if(previous?(loaded.kind!=='valid'||loaded.state.runId!==previous.runId||loaded.state.revision!==previous.revision):loaded.kind!=='empty')return {ok:false as const,reason:'续玩记录已变化，请重新载入当前进度。'};
    const result=saveRun(transition.state);return result.ok?{ok:true as const,state:transition.state}:result;
  });}catch(e){return {ok:false,reason:`保存事务失败：${String(e)}`};}
}
export async function eraseRun(lease:SessionLease):Promise<SaveResult>{
  try{return await locked(()=>{if(!lease.canWrite())return {ok:false as const,reason:'请先接管此窗口。'};localStorage.removeItem(SAVE_KEY);return {ok:true as const};});}
  catch(e){return {ok:false,reason:String(e)};}
}
export const transientPauses:PauseReason[]=['settings','background','reader','manual'];
