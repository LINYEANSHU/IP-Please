import {test,expect} from '@playwright/test';
import {atCase} from '../fixtures/week';
import {world,readState,dragWorld,stamp,giveBack,call} from './helpers';

for(const width of [1280,1920])test(`${width} 证件盖住文件标签时，显示与鼠标命中都由证件优先；拖走后标签可用`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?720:1080});
  const s=atCase(6),id=Object.keys(s.papers).at(-1)!;
  s.papers[id]={...s.papers[id],x:390,y:112};s.topPaper=id;
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.goto('/');await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
  await expect(page.locator('#case-count')).toBeVisible();
  const point=await world(page,405,125);
  expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await page.screenshot({path:`docs/validation/proofs/paper-foreground-${width}.png`});
  await dragWorld(page,405,125,315,195);
  await expect.poll(async()=>(await readState(page)).papers[id].x).toBe(300);
  await page.locator('[data-action="show-paper:book"]').click();
  await expect.poll(async()=>(await readState(page)).topPaper).toBe('book');
});

test('纸张压住印章时优先拿起纸张',async({page})=>{
  const s=atCase(2),id=Object.keys(s.papers)[0];s.papers[id]={...s.papers[id],x:480,y:230};s.topPaper=id;
  await page.clock.install();await page.clock.pauseAt(new Date());await page.goto('/');
  await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  await dragWorld(page,510,315,330,235);
  await expect.poll(async()=>(await readState(page)).papers[id].x).toBe(300);
  expect((await readState(page)).decisions).toEqual(s.decisions);
});

for(const width of [1280,1920])test(`${width} 新人物放行后感谢，递还与重载保留，下个人重置`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?720:1080});
  const s=atCase(1,1);await page.clock.install();await page.clock.pauseAt(new Date());await page.goto('/');
  await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  for(let i=0;i<2;i++){
    await page.getByRole('button',{name:'继续对话',exact:true}).click();
    await expect.poll(async()=>(await readState(page)).dialogueLine).toBe(i+1);
  }
  const beforeLines=await page.locator('.dialogue-entry').allTextContents();
  await page.reload();await expect(page.locator('.dialogue-entry')).toHaveText(beforeLines);
  await stamp(page,true);await expect(page.getByRole('log')).toContainText('谢谢');
  await page.screenshot({path:`docs/validation/proofs/window-thanks-${width}.png`});
  const ledger=(await readState(page)).ledger;
  await giveBack(page);await expect(page.getByRole('log')).toContainText('谢谢');
  await page.reload();await expect(page.getByRole('log')).toContainText('谢谢');
  expect((await readState(page)).ledger).toEqual(ledger);
  await call(page,2);await expect(page.getByRole('log')).not.toContainText('谢谢');
});

test('核对时文件移到顶部仍优先响应拖动，上方不显示结果面板',async({page})=>{
  const s=atCase(2),id=Object.keys(s.papers)[0];s.papers[id]={...s.papers[id],x:20,y:25};s.topPaper=id;
  await page.clock.install();await page.clock.pauseAt(new Date());await page.goto('/');
  await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  await page.keyboard.press('i');
  await expect(page.locator('.inspection-panel')).toHaveCount(0);
  const point=await world(page,40,40);
  expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');
  await dragWorld(page,40,40,340,200);
  await expect.poll(async()=>(await readState(page)).papers[id].x).toBe(320);
});

test('多证件时继续对话与询问材料不相互遮挡',async({page})=>{
  const s=atCase(2);await page.goto('/');await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
  await expect(page.locator('#case-count')).toBeVisible();
  const next=await page.getByRole('button',{name:'继续对话',exact:true}).boundingBox();
  const ask=await page.getByRole('button',{name:'询问材料',exact:true}).boundingBox();
  expect(next!.y+next!.height).toBeLessThanOrEqual(ask!.y);
});
