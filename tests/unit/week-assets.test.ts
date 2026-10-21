import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {WEEK_DAYS} from '../../src/domain/week';
it('首周每位申请人都有实际可加载的人物源图和合法裁切',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../../public/assets/manifest.json',import.meta.url),'utf8'));
  for(const id of new Set(WEEK_DAYS.flatMap(d=>d.cases.map(c=>c.portraitId)))){
    const portrait=manifest.portraits[id];expect(portrait,id).toBeDefined();
    const sheet=manifest.sheets[portrait.sheet];expect(existsSync(new URL('../../public/assets/'+sheet.file,import.meta.url)),id).toBe(true);
    expect(portrait.rect.x+portrait.rect.width).toBeLessThanOrEqual(sheet.width);expect(portrait.rect.y+portrait.rect.height).toBeLessThanOrEqual(sheet.height);
  }
});
