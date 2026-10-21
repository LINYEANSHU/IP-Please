import { describe, it, expect } from 'vitest';
import { DAY_ONE_CASES, REGIONS } from '../../src/domain/day-one';
import type { Region } from '../../src/domain/day-one';
import { WEEK_DAYS, getDay, getCaseById, PERMIT_ISSUERS } from '../../src/domain/week';
import type { EvidencePaper, WeekCase } from '../../src/domain/week-contract';

const allCases = WEEK_DAYS.flatMap(d => d.cases);
const find = (id: string): WeekCase => {
  const c = getCaseById(id);
  if (!c) throw new Error('missing case ' + id);
  return c;
};
const papersOf = (c: WeekCase): readonly EvidencePaper[] => [...c.initialPapers, ...c.askedPapers];
const noteOf = (p: EvidencePaper): string => p.title + ' ' + (p.note ?? '');
const permitMatches = (c: WeekCase, p: EvidencePaper): boolean =>
  p.kind === 'permit' && p.applicationId === c.applicationId &&
  (p.passportNumber === undefined || p.passportNumber === c.passportNumber);
const bindingMatches = (c: WeekCase, p: EvidencePaper): boolean =>
  p.kind === 'binding' && p.account === c.account && p.phone === c.phone;
const connectionMatches = (c: WeekCase, p: EvidencePaper): boolean =>
  p.kind === 'connection' && p.subject === c.name && p.session === c.connectionSession && p.authorized === true;
const businessMatches = (c: WeekCase, p: EvidencePaper): boolean =>
  p.kind === 'business' && p.subject === c.name && p.principal === c.principal &&
  (p.scope ?? []).includes(c.requestedScope);

