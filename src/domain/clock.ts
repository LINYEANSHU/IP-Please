import type {RunState} from './run';

export function isShiftClockRunning(s:RunState):boolean {
  const caseId=s.caseIds[s.caseIndex];
  return (s.phase==='desk'||s.phase==='returning')&&s.pauses.length===0&&!!caseId&&!s.returned.includes(caseId);
}

export const MAX_TICK_MS=1000;
export function clampElapsed(ms:number):number {
  if(!Number.isFinite(ms))return 0;
  return Math.min(MAX_TICK_MS,Math.max(0,Math.round(ms)));
}
