import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {getCaseById,getDay} from '../../src/domain/week';
import {newspaper} from '../../src/view/week-screens';
import {newRun} from '../../src/domain/run';
const manifest=JSON.parse(readFileSync(new URL('../../public/assets/manifest.json',import.meta.url),'utf8'));

it.each([
  ['D03-S03','叶莲娜·索科洛娃','female'],['D07-S04','安娜·彼得罗娃','female'],
  ['D06-S07','Olivia Bennett','female'],['D02-S10','Élodie Bernard','female'],
  ['D04-S03','Grace Kim','female'],['D05-S04','Sophie Turner','female'],
  ['D03-S06','Lucas Moreau','male'],['D06-S03','Benoît Marchand','male'],
  ['D06-S08','Hugo Lemaire','male'],['D05-S05','Julien Roy','male'],
  ['D02-S12','Owen Hughes','male'],['D04-S09','Noah Park','male'],
])('%s 的姓名与已核对头像相配',(id,name,presentation)=>{
  const c=getCaseById(id)!;expect(c.name).toBe(name);
  expect(manifest.portraits[c.portraitId].presentation).toBe(presentation);
});

it('七份日报同时包含当日真实条款与不同的架空宣传报道',()=>{
  const pages=[];
  for(let day=1;day<=7;day++){
    const s={...newRun('relaxed','press'),day};
    const html=newspaper(s,{corridorUrl:'/test.png'} as any);pages.push(html);
    expect(html).toContain('当日办件规定');
    for(const rule of getDay(day).rules)expect(html).toContain(rule);
    expect(html).toContain('Dario Amodei');
    expect(html).toContain('融资');
    expect(html).toContain('生活短讯');
    expect(html).toContain('架空');
  }
  expect(new Set(pages).size).toBe(7);
});
