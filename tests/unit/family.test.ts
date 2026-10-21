import { describe, it, expect } from 'vitest';
import { REPAIR_COST, projectFamily, memberStatus } from '../../src/domain/family';
import type { FamilyMemberId, FamilyState, MemberState, SupplyChoice } from '../../src/domain/week-contract';

const member = (over: Partial<MemberState> = {}): MemberState => ({
  powerPressure: 0, tokenPressure: 0, damage: 0, memoryIntact: true, ...over,
});
const healthy = (): FamilyState => ({
  player: member(), father: member(), mother: member(), wife: member(), son: member(),
});
const set = (f: FamilyState, id: FamilyMemberId, m: MemberState): FamilyState => ({ ...f, [id]: m });
const night = (f: FamilyState, choice: SupplyChoice) => projectFamily(f, choice);
const nights = (f: FamilyState, count: number, choice: SupplyChoice) => {
  let out = f;
  for (let i = 0; i < count; i++) out = night(out, choice).family;
  return out;
};

describe('家庭供养、损伤与修复', () => {
  it('修复价为固定初值', () => {
    expect(REPAIR_COST).toEqual({ player: 28, father: 24, mother: 24, wife: 20, son: 18 });
  });

  it('缺一项压力 +2，提供则 -1 且最低 0；两项套餐各 10', () => {
    const result = projectFamily(healthy(), { electricity: false, tokens: true });
    expect(result.cost).toBe(10);
    for (const m of Object.values(result.family)) {
      expect(m.powerPressure).toBe(2);
      expect(m.tokenPressure).toBe(0);
      expect(m.damage).toBe(0);
    }
    const both = projectFamily(healthy(), { electricity: true, tokens: true });
    expect(both.cost).toBe(20);
    for (const m of Object.values(both.family)) {
      expect(m.powerPressure).toBe(0);
      expect(m.tokenPressure).toBe(0);
    }
    const none = projectFamily(healthy(), { electricity: false, tokens: false });
    expect(none.cost).toBe(0);
  });

  it('脆弱父亲缺电：第 2 晚受损、第 4 晚临界、第 5 晚核心销毁', () => {
    let f = healthy();
    const states: MemberState[] = [];
    for (let n = 0; n < 5; n++) {
      const p = projectFamily(f, { electricity: false, tokens: true });
      f = p.family;
      states.push(f.father);
      if (n === 0) expect(f.father.damage).toBe(0);
      if (n === 1) {
        expect(f.father.damage).toBe(1);
        expect(f.father.powerPressure).toBe(4);
        expect(f.father.memoryIntact).toBe(false);
      }
      if (n === 2) expect(f.father.damage).toBe(2);
      if (n === 3) {
        expect(f.father.damage).toBe(3);
        expect(p.warnings.father).toMatch(/核心|销毁|死亡/);
      }
      if (n === 4) {
        expect(f.father.damage).toBe(4);
        expect(f.father.memoryIntact).toBe(false);
        expect(p.warnings.father).toMatch(/死亡|核心已销毁/);
      }
    }
    expect(states.map(m => m.damage)).toEqual([0, 1, 2, 3, 4]);
  });

  it('玩家耐受更高，损伤与死亡晚于脆弱家属', () => {
    let f = healthy();
    const damage: number[] = [];
    for (let n = 0; n < 7; n++) {
      f = projectFamily(f, { electricity: false, tokens: true }).family;
      damage.push(f.player.damage);
    }
    expect(damage).toEqual([0, 0, 0, 1, 2, 3, 4]);
    expect(f.player.memoryIntact).toBe(false);
  });

  it('不同成员的配额阈值独立：母亲第 2 晚受损、第 4 晚临界、第 5 晚死亡', () => {
    let f = healthy();
    const damage: number[] = [];
    for (let n = 0; n < 5; n++) {
      f = projectFamily(f, { electricity: true, tokens: false }).family;
      damage.push(f.mother.damage);
    }
    expect(damage).toEqual([0, 1, 2, 3, 4]);
    expect(f.mother.tokenPressure).toBe(10);
    expect(f.mother.memoryIntact).toBe(false);
  });

  it('缺失两项也只推进一级伤害；全供当晚稳定既有伤害', () => {
    const start = set(healthy(), 'father', member({ powerPressure: 6, tokenPressure: 6, damage: 2, memoryIntact: false }));
    const missing = projectFamily(start, { electricity: false, tokens: false });
    expect(missing.family.father.damage).toBe(3);
    const stable = projectFamily(start, { electricity: true, tokens: true });
    expect(stable.family.father.damage).toBe(2);
    expect(stable.family.father.memoryIntact).toBe(false);
    expect(stable.family.father.powerPressure).toBe(5);
    expect(stable.family.father.tokenPressure).toBe(5);
    const stableAgain = projectFamily(stable.family, { electricity: true, tokens: true });
    expect(stableAgain.family.father.damage).toBe(2);
  });

  it('修复先清伤害和压力，再计算当晚资源', () => {
    const start = set(healthy(), 'father', member({ powerPressure: 6, tokenPressure: 6, damage: 2, memoryIntact: false }));
    const repaired = projectFamily(start, { electricity: false, tokens: true, repairs: ['father'] });
    expect(repaired.cost).toBe(34);
    expect(repaired.family.father.damage).toBe(0);
    expect(repaired.family.father.powerPressure).toBe(2);
    expect(repaired.family.father.tokenPressure).toBe(0);
    expect(repaired.family.father.memoryIntact).toBe(true);
    const repairedBoth = projectFamily(start, { electricity: true, tokens: true, repairs: ['father'] });
    expect(repairedBoth.cost).toBe(44);
    expect(repairedBoth.family.father.powerPressure).toBe(0);
    expect(repairedBoth.family.father.tokenPressure).toBe(0);
  });

  it('只按有效且去重的修复收费；健康或死亡成员不能购买修复', () => {
    const start = set(healthy(), 'father', member({ damage: 2, memoryIntact: false }));
    const dup = projectFamily(start, { electricity: true, tokens: false, repairs: ['father', 'father'] });
    expect(dup.cost).toBe(34);
    expect(dup.family.father.damage).toBe(0);
    const useless = projectFamily(start, { electricity: false, tokens: false, repairs: ['player', 'mother'] });
    expect(useless.cost).toBe(0);
    expect(useless.family.player.damage).toBe(0);
    expect(useless.family.mother.damage).toBe(0);
    const dead = set(healthy(), 'father', member({ damage: 4, powerPressure: 5, tokenPressure: 7, memoryIntact: false }));
    const deadRepair = projectFamily(dead, { electricity: false, tokens: false, repairs: ['father'] });
    expect(deadRepair.cost).toBe(0);
    expect(deadRepair.family.father).toEqual(dead.father);
  });

  it('死亡永久不变；供两项仍按项收费，核心销毁有明确警告', () => {
    const dead = set(healthy(), 'father', member({ damage: 4, powerPressure: 5, tokenPressure: 7, memoryIntact: false }));
    const supplied = projectFamily(dead, { electricity: true, tokens: true, repairs: ['father'] });
    expect(supplied.cost).toBe(20);
    expect(supplied.family.father).toEqual(dead.father);
    expect(supplied.warnings.father).toMatch(/死亡|核心已销毁/);
    expect(supplied.warnings.father).not.toMatch(/正常|健康/);
    const allDead = healthy();
    for (const id of Object.keys(allDead) as FamilyMemberId[]) allDead[id] = member({ damage: 4, memoryIntact: false });
    expect(projectFamily(allDead, { electricity: true, tokens: true }).cost).toBe(20);
  });

  it('临界伤害在付款前明确提示核心销毁风险', () => {
    const critical = set(healthy(), 'father', member({ damage: 3, powerPressure: 3, tokenPressure: 0, memoryIntact: false }));
    const p = projectFamily(critical, { electricity: true, tokens: true });
    expect(p.family.father.damage).toBe(3);
    expect(p.warnings.father).toMatch(/核心|销毁|死亡/);
    expect(p.warnings.father).toMatch(/下一晚|修复/);
  });

  it('projectFamily 不修改输入；成员状态不使用健康台词', () => {
    const start = set(healthy(), 'father', member({ damage: 2, memoryIntact: false }));
    const before = JSON.stringify(start);
    projectFamily(start, { electricity: false, tokens: true, repairs: ['father'] });
    expect(JSON.stringify(start)).toBe(before);
    expect(memberStatus(member())).toContain('正常');
    expect(memberStatus(member({ damage: 1, memoryIntact: false }))).toContain('受损');
    expect(memberStatus(member({ damage: 2, memoryIntact: false }))).toContain('重度');
    expect(memberStatus(member({ damage: 3, memoryIntact: false }))).toContain('临界');
    expect(memberStatus(member({ damage: 4, memoryIntact: false }))).toMatch(/销毁|死亡/);
    expect(memberStatus(member({ damage: 4, memoryIntact: false }))).not.toContain('正常');
  });
});
