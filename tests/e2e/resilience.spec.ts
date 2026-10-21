import {test,expect} from '@playwright/test';
import {start,call,readState,dragWorld,stamp} from './helpers';
test('存储配额失败阻止裁决，恢复后只重试一次',async({page})=>{
  await page.clock.install();
  await start(page);await call(page,0);
  // Freeze the 60-second shift so the quota failure can only belong to the stamp.
  await page.clock.pauseAt((await page.evaluate(()=>Date.now()))+1000);
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem;
    (window as any).__restoreStore=()=>Storage.prototype.setItem=original;
    Storage.prototype.setItem=function(k,v){if(k==='ip-please:run:v1')throw new DOMException('full','QuotaExceededError');original.call(this,k,v);};
  });
  const s=await readState(page);await dragWorld(page,596,315,s.book.x+163,s.book.y+112);
  await expect(page.getByRole('alertdialog',{name:'未能保存'})).toBeVisible();
  expect((await readState(page)).decisions).toEqual({});
  await page.evaluate(()=>(window as any).__restoreStore());
  await page.getByRole('button',{name:'重试保存'}).click();
  await expect.poll(async()=>(await readState(page)).phase).toBe('returning');
  expect((await readState(page)).balance).toBe(55);
  await page.reload();expect((await readState(page)).ledger.filter((e:any)=>e.kind==='wage')).toHaveLength(1);
});
test('坏存档、未知版本保留原文且不开始新局',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.setItem('ip-please:run:v1','{"schemaVersion":999}'));
  await page.reload();await expect(page.getByRole('alertdialog')).toContainText('原数据已保留');
  expect(await page.evaluate(()=>localStorage.getItem('ip-please:run:v1'))).toBe('{"schemaVersion":999}');
});
test('正式页面双标签接管，旧标签禁止办件',async({page,context})=>{
  await start(page);await call(page,0);await stamp(page,true);
  const other=await context.newPage();await other.goto('/');
  await expect(other.getByRole('button',{name:'在此窗口接管'})).toBeVisible();
  await other.getByRole('button',{name:'在此窗口接管'}).click();
  await expect(page.getByRole('button',{name:'在此窗口接管'})).toBeVisible();
  expect((await readState(other)).balance).toBe(55);
  await other.getByText('键盘与辅助操作',{exact:true}).click();
  await other.getByRole('button',{name:'递还通行册'}).click();
  await expect.poll(async()=>(await readState(other)).returned.length).toBe(1);
  await page.reload();await expect(page.getByRole('button',{name:'在此窗口接管'})).toBeVisible();
});
