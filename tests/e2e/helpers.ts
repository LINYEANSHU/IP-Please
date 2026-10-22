import {expect} from '@playwright/test';
import type {Page} from '@playwright/test';
export const readState=(p:Page)=>p.evaluate(()=>JSON.parse(localStorage.getItem('ip-please:run:v1')!));
export async function world(p:Page,x:number,y:number){await expect(p.getByText('岗亭正在通电',{exact:true})).toBeHidden();const b=await p.locator('canvas').boundingBox();if(!b)throw Error('canvas missing');return {x:b.x+x*b.width/640,y:b.y+y*b.height/360};}
export async function clickWorld(p:Page,x:number,y:number){const q=await world(p,x,y);await p.mouse.click(q.x,q.y);}
export async function dragWorld(p:Page,x:number,y:number,tx:number,ty:number){const from=await world(p,x,y),to=await world(p,tx,ty);await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:12});await p.mouse.up();}
export async function start(p:Page,mode='轻松值班',url='/'){
  await p.goto(url);await p.getByRole('button',{name:mode,exact:true}).click();
  await p.getByRole('button',{name:'去上班'}).click();
  const begin=p.getByRole('button',{name:'开始值班'});await begin.click();
  await expect(begin).toBeHidden();
  await expect.poll(async()=>(await readState(p)).pauses.filter((x:string)=>x==='briefing')).toEqual([]);
}
export async function call(p:Page,index:number){
  await p.getByRole('button',{name:'下一位',exact:true}).click();
  await expect.poll(async()=>(await readState(p)).caseIndex).toBe(index);
  if(index===0&&(await readState(p)).pauses.includes('tutorial')){
    const dismiss=p.getByRole('button',{name:'知道了，开始办件'});await dismiss.click();
    await expect(dismiss).toBeHidden();
  }
  await expect.poll(async()=>(await readState(p)).pauses.filter((x:string)=>x==='tutorial'||x==='briefing')).toEqual([]);
  const s=await readState(p);if(s.bookPage==='cover'){await clickWorld(p,s.book.x+170,s.book.y+60);await expect.poll(async()=>(await readState(p)).bookPage).toBe('inside');}
}
export async function stamp(p:Page,allow:boolean){
  const s=await readState(p);await dragWorld(p,allow?596:522,315,s.book.x+163,s.book.y+112);
  await expect.poll(async()=>(await readState(p)).phase).toBe('returning');
  await expect.poll(async()=>(await readState(p)).decisions[s.caseIds[s.caseIndex]]?.decision).toBe(allow?'allow':'reject');
}
export async function giveBack(p:Page){
  const s=await readState(p);await dragWorld(p,s.book.x+30,s.book.y+30,120,200);
  await expect.poll(async()=>(await readState(p)).returned.length).toBe(s.caseIndex+1);
}
export async function finishDay(p:Page){for(let i=0;i<8;i++){await call(p,i);await stamp(p,i!==2&&i!==5);await giveBack(p);}}
