import {test,expect,chromium} from '@playwright/test';
import {createServer} from 'node:net';
import {start,call,readState,world} from './helpers';

test('真实标签切换暂停，恢复不补扣后台时间，离开页面取消手持印章',async({baseURL},testInfo)=>{
  // A second CDP session cannot disable the focus override owned by Playwright's
  // first session. Attach to an untouched default context with noDefaults instead.
  const server=createServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=(server.address() as {port:number}).port;
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  const launched=await chromium.launch({headless:false,channel:'chrome',args:[`--remote-debugging-port=${port}`,'--window-position=-2400,-2400']});
  try{
    const attached=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{noDefaults:true});
    const context=attached.contexts()[0];
    const page=await context.newPage();await page.setViewportSize({width:1280,height:720});
    try{
      await start(page,'标准值班',baseURL!);await call(page,0);
      const pos=await world(page,596,315);await page.mouse.move(pos.x,pos.y);await page.mouse.down();
      const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
      // Check the browser's actual state as well as the game's persisted pause.
      await expect.poll(()=>page.evaluate(()=>document.hidden)).toBe(true);
      // Native focus reporting differs on hosted macOS. Actual tab visibility
      // and the game's response are the contract; preserve focus as evidence.
      await testInfo.attach('browser-background-state',{body:JSON.stringify(await page.evaluate(()=>({hidden:document.hidden,focus:document.hasFocus()}))),contentType:'application/json'});
      await expect.poll(async()=>(await readState(page)).pauses).toContain('background');
      const before=(await readState(page)).remainingMs;await page.waitForTimeout(1100);
      expect((await readState(page)).remainingMs).toBe(before);
      await page.bringToFront();
      await expect.poll(()=>page.evaluate(()=>document.hidden)).toBe(false);
      await expect.poll(async()=>(await readState(page)).pauses).not.toContain('background');
      const s=await readState(page),drop=await world(page,s.book.x+163,s.book.y+112);
      await page.mouse.move(drop.x,drop.y);await page.mouse.up();expect((await readState(page)).decisions).toEqual({});
      await page.waitForTimeout(400);expect((await readState(page)).remainingMs).toBeGreaterThan(before-1100);
    }catch(error){
      await page.screenshot({path:testInfo.outputPath('background-failure.png')}).catch(()=>{});
      throw error;
    }
  }finally{
    await launched.close();
  }
});
