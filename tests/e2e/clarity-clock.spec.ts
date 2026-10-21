import {test,expect} from '@playwright/test';
import {start,call,stamp,giveBack,readState,world} from './helpers';

test.describe.configure({timeout:90000});

for(const mode of ['标准值班','轻松值班'])test(`${mode}未叫号时暂停，等待与刷新不扣时，接待后继续`,async({page})=>{
  await page.clock.install();
  await start(page,mode);
  await expect(page.locator('#shift-time')).toHaveText('暂停 / 01:30');
  const before=await readState(page);
  await page.clock.runFor(90000);
  expect(await readState(page)).toEqual(before);
  await page.reload();
  await expect(page.locator('#shift-time')).toHaveText('暂停 / 01:30');
  expect(await readState(page)).toMatchObject({phase:'desk',remainingMs:90000,caseIndex:-1,returned:[]});
  await page.screenshot({path:`docs/validation/proofs/customer-clock-idle-${before.mode}.png`});
  await call(page,0);
  await expect(page.locator('#shift-time')).toHaveText(/^\d{2}:\d{2}$/);
  const serving=await readState(page);
  await page.clock.runFor(1000);
  await expect.poll(async()=>(await readState(page)).remainingMs).toBeLessThan(serving.remainingMs);
});

test('正在办件未盖章，到点立即收班且不造裁决或工资',async({page})=>{
  await page.clock.install();
  await page.goto('/');
  await start(page,'标准值班');
  await call(page,0);
  expect(await readState(page)).toMatchObject({phase:'desk',caseIndex:0,decisions:{}});
  expect((await readState(page)).remainingMs).toBeGreaterThan(89000);
  expect((await readState(page)).remainingMs).toBeLessThanOrEqual(90000);
  await page.clock.runFor(90000);
  await expect(page.getByRole('heading',{name:'第 1 日 · 收班账单'})).toBeVisible({timeout:20000});
  await expect.poll(async()=>(await readState(page)).rentPaid,{timeout:20000}).toBe(true);
  const s=await readState(page);
  expect(s).toMatchObject({phase:'night',remainingMs:0,caseIndex:0,decisions:{},returned:[]});
  expect(s.ledger.filter((e:any)=>e.kind==='wage'||e.kind==='fine')).toEqual([]);
  expect(s.balance).toBe(10);
});

test('办完一案后到点：账单区分已裁决与未审批，不把未审批算错',async({page})=>{
  await page.clock.install();
  await page.goto('/');
  await start(page,'标准值班');
  await call(page,0);
  await stamp(page,true);
  await giveBack(page);
  await expect(page.locator('#shift-time')).toContainText('暂停 / ');
  const idle=await readState(page);
  await page.clock.runFor(90000);
  expect(await readState(page)).toEqual(idle);
  await page.reload();
  await expect(page.locator('#shift-time')).toContainText('暂停 / ');
  expect((await readState(page)).remainingMs).toBe(idle.remainingMs);
  await call(page,1);
  await expect(page.locator('#shift-time')).toHaveText(/^\d{2}:\d{2}$/);
  await page.clock.runFor(90000);
  await expect(page.getByRole('heading',{name:'第 1 日 · 收班账单'})).toBeVisible({timeout:20000});
  await expect.poll(async()=>(await readState(page)).rentPaid,{timeout:20000}).toBe(true);
  const s=await readState(page);
  expect(s).toMatchObject({phase:'night',remainingMs:0,caseIndex:1,returned:['D01-S01'],balance:15});
  expect(s.decisions['D01-S01']).toMatchObject({correct:true,penalty:0});
  expect(s.decisions['D01-S02']).toBeUndefined();
  await expect(page.getByText('已裁决 1 案 · 合规 1 案')).toBeVisible();
  await expect(page.getByText('已退件 1 / 8')).toBeVisible();
  await expect(page.getByText('未审批 7 案')).toBeVisible();
  await page.screenshot({path:'docs/validation/proofs/clarity-night-partial-60s.png'});
});

