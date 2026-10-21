import {it,expect} from 'vitest';
import {atCase,atDay,closeDay,enterDay,step} from '../fixtures/week';
import {loadRun,saveRun} from '../../src/storage/session';
import {previewSupply} from '../../src/domain/night';
it('实际交付与历史账目不可通过改标志或改案号绕过',()=>{
  const base=atCase(4,4);
  for(const change of [
    (s:any)=>s.caseRuntime['D04-S05'].delivered.push('D04-S05-ASKED-BINDING'),
    (s:any)=>s.history[0].returned.pop(),
    (s:any)=>s.history[0].supply.electricity=false,
    (s:any)=>s.story.guardAlive=false,
    (s:any)=>s.caseRuntime['D04-S05'].bookReturned=true,
  ]){const bad=structuredClone(base);change(bad);let raw=JSON.stringify(bad),writes=0;const store={getItem:()=>raw,setItem:()=>{writes++;}};expect(loadRun(store).kind).toBe('invalid');expect(saveRun(bad,store).ok).toBe(false);expect(writes).toBe(0);}
});
it('重度与临界阶段的修复预览等于真正提交，刷新不重复扣修复费',()=>{
  const choice={electricity:false,tokens:false};let s=closeDay(enterDay(atDay(5,'relaxed',choice)));
  expect(s.family.father.damage).toBe(3);
  const purchase={...choice,repairs:['father' as const]},p=previewSupply(s,purchase),before=s.balance;
  s=step(s,{type:'supply',choice:purchase});expect(s.family).toEqual(p.family);expect(s.balance).toBe(before-24);
  const store={value:'',getItem(){return this.value||null;},setItem(_k:string,v:string){this.value=v;}};
  expect(saveRun(s,store).ok).toBe(true);const loaded=loadRun(store);expect(loaded.kind).toBe('valid');
  if(loaded.kind==='valid')expect(step(loaded.state,{type:'supply',choice:purchase})).toEqual(loaded.state);
});
