import { REGIONS } from './day-one';
import type { Decision, Region } from './day-one';
import type { Evaluation, EvidencePaper, WeekCase } from './week-contract';
import { PERMIT_ISSUERS } from './week';
import {campaignEvaluation} from './campaign-rules';

const ALLOWED_IP: ReadonlySet<Region> = new Set<Region>(['US', 'GB', 'FR', 'SG', 'JP']);

function inDates(p: EvidencePaper, day: number): boolean {
  return typeof p.validFrom === 'number'
    && typeof p.validTo === 'number'
    && p.validFrom <= day
    && day <= p.validTo;
}

function dateText(p: EvidencePaper): string {
  return '第 ' + String(p.validFrom) + '–' + String(p.validTo) + ' 工作日';
}

function issueLabel(issue: WeekCase['connectionIssue']): string {
  if (issue === 'shared') return '共享出口';
  if (issue === 'session') return '会话';
  return '连接主体';
}

function permitFailure(p: EvidencePaper, c: WeekCase, day: number): string {
  if (!p.issuer || !PERMIT_ISSUERS.includes(p.issuer)) {
    return '所交许可的签发机关不在当日公布清单内，不能视为有效许可。';
  }
  if (p.applicationId !== c.applicationId) {
    return '许可申请编号与本案通行册不一致。';
  }
  if (day >= 3 && p.subject !== c.name) {
    return '许可列明的姓名与本案申请人不一致。';
  }
  if (day >= 3 && p.passportNumber !== c.passportNumber) {
    return '许可列明的证件号与本案护照不一致。';
  }
  if (typeof p.validFrom !== 'number' || typeof p.validTo !== 'number') {
    return '许可未列明可核对的有效期。';
  }
  if (day < p.validFrom) return '许可' + dateText(p) + '，尚未生效。';
  if (day > p.validTo) return '许可' + dateText(p) + '，已过到期日。';
  return '';
}

function bindingFailure(p: EvidencePaper, c: WeekCase, day: number): string {
  if (p.subject !== c.name) return '绑定凭条列明的使用人与本案申请人不一致。';
  if (p.account !== c.account) return '绑定凭条列明的账号与本案账号不一致。';
  if (p.phone !== c.phone) return '绑定凭条列明的手机号与本案不一致。';
  if (typeof p.validFrom !== 'number' || typeof p.validTo !== 'number') {
    return '绑定凭条未列明可核对的有效期。';
  }
  if (day < p.validFrom) return '绑定凭条' + dateText(p) + '，尚未生效。';
  if (day > p.validTo) return '绑定凭条' + dateText(p) + '，已过到期日。';
  return '';
}

function connectionFailure(p: EvidencePaper, c: WeekCase, day: number): string {
  if (p.subject !== c.name) return '连接核验条的使用人与本案申请人不一致。';
  if (p.session !== c.connectionSession) return '连接核验条的会话与本案当前会话不一致。';
  if (p.authorized !== true) return '连接核验条未列明本人授权。';
  if (typeof p.validFrom !== 'number' || typeof p.validTo !== 'number') {
    return '连接核验条未列明可核对的有效期。';
  }
  if (day < p.validFrom) return '连接核验条' + dateText(p) + '，尚未生效。';
  if (day > p.validTo) return '连接核验条' + dateText(p) + '，已过到期日。';
  return '';
}

function businessFailure(p: EvidencePaper, c: WeekCase, day: number): string {
  if (p.subject !== c.name) return '企业授权列明的使用人不是本案申请人。';
  if (p.principal !== c.principal) return '企业授权列明的委托主体与本案申请主体不一致。';
  if (!(p.scope ?? []).includes(c.requestedScope)) {
    return '企业授权范围未覆盖本案申请的“' + c.requestedScope + '”用途。';
  }
  if (typeof p.validFrom !== 'number' || typeof p.validTo !== 'number') {
    return '企业授权未列明可核对的有效期。';
  }
  if (day < p.validFrom) return '企业授权' + dateText(p) + '，尚未生效。';
  if (day > p.validTo) return '企业授权' + dateText(p) + '，已过到期日。';
  return '';
}

