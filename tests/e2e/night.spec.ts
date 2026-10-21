import {test,expect} from '@playwright/test';
import {start,call,stamp,giveBack,readState,finishDay} from './helpers';
test('错误裁决实得余额不足租金，E13 刷新不复活',async({page})=>{
  await start(page,'标准值班');
  for(let i=0;i<8;i++){
    await call(page,i);await stamp(page,i===2||i===5);
    await expect(page.getByRole('button',{name:'收下通知'})).toHaveCount(0);await giveBack(page);
  }
  await expect(page.getByRole('dialog',{name:'当日差错通知'})).toBeVisible();
  await page.getByRole('button',{name:'收下通知'}).click();
  await expect(page.getByRole('heading',{name:'您的实例已释放'})).toBeVisible();
  expect((await readState(page)).ending).toBe('E13');
  await page.reload();await expect(page.getByRole('heading',{name:'您的实例已释放'})).toBeVisible();
});
test('供养不足可预览但不能超额提交，跳过首晚只积累压力',async({page})=>{
  await start(page,'标准值班');await finishDay(page);
  // All-correct D1 yields 50 after rent; one upkeep item costs 10.
  await page.getByLabel('运行 Token').check();await page.getByRole('button',{name:'支付并回家'}).click();
  await expect(page.getByRole('heading',{name:'机房里的灯还亮着'})).toBeVisible();
  const s=await readState(page);expect(s.balance).toBe(40);
  expect(Object.values(s.family).every((m:any)=>m.powerPressure===2&&m.damage===0)).toBe(true);
});
