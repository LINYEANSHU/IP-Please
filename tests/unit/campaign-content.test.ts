import {describe,it,expect} from 'vitest';
import {getDay,getCaseById} from '../../src/domain/week';
import {evaluateCase} from '../../src/domain/rules';

describe('完整月份案卷与渐进规则',()=>{
  it('31 日共 368 个唯一案位；所有纸张可追溯',()=>{
    const days=Array.from({length:31},(_,i)=>getDay(i+1));
    const cases=days.flatMap(d=>d.cases);
    expect(cases).toHaveLength(368);expect(new Set(cases.map(c=>c.id)).size).toBe(368);
    for(const d of days){expect(d.cases).toHaveLength(d.day===1?8:12);expect(d.version).toBe(`V${String(d.day).padStart(2,'0')}`);}
    for(const c of cases){expect(getCaseById(c.id)).toEqual(c);expect(new Set([...c.initialPapers,...c.askedPapers].map(p=>p.id)).size).toBe(c.initialPapers.length+c.askedPapers.length);}
  });
  it('后期每天有合法受理、明确违规与可问出的补件；没有全拒绝死局',()=>{
    for(let day=8;day<=31;day++){
      const cases=getDay(day).cases,answers=cases.map(c=>evaluateCase(day,c,[...c.initialPapers,...c.askedPapers].map(p=>p.id)));
      expect(answers.some(a=>a.decision==='allow'),`D${day}`).toBe(true);
      expect(answers.some(a=>a.decision==='reject'),`D${day}`).toBe(true);
      expect(cases.some(c=>c.askedPapers.length>0)).toBe(true);
    }
  });
  it('新增材料只在对应日期后发放；D26 清理有正式执行联',()=>{
    const gates:Record<string,number>={identity:8,overseas:9,context:10,delegation:13,relation:14,history:16,language:17,browser:18,input:19,exception:20,search:21,phoneHistory:22,configuration:23,freeze:26};
    for(let day=8;day<=31;day++)for(const c of getDay(day).cases)for(const p of [...c.initialPapers,...c.askedPapers])expect(day,`${p.id}/${p.kind}`).toBeGreaterThanOrEqual(gates[p.kind]??1);
    const c=getDay(26).cases.find(c=>c.initialPapers.some(p=>p.kind==='freeze'))!;
    expect(c).toBeDefined();expect(evaluateCase(26,c,[...c.initialPapers,...c.askedPapers].map(p=>p.id))).toMatchObject({decision:'reject',disposition:'ban'});
  });
});
