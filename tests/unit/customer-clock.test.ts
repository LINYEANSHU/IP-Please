import {describe,it,expect} from 'vitest';
import {newRun,reduceRun,currentCase} from '../../src/domain/run';
import type {RunState,ActionBody} from '../../src/domain/run';
import {atCase} from '../fixtures/week';
import {evaluateCase} from '../../src/domain/rules';

let sequence=0;
const step=(s:RunState,a:ActionBody)=>reduceRun(s,{...a,actionId:`customer-clock-${sequence++}`}).state;
const ready=(mode:'standard'|'relaxed')=>step(step(newRun(mode,'customer-clock'),{type:'go-desk'}),{type:'dismiss',reason:'briefing'});

describe('只在接待客户时扣除值班时间',()=>{
  it.each(['standard','relaxed'] as const)('%s 未叫号时长时间等待不扣时、不收班、不生成存档修订',mode=>{
    const s=ready(mode);
    const transition=reduceRun(s,{type:'tick',ms:180000,actionId:'idle'});
    expect(transition.state).toBe(s);
    expect(transition.effects).toEqual([]);
    expect(s).toMatchObject({phase:'desk',caseIndex:-1,remainingMs:90000});
  });

  it('完整退件后暂停，下一位从剩余时间继续',()=>{
    let s=step(ready('standard'),{type:'call'});
    s=step(s,{type:'dismiss',reason:'tutorial'});
    s=step(s,{type:'tick',ms:12000});
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    s=step(s,{type:'return',caseId:'D01-S01'});
    expect(s).toMatchObject({phase:'desk',remainingMs:78000,returned:['D01-S01']});
    expect(step(s,{type:'tick',ms:180000})).toBe(s);
    s=step(s,{type:'call'});
    s=step(s,{type:'tick',ms:1000});
    expect(s).toMatchObject({phase:'desk',caseIndex:1,remainingMs:77000});
  });

  it('册子退了但材料未齐仍在接待，最后一份退还后才暂停',()=>{
    let s=atCase(4,0);
    const c=currentCase(s)!;
    const papers=Object.keys(s.papers);
    expect(papers.length).toBeGreaterThan(1);
    s=step(s,{type:'stamp',caseId:c.id,decision:evaluateCase(4,c,s.caseRuntime[c.id].delivered).decision});
    s=step(s,{type:'return',caseId:c.id});
    s=step(s,{type:'tick',ms:1000});
    expect(s).toMatchObject({phase:'returning',remainingMs:89000});
    for(const paperId of papers.slice(0,-1))s=step(s,{type:'return-paper',paperId});
    s=step(s,{type:'tick',ms:1000});
    expect(s.remainingMs).toBe(88000);
    s=step(s,{type:'return-paper',paperId:papers.at(-1)!});
    expect(s.returned).toContain(c.id);
    expect(step(s,{type:'tick',ms:90000})).toBe(s);
  });
});
