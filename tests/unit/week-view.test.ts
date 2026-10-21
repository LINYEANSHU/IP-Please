import {it,expect} from 'vitest';
import {renderShell} from '../../src/view/shell';
import {atCase,step} from '../fixtures/week';
it('补件问话显示实际回复，不继续播放旧字幕',()=>{
  let s=atCase(2,5);s=step(s,{type:'ask'});
  const html=renderShell(s,{assets:{portraits:{}},panel:null,writable:true,error:null,loaded:true,effects:false,music:false,choice:{electricity:false,tokens:false},corridorUrl:'',hint:''});
  expect(html).toContain('刚才那张拿错了，这一张才是我的许可。');
  expect(step(s,{type:'dialogue'})).toEqual(s);
});
