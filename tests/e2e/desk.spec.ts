import {test,expect} from '@playwright/test';
import {start,call,stamp,giveBack,readState,dragWorld,world} from './helpers';
test('实体拖章：无效区域、画布外释放、重复释放不判定；刷新保留印章',async({page})=>{
  await start(page);await call(page,0);
  await dragWorld(page,596,315,300,320);expect((await readState(page)).phase).toBe('desk');
  const a=await world(page,596,315);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(0,0);await page.mouse.up();
  expect((await readState(page)).phase).toBe('desk');
  await stamp(page,true);await page.mouse.up();expect((await readState(page)).balance).toBe(55);
  await page.reload();await expect(page.getByText('将册子和材料逐件拖回左侧窗口',{exact:false})).toBeVisible();
  expect((await readState(page)).decisions['D01-S01'].decision).toBe('allow');
  await giveBack(page);await call(page,1);
});
test('中文新加坡合规，对话静音仍逐句等待；设置与后台暂停',async({page})=>{
  await start(page,'标准值班');await call(page,0);
  await page.getByRole('button',{name:'关闭音效'}).click();
  await page.waitForTimeout(1000);expect((await readState(page)).dialogueLine).toBe(0);
  await page.getByRole('button',{name:'继续对话'}).click();await expect.poll(async()=>(await readState(page)).dialogueLine).toBe(1);
  await page.getByRole('button',{name:'设置',exact:true}).click();const before=(await readState(page)).remainingMs;
  await page.waitForTimeout(1100);expect((await readState(page)).remainingMs).toBe(before);
  await page.getByRole('button',{name:'返回值班'}).click();
  for(let i=0;i<3;i++){if(i>0)await call(page,i);await stamp(page,i!==2);await giveBack(page);}
  await call(page,3);await expect(page.getByRole('log')).toContainText('你好，麻烦看一下。');
  await stamp(page,true);expect((await readState(page)).decisions['D01-S04'].correct).toBe(true);
  await expect(page.locator('body')).not.toContainText('手机号');
});
