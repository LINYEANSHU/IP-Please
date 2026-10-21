import {it, expect} from 'vitest';
import {toWorldPoint, hitStampArea} from '../../src/view/hit-test';
it('letterbox、2×和3×转换到同一世界坐标，画布外返回 null',()=>{
  for(const scale of [2,3]){
    const b={left:20,top:30,width:640*scale,height:360*scale} as DOMRect;
    expect(toWorldPoint(20+400*scale,30+250*scale,b)).toEqual({x:400,y:250});
    expect(toWorldPoint(19,50,b)).toBe(null);
  }
  const b={left:0,top:0,width:1280,height:800} as DOMRect;
  expect(toWorldPoint(800,540,b)).toEqual({x:400,y:250});
  expect(toWorldPoint(10,20,b)).toBe(null);
});
it('只允许打开册内页的章区；封皮与册外均无效',()=>{
  const book={x:350,y:160,width:220,height:152};
  expect(hitStampArea({x:520,y:270},book,'inside')).toBe(true);
  expect(hitStampArea({x:520,y:270},book,'cover')).toBe(false);
  expect(hitStampArea({x:370,y:270},book,'inside')).toBe(false);
  expect(hitStampArea({x:620,y:270},book,'inside')).toBe(false);
});