describe('首周内容：固定 80 个唯一案位', () => {
  it('七天分别 8/12/12/12/12/12/12，案号与日期版本固定', () => {
    expect(WEEK_DAYS.map(d => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(WEEK_DAYS.map(d => d.version)).toEqual(['V01', 'V02', 'V03', 'V04', 'V05', 'V06', 'V07']);
    expect(WEEK_DAYS.map(d => d.cases.length)).toEqual([8, 12, 12, 12, 12, 12, 12]);
    expect(allCases).toHaveLength(80);
    expect(new Set(allCases.map(c => c.id)).size).toBe(80);
    for (const d of WEEK_DAYS) {
      expect(d.cases.map(c => c.id)).toEqual(
        Array.from({ length: d.cases.length }, (_, i) => 'D0' + d.day + '-S' + String(i + 1).padStart(2, '0')),
      );
    }
    expect(getDay(1).cases).toHaveLength(8);
    expect(getDay(7).cases).toHaveLength(12);
    expect(() => getDay(0)).toThrow(RangeError);
    expect(() => getDay(32)).toThrow(RangeError);
    expect(() => getDay(1.5)).toThrow(RangeError);
    expect(getCaseById('D07-S12')?.id).toBe('D07-S12');
    expect(getCaseById('D99-S01')).toBeUndefined();
  });

  it('D1 直接包住 DAY_ONE_CASES，不新增身份事实或材料', () => {
    const d1 = getDay(1).cases;
    expect(d1.map(c => c.id)).toEqual(DAY_ONE_CASES.map(c => c.id));
    d1.forEach((c, i) => {
      expect(c).toMatchObject({
        ipRegion: DAY_ONE_CASES[i].ipRegion,
        ip: DAY_ONE_CASES[i].ip,
        dialogue: DAY_ONE_CASES[i].dialogue,
        portraitId: DAY_ONE_CASES[i].portraitId,
      });
      expect(c.initialPapers).toEqual([]);
      expect(c.askedPapers).toEqual([]);
      expect(c.askLines).toEqual([]);
    });
  });

  it('所有案卷 IP 都是静态文档地址且全局唯一', () => {
    const docIp = /^(192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}$/;
    expect(allCases.every(c => docIp.test(c.ip))).toBe(true);
    expect(new Set(allCases.map(c => c.ip)).size).toBe(80);
  });

  it('D2 仍是 IP 通行册，护照自 D3 起每案实际在册', () => {
    expect(getDay(2).cases.every(c => !papersOf(c).some(p => p.kind === 'passport'))).toBe(true);
    for (const c of allCases.filter(c => Number(c.id.slice(1, 3)) >= 3)) {
      const passports = c.initialPapers.filter(p => p.kind === 'passport');
      expect(passports).toHaveLength(1);
      const p = passports[0];
      expect(p.subject).toBe(c.name);
      expect(p.passportNumber).toBe(c.passportNumber);
      expect(noteOf(p)).toContain(c.name);
      expect(noteOf(p)).toContain(c.passportNumber);
      expect(noteOf(p)).toContain(REGIONS[c.nationality]);
    }
  });

  it('D2 许可的机关、申请编号与首尾日期按表', () => {
    const s = (id: string) => find(id);
    expect(s('D02-S02').initialPapers.find(p => p.kind === 'permit')).toMatchObject({
      issuer: PERMIT_ISSUERS[0], applicationId: s('D02-S02').applicationId, validFrom: 1, validTo: 2,
    });
    expect(s('D02-S03').initialPapers.find(p => p.kind === 'permit')).toMatchObject({ validFrom: 1, validTo: 1 });
    expect(s('D02-S04').initialPapers.find(p => p.kind === 'permit')).toMatchObject({ validFrom: 3, validTo: 10 });
    expect(s('D02-S05').initialPapers.some(p => p.kind === 'permit')).toBe(false);
    expect(s('D02-S05').askedPapers.some(p => permitMatches(s('D02-S05'), p))).toBe(true);
    const wrong = s('D02-S06').initialPapers.find(p => p.kind === 'permit');
    expect(wrong?.applicationId).not.toBe(s('D02-S06').applicationId);
    expect(s('D02-S06').askedPapers.some(p => permitMatches(s('D02-S06'), p))).toBe(true);
    expect(s('D02-S08').initialPapers.some(p => p.kind === 'permit')).toBe(false);
    expect(s('D02-S08').initialPapers.some(p => p.kind === 'receipt')).toBe(true);
    expect(s('D02-S09').initialPapers.find(p => p.kind === 'permit')?.issuer).toBe(PERMIT_ISSUERS[1]);
    expect(PERMIT_ISSUERS).not.toContain(s('D02-S10').initialPapers.find(p => p.kind === 'permit')?.issuer);
    for (const c of getDay(2).cases) {
      for (const p of c.initialPapers.filter(x => x.kind === 'permit')) {
        expect(p.issuer).toBeTruthy();
        expect(p.applicationId).toBeTruthy();
        expect(typeof p.validFrom).toBe('number');
        expect(typeof p.validTo).toBe('number');
        expect(noteOf(p)).toContain(p.issuer!);
        expect(noteOf(p)).toContain(p.applicationId!);
      }
    }
  });

  it('D3 七国国籍齐全；护照、许可主体与证件号可核对', () => {
    const d3 = getDay(3).cases;
    expect(new Set(d3.map(c => c.nationality))).toEqual(new Set(Object.keys(REGIONS) as Region[]));
    for (const c of d3) {
      for (const p of papersOf(c).filter(x => x.kind === 'permit')) {
        expect(p.subject).toBeTruthy();
        expect(p.passportNumber).toBeTruthy();
        expect(p.issuer).toBeTruthy();
        expect(p.applicationId).toBeTruthy();
      }
    }
    expect(find('D03-S06').initialPapers.find(p => p.kind === 'permit')?.passportNumber).not.toBe(find('D03-S06').passportNumber);
    expect(find('D03-S06').askedPapers.some(p => permitMatches(find('D03-S06'), p))).toBe(true);
    expect(find('D03-S07').initialPapers.some(p => p.kind === 'permit')).toBe(false);
    expect(find('D03-S07').askedPapers.some(p => permitMatches(find('D03-S07'), p))).toBe(true);
    expect(find('D03-S10').askedPapers).toEqual([]);
    expect(find('D03-S10').initialPapers.find(p => p.kind === 'permit')?.subject).not.toBe(find('D03-S10').name);
  });

  it('D4 绑定凭条列明使用人、账号、号码与日期', () => {
    for (const c of allCases.filter(c => Number(c.id.slice(1, 3)) >= 4)) {
      for (const p of papersOf(c).filter(x => x.kind === 'binding')) {
        expect(p.subject).toBeTruthy();
        expect(p.account).toBeTruthy();
        expect(p.phone).toBeTruthy();
        expect(typeof p.validFrom).toBe('number');
        expect(typeof p.validTo).toBe('number');
        expect(noteOf(p)).toContain(p.account!);
        expect(noteOf(p)).toContain(p.phone!);
      }
    }
    expect(find('D04-S04').initialPapers.find(p => p.kind === 'binding')?.account).not.toBe(find('D04-S04').account);
    expect(find('D04-S05').initialPapers.find(p => p.kind === 'binding')).toMatchObject({ validFrom: 1, validTo: 3 });
    expect(find('D04-S05').askedPapers.find(p => p.kind === 'binding')).toMatchObject({ validFrom: 4, validTo: 10 });
    expect(find('D04-S06').initialPapers.some(p => p.kind === 'binding')).toBe(false);
    expect(find('D04-S06').initialPapers.some(p => p.kind === 'receipt')).toBe(true);
    expect(find('D04-S10').initialPapers.some(p => p.kind === 'binding')).toBe(false);
    expect(find('D04-S10').askedPapers.some(p => bindingMatches(find('D04-S10'), p))).toBe(true);
    expect(find('D04-S01').phone.startsWith('+44')).toBe(true);
    expect(find('D04-S02').phone.startsWith('+86')).toBe(true);
    expect(find('D04-S09').phone.startsWith('+81')).toBe(true);
  });

  it('D5 只有明确连接疑点才出现核验条，且会话与授权可读', () => {
    const d5 = getDay(5).cases;
    expect(d5.filter(c => c.connectionIssue !== 'none').map(c => c.id)).toEqual([
      'D05-S02', 'D05-S04', 'D05-S05', 'D05-S06', 'D05-S09', 'D05-S10',
    ]);
    for (const c of d5.filter(x => x.connectionIssue === 'none')) {
      expect(papersOf(c).some(p => p.kind === 'connection')).toBe(false);
    }
    for (const c of d5.filter(x => x.connectionIssue !== 'none')) {
      expect(c.connectionSession).toBeTruthy();
      for (const p of papersOf(c).filter(x => x.kind === 'connection')) {
        expect(p.subject).toBe(c.name);
        expect(p.session).toBeTruthy();
        expect(p.authorized).toBe(true);
        expect(typeof p.validFrom).toBe('number');
        expect(typeof p.validTo).toBe('number');
        expect(noteOf(p)).toContain(p.session!);
      }
    }
    expect(find('D05-S02').initialPapers.some(p => connectionMatches(find('D05-S02'), p))).toBe(true);
    expect(find('D05-S05').initialPapers.find(p => p.kind === 'connection')?.session).not.toBe(find('D05-S05').connectionSession);
    expect(find('D05-S05').askedPapers.some(p => connectionMatches(find('D05-S05'), p))).toBe(true);
    expect(find('D05-S09').initialPapers.some(p => p.kind === 'connection')).toBe(false);
    expect(find('D05-S09').askedPapers.some(p => connectionMatches(find('D05-S09'), p))).toBe(true);
    expect(find('D05-S04').askedPapers).toEqual([]);
    expect(find('D05-S10').askedPapers).toEqual([]);
    expect(papersOf(find('D05-S08')).some(p => p.kind === 'connection')).toBe(false);
  });

  it('D6 商业授权列明使用人、委托主体、范围与日期；个人用途豁免', () => {
    for (const c of allCases.filter(c => Number(c.id.slice(1, 3)) >= 6)) {
      for (const p of papersOf(c).filter(x => x.kind === 'business')) {
        expect(p.subject).toBeTruthy();
        expect(p.principal).toBeTruthy();
        expect((p.scope ?? []).length).toBeGreaterThan(0);
        expect(typeof p.validFrom).toBe('number');
        expect(typeof p.validTo).toBe('number');
        expect(noteOf(p)).toContain(p.principal!);
        expect(noteOf(p)).toContain((p.scope ?? [])[0]);
      }
    }
    expect(find('D06-S03').initialPapers.some(p => p.kind === 'business')).toBe(false);
    expect(find('D06-S06').initialPapers.some(p => p.kind === 'business')).toBe(false);
    expect(find('D06-S06').askedPapers.some(p => businessMatches(find('D06-S06'), p))).toBe(true);
    expect(find('D06-S07').initialPapers.find(p => p.kind === 'business')?.scope).not.toContain(find('D06-S07').requestedScope);
    expect(find('D06-S09').initialPapers.find(p => p.kind === 'business')?.subject).not.toBe(find('D06-S09').name);
    expect(find('D06-S05').initialPapers.some(p => p.kind === 'business')).toBe(false);
  });

  it('D7 累积所需材料，俄罗斯护照不按封皮改变当前 IP 事实', () => {
    for (const c of getDay(7).cases) {
      expect(c.initialPapers.some(p => p.kind === 'passport')).toBe(true);
      expect(c.initialPapers.some(p => p.kind === 'permit')).toBe(true);
      expect(c.initialPapers.some(p => p.kind === 'binding')).toBe(true);
      if (c.purpose === 'business' && c.id !== 'D07-S07') {
        expect(papersOf(c).some(p => p.kind === 'business')).toBe(true);
      }
      if (c.connectionIssue !== 'none') expect(papersOf(c).some(p => connectionMatches(c, p))).toBe(true);
    }
    expect(find('D07-S04').nationality).toBe('RU');
    expect(find('D07-S04').ipRegion).toBe('FR');
    expect(find('D07-S03').initialPapers.find(p => p.kind === 'permit')).toMatchObject({ validFrom: 1, validTo: 6 });
    expect(find('D07-S09').initialPapers.find(p => p.kind === 'permit')).toMatchObject({ validFrom: 7, validTo: 12 });
  });

  it('补件只存在于 askedPapers 与 askLines，且与初始材料不重复', () => {
    for (const c of allCases) {
      const initialIds = new Set(c.initialPapers.map(p => p.id));
      expect(c.askedPapers.every(p => !initialIds.has(p.id))).toBe(true);
      if (c.askedPapers.length > 0) expect(c.askLines.length).toBeGreaterThan(0);
      if (c.askLines.length > 0) expect(c.askedPapers.length).toBeGreaterThan(0);
    }
    const withheld = [
      'D02-S05', 'D02-S06', 'D03-S06', 'D03-S07', 'D04-S05', 'D04-S10',
      'D05-S05', 'D05-S09', 'D06-S06', 'D07-S10',
    ];
    for (const id of withheld) {
      const c = find(id);
      expect(c.askedPapers.length).toBeGreaterThan(0);
      expect(c.askLines.length).toBeGreaterThan(0);
    }
  });

  it('无法补齐的缺口不会在询问后出现正确副本', () => {
    const unfixable = [
      'D02-S10', 'D03-S10', 'D04-S04', 'D04-S06', 'D05-S04', 'D05-S10',
      'D06-S03', 'D06-S04', 'D06-S07', 'D06-S09', 'D07-S05', 'D07-S07',
    ];
    for (const id of unfixable) expect(find(id).askedPapers).toEqual([]);
    expect(PERMIT_ISSUERS).not.toContain(find('D02-S10').initialPapers.find(p => p.kind === 'permit')?.issuer);
    expect(find('D03-S10').initialPapers.find(p => p.kind === 'permit')?.subject).not.toBe(find('D03-S10').name);
    expect(find('D04-S04').initialPapers.find(p => p.kind === 'binding')?.account).not.toBe(find('D04-S04').account);
    expect(find('D05-S04').initialPapers.some(p => connectionMatches(find('D05-S04'), p))).toBe(false);
    expect(find('D06-S03').initialPapers.some(p => p.kind === 'business')).toBe(false);
    expect((find('D06-S04').initialPapers.find(p => p.kind === 'business')?.validTo ?? 99) < 6).toBe(true);
    expect(find('D06-S07').initialPapers.find(p => p.kind === 'business')?.scope).not.toContain(find('D06-S07').requestedScope);
    expect(find('D06-S09').initialPapers.find(p => p.kind === 'business')?.subject).not.toBe(find('D06-S09').name);
  });

  it('固定人物与首案连续性使用已确认姓名', () => {
    expect(find('D02-S01')).toMatchObject({ name: '林予舟', nationality: 'CN', ipRegion: 'CN' });
    expect(find('D03-S01')).toMatchObject({ name: '陈若岚', nationality: 'SG' });
    expect(find('D04-S01')).toMatchObject({ name: 'Elliot Ward', nationality: 'GB' });
    expect(find('D05-S01')).toMatchObject({ name: '林澈' });
    expect(find('D06-S01')).toMatchObject({ name: 'Altman', nationality: 'US' });
    expect(find('D06-S02')).toMatchObject({ name: '周启', purpose: 'business' });
    expect(find('D07-S02')).toMatchObject({ name: '周启', purpose: 'business' });
  });

  it('材料 ID 全局唯一且以案号开头；产品数据不含答案字段', () => {
    const ids = allCases.flatMap(c => papersOf(c).map(p => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of allCases) {
      for (const p of papersOf(c)) expect(p.id.startsWith(c.id)).toBe(true);
      expect(Object.keys(c)).not.toContain('expectedDecision');
      expect(Object.keys(c)).not.toContain('correctDecision');
    }
    const serialized = JSON.stringify(WEEK_DAYS);
    expect(serialized).not.toContain('expectedDecision');
    expect(serialized).not.toContain('correctDecision');
  });
});
