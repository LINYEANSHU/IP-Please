import {describe,it,expect} from 'vitest';
import {clampElapsed,MAX_TICK_MS} from '../../src/domain/clock';
describe('单次计时跨度',()=>{
  it('正常轮询保留实际经过时间',()=>{
    expect(clampElapsed(0)).toBe(0);
    expect(clampElapsed(250.4)).toBe(250);
    expect(clampElapsed(999)).toBe(999);
    expect(clampElapsed(MAX_TICK_MS)).toBe(MAX_TICK_MS);
  });
  it('休眠或长阻塞不补扣整段，异常值不推进计时',()=>{
    expect(clampElapsed(1001)).toBe(MAX_TICK_MS);
    expect(clampElapsed(360000)).toBe(MAX_TICK_MS);
    expect(clampElapsed(-1)).toBe(0);
    expect(clampElapsed(Number.NaN)).toBe(0);
    expect(clampElapsed(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
