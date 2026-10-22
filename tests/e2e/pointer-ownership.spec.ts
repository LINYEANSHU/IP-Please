import {test,expect} from '@playwright/test';
import {start,call,readState,world,stamp} from './helpers';

test.use({hasTouch:true});
test('第二根手指不抢走印章，主指针仍能完成裁决',async({page,context})=>{
  await page.clock.install();await page.clock.pauseAt(new Date());
  await start(page);await call(page,0);
  const client=await context.newCDPSession(page),s=await readState(page);
  const a=await world(page,596,315),b=await world(page,260,180),end=await world(page,s.book.x+163,s.book.y+112);
  const touch=(id:number,p:{x:number;y:number})=>({id,...p,radiusX:1,radiusY:1,force:1});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,a)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,a),touch(2,b)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,end),touch(2,b)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[touch(2,b)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>(await readState(page)).decisions[s.caseIds[0]]?.decision).toBe('allow');
});

test('其他指针的取消事件不清除主拖动，真正取消后可重新操作',async({page})=>{
  await page.clock.install();await page.clock.pauseAt(new Date());
  await start(page);await call(page,0);
  const s=await readState(page),from=await world(page,596,315),end=await world(page,s.book.x+163,s.book.y+112);
  await page.mouse.move(from.x,from.y);await page.mouse.down();
  await page.locator('canvas').dispatchEvent('pointercancel',{pointerId:999});
  await page.mouse.move(end.x,end.y,{steps:5});await page.mouse.up();
  await expect.poll(async()=>(await readState(page)).phase).toBe('returning');
  await page.mouse.move(from.x,from.y);await page.mouse.down();
  await page.locator('canvas').dispatchEvent('pointercancel',{pointerId:1});
  await page.mouse.move(end.x,end.y);await page.mouse.up();
  expect((await readState(page)).decisions[s.caseIds[0]].decision).toBe('allow');
  await stamp(page,false);
  expect((await readState(page)).decisions[s.caseIds[0]].decision).toBe('reject');
});
