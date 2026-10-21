import {test,expect} from '@playwright/test';
import {atCase,atDay,step,enterDay} from '../fixtures/week';
import {stamp,giveBack} from './helpers';
import {getDay} from '../../src/domain/week';
import {clickWorld,dragWorld,readState} from './helpers';

test('点击证件与字段都留在桌面，核对只显示连线，继续计时',async({page})=>{
  const s=atCase(3),id=Object.keys(s.papers)[0],p=s.papers[id];
  await page.clock.install();await page.clock.pauseAt(new Date());await page.goto('/');
  await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
  await expect(page.locator('#case-count')).toBeVisible();
  await page.locator(`[data-action="show-paper:${id}"]`).click();
  await clickWorld(page,p.x+10,p.y+10);await expect(page.getByRole('dialog')).toHaveCount(0);
  await clickWorld(page,p.x+40,p.y+60);
  await expect(page.locator('.inspection-panel')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'字段核对',exact:true})).toHaveAttribute('aria-pressed','true');
  const beforeClock=(await readState(page)).remainingMs;
  await page.clock.runFor(1000);await expect.poll(async()=>(await readState(page)).remainingMs).toBeLessThan(beforeClock);
  await page.screenshot({path:'docs/validation/proofs/desk-line-only.png'});
  await dragWorld(page,p.x+12,p.y+12,312,182);
  await expect.poll(async()=>(await readState(page)).papers[id].x).toBe(300);
});

test('误盖可在退册前改回，按最终裁决计一次工资',async({page})=>{
  let s=atCase(1);await page.clock.install();await page.clock.pauseAt(new Date());await page.goto('/');
  await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  await stamp(page,true);await stamp(page,false);
  await expect.poll(async()=>(await readState(page)).decisions['D01-S01'].decision).toBe('reject');
  expect((await readState(page)).balance).toBe(50);
  await stamp(page,true);expect((await readState(page)).balance).toBe(55);
  expect((await readState(page)).ledger.filter((e:any)=>e.caseId==='D01-S01')).toHaveLength(1);
  await giveBack(page);expect((await readState(page)).returned).toContain('D01-S01');
});

test('余额不足仍可勾选，点支付弹窗、不扣款，调整后正常推进',async({page})=>{
  let s=enterDay(atDay(1,'standard'));s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});
  s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});s=step(s,{type:'return',caseId:'D01-S01'});
  s=step(s,{type:'call'});s=step(s,{type:'tick',ms:90000});s=step(s,{type:'settle'});
  await page.goto('/');await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
  await page.getByLabel('全家电力').check();await page.getByLabel('运行 Token').check();
  const pay=page.getByRole('button',{name:'支付并回家',exact:true});await expect(pay).toBeEnabled();
  const before=await readState(page);await pay.click();
  const warning=page.getByRole('alertdialog',{name:'余额不足'});await expect(warning).toBeVisible();
  await expect(warning).toContainText('当前余额 15');await expect(warning).toContainText('所选费用 20');await expect(warning).toContainText('还差 5');
  expect(await readState(page)).toEqual(before);
  await page.screenshot({path:'docs/validation/proofs/insufficient-balance.png'});
  await warning.getByRole('button',{name:'调整选择'}).click();await expect(page.getByLabel('全家电力')).toBeChecked();
  await page.getByLabel('全家电力').uncheck();await page.getByLabel('运行 Token').uncheck();await pay.click();
  await expect(page.getByRole('heading',{name:'机房里的灯还亮着'})).toBeVisible();
});

for(const width of [1280,1920])test(`${width} 七天机关报完整排版，审批条款可见且可以上班`,async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width,height:width===1280?720:1080});await page.goto('/');
  const overflows:unknown[]=[];
  for(const day of [1,2,3,4,5,6,7]){
    const s=atDay(day);await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
    const paper=page.getByRole('article',{name:'安全日报'});
    await expect(paper).toBeVisible();await expect(paper).toContainText('当日办件规定');
    await expect(paper).toContainText('Dario Amodei');await expect(paper).toContainText('生活短讯');
    expect(await paper.evaluate(el=>el.scrollHeight<=el.clientHeight+2)).toBe(true);
    const articles=paper.locator('[data-press-column]');
    for(const article of await articles.all()){
      const metrics=await article.evaluate(el=>({kind:el.className,actual:el.scrollHeight,available:el.clientHeight}));
      if(metrics.actual>metrics.available+2)overflows.push({day,...metrics});
    }
    if([1,3,7].includes(day))await page.screenshot({path:`docs/validation/proofs/press-d${day}-${width}.png`});
    await page.getByRole('button',{name:'去上班',exact:true}).click();await expect(page.locator('.memo')).toBeVisible();
  }
  expect(overflows).toEqual([]);
});

test('七天老乔保持同一面孔，带不同小动作，日常案卷仍可办理',async({page})=>{
  test.setTimeout(90000);
  await page.clock.install();await page.clock.pauseAt(new Date());await page.goto('/');
  for(let day=1;day<=7;day++){
    const index=getDay(day).cases.findIndex(c=>c.personId==='COMIC-QIAO'),s=atCase(day,index);
    await page.evaluate(s=>localStorage.setItem('ip-please:run:v1',JSON.stringify(s)),s);await page.reload();
    await expect(page.getByText('老乔 / 修电脑的',{exact:true})).toBeVisible();
    if([1,2,4,7].includes(day))await page.screenshot({path:`docs/validation/proofs/old-qiao-d${day}.png`});
    const crop=()=>page.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>{
      const c=document.createElement('canvas');c.width=100;c.height=145;
      c.getContext('2d')!.drawImage(canvas,0,145*canvas.height/360,99*canvas.width/640,143*canvas.height/360,0,0,100,145);
      return c.toDataURL();
    });
    const before=await crop();await page.clock.runFor(800);expect(await crop()).not.toBe(before);
  }
});
