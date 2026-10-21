import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {atCase} from '../fixtures/week';
import type {RunState} from '../../src/domain/run';
import {readState,dragWorld,clickWorld,stamp} from './helpers';

async function seed(page:Page,s:RunState){
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.goto('/');await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);await expect(page.locator('#case-count')).toBeVisible();
}
async function raise(page:Page,id:string){
  await page.locator(`[data-action="show-paper:${id}"]`).click();
  await expect.poll(async()=>(await readState(page)).topPaper).toBe(id);
}
for(const width of [1280,1920])test(`${width} 材料自由摆放，覆盖册页也不吸附，翻册移动不带动材料`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?720:1080});
  const s=atCase(4),ids=Object.keys(s.papers),id=ids[0];await seed(page,s);await raise(page,id);
  const p=s.papers[id],x=s.book.x+20,y=s.book.y+20;
  await dragWorld(page,p.x+15,p.y+15,x+15,y+15);
  await expect.poll(async()=>(await readState(page)).papers[id]).toEqual({...p,x,y});
  const placed=(await readState(page)).papers;
  await raise(page,'book');await clickWorld(page,s.book.x+175,s.book.y+70);
  await expect.poll(async()=>(await readState(page)).bookPage).toBe('cover');
  expect((await readState(page)).papers).toEqual(placed);
  await clickWorld(page,s.book.x+175,s.book.y+70);await expect.poll(async()=>(await readState(page)).bookPage).toBe('inside');
  await dragWorld(page,s.book.x+25,s.book.y+25,175,85);
  await expect.poll(async()=>(await readState(page)).book.x).toBe(150);
  expect((await readState(page)).papers).toEqual(placed);
  await raise(page,id);await dragWorld(page,x+15,y+15,30,45);
  await expect.poll(async()=>(await readState(page)).papers[id]).toEqual({...p,x:15,y:30});
  if(ids[1]){
    await raise(page,ids[1]);const other=(await readState(page)).papers[ids[1]];
    await dragWorld(page,other.x+15,other.y+15,535,55);
    await expect.poll(async()=>(await readState(page)).papers[ids[1]].x).toBe(520);
  }
  const independent=await readState(page);await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  expect((await readState(page)).papers).toEqual(independent.papers);expect((await readState(page)).book).toEqual(independent.book);
  await page.screenshot({path:`docs/validation/proofs/independent-papers-${width}.png`});
  const moved=await readState(page);
  await dragWorld(page,moved.book.x+190,moved.book.y+140,584,290);
  await expect.poll(async()=>(await readState(page)).book.x).toBe(394);
  await clickWorld(page,252,135);
  await expect(page.getByRole('dialog',{name:'今日公文'})).toBeVisible();
  await expect(page.getByRole('button',{name:/叠入册内|从册中取出/})).toHaveCount(0);
});

test('只退册仍须逐件递还，纸张不会被整批带走',async({page})=>{
  const s=atCase(4),id=s.caseIds[s.caseIndex],papers=Object.keys(s.papers);await seed(page,s);await raise(page,'book');
  await stamp(page,true);await dragWorld(page,s.book.x+25,s.book.y+25,120,200);
  await expect.poll(async()=>(await readState(page)).caseRuntime[id].bookReturned).toBe(true);
  expect((await readState(page)).caseRuntime[id].returnedPapers).toEqual([]);
  expect((await readState(page)).returned).not.toContain(id);
  await expect(page.getByRole('button',{name:'下一位',exact:true})).toBeDisabled();
  for(const paperId of papers){
    await raise(page,paperId);const p=(await readState(page)).papers[paperId];
    await dragWorld(page,p.x+15,p.y+15,120,200);
    await expect.poll(async()=>(await readState(page)).caseRuntime[id].returnedPapers).toContain(paperId);
  }
  await expect.poll(async()=>(await readState(page)).returned).toContain(id);
  await expect(page.getByRole('button',{name:'下一位',exact:true})).toBeEnabled();
});

test('旧叠册存档直接续玩，读取不覆写，第一次实际操作才保存独立坐标',async({page})=>{
  const s=atCase(4),ids=Object.keys(s.papers),papers=structuredClone(s.papers);
  for(const [i,id] of ids.entries())(s.papers[id] as any).stacked=i%2===0;
  await seed(page,s);
  expect(await readState(page)).toEqual(s);
  await raise(page,ids[0]);
  const after=await readState(page);
  expect(after.papers).toEqual(papers);
  expect(after).toMatchObject({runId:s.runId,revision:s.revision+1,balance:s.balance,ledger:s.ledger,decisions:s.decisions,caseRuntime:s.caseRuntime,family:s.family});
  await dragWorld(page,papers[ids[0]].x+15,papers[ids[0]].y+15,45,65);
  await expect.poll(async()=>(await readState(page)).papers[ids[0]]).toEqual({...papers[ids[0]],x:30,y:50});
  await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  expect((await readState(page)).papers[ids[0]]).toEqual({...papers[ids[0]],x:30,y:50});
});
