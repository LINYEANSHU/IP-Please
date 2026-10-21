import {it,expect} from 'vitest';
import {getDay} from '../../src/domain/week';
import {evaluateCase} from '../../src/domain/rules';
import type {WeekCase} from '../../src/domain/week-contract';
const result=(day:number,c:WeekCase)=>evaluateCase(day,c,[...c.initialPapers,...c.askedPapers].map(p=>p.id));
it('未知浏览器不在准入名单内，不能因不等于360而获准',()=>{
  const c=structuredClone(getDay(18).cases.find(c=>result(18,c).decision==='allow')!);
  c.initialPapers.find(p=>p.kind==='browser')!.values!['浏览器']='Unlisted';
  expect(result(18,c).decision).toBe('reject');
});
it('身份复核不完整转补证，不能把缺少照片结论视作本人一致',()=>{
  const c=structuredClone(getDay(8).cases.find(c=>result(8,c).decision==='allow')!);
  delete c.initialPapers.find(p=>p.kind==='identity')!.values!['照片复核'];
  expect(result(8,c).decision).toBe('reject');
});
it('委托链仍须匹配主体，特许不能覆盖身份冒用或过期主许可',()=>{
  const c=structuredClone(getDay(21).cases.find(c=>c.purpose==='business'&&result(21,c).decision==='allow')!);
  c.initialPapers.find(p=>p.kind==='delegation')!.principal='另一家委托方';
  expect(result(21,c).decision).toBe('reject');
  const d=structuredClone(getDay(20).cases[1]);d.initialPapers.find(p=>p.kind==='identity')!.values!['照片复核']='已证实冒用';expect(result(20,d).disposition).toBe('ban');
});
