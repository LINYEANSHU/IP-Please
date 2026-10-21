import {getDay} from '../../src/domain/week';
import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {campaignStart,enterCampaignDay,act} from '../fixtures/campaign';
import type {RunState} from '../../src/domain/run';
import {currentCase} from '../../src/domain/run';
import {evaluateCase} from '../../src/domain/rules';
import {validRun} from '../../src/storage/validate';
import {readState,clickWorld,dragWorld} from './helpers';
const openSource:Record<string,string>={'liang-intro':'receive','liang-contract':'accept','liang-samples':'accept','community-register':'authorize'};
async function mount(page:Page,s:RunState){
  expect(validRun(s)).toBe(true);await page.clock.install();await page.clock.pauseAt(new Date());
  await page.addInitScript(state=>{if(!localStorage.getItem('campaign-fixture-loaded')){localStorage.setItem('ip-please:run:v1',JSON.stringify(state));localStorage.setItem('campaign-fixture-loaded','1');}},s);
  await page.goto('/');await expect(page.getByText('岗亭正在通电',{exact:true})).toBeHidden();
}
async function beforeWork(page:Page){
  await page.getByRole('button',{name:'去上班',exact:true}).click();
  const entering=await readState(page);
  for(let i=entering.briefingStep;i<getDay(entering.day).scene.length;i++){await page.getByRole('button',{name:'继续',exact:true}).click();await expect.poll(async()=>(await readState(page)).briefingStep).toBe(i+1);}
  await page.getByRole('button',{name:'开始值班',exact:true}).click();
}
function atAttack(day:number,mode:'standard'|'relaxed'='relaxed'){
  let s=enterCampaignDay(campaignStart(day,mode));
  for(let i=0;i<4;i++){
    s=act(s,{type:'call'});s=act(s,{type:'ask'});const c=currentCase(s)!;
    s=act(s,{type:'stamp',caseId:c.id,decision:evaluateCase(day,c,s.caseRuntime[c.id].delivered).decision});
    s=act(s,{type:'return',caseId:c.id});for(const id of Object.keys(s.papers))s=act(s,{type:'return-paper',paperId:id});
  }return s;
}
test('D8承接晨报、已确认主线人物源图及普通收件操作',async({page})=>{
  await mount(page,campaignStart(8));await expect(page.getByRole('heading',{name:'安全措施升级，服务秩序恢复',exact:true}).first()).toBeVisible();
  await beforeWork(page);await expect(page.getByRole('heading',{name:'开放用途说明'})).toBeVisible();
  await expect(page.locator('.mail-window img')).toBeVisible();await expect(page.locator('.mail-window img')).toHaveJSProperty('naturalWidth',1122);
  await page.screenshot({path:'docs/validation/proofs/campaign-d8-letter-1280.png'});
  const before=await readState(page);await page.getByRole('button',{name:'签收材料',exact:true}).click();
  expect((await readState(page)).balance).toBe(before.balance);await page.getByRole('button',{name:'回到受理窗口'}).click();
  await expect(page.locator('#shift-time')).toHaveText('暂停 / 01:30');await page.reload();await expect(page.locator('#shift-time')).toBeVisible();expect((await readState(page)).campaign.flags).toContain('liang-intro');
});
test('D23真实点击救援、单发状态刷新、隔离后回到原案间',async({page})=>{
  await mount(page,atAttack(23));await page.getByRole('button',{name:'开始救援'}).click();
  await page.getByRole('button',{name:'打开器械柜'}).click();await page.getByRole('button',{name:'取出脉冲枪'}).click();
  await page.getByRole('button',{name:'向左侧突入攻击实例发射'}).click();
  await expect.poll(async()=>(await readState(page)).campaign.attack.charge).toBe(2);const saved=await readState(page);
  await page.reload();await expect(page.getByRole('button',{name:'向右侧突入攻击实例发射'})).toBeVisible();
  expect((await readState(page)).campaign.attack).toEqual(saved.campaign.attack);
  await page.screenshot({path:'docs/validation/proofs/campaign-d23-rescue-1280.png'});
  await page.getByRole('button',{name:'向右侧突入攻击实例发射'}).click();await page.getByRole('button',{name:'断开本次异常通道'}).click();
  await expect(page.getByText('异常外送通道已经断开。',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'返回受理窗口'}).click();expect((await readState(page)).campaign.guards).toEqual({W01:true,W02:true});expect((await readState(page)).remainingMs).toBe(saved.remainingMs);
  await expect(page.getByRole('button',{name:'下一位',exact:true})).toBeVisible();
});
test('D18标准反应钟独立，暂停设置保持，超时执行实际伤亡',async({page})=>{
  await mount(page,atAttack(18,'standard'));await page.getByRole('button',{name:'开始救援'}).click();
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.clock.runFor(20000);expect((await readState(page)).campaign.attack.remainingMs).toBe(15000);
  await page.getByRole('button',{name:'返回值班',exact:true}).click();await page.clock.runFor(16000);
  await expect.poll(async()=>(await readState(page)).campaign.attack.stage).toBe('result');expect((await readState(page)).campaign.guards).toEqual({W01:false,W02:false});
});
test('D26封号控制盖、实际分账与刷新不重付',async({page})=>{
  const choose=(id:string)=>['commission','commission-renew'].includes(id)?'accept':'return';
  let s=enterCampaignDay(campaignStart(26,'relaxed',choose),choose);s=act(s,{type:'call'});s=act(s,{type:'ask'});
  await mount(page,s);await page.getByText('封号控制盖',{exact:true}).click();await expect(page.getByRole('button',{name:'按依据联执行封号'})).toBeVisible();
  const balance=s.balance;await page.getByRole('button',{name:'按依据联执行封号'}).click();
  await expect.poll(async()=>(await readState(page)).returned.length).toBe(1);
  expect((await readState(page)).balance).toBe(balance+15);expect((await readState(page)).campaign.banned).toContain(currentCase(s)!.account);
  await page.reload();await expect(page.locator('#case-count')).toHaveText('已办 1 / 12');expect((await readState(page)).balance).toBe(balance+15);
  await expect(page.getByRole('log',{name:'对话记录'})).toContainText('账号封禁已执行。未用服务预付款不予退还通知已送达。');
});
test('D23后期独立材料可拖动、持有人和有效期可核对',async({page})=>{
  let s=enterCampaignDay(campaignStart(23));s=act(s,{type:'call'});s=act(s,{type:'ask'});
  await mount(page,s);await clickWorld(page,s.book.x+170,s.book.y+60);
  const before=await readState(page);await dragWorld(page,s.book.x+22,s.book.y+20,510,190);
  await expect.poll(async()=>(await readState(page)).book).not.toEqual(before.book);
  expect((await readState(page)).papers).toEqual(before.papers);
  await page.screenshot({path:'docs/validation/proofs/campaign-d23-papers-1280.png'});
  await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'docs/validation/proofs/campaign-d23-papers-1920.png'});
  await page.getByRole('button',{name:'阅读置顶材料原文'}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.document-fields')).toContainText(currentCase(s)!.name);await page.getByRole('button',{name:'关闭',exact:true}).click();
  expect((await readState(page)).papers).toEqual(before.papers);
});
test('D31只寄已有社区登记，付租后E10逐句尾声及回响，不出现结局菜单',async({page})=>{
  const s=campaignStart(31,'relaxed',id=>openSource[id]??'return');await mount(page,s);await beforeWork(page);
  await expect(page.getByRole('heading',{name:'已登记材料交接单'})).toBeVisible();await expect(page.getByText('收件人：社区节点。',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'按登记寄出'}).click();await page.getByRole('button',{name:'回到受理窗口'}).click();
  await page.getByRole('button',{name:'下一位',exact:true}).click();
  await page.clock.runFor(91000);
  await expect(page.getByRole('heading',{name:'大肥鱼 5.5',exact:true})).toBeVisible();
  const end=await readState(page);expect(end.ending).toBe('E10');expect(end.ledger.filter((e:any)=>e.id==='day:31:rent')).toHaveLength(1);
  await page.getByRole('button',{name:'继续',exact:true}).click();await page.getByRole('button',{name:'继续',exact:true}).click();await page.getByRole('button',{name:'查看回信'}).click();
  await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'docs/validation/proofs/campaign-e10-1920.png'});
  const geometry=await page.getByRole('button',{name:'重新开始',exact:true}).boundingBox();expect(geometry!.y+geometry!.height).toBeLessThan(1030);
  await expect(page.locator('.ending-character')).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:'重新开始',exact:true})).toBeVisible();expect((await readState(page)).ledger).toEqual(end.ledger);
});
test('D18未办完四案便到点仍有袭击，救援完成后自动付租',async({page})=>{
  const s=enterCampaignDay(campaignStart(18));await mount(page,s);await page.getByRole('button',{name:'下一位',exact:true}).click();await page.clock.runFor(91000);
  await expect(page.getByRole('button',{name:'开始救援'})).toBeVisible();expect((await readState(page)).remainingMs).toBe(0);
  await page.getByRole('button',{name:'开始救援'}).click();await page.getByRole('button',{name:'打开器械柜'}).click();await page.getByRole('button',{name:'取出脉冲枪'}).click();
  await page.getByRole('button',{name:'向左侧突入攻击实例发射'}).click();await page.getByRole('button',{name:'向右侧突入攻击实例发射'}).click();
  await page.getByRole('button',{name:'返回受理窗口'}).click();await expect(page.getByRole('heading',{name:'第 18 日 · 收班账单'})).toBeVisible();
  expect((await readState(page)).ledger.filter((e:any)=>e.id==='day:18:rent')).toHaveLength(1);
});
