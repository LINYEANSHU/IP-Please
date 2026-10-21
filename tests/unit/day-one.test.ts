import { describe, it, expect } from 'vitest';
import { DAY_ONE_CASES, requiredDecision, getModePolicy } from '../../src/domain/day-one';
describe('D1 只按当前 IP 办理八案', () => {
  it('固定案位、地区、判定，中文新加坡申请合规', () => {
    expect(DAY_ONE_CASES.map(c => c.id)).toEqual(Array.from({length:8}, (_,i)=>`D01-S0${i+1}`));
    expect(DAY_ONE_CASES.map(c => c.ipRegion)).toEqual(['JP','US','CN','SG','GB','RU','FR','JP']);
    expect(DAY_ONE_CASES.map(requiredDecision)).toEqual(['allow','allow','reject','allow','allow','reject','allow','allow']);
    expect(DAY_ONE_CASES[3].dialogue[0]).toBe('你好，麻烦看一下。');
    expect(DAY_ONE_CASES.every(c => !('nationality' in c) && !('permit' in c))).toBe(true);
  });
  it('模式经济与计时遵守计划', () => {
    expect(getModePolicy('standard')).toMatchObject({initial:20, salary:10, wage:5, durationMs:90000});
    expect(getModePolicy('relaxed')).toMatchObject({initial:50, salary:10, wage:5, durationMs:90000});
  });
});
