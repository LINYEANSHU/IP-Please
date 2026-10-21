import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {start,call,stamp,readState} from './helpers';

async function metrics(page:Page){
  return page.evaluate(()=>{
    const c=document.querySelector('canvas')!,b=c.getBoundingClientRect(),ctx=c.getContext('2d')!;
    const points=[[.12,.5],[.5,.18],[.62,.58],[.86,.8],[.5,.92]];
    const samples=points.map(([x,y])=>Array.from(ctx.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data).join(','));
    return {width:c.width,height:c.height,cssWidth:b.width,cssHeight:b.height,top:b.top,left:b.left,dpr:Math.min(3,Math.max(1,devicePixelRatio||1)),unique:new Set(samples).size,image:getComputedStyle(c).imageRendering};
  });
}
async function expectBacking(page:Page){
  const m=await metrics(page);
  expect(m.image).not.toBe('pixelated');
  expect(Math.abs(m.width-m.cssWidth*m.dpr)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.height-m.cssHeight*m.dpr)).toBeLessThanOrEqual(1);
  expect(m.unique).toBeGreaterThan(1);
  return m;
}
test('2560x1440 全屏使用可用高度，canvas backing 与截图清晰',async({page})=>{
  await page.setViewportSize({width:2560,height:1440});
  await page.goto('/');
  await expect(page.getByRole('button',{name:'轻松值班',exact:true})).toBeVisible();
  const title=await expectBacking(page);
  expect(title.width).toBeGreaterThan(2000);
  await page.screenshot({path:'docs/validation/proofs/clarity-title-2560.png'});
  await page.getByRole('button',{name:'轻松值班',exact:true}).click();
  await page.getByRole('button',{name:'去上班'}).click();
  await page.getByRole('button',{name:'开始值班'}).click();
  await call(page,0);
  const desk=await expectBacking(page);
  expect(desk.cssHeight).toBeGreaterThan(1250);
  expect(desk.top+desk.cssHeight).toBeLessThan(1440);
  expect(desk.left+desk.cssWidth).toBeLessThan(2560);
  await page.screenshot({path:'docs/validation/proofs/clarity-desk-2560.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test.describe('DPR 2',()=>{
  test.use({viewport:{width:1920,height:1080},deviceScaleFactor:2});
  test('1920x1080 @2x 的 canvas 按 CSS×DPR 建立',async({page})=>{
    await page.goto('/');
    await expect(page.getByRole('button',{name:'轻松值班',exact:true})).toBeVisible();
    const title=await expectBacking(page);
    expect(title.dpr).toBe(2);
    expect(title.width).toBeGreaterThan(3000);
    await page.getByRole('button',{name:'轻松值班',exact:true}).click();
    await page.getByRole('button',{name:'去上班'}).click();
    await page.getByRole('button',{name:'开始值班'}).click();
    await call(page,0);
    const desk=await expectBacking(page);
    expect(Math.abs(desk.width-desk.cssWidth*2)).toBeLessThanOrEqual(1);
    await page.screenshot({path:'docs/validation/proofs/clarity-dpr2-1920.png'});
  });
});

test('resize 后 canvas 重建且不空白，实际拖章坐标仍正确',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/');
  await start(page,'轻松值班');
  await call(page,0);
  const before=await expectBacking(page);
  await page.setViewportSize({width:1440,height:900});
  await expect.poll(async()=>(await metrics(page)).width,{timeout:10000}).not.toBe(before.width);
  const after=await expectBacking(page);
  expect(after.cssWidth).toBeGreaterThan(before.cssWidth);
  await page.screenshot({path:'docs/validation/proofs/clarity-resize-1440.png'});
  await stamp(page,true);
  expect((await readState(page)).decisions['D01-S01']).toMatchObject({decision:'allow',correct:true});
  expect((await readState(page)).balance).toBe(55);
  await page.screenshot({path:'docs/validation/proofs/clarity-resize-stamped-1440.png'});
});
