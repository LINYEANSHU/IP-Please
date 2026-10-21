import {test,expect} from '@playwright/test';
import {start,finishDay,readState} from './helpers';
for(const [mode,balance] of [['标准值班',30],['轻松值班',60]] as const){
  test(`${mode} 八案、扣租、供养与刷新闭环，余额 ${balance}`,async({page})=>{
    await start(page,mode);await finishDay(page);
    await expect(page.getByText('服务器租金已扣除')).toBeVisible();
    await expect(page.locator('.bill dt:has-text("底薪") + dd')).toHaveText('+10');
    await expect(page.locator('label').filter({has:page.locator('#electricity')})).toHaveText('全家电力 10');
    await expect(page.locator('label').filter({has:page.locator('#tokens')})).toHaveText('运行 Token 10');
    await page.screenshot({path:`docs/validation/proofs/clarity-night-${mode==='标准值班'?'standard':'relaxed'}.png`});
    const rent=(await readState(page)).balance;await page.reload();
    await expect(page.getByRole('button',{name:'支付并回家'})).toBeVisible();expect((await readState(page)).balance).toBe(rent);
    await page.getByLabel('全家电力').check();await page.getByLabel('运行 Token').check();
    await expect(page.locator('.supply-preview')).toContainText(`支付后余额 ${rent-20}`);
    await page.getByRole('button',{name:'支付并回家'}).click();
    await expect(page.getByRole('heading',{name:'机房里的灯还亮着'})).toBeVisible();
    const face=await page.locator('.family-member img').first().evaluate((img:HTMLImageElement)=>({w:img.naturalWidth,h:img.naturalHeight}));
    expect(face.w).toBeGreaterThanOrEqual(270);
    expect(face.h).toBeGreaterThanOrEqual(280);
    const endButton=await page.getByRole('button',{name:'结束这一天'}).boundingBox(),canvasBox=await page.locator('canvas').boundingBox();
    expect(endButton!.y+endButton!.height).toBeLessThanOrEqual(canvasBox!.y+canvasBox!.height);
    expect((await readState(page)).balance).toBe(balance);
    expect((await readState(page)).ledger.filter((e:any)=>['electricity','tokens'].includes(e.kind)).map((e:any)=>e.amount)).toEqual([-10,-10]);
    await page.screenshot({path:`docs/validation/proofs/clarity-family-${mode==='标准值班'?'standard':'relaxed'}.png`});
    await page.reload();await expect(page.getByRole('heading',{name:'机房里的灯还亮着'})).toBeVisible();
    expect((await readState(page)).balance).toBe(balance);
    await page.getByRole('button',{name:'结束这一天'}).click();
    await expect(page.getByRole('heading',{name:'有效许可，为安全增加一天',exact:true})).toBeVisible();expect(await readState(page)).toMatchObject({day:2,phase:'newspaper',rentPaid:false});
  });
}
