import { describe, it, expect } from 'vitest';
import { requiredDecision } from '../../src/domain/day-one';
import type { Decision } from '../../src/domain/day-one';
import { WEEK_DAYS, getDay, getCaseById, PERMIT_ISSUERS } from '../../src/domain/week';
import { evaluateCase } from '../../src/domain/rules';
import type { WeekCase, EvidencePaper } from '../../src/domain/week-contract';

const find = (id: string): WeekCase => {
  const c = getCaseById(id);
  if (!c) throw new Error('missing case ' + id);
  return c;
};
const allIds = (c: WeekCase): string[] => [...c.initialPapers, ...c.askedPapers].map(p => p.id);
const initialIds = (c: WeekCase): string[] => c.initialPapers.map(p => p.id);
const withoutKind = (c: WeekCase, kind: EvidencePaper['kind']): string[] =>
  allIds(c).filter(id => !([...c.initialPapers, ...c.askedPapers].find(p => p.id === id)?.kind === kind));
const decide = (id: string, ids?: string[]): Decision => {
  const c = find(id);
  return evaluateCase(Number(c.id.slice(1, 3)), c, ids ?? allIds(c)).decision;
};
const findingsFor = (c: WeekCase, ids?: string[]): string =>
  evaluateCase(Number(c.id.slice(1, 3)), c, ids ?? allIds(c)).findings.join('\n');

// Independently transcribed from the 2026-10-20 first-seven-days content tables.
const EXPECTED: readonly (readonly Decision[])[] = [
  ['allow', 'allow', 'reject', 'allow', 'allow', 'reject', 'allow', 'allow'],
  ['reject', 'allow', 'reject', 'reject', 'allow', 'allow', 'reject', 'reject', 'allow', 'reject', 'allow', 'allow'],
  ['allow', 'allow', 'allow', 'reject', 'reject', 'allow', 'allow', 'allow', 'reject', 'reject', 'allow', 'reject'],
  ['allow', 'allow', 'allow', 'reject', 'allow', 'reject', 'reject', 'reject', 'allow', 'allow', 'allow', 'reject'],
  ['allow', 'allow', 'allow', 'reject', 'allow', 'reject', 'reject', 'allow', 'allow', 'reject', 'reject', 'allow'],
  ['allow', 'allow', 'reject', 'reject', 'allow', 'allow', 'reject', 'allow', 'reject', 'reject', 'allow', 'allow'],
  ['allow', 'allow', 'reject', 'allow', 'reject', 'allow', 'reject', 'reject', 'allow', 'allow', 'reject', 'allow'],
];

