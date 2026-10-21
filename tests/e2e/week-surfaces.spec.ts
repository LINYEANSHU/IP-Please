import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {atCase,atDay,closeDay,enterDay,step} from '../fixtures/week';
import type {RunState} from '../../src/domain/run';
import {readState,dragWorld,clickWorld} from './helpers';
async function seed(page:Page,s:RunState){
  await page.goto('/');await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);await expect(page.locator('#save-status')).toBeVisible();
}
for(const width of [1280,1920])test(`${width} 首周材料、补件字幕、原文和夜间风险布局`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:width===1280?720:1080});await page.clock.install();await page.clock.pauseAt(new Date());
  for(const day of [2,3,4,5,6,7]){
    const s=atCase(day,day===2?4:day===5?1:0);await seed(page,s);
    await expect(page.locator('#case-count')).toContainText('/ 12');
    if(day===2){
      const id=s.caseIds[s.caseIndex];expect((await readState(page)).caseRuntime[id].delivered).toEqual([]);
      await page.getByRole('button',{name:'询问材料',exact:true}).click();
      await expect(page.getByRole('log')).toContainText('许可在封套里');
      await expect.poll(async()=>(await readState(page)).caseRuntime[id].delivered.length).toBe(1);
    }
    const after=await readState(page),ids=Object.keys(after.papers),id=ids.find(id=>id.endsWith('BUSINESS'))??ids.find(id=>id.endsWith('CONNECTION'))??ids.at(-1)!;
    await page.locator(`[data-action="show-paper:${id}"]`).click();
    await page.screenshot({path:`docs/validation/proofs/week-materials-d${day}-${width}.png`});
    await clickWorld(page,252,135);
    const dialog=page.getByRole('dialog',{name:'今日公文'});await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('当前 IP');if(day===6)await expect(dialog).toContainText('商业');
    if(day===6)await page.screenshot({path:`docs/validation/proofs/week-reader-${width}.png`});
    await page.getByRole('button',{name:'返回桌面',exact:true}).click();
  }
  const missing={electricity:false,tokens:false};const night=closeDay(enterDay(atDay(5,'relaxed',missing)));await seed(page,night);
  await expect(page.locator('.member-preview')).toContainText('本次停供将永久销毁核心');await expect(page.getByLabel('修复父亲')).toBeVisible();
  const pay=page.getByRole('button',{name:'支付并回家'}),box=await pay.boundingBox(),stage=await page.locator('canvas').boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(stage!.y+stage!.height);
  const risk=await page.locator('.member-preview').boundingBox();expect(risk!.y+risk!.height).toBeLessThanOrEqual(box!.y);
  await page.screenshot({path:`docs/validation/proofs/week-night-risk-${width}.png`});
  await pay.click();await expect(page.locator('.member-dead')).toHaveCount(3);
  await expect(page.locator('.family-words')).not.toContainText('父亲');await page.screenshot({path:`docs/validation/proofs/week-family-dead-${width}.png`});
});
test('第七日90秒立即封存工资并进入首袭，不续办在场申请',async({page})=>{
  await page.clock.install();let s=atCase(7);await seed(page,s);
  await dragWorld(page,596,315,s.book.x+163,s.book.y+112);await expect.poll(async()=>(await readState(page)).phase).toBe('returning');
  const balance=(await readState(page)).balance;await page.clock.runFor(90000);
  await expect(page.getByRole('heading',{name:'值班窗口已关闭'})).toBeVisible();
  expect(await readState(page)).toMatchObject({phase:'incident',remainingMs:0,balance,rentPaid:false});
  await page.reload();await expect(page.getByRole('heading',{name:'值班窗口已关闭'})).toBeVisible();
  expect((await readState(page)).ledger.filter((e:any)=>e.id==='case:D07-S01:wage')).toHaveLength(1);
});
