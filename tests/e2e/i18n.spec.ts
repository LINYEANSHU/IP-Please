import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import type {RunState} from '../../src/domain/run';
import {campaignStart,enterCampaignDay,finishCampaignWork,act} from '../fixtures/campaign';
import {atCase} from '../fixtures/week';
import {readState,dragWorld} from './helpers';

async function english(page:Page,state?:RunState){
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.addInitScript(s=>{
    localStorage.setItem('ip-please:language','en');
    if(s&&!sessionStorage.getItem('i18n-seeded')){localStorage.setItem('ip-please:run:v1',JSON.stringify(s));sessionStorage.setItem('i18n-seeded','1');}
  },state);
  await page.goto('/');await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('heading',{name:'Powering up the booth',exact:true})).toBeHidden();
  await expect(page.locator('text=Loading local portraits and fonts...')).toBeHidden();
}
async function noChinese(page:Page){
  const text=await page.locator('#app').evaluate(app=>{
    const clone=app.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-no-translate]').forEach(el=>el.remove());
    return clone.textContent+' '+[...clone.querySelectorAll('[aria-label],[alt],[title]')].flatMap(el=>['aria-label','alt','title'].map(key=>el.getAttribute(key)??'')).join(' ');
  });
  expect(text).not.toMatch(/\p{Script=Han}/u);
}
test('English title, preference persistence and same-run language switching',async({page})=>{
  await english(page);await expect(page.getByRole('button',{name:'Relaxed shift',exact:true})).toBeVisible();
  await noChinese(page);
  await page.getByRole('button',{name:'Relaxed shift',exact:true}).click();
  await expect(page.getByRole('heading',{name:'SAFETY DAILY',exact:true})).toBeVisible();await noChinese(page);
  const saved=await readState(page);
  await page.locator('[data-action="toggle-language"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
  await expect(page.getByRole('heading',{name:'安全日报',exact:true})).toBeVisible();
  expect(await readState(page)).toEqual(saved);
  await page.locator('[data-action="toggle-language"]').click();expect(await readState(page)).toEqual(saved);
  await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');await noChinese(page);
});

for(const width of [1280,1920])test(`English paper desk and reader ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===1280?720:1080});
  const state=atCase(3);await english(page,state);await noChinese(page);
  await page.locator('[data-action="read-current"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();await noChinese(page);
  await page.screenshot({path:`docs/readme/reader-en-${width}.png`});
  await page.locator('[data-action="close-panel"]').click();
  await expect.poll(async()=>(await readState(page)).pauses).not.toContain('reader');
  const saved=await readState(page);await page.locator('[data-action="toggle-language"]').click();
  // Settings/reader pause transactions are complete before the language comparison.
  expect(await readState(page)).toEqual(saved);
  await page.screenshot({path:`docs/readme/desk-zh-${width}.png`});
  await page.locator('[data-action="toggle-language"]').click();
  await page.screenshot({path:`docs/readme/desk-en-${width}.png`});
  await dragWorld(page,596,315,state.book.x+163,state.book.y+112);
  await expect.poll(async()=>(await readState(page)).phase).toBe('returning');await noChinese(page);
  await page.reload();await expect(page.locator('#case-count')).toBeVisible();
  expect((await readState(page)).decisions[state.caseIds[0]].decision).toBe('allow');
});

test('English rescue controls, outcomes and clock preserve the case',async({page})=>{
  let state=enterCampaignDay(campaignStart(23));state=act(state,{type:'call'});state=act(state,{type:'tick',ms:91000});
  expect(state.phase).toBe('defense');await english(page,state);await noChinese(page);
  for(const action of ['defense:start','defense:open','defense:take'])await page.locator(`[data-action="${action}"]`).click();
  const saved=await readState(page);
  for(const target of saved.campaign.attack.targets)await page.locator(`[data-action="fire:${target.id}"]`).click();
  await page.locator('[data-action="defense:isolate"]').click();
  await expect.poll(async()=>(await readState(page)).campaign.attack.stage).toBe('result');await noChinese(page);
  await expect(page.getByText('The abnormal outbound channel is disconnected.',{exact:true})).toBeVisible();
  await page.screenshot({path:'docs/readme/rescue-en.png'});
  await page.reload();await noChinese(page);expect((await readState(page)).campaign.attack.charge).toBe(1);
});

for(const ending of ['E01','E10'])test(`English ${ending} epilogue and echoes`,async({page})=>{
  const open:Record<string,string>={'liang-intro':'receive','liang-contract':'accept','liang-samples':'accept','community-register':'authorize',dispatch:'submit'};
  const choose=(id:string)=>ending==='E10'?(open[id]??'return'):'return';
  let state=act(finishCampaignWork(enterCampaignDay(campaignStart(31,'relaxed',choose),choose)),{type:'settle'});
  if(!state.ending)state=act(state,{type:'supply',choice:{electricity:true,tokens:true}});
  expect(state.ending).toBe(ending);await english(page,state);await noChinese(page);
  for(let i=0;i<3;i++){await page.locator('[data-action="ending-next"]').click();await expect.poll(async()=>(await readState(page)).campaign.endingLine).toBe(i+1);await noChinese(page);}
  await expect(page.locator('[data-action="restart"]')).toBeVisible();
  await page.locator('[data-action="restart"]').scrollIntoViewIfNeeded();
  const restart=await page.locator('[data-action="restart"]').boundingBox(),article=await page.locator('.campaign-ending article').boundingBox();
  // Layout and scroll offsets round to different subpixel grids across engines.
  expect(restart!.y+restart!.height).toBeLessThanOrEqual(article!.y+article!.height+1);
  await page.screenshot({path:`docs/readme/ending-en-${ending}.png`});
});

for(const day of [8,17,23,26,31])test(`English campaign documents D${day}`,async({page})=>{
  await english(page,campaignStart(day));
  await expect(page.getByRole('button',{name:'Go to work',exact:true})).toBeVisible();await noChinese(page);
  await page.screenshot({path:`docs/readme/newspaper-en-d${day}.png`});
});

test('English correspondence has translated content',async({page})=>{
  let state=act(campaignStart(8),{type:'go-desk'});
  while(state.pauses.includes('briefing'))state=act(state,{type:'dismiss',reason:'briefing'});
  await english(page,state);
  await expect(page.getByRole('heading',{name:'Open-use statement'})).toBeVisible();await noChinese(page);
  await page.screenshot({path:'docs/readme/mail-en.png'});
});

for(const phase of ['night','family'] as const)test(`English ${phase} account and resource screens`,async({page})=>{
  let state=act(finishCampaignWork(enterCampaignDay(campaignStart(1))),{type:'settle'});
  if(phase==='family')state=act(state,{type:'supply',choice:{electricity:true,tokens:true}});
  await english(page,state);await noChinese(page);
  await expect(page.locator(`.screen.${phase}`)).toBeVisible();
  await page.screenshot({path:`docs/readme/${phase}-en.png`});
});
