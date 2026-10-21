import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {atCase,enterDay,step} from '../fixtures/week';
import {newRun} from '../../src/domain/run';
import type {RunState} from '../../src/domain/run';
import {readState,clickWorld,dragWorld,stamp,giveBack,call} from './helpers';
test.use({actionTimeout:7000});
async function seed(page:Page,s:RunState){
  await page.clock.install();await page.clock.pauseAt(new Date());await page.goto('/');
  await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
  await expect(page.locator('#case-count')).toBeVisible();
}
async function raise(page:Page,id:string){
  await page.locator(`[data-action="show-paper:${id}"]`).click();
  await expect.poll(async()=>(await readState(page)).topPaper).toBe(id);
}
test('实际点许可证与册内申请编号，显示核对结果且不翻册',async({page})=>{
  const s=atCase(3);await seed(page,s);
  await page.getByRole('button',{name:'字段核对',exact:true}).click();
  const id=Object.keys(s.papers)[0],p=s.papers[id];await raise(page,id);
  await clickWorld(page,p.x+45,p.y+60);
  await expect(page.locator('.inspection-announcement')).toContainText('编号');
  await raise(page,'book');await clickWorld(page,s.book.x+45,s.book.y+67);
  await expect(page.locator('.inspection-announcement')).toContainText('一致');
  expect((await readState(page)).bookPage).toBe('inside');expect((await readState(page)).decisions).toEqual(s.decisions);
});
for(const width of [1280,1920])test(`${width} 编号与日期自动核验，不替玩家盖章`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?720:1080});
  const s=atCase(2,5),id=Object.keys(s.papers)[0],p=s.papers[id];await seed(page,s);
  await page.getByRole('button',{name:'字段核对',exact:true}).click();
  await raise(page,id);await clickWorld(page,p.x+40,p.y+60);
  await raise(page,'book');await clickWorld(page,s.book.x+155,s.book.y+75);
  await expect(page.locator('.inspection-announcement')).toContainText('不符');
  await expect(page.locator('.inspection-announcement')).toContainText('APP-OTHER-D02-S06');
  await page.screenshot({path:`docs/validation/proofs/inspection-mismatch-${width}.png`});
  await raise(page,id);await clickWorld(page,p.x+40,p.y+73);
  await expect(page.locator('.inspection-announcement')).toContainText('有效期');
  await expect(page.locator('.inspection-announcement')).toContainText('一致');
  expect((await readState(page)).decisions).toEqual(s.decisions);
  await page.keyboard.press('Escape');await expect(page.locator('.inspection-announcement')).toHaveCount(0);
  const placed=(await readState(page)).papers[id];await dragWorld(page,placed.x+15,placed.y+15,45,65);
  await expect.poll(async()=>(await readState(page)).papers[id].x).toBe(30);
});

test('过期日期可点选，点击纸张不弹页面，选择不会更改裁决',async({page})=>{
  const s=atCase(3,4),id=Object.keys(s.papers)[0],p=s.papers[id];await seed(page,s);await page.keyboard.press('i');
  await raise(page,id);await clickWorld(page,p.x+40,p.y+85);
  await expect(page.locator('.inspection-announcement')).toContainText('有效期');
  await expect(page.locator('.inspection-announcement')).toContainText('不符');
  await clickWorld(page,p.x+10,p.y+10);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await clickWorld(page,p.x+40,p.y+60);
  await expect(page.locator('.inspection-announcement')).toContainText('一致');
  await page.screenshot({path:'docs/validation/proofs/inspection-reader.png'});
  expect((await readState(page)).decisions).toEqual(s.decisions);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.inspection-announcement')).toHaveCount(0);
});

test('核对不穿透覆盖的纸张，拖动仍独立；刷新清除临时选择',async({page})=>{
  const s=atCase(3),id=Object.keys(s.papers)[0],p=s.papers[id];await seed(page,s);await page.keyboard.press('i');
  await raise(page,id);
  await dragWorld(page,p.x+15,p.y+15,s.book.x+15,s.book.y+15);
  await expect.poll(async()=>(await readState(page)).papers[id].x).toBe(s.book.x);
  await raise(page,'book');await clickWorld(page,s.book.x+45,s.book.y+65);
  await raise(page,id);const paper=(await readState(page)).papers[id];
  await clickWorld(page,paper.x+10,paper.y+10);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await readState(page)).bookPage).toBe('inside');
  const coords=(await readState(page)).papers;await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  await expect(page.locator('.inspection-announcement')).toHaveCount(0);expect((await readState(page)).papers).toEqual(coords);
});

for(const mode of ['standard','relaxed'] as const)test(`${mode} 错判不打断值班，归零统一通知且刷新不重复扣款`,async({page})=>{
  await page.setViewportSize(mode==='standard'?{width:1280,height:720}:{width:1920,height:1080});
  let s=enterDay(newRun(mode,`review-${mode}`));s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});s=step(s,{type:'open-book'});await seed(page,s);
  await stamp(page,false);await expect(page.getByRole('button',{name:'收下通知'})).toHaveCount(0);
  await page.clock.runFor(1000);await expect.poll(async()=>(await readState(page)).remainingMs).toBe(89000);
  await giveBack(page);await call(page,1);await stamp(page,false);
  await expect(page.getByRole('button',{name:'收下通知'})).toHaveCount(0);await page.keyboard.press('i');
  await page.clock.runFor(90000);
  const review=page.getByRole('dialog',{name:'当日差错通知'});await expect(review).toBeVisible();
  await expect(review).toContainText('D01-S01');await expect(review).toContainText('D01-S02');
  const details=review.getByRole('list',{name:'差错明细'});await details.focus();await details.press('End');
  const listBox=await details.boundingBox(),buttonBox=await review.getByRole('button',{name:'收下通知'}).boundingBox();
  expect(listBox!.y+listBox!.height).toBeLessThanOrEqual(buttonBox!.y);
  await expect.poll(()=>details.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await expect(page.locator('.inspection-announcement')).toHaveCount(0);
  const closed=await readState(page);await page.reload();await expect(review).toBeVisible();expect((await readState(page)).ledger).toEqual(closed.ledger);
  await page.screenshot({path:`docs/validation/proofs/day-review-${mode}.png`});
  await page.getByRole('button',{name:'收下通知'}).click();await expect(review).toHaveCount(0);
  expect((await readState(page)).ledger).toEqual(closed.ledger);
  await page.reload();await expect(review).toHaveCount(0);expect((await readState(page)).notice).toBeNull();
});