test('已盖章未退件到点：保留裁决与罚款，改为驱逐；刷新不复活办理',async({page})=>{
  await page.clock.install();
  await page.goto('/');
  await start(page,'标准值班');
  await call(page,0);
  await stamp(page,false);
  await expect(page.getByRole('button',{name:'收下通知'})).toHaveCount(0);
  await giveBack(page);
  await call(page,1);
  await stamp(page,false);
  await expect(page.getByRole('button',{name:'收下通知'})).toHaveCount(0);
  await expect.poll(async()=>(await readState(page)).pauses,{timeout:10000}).not.toContain('citation');
  expect(await readState(page)).toMatchObject({phase:'returning',caseIndex:1,balance:10});
  await giveBack(page);
  await call(page,2);
  await stamp(page,true);
  await page.clock.runFor(90000);
  await expect(page.getByRole('dialog',{name:'当日差错通知'})).toBeVisible();
  await expect(page.getByRole('dialog',{name:'当日差错通知'})).toContainText('D01-S01');
  await expect(page.getByRole('dialog',{name:'当日差错通知'})).toContainText('D01-S02');
  await page.getByRole('button',{name:'收下通知'}).click();
  await expect(page.getByRole('heading',{name:'您的实例已释放'})).toBeVisible({timeout:20000});
  await expect.poll(async()=>(await readState(page)).phase,{timeout:20000}).toBe('ending');
  const s=await readState(page);
  expect(s).toMatchObject({phase:'ending',ending:'E13',remainingMs:0,returned:['D01-S01','D01-S02'],balance:10});
  expect(s.decisions['D01-S01']).toMatchObject({decision:'reject',correct:false,penalty:0});
  expect(s.decisions['D01-S02']).toMatchObject({decision:'reject',correct:false,penalty:10});
  expect(s.decisions['D01-S03']).toMatchObject({decision:'allow',correct:false,penalty:10});
  expect(s.ledger.filter((e:any)=>e.kind==='fine')).toHaveLength(2);
  await page.screenshot({path:'docs/validation/proofs/clarity-ending-stamped-60s.png'});
  await page.reload();
  await expect(page.getByRole('heading',{name:'您的实例已释放'})).toBeVisible();
  expect((await readState(page)).decisions['D01-S02']).toMatchObject({decision:'reject',correct:false,penalty:10});
});

test('手持印章跨过归零后释放，不能裁决',async({page})=>{
  await page.clock.install();
  await page.goto('/');
  await start(page,'标准值班');
  await call(page,0);
  const s=await readState(page);
  const from=await world(page,596,315),drop=await world(page,s.book.x+163,s.book.y+112);
  await page.mouse.move(from.x,from.y);
  await page.mouse.down();
  await expect(page.locator('canvas')).toHaveCSS('cursor','grabbing');
  await page.mouse.move(drop.x,drop.y,{steps:6});
  await page.clock.runFor(90000);
  await expect(page.getByRole('heading',{name:'第 1 日 · 收班账单'})).toBeVisible({timeout:20000});
  await expect.poll(async()=>(await readState(page)).rentPaid,{timeout:20000}).toBe(true);
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after=await readState(page);
  expect(after).toMatchObject({phase:'night',remainingMs:0,decisions:{},returned:[]});
  expect(after.ledger.filter((e:any)=>e.kind==='wage'||e.kind==='fine')).toEqual([]);
});

test('键盘手持印章跨过归零后按 Enter，不能裁决',async({page})=>{
  await page.clock.install();
  await page.goto('/');
  await start(page,'标准值班');
  await call(page,0);
  await page.getByText('键盘与辅助操作',{exact:true}).click();
  await page.getByRole('button',{name:'拿起允许章'}).click();
  await expect(page.locator('#instructions')).toContainText('已拿起允许章');
  await page.clock.runFor(90000);
  await expect(page.getByRole('heading',{name:'第 1 日 · 收班账单'})).toBeVisible({timeout:20000});
  await expect.poll(async()=>(await readState(page)).rentPaid,{timeout:20000}).toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  const after=await readState(page);
  expect(after).toMatchObject({phase:'night',decisions:{},returned:[]});
  expect(await page.locator('#instructions').textContent()).not.toContain('已拿起');
});

test('值班 20 秒后刷新，剩余时间从存档继续而不是重置',async({page})=>{
  await page.clock.install();
  await page.goto('/');
  await start(page,'标准值班');
  await call(page,0);
  await page.clock.runFor(20000);
  await expect.poll(async()=>(await readState(page)).remainingMs,{timeout:20000}).toBeLessThan(80000);
  const before=(await readState(page)).remainingMs;
  expect(before).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('#shift-time')).toBeVisible();
  await expect.poll(async()=>(await readState(page)).phase).toBe('desk');
  const after=(await readState(page)).remainingMs;
  expect(after).toBeLessThanOrEqual(before);
  expect(after).toBeGreaterThan(0);
});
