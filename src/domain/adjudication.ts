import {evaluateCase} from './rules';
import type {RunState} from './run';
import type {WeekCase} from './week-contract';
import type {Decision} from './day-one';
export function assessDecision(s:Pick<RunState,'day'|'runId'>,c:WeekCase,delivered:readonly string[],decision:Decision,disposition?:'ban'|'review'|'unban',appeal=false){
  const e=evaluateCase(s.day,c,delivered);
  const correct=appeal?(disposition==='review'||disposition==='unban'&&s.day>=28&&e.decision==='allow'||!disposition&&decision==='reject'&&!(s.day>=28&&e.decision==='allow')):disposition==='unban'?false:disposition==='ban'?e.disposition==='ban':disposition==='review'?e.decision==='reject'&&e.disposition!=='ban':e.disposition==='ban'?false:e.decision===decision;
  let hash=2166136261;for(const ch of s.runId+':'+c.id)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
  const caught=correct||!(e.minor&&decision==='allow'&&!disposition)||hash%2===0;
  const serious=!correct&&caught&&(decision==='allow'&&!e.minor||disposition==='ban'||e.disposition==='ban');
  return {correct,caught,serious,evaluation:e};
}
