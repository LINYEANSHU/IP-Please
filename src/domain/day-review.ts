import {getDay} from './week';
import {evaluateCase} from './rules';
import type {RunState} from './run';

export interface DayCitation {
  caseId:string;
  ruleVersion:string;
  decision:'allow'|'reject';
  penalty:number;
  message:string;
}

/**
 * End-of-day review of the current shift. Only decisions recorded for the
 * current day's own case definitions and actually delivered evidence are
 * cited. Stored fees are authoritative; nothing here mutates the run.
 */
export function dayCitations(s:RunState):DayCitation[] {
  const day = getDay(s.day);
  const definitions = new Map(day.cases.map(c => [c.id, c]));
  const citations: DayCitation[] = [];
  const seen = new Set<string>();
  for (const id of s.caseIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const decision = s.decisions[id];
    if (!decision || decision.correct !== false || decision.caught===false) continue;
    const c = definitions.get(id);
    if (!c) continue;
    const runtime = s.caseRuntime[id];
    if (!runtime) continue;
    const findings = decision.decision === 'allow'
      ? evaluateCase(day.day, c, runtime.delivered).findings.join('；')
      : decision.disposition==='ban'?'未满足封号条件，执行了缺少依据的账号封禁。':evaluateCase(day.day,c,runtime.delivered).disposition==='ban'?'本案已有主体匹配的正式封号执行依据，未按令封号。':decision.disposition==='review'?'已交材料满足本日生效条款，被错误转交复核。':'已交材料满足本日生效条款，被错误拒绝。';
    const version = decision.ruleVersion || day.version;
    const fee = Number.isFinite(decision.penalty) && decision.penalty > 0
      ? '罚款 ' + String(decision.penalty) + '。'
      : '本次警告。';
    citations.push({
      caseId: id,
      ruleVersion: version,
      decision: decision.decision,
      penalty: decision.penalty,
      message: id + ' · ' + version + '\n' + (findings || '所交材料不符合本日生效条款。')
        + '\n本案不计件。' + fee,
    });
  }
  return citations;
}