export function evaluateCase(day: number, c: WeekCase, deliveredIds: readonly string[]): Evaluation {
  const findings: string[] = [];
  let ok = true;
  const fail = (text: string): void => { ok = false; findings.push(text); };
  const pass = (text: string): void => { findings.push(text); };

  if (!ALLOWED_IP.has(c.ipRegion)) {
    return {
      decision: 'reject',
      findings: ['当前 IP ' + c.ip + ' 位于' + REGIONS[c.ipRegion] + '，按现行地区规则不支持访问；无需再核对其他材料。'],
    };
  }
  pass('当前 IP ' + c.ip + ' 位于' + REGIONS[c.ipRegion] + '，属于当日允许地区。');

  // Only definitions that actually exist for this case can be read. A paper
  // that was withheld and never actually delivered is not inspected.
  const definitions = new Map<string, EvidencePaper>();
  for (const p of [...c.initialPapers, ...c.askedPapers]) {
    if (!definitions.has(p.id)) definitions.set(p.id, p);
  }
  const papers: EvidencePaper[] = [];
  for (const id of new Set(deliveredIds)) {
    const p = definitions.get(id);
    if (p) papers.push(p);
  }
  const ofKind = (kind: EvidencePaper['kind']): EvidencePaper[] => papers.filter(p => p.kind === kind);

  let passportOk = true;
  if (day >= 3) {
    const passports = ofKind('passport');
    const passport = passports.find(p => p.subject === c.name && p.passportNumber === c.passportNumber);
    if (passport) {
      pass('护照姓名 ' + c.name + '、证件号 ' + c.passportNumber + ' 与本案一致。');
    } else {
      passportOk = false;
      if (passports.length === 0) fail('未提交本案护照，无法核对姓名与证件号。');
      else if (passports.some(p => p.subject !== c.name)) fail('所交护照的姓名与本案申请人不一致。');
      else fail('所交护照的证件号与本案不一致。');
    }
  }

  let permitOk = true;
  if (day >= 2) {
    const permits = ofKind('permit');
    const permit = permits.find(p => permitFailure(p, c, day) === '');
    if (permit) {
      pass('访问许可由' + String(permit.issuer) + '签发，申请编号 ' + String(permit.applicationId)
        + '，有效期' + dateText(permit) + '，首尾均有效。');
    } else {
      permitOk = false;
      if (permits.length === 0) {
        if (papers.some(p => p.kind === 'receipt')) {
          fail('所交材料是申请收件条，尚未取得当前有效的访问许可。');
        } else {
          fail('未提交当前有效的访问许可。');
        }
      } else {
        fail(permitFailure(permits[0], c, day) || '未提交当前有效的访问许可。');
      }
    }
  }

  let bindingOk = true;
  if (day >= 4) {
    const bindings = ofKind('binding');
    const binding = bindings.find(p => bindingFailure(p, c, day) === '');
    if (binding) {
      pass('绑定凭条列明账号 ' + String(binding.account) + '、手机号 ' + String(binding.phone)
        + '，有效期' + dateText(binding) + '，属于本案本人。');
    } else {
      bindingOk = false;
      if (bindings.length === 0) {
        if (papers.some(p => p.kind === 'receipt')) {
          fail('绑定申请收件条不等同于已生效的账号绑定。');
        } else {
          fail('未提交当前有效的账号绑定凭条。');
        }
      } else {
        fail(bindingFailure(bindings[0], c, day) || '未提交当前有效的账号绑定凭条。');
      }
    }
  }

  let connectionOk = true;
  if (day >= 5 && c.connectionIssue !== 'none') {
    const connections = ofKind('connection');
    const connection = connections.find(p => connectionFailure(p, c, day) === '');
    if (connection) {
      pass('连接核验条列明本人授权，当前会话 ' + String(connection.session)
        + '，可解释本案的' + issueLabel(c.connectionIssue) + '疑点。');
    } else {
      connectionOk = false;
      if (connections.length === 0) {
        fail('本案存在' + issueLabel(c.connectionIssue) + '的明确连接疑点，但未提交可核实的本人授权连接证明。');
      } else {
        fail(connectionFailure(connections[0], c, day) || '未提交可核实的本人授权连接证明。');
      }
    }
  }

  let businessOk = true;
  if (day >= 6 && c.purpose === 'business') {
    const businesses = ofKind('business');
    const business = businesses.find(p => businessFailure(p, c, day) === '');
    if (business) {
      pass('企业授权列明使用人 ' + c.name + '、委托主体 ' + String(business.principal)
        + '，范围覆盖 ' + c.requestedScope + '，有效期' + dateText(business) + '。');
    } else {
      businessOk = false;
      if (businesses.length === 0) {
        fail('本案为商业用途，但未提交列明本次使用人、委托主体、用途范围与有效期的企业授权。');
      } else {
        fail(businessFailure(businesses[0], c, day) || '未提交覆盖本案商业用途的企业授权。');
      }
    }
  }

  const decision: Decision = ok && passportOk && permitOk && bindingOk && connectionOk && businessOk
    ? 'allow'
    : 'reject';
  return campaignEvaluation(day,c,deliveredIds,{ decision, findings });
}