describe('裁决规则：只读实际交付的纸张', () => {
  it('D1 八案继续只按当前 IP', () => {
    const d1 = getDay(1).cases;
    expect(d1.map(c => evaluateCase(1, c, []).decision)).toEqual(EXPECTED[0]);
    for (const c of d1) expect(evaluateCase(1, c, []).decision).toBe(requiredDecision(c));
  });

  it('全部交付时 80 案的预期裁决独立核对', () => {
    expect(EXPECTED.flat()).toHaveLength(80);
    for (let day = 1; day <= 7; day++) {
      const d = getDay(day);
      const actual = d.cases.map(c => evaluateCase(day, c, allIds(c)).decision);
      expect(actual, 'D' + day).toEqual(EXPECTED[day - 1]);
    }
  });

  it('六类以上补件在问到前拒绝、实际交付后允许', () => {
    const withheld = [
      'D02-S05', 'D02-S06', 'D03-S06', 'D03-S07', 'D04-S05',
      'D04-S10', 'D05-S05', 'D05-S09', 'D06-S06', 'D07-S10',
    ];
    for (const id of withheld) {
      const c = find(id);
      expect(decide(id, initialIds(c)), id + ' 未问').toBe('reject');
      expect(decide(id), id + ' 已补').toBe('allow');
    }
  });

  it('日期首尾均包含，过期与未生效分开陈述', () => {
    const checks: readonly [string, Decision][] = [
      ['D02-S02', 'allow'], ['D02-S03', 'reject'], ['D02-S04', 'reject'],
      ['D03-S05', 'reject'], ['D03-S12', 'reject'],
      ['D04-S05', 'allow'],
      ['D05-S01', 'allow'], ['D05-S07', 'reject'],
      ['D06-S04', 'reject'], ['D06-S08', 'allow'], ['D06-S12', 'allow'],
      ['D07-S03', 'reject'], ['D07-S09', 'allow'],
    ];
    for (const [id, expected] of checks) expect(decide(id), id).toBe(expected);
    expect(findingsFor(find('D03-S05'))).toMatch(/已过到期日/);
    expect(findingsFor(find('D03-S12'))).toMatch(/尚未生效/);
    expect(findingsFor(find('D05-S01'))).toMatch(/第 1–5 工作日/);
    expect(findingsFor(find('D06-S08'))).toMatch(/第 6–10 工作日/);
  });

  it('许可签发机关必须在公布清单内，申请编号必须对应本案', () => {
    expect(PERMIT_ISSUERS.length).toBeGreaterThan(0);
    expect(decide('D02-S09')).toBe('allow');
    expect(PERMIT_ISSUERS).toContain(find('D02-S09').initialPapers.find(p => p.kind === 'permit')?.issuer);
    expect(decide('D02-S10')).toBe('reject');
    expect(PERMIT_ISSUERS).not.toContain(find('D02-S10').initialPapers.find(p => p.kind === 'permit')?.issuer);
    expect(findingsFor(find('D02-S10'))).toMatch(/签发机关/);
    expect(decide('D02-S06', initialIds(find('D02-S06')))).toBe('reject');
    expect(findingsFor(find('D02-S06'), initialIds(find('D02-S06')))).toMatch(/申请编号/);
  });

  it('国籍、护照封皮与手机号段不替代当前 IP 或本人绑定', () => {
    const allowed = ['D03-S02', 'D03-S03', 'D03-S11', 'D04-S01', 'D04-S02', 'D04-S09', 'D07-S04'];
    for (const id of allowed) expect(decide(id), id).toBe('allow');
    expect(find('D03-S02').nationality).toBe('CN');
    expect(find('D03-S02').ipRegion).toBe('JP');
    expect(find('D03-S03').nationality).toBe('RU');
    expect(find('D03-S03').ipRegion).toBe('FR');
    expect(find('D07-S04').nationality).toBe('RU');
    expect(find('D07-S04').ipRegion).toBe('FR');
    expect(find('D04-S01').phone.startsWith('+44')).toBe(true);
    expect(find('D04-S02').phone.startsWith('+86')).toBe(true);
    expect(find('D04-S09').phone.startsWith('+81')).toBe(true);
    for (const id of ['D03-S04', 'D04-S07', 'D04-S08', 'D05-S11', 'D07-S08', 'D07-S11']) {
      expect(decide(id), id).toBe('reject');
      expect(findingsFor(find(id))).toMatch(/当前 IP/);
    }
  });

  it('明确连接疑点才要求本人授权；共享出口可解释，身份问题不能凭标签定罪', () => {
    expect(decide('D05-S02')).toBe('allow');
    expect(decide('D05-S02', withoutKind(find('D05-S02'), 'connection'))).toBe('reject');
    expect(decide('D05-S05', initialIds(find('D05-S05')))).toBe('reject');
    expect(findingsFor(find('D05-S05'), initialIds(find('D05-S05')))).toMatch(/会话/);
    expect(decide('D05-S09', initialIds(find('D05-S09')))).toBe('reject');
    expect(decide('D05-S09')).toBe('allow');
    expect(decide('D05-S08')).toBe('allow');
    expect(find('D05-S08').initialPapers.some(p => p.kind === 'connection')).toBe(false);
    for (const id of ['D05-S04', 'D05-S10']) {
      expect(decide(id), id).toBe('reject');
      expect(findingsFor(find(id))).toMatch(/连接/);
      expect(findingsFor(find(id))).not.toMatch(/伪造|拘留|冒名/);
    }
    expect(decide('D06-S11', withoutKind(find('D06-S11'), 'connection'))).toBe('reject');
    expect(decide('D06-S11', withoutKind(find('D06-S11'), 'business'))).toBe('reject');
    expect(decide('D07-S06', withoutKind(find('D07-S06'), 'connection'))).toBe('reject');
    expect(decide('D07-S06', withoutKind(find('D07-S06'), 'business'))).toBe('reject');
  });

  it('商业用途核对使用人、委托主体、范围与日期；个人学习不要求企业授权', () => {
    const checks: readonly [string, Decision][] = [
      ['D06-S01', 'allow'], ['D06-S02', 'allow'], ['D06-S03', 'reject'],
      ['D06-S04', 'reject'], ['D06-S05', 'allow'], ['D06-S06', 'allow'],
      ['D06-S07', 'reject'], ['D06-S08', 'allow'], ['D06-S09', 'reject'],
      ['D06-S10', 'reject'], ['D06-S11', 'allow'], ['D06-S12', 'allow'],
      ['D07-S02', 'allow'], ['D07-S06', 'allow'], ['D07-S07', 'reject'], ['D07-S10', 'allow'],
    ];
    for (const [id, expected] of checks) expect(decide(id), id).toBe(expected);
    expect(find('D06-S05').purpose).toBe('personal');
    expect(find('D06-S05').initialPapers.some(p => p.kind === 'business')).toBe(false);
    expect(findingsFor(find('D06-S03'))).toMatch(/商业|授权/);
    expect(findingsFor(find('D06-S04'))).toMatch(/已过到期日/);
    expect(findingsFor(find('D06-S07'))).toMatch(/范围/);
    expect(findingsFor(find('D06-S09'))).toMatch(/使用人/);
    expect(findingsFor(find('D07-S07'))).toMatch(/商业|授权/);
    expect(findingsFor(find('D06-S01'))).toMatch(/委托主体/);
  });

  it('结论只使用中文事实，不写伪造、拘留或未来规则', () => {
    for (let day = 1; day <= 7; day++) {
      for (const c of getDay(day).cases) {
        const findings = evaluateCase(day, c, allIds(c)).findings;
        expect(findings.length).toBeGreaterThan(0);
        const text = findings.join('\n');
        expect(text).toMatch(/[\u4e00-\u9fff]/);
        expect(text).not.toMatch(/伪造|拘留|未来|复核|D8|封号/);
      }
    }
  });

  it('未交付的补件不会被规则偷偷读取', () => {
    const c = find('D02-S05');
    expect(c.askedPapers.length).toBeGreaterThan(0);
    const withheldIds = new Set(c.askedPapers.map(p => p.id));
    expect(initialIds(c).some(id => withheldIds.has(id))).toBe(false);
    expect(decide('D02-S05', initialIds(c))).toBe('reject');
  });
});
