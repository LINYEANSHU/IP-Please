import { describe,it,expect } from 'vitest';
import { newRun, reduceRun } from '../../src/domain/run';
import { settleDay, previewSupply, submitSupply } from '../../src/domain/night';
describe('夜间租金与五人整包供养',()=>{
  it.each([['standard',30],['relaxed',60]] as const)('%s 全正确全供养余额 %i', (mode, expected)=>{
    const s=newRun(mode,'night'); s.phase='night'; s.balance+=40;
    const rent=settleDay(s).state; const after=submitSupply(rent,{electricity:true,tokens:true},'supply').state;
    expect(after.balance).toBe(expected); expect(after.phase).toBe('family');
    expect(Object.values(after.family).every(m=>m.damage===0 && m.powerPressure===0 && m.tokenPressure===0)).toBe(true);
    expect(submitSupply(after,{electricity:true,tokens:true},'again').state).toEqual(after);
    expect(settleDay(after).state).toEqual(after);
    expect(reduceRun(after,{type:'next-day',actionId:'next'}).state).toMatchObject({day:2,phase:'newspaper'});
  });
  it.each([[9,'ending',19],[10,'night',0],[11,'night',1]] as const)('先发底薪 10 再检查租金边界，原余额 %i', (balance,phase,remaining)=>{
    const s=newRun('standard','rent'); s.phase='night'; s.balance=balance;
    expect(settleDay(s).state).toMatchObject({phase,balance:remaining,ending:phase==='ending'?'E13':null});
  });
  it('预览纯计算；超额不能提交；断供首晚仅加压力',()=>{
    const s=newRun('standard','supply'); s.phase='night'; s.balance=20;
    const rent=settleDay(s).state; const before=JSON.stringify(rent);
    for(const electricity of [false,true]) for(const tokens of [false,true]) previewSupply(rent,{electricity,tokens});
    expect(JSON.stringify(rent)).toBe(before);
    expect(submitSupply(rent,{electricity:true,tokens:true},'too-much').state).toEqual(rent);
    const after=submitSupply(rent,{electricity:false,tokens:true},'one').state;
    expect(after.balance).toBe(0);
    expect(Object.values(after.family).every(m=>m.powerPressure===2 && m.tokenPressure===0 && m.damage===0)).toBe(true);
  });
});
