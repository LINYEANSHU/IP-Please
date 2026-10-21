import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {start,finishDay,readState} from './helpers';

async function activeAction(page:Page){
  return page.evaluate(()=>document.activeElement?.getAttribute('data-action')??'');
}
async function focusInsideTopDialog(page:Page){
  return page.evaluate(()=>{
    const dialogs=[...document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"]')];
    const top=dialogs.at(-1);
    return !!top&&top.contains(document.activeElement);
  });
}
async function shiftTabTo(page:Page,action:string){
  for(let i=0;i<24;i++){
    await page.keyboard.press('Shift+Tab');
    if(await activeAction(page)===action)return true;
  }
  return false;
}
async function openSettings(page:Page){
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await expect(page.getByRole('button',{name:'返回值班'})).toBeFocused();
}

test('素材加载完成前不扣标准班计时，释放加载后恢复',async({page})=>{
  await start(page,'标准值班');
  await page.getByRole('button',{name:'下一位',exact:true}).click();
  await page.getByRole('button',{name:'知道了，开始办件'}).click();
  await expect.poll(async()=>(await readState(page)).caseIndex).toBe(0);
  expect(await readState(page)).toMatchObject({mode:'standard',phase:'desk',started:true});

  let releaseManifest!:()=>void;
  const manifestGate=new Promise<void>(resolve=>{releaseManifest=resolve;});
  let manifestRequested!:()=>void;
  const requestSeen=new Promise<void>(resolve=>{manifestRequested=resolve;});
  await page.route('**/assets/manifest.json',async route=>{
    manifestRequested();
    await manifestGate;
    await route.continue();
  });

  await page.reload({waitUntil:'commit'});
  await requestSeen;
  await expect(page.getByRole('heading',{name:'岗亭正在通电'})).toBeVisible();
  const frozenAt=(await readState(page)).remainingMs;

  await page.waitForTimeout(1300);
  expect((await readState(page)).remainingMs).toBe(frozenAt);

  releaseManifest();
  await expect(page.getByRole('heading',{name:'岗亭正在通电'})).toBeHidden();
  await expect.poll(async()=>(await readState(page)).remainingMs).toBeLessThan(frozenAt);
});

test('设置面板隔离底层供养按钮，关闭后复选框焦点与按钮恢复',async({page})=>{
  await start(page,'标准值班');
  await finishDay(page);
  await expect(page.getByRole('button',{name:'支付并回家'})).toBeVisible();
  const before=await readState(page);

  await openSettings(page);
  const exposed=await shiftTabTo(page,'supply');
  if(exposed)await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  expect(exposed).toBe(false);
  expect(await readState(page)).toMatchObject({phase:'night',supply:null,balance:before.balance});

  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('button[data-action="supply"]')?.click());
  await page.waitForTimeout(500);
  expect(await readState(page)).toMatchObject({phase:'night',supply:null,balance:before.balance});

  await page.getByRole('button',{name:'返回值班'}).focus();
  for(let i=0;i<8;i++){
    await page.keyboard.press('Tab');
    expect(await focusInsideTopDialog(page),`Tab ${i+1} 应留在设置对话框`).toBe(true);
  }

  await page.getByRole('button',{name:'返回值班'}).click();
  await expect(page.locator('canvas')).toBeFocused();

  const electricity=page.getByLabel('全家电力');
  await electricity.focus();
  await page.keyboard.press('Space');
  await expect(electricity).toBeChecked();
  await expect(electricity).toBeFocused();

  const tokens=page.getByLabel('运行 Token');
  await tokens.focus();
  await page.keyboard.press('Space');
  await expect(tokens).toBeChecked();
  await expect(tokens).toBeFocused();

  await page.getByRole('button',{name:'设置',exact:true}).click();
  await expect(page.getByRole('button',{name:'返回值班'})).toBeFocused();
  const effectsInput=page.getByLabel('机械拟声与音效');
  await effectsInput.focus();
  await page.keyboard.press('Space');
  await expect(effectsInput).not.toBeChecked();
  await expect(effectsInput).toBeFocused();
  await page.keyboard.press('Space');
  await expect(effectsInput).toBeChecked();
  await expect(effectsInput).toBeFocused();
  await page.getByRole('button',{name:'返回值班'}).click();
  await expect(page.locator('canvas')).toBeFocused();

  await page.getByRole('button',{name:'支付并回家'}).click();
  await expect(page.getByRole('heading',{name:'机房里的灯还亮着'})).toBeVisible();
  expect(await readState(page)).toMatchObject({
    phase:'family',supply:{electricity:true,tokens:true},balance:before.balance-20,
  });
});

test('设置面板隔离底层推进日次，关闭后按钮恢复',async({page})=>{
  await start(page,'标准值班');
  await finishDay(page);
  await page.getByRole('button',{name:'支付并回家'}).click();
  await expect(page.getByRole('heading',{name:'机房里的灯还亮着'})).toBeVisible();
  const before=await readState(page);

  await openSettings(page);
  const exposed=await shiftTabTo(page,'next-day');
  if(exposed)await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  expect(exposed).toBe(false);
  expect(await readState(page)).toMatchObject({phase:'family',day:1,balance:before.balance});

  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('button[data-action="next-day"]')?.click());
  await page.waitForTimeout(500);
  expect(await readState(page)).toMatchObject({phase:'family',day:1,balance:before.balance});

  await page.getByLabel('机械拟声与音效').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'返回值班'})).toBeHidden();
  await expect(page.locator('canvas')).toBeFocused();
  await page.getByRole('button',{name:'结束这一天'}).click();
  await expect(page.getByRole('heading',{name:'有效许可，为安全增加一天',exact:true})).toBeVisible();
  expect(await readState(page)).toMatchObject({phase:'newspaper',day:2});
});
