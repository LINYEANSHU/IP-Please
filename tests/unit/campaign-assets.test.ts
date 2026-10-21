import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {getDay} from '../../src/domain/week';
it('全部后期人物与已确认的大肥鱼形象均有实际素材，客串不借用普通人头像',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../../public/assets/manifest.json',import.meta.url),'utf8'));
  const cast=[[12,'N01'],[14,'N02'],[16,'N03'],[17,'N04'],[19,'N05'],[21,'N06'],[25,'N07']] as const;
  for(const [day,id] of cast)expect(getDay(day).cases[1].portraitId).toBe(id);
  const ids=new Set(['M08',...Array.from({length:31},(_,i)=>getDay(i+1)).flatMap(d=>d.cases.map(c=>c.portraitId))]);
  for(const id of ids){
    const portrait=manifest.portraits[id];expect(portrait,id).toBeDefined();const sheet=manifest.sheets[portrait.sheet];
    expect(existsSync(new URL('../../public/assets/'+sheet.file,import.meta.url)),id).toBe(true);
    expect(portrait.rect.x+portrait.rect.width).toBeLessThanOrEqual(sheet.width);expect(portrait.rect.y+portrait.rect.height).toBeLessThanOrEqual(sheet.height);
  }
});
