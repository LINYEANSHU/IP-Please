import {acquireSession,loadRun,commitTransition} from '../../src/storage/session';
import {newRun,reduceRun} from '../../src/domain/run';
import type {ActionBody,RunState} from '../../src/domain/run';
const lease=await acquireSession();let state:RunState;
async function read(){const loaded=loadRun();if(loaded.kind==='valid')state=loaded.state;
else if(loaded.kind==='empty'&&lease.canWrite()){
  state=newRun('standard','fixture');
  for(const a of [{type:'go-desk'},{type:'dismiss',reason:'briefing'},{type:'call'},{type:'dismiss',reason:'tutorial'}] as ActionBody[])state=reduceRun(state,{...a,actionId:crypto.randomUUID()}).state;
  await commitTransition(null,{state,effects:[]},lease);
}paint();}
function paint(){document.querySelector('#state')!.textContent=JSON.stringify({writable:lease.canWrite(),state});}
async function act(a:ActionBody){const next=reduceRun(state,{...a,actionId:crypto.randomUUID()});const saved=await commitTransition(state,next,lease);if(saved.ok)state=saved.state;paint();}
document.querySelector('#take')!.addEventListener('click',async()=>{await lease.takeOver();await read();});
document.querySelector('#stamp')!.addEventListener('click',()=>void act({type:'stamp',caseId:'D01-S01',decision:'allow'}));
document.querySelector('#return')!.addEventListener('click',()=>void act({type:'return',caseId:'D01-S01'}));
window.addEventListener('storage',()=>paint());window.addEventListener('pagehide',()=>lease.release());await read();
