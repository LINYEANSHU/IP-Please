import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {start,call,stamp,giveBack,readState,dragWorld} from './helpers';
const EXPECTED=['AARAARAA','RARRAARRARAA','AAARRAAARRAR','AAARARRRAAAR','AAARARRAARRA','AARRAARARRAA','AARARARRAARA'];
test.use({actionTimeout:10000});
async function briefing(page:Page){
  await page.getByRole('button',{name:'去上班',exact:true}).click();
  await expect(page.locator('.memo')).toBeVisible();
  while(await page.getByRole('button',{name:'继续',exact:true}).isVisible()){
    const before=(await readState(page)).briefingStep;await page.getByRole('button',{name:'继续',exact:true}).click();
    await expect.poll(async()=>(await readState(page)).briefingStep).toBe(before+1);
  }
  await page.getByRole('button',{name:'开始值班',exact:true}).click();
  await expect.poll(async()=>(await readState(page)).pauses).toEqual([]);
}
async function returnActualPaper(page:Page,id:string){
  await page.locator(`[data-action="show-paper:${id}"]`).click();
  await expect.poll(async()=>(await readState(page)).topPaper).toBe(id);
  const s=await readState(page),p=s.papers[id];
  await dragWorld(page,p.x+22,p.y+32,120,200);
  await expect.poll(async()=>(await readState(page)).caseRuntime[s.caseIds[s.caseIndex]].returnedPapers).toContain(id);
}
for(const mode of ['标准值班','轻松值班'])test(`${mode} 实际鼠标办完首周80案、材料逐件递还、D7过场与D8存档`,async({page})=>{
  test.setTimeout(300000);await page.clock.install();await page.clock.pauseAt(new Date());await start(page,mode);
  for(let day=1;day<=7;day++){
    if(day>1)await briefing(page);
    for(let i=0;i<EXPECTED[day-1].length;i++){
      await call(page,i);
      if(day>1){
        await page.getByRole('button',{name:'询问材料',exact:true}).click();
        await expect.poll(async()=>(await readState(page)).caseRuntime[`D0${day}-S${String(i+1).padStart(2,'0')}`].asked).toBe(true);
        await page.locator('[data-action="show-paper:book"]').click();
      }
      await stamp(page,EXPECTED[day-1][i]==='A');
      const s=await readState(page);expect(s.decisions[s.caseIds[i]].correct).toBe(true);
      if(day===4&&i===0){
        const placed=await readState(page);await page.reload();await expect(page.locator('#case-count')).toBeVisible();
        expect((await readState(page)).papers).toEqual(placed.papers);
      }
      if(i===0&&[2,3,4,5,6,7].includes(day))await page.screenshot({path:`docs/validation/proofs/week-day-${day}-${mode==='标准值班'?'standard':'relaxed'}.png`});
      for(const id of Object.keys(s.papers))await returnActualPaper(page,id);
      await giveBack(page);
    }
    if(day===7){
      await expect(page.getByRole('heading',{name:'值班窗口已关闭'})).toBeVisible();
      expect((await readState(page)).story.oldRulesReceived).toBe(true);
      await page.getByRole('button',{name:'继续',exact:true}).click();
      await expect.poll(async()=>(await readState(page)).story.incidentLine).toBe(1);
      const balance=(await readState(page)).balance;await page.reload();
      await expect(page.getByRole('heading',{name:'值班窗口已关闭'})).toBeVisible();
      expect(await readState(page)).toMatchObject({balance,story:{incidentLine:1,guardAlive:true}});
      await page.getByRole('button',{name:'继续',exact:true}).click();
      await page.screenshot({path:`docs/validation/proofs/week-incident-${mode==='标准值班'?'standard':'relaxed'}.png`});
      await page.getByRole('button',{name:'等待值守交接'}).click();
    }
    await expect(page.getByText('服务器租金已扣除',{exact:true})).toBeVisible();
    await page.getByLabel('全家电力').check();await page.getByLabel('运行 Token').check();await page.getByRole('button',{name:'支付并回家'}).click();
    await expect(page.getByRole('heading',{name:'机房里的灯还亮着'})).toBeVisible();
    expect((await readState(page)).balance).toBe(mode==='标准值班'?day*30:30+day*30);
    await page.getByRole('button',{name:'结束这一天'}).click();
    await expect.poll(async()=>(await readState(page)).day).toBe(day+1);
  }
  await expect(page.getByRole('heading',{name:'安全日报',exact:true})).toBeVisible();
  const end=await readState(page);expect(Object.keys(end.decisions)).toHaveLength(80);expect(end.ledger.filter((e:any)=>e.kind==='rent')).toHaveLength(7);
  await page.reload();await expect(page.getByRole('heading',{name:'安全日报',exact:true})).toBeVisible();expect((await readState(page)).ledger).toEqual(end.ledger);
});
