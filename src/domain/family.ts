import {SUPPLY_COST} from './economy';
import type {
  FamilyMemberId, FamilyProjection, FamilyState, MemberState, SupplyChoice,
} from './week-contract';

export const REPAIR_COST: Record<FamilyMemberId, number> = {
  player: 28,
  father: 24,
  mother: 24,
  wife: 20,
  son: 18,
};

// Individual tolerances confirmed in the design spec, section 6.
const THRESHOLDS: Record<FamilyMemberId, { power: number; tokens: number }> = {
  player: { power: 8, tokens: 8 },
  father: { power: 4, tokens: 6 },
  mother: { power: 6, tokens: 4 },
  wife: { power: 6, tokens: 8 },
  son: { power: 8, tokens: 4 },
};

const LABELS: Record<FamilyMemberId, string> = {
  player: '你',
  father: '父亲',
  mother: '母亲',
  wife: '妻子',
  son: '儿子',
};

function validRepairs(family: FamilyState, choice: SupplyChoice): FamilyMemberId[] {
  return [...new Set(choice.repairs ?? [])].filter(id => {
    const m = family[id];
    return Boolean(m) && m.damage >= 1 && m.damage < 4;
  });
}

function warningFor(id: FamilyMemberId, m: MemberState): string {
  const label = LABELS[id];
  if (m.damage >= 4) return label + '的核心已销毁，永久死亡，不能修复或复活。';
  if (m.damage === 3) return label + '的损伤已达临界；下一晚仍缺对应资源将核心销毁，修复可恢复。';
  if (m.damage === 2) return label + '已重度受损，记忆不完整；修复可恢复。';
  if (m.damage === 1) return label + '已受损，记忆不完整；修复可恢复。';
  if (m.powerPressure >= THRESHOLDS[id].power || m.tokenPressure >= THRESHOLDS[id].tokens) {
    return label + '的压力已达触发阈值，若下一晚继续缺供将受损。';
  }
  return '';
}

export function memberStatus(m: MemberState): string {
  if (m.damage >= 4) return '核心已销毁：永久死亡，不能修复或复活。';
  if (m.damage === 3) return '临界：下一晚仍缺对应资源将核心销毁，可修复。';
  if (m.damage === 2) return '重度受损：记忆不完整，可修复。';
  if (m.damage === 1) return '受损：记忆不完整，可修复。';
  if (m.powerPressure > 0 || m.tokenPressure > 0) return '正常；压力偏高，尚未达到损伤阈值。';
  return '正常。';
}

export function projectFamily(family: FamilyState, choice: SupplyChoice): FamilyProjection {
  const next: FamilyState = structuredClone(family);
  const repairs = validRepairs(next, choice);

  // Repairs happen first: clear damage and both pressures, then tonight's
  // resources are applied. A repair never replaces tonight's upkeep payment.
  for (const id of repairs) {
    const repaired: MemberState = { powerPressure: 0, tokenPressure: 0, damage: 0, memoryIntact: true };
    next[id] = repaired;
  }

  for (const id of Object.keys(next) as FamilyMemberId[]) {
    const m = next[id];
    // Core destruction is permanent. Dead members keep their last state and
    // never receive healthy dialogue or a purchasable repair.
    if (m.damage >= 4) {
      m.memoryIntact = false;
      continue;
    }

    m.powerPressure = choice.electricity
      ? Math.max(0, m.powerPressure - 1)
      : m.powerPressure + 2;
    m.tokenPressure = choice.tokens
      ? Math.max(0, m.tokenPressure - 1)
      : m.tokenPressure + 2;

    // One level at most per night, even when both resources are missing.
    // Providing both resources stabilizes existing damage instead.
    const powerHit = !choice.electricity && m.powerPressure >= THRESHOLDS[id].power;
    const tokenHit = !choice.tokens && m.tokenPressure >= THRESHOLDS[id].tokens;
    if (powerHit || tokenHit) m.damage = Math.min(4, m.damage + 1) as MemberState['damage'];
    if (m.damage >= 1) m.memoryIntact = false;
  }

  const cost = (Number(choice.electricity) + Number(choice.tokens)) * SUPPLY_COST
    + repairs.reduce((sum, id) => sum + REPAIR_COST[id], 0);
  const warnings = Object.fromEntries(
    (Object.keys(next) as FamilyMemberId[]).map(id => [id, warningFor(id, next[id])]),
  ) as Record<FamilyMemberId, string>;

  return { family: next, cost, warnings };
}
