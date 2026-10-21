import {describe,it,expect} from 'vitest';
import {newRun,reduceRun} from '../../src/domain/run';
import type {ActionBody,RunAction,RunState} from '../../src/domain/run';
import {DAY_ONE_CASES,getModePolicy,requiredDecision} from '../../src/domain/day-one';
import {formatTime} from '../../src/view/shell';
let sequence=0;
const step=(s:RunState,a:ActionBody)=>reduceRun(s,{...a,actionId:`shift-90-${sequence++}`} as RunAction).state;
const ready=(mode:'standard'|'relaxed'='standard')=>step(step(newRun(mode,'shift-90'),{type:'go-desk'}),{type:'dismiss',reason:'briefing'});
const callFirst=(s:RunState)=>step(step(s,{type:'call'}),{type:'dismiss',reason:'tutorial'});
const processCase=(s:RunState,index:number)=>{
  s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});
  s=step(s,{type:'stamp',caseId:DAY_ONE_CASES[index].id,decision:requiredDecision(DAY_ONE_CASES[index])});
  s=step(s,{type:'dismiss',reason:'citation'});
  return step(s,{type:'return',caseId:DAY_ONE_CASES[index].id});
};
describe('90 秒值班与立即收班',()=>{
  it('标准与轻松均为 90 秒，工资与初始金不变',()=>{
    expect(getModePolicy('standard')).toEqual({initial:20,salary:10,wage:5,durationMs:90000,ordinaryWarnings:1,fine:10,severeFine:15});
    expect(getModePolicy('relaxed')).toEqual({initial:50,salary:10,wage:5,durationMs:90000,ordinaryWarnings:2,fine:5,severeFine:10});
    expect(newRun('standard','s').remainingMs).toBe(90000);
    expect(newRun('relaxed','r').remainingMs).toBe(90000);
    expect(formatTime(90000)).toBe('01:30');
    expect(formatTime(0)).toBe('00:00');
  });
  it('班前、强制公文和未叫号时都不扣时',()=>{
    let s=newRun('standard','before');
    expect(step(s,{type:'tick',ms:5000})).toMatchObject({phase:'newspaper',remainingMs:90000});
    s=step(s,{type:'go-desk'});
    expect(step(s,{type:'tick',ms:5000})).toMatchObject({phase:'desk',remainingMs:90000});
    s=step(s,{type:'dismiss',reason:'briefing'});
    s=step(s,{type:'tick',ms:1000});
    expect(s).toMatchObject({phase:'desk',remainingMs:90000,caseIndex:-1,decisions:{}});
  });
  it('普通对话、翻纸与错误盖章继续走表；设置仍暂停',()=>{
    let s=callFirst(ready());
    s=step(s,{type:'tick',ms:1000});expect(s.remainingMs).toBe(89000);
    s=step(s,{type:'dialogue'});s=step(s,{type:'open-book'});
    s=step(s,{type:'tick',ms:1000});expect(s.remainingMs).toBe(88000);
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'reject'});
    expect(s.pauses).not.toContain('citation');
    expect(s.notice).toBeNull();
    s=step(s,{type:'pause',reason:'settings',paused:true});
    expect(step(s,{type:'tick',ms:1000})).toMatchObject({remainingMs:88000});
    s=step(s,{type:'pause',reason:'settings',paused:false});
    s=step(s,{type:'tick',ms:1000});expect(s.remainingMs).toBe(87000);
  });
  it('89999/90000 边界：剩 1 毫秒仍在值班，归零当刻立即收班',()=>{
    let s=callFirst(ready('standard'));
    s=step(s,{type:'tick',ms:89999});
    expect(s).toMatchObject({phase:'desk',remainingMs:1});
    s=step(s,{type:'tick',ms:1});
    expect(s).toMatchObject({phase:'night',remainingMs:0});
  });
  it.each(['standard','relaxed'] as const)('%s 未叫号等待超过 90 秒仍不收班',mode=>{
    let s=ready(mode);
    s=step(s,{type:'tick',ms:90000});
    expect(s).toMatchObject({phase:'desk',remainingMs:90000,caseIndex:-1,decisions:{}});
    expect(s.returned).toEqual([]);
    expect(s.ledger).toEqual([]);
  });
  it('未盖章的在场案到点不造裁决、不计件、不发工资',()=>{
    let s=callFirst(ready());
    expect(s.caseIndex).toBe(0);
    s=step(s,{type:'tick',ms:90000});
    expect(s).toMatchObject({phase:'night',remainingMs:0,caseIndex:0});
    expect(s.decisions).toEqual({});
    expect(s.returned).toEqual([]);
    expect(s.ledger).toEqual([]);
  });
  it('已盖章未退件到点：保留裁决与工资，退件不能补做或重复入账',()=>{
    let s=callFirst(ready());
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    expect(s).toMatchObject({phase:'returning',remainingMs:90000});
    const stamped=s;
    s=step(s,{type:'tick',ms:90000});
    expect(s).toMatchObject({phase:'night',remainingMs:0});
    expect(s.decisions['D01-S01']).toMatchObject({decision:'allow',correct:true});
    expect(s.ledger.filter(e=>e.kind==='wage')).toEqual([expect.objectContaining({caseId:'D01-S01',amount:5})]);
    expect(s.returned).toEqual([]);
    expect(step(s,{type:'return',caseId:'D01-S01'})).toEqual(s);
    expect(step(s,{type:'stamp',caseId:'D01-S01',decision:'reject'})).toEqual(s);
    expect(step(s,{type:'call'})).toEqual(s);
    expect(step(s,{type:'dialogue'})).toEqual(s);
    expect(step(s,{type:'open-book'})).toEqual(s);
    expect(step(s,{type:'move',paper:'book',x:500,y:200})).toEqual(s);
    expect(stamped.remainingMs).toBe(90000);
  });
  it('日终 settle 只执行一次，部分案件夜间状态不重复入账',()=>{
    let s=callFirst(ready());
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    s=step(s,{type:'tick',ms:90000});
    const settled=step(s,{type:'settle'});
    expect(settled.rentPaid).toBe(true);
    expect(settled.phase).toBe('night');
    const again=step(settled,{type:'settle'});
    expect(again).toEqual(settled);
    expect(settled.ledger.filter(e=>e.kind==='salary')).toHaveLength(1);
    expect(settled.ledger.filter(e=>e.kind==='rent')).toHaveLength(1);
    expect(settled.ledger.filter(e=>e.kind==='wage')).toHaveLength(1);
  });
  it('八案全部办完仍可提前收班，无需空等',()=>{
    let s=ready('relaxed');
    for(let i=0;i<8;i++)s=processCase(s,i);
    expect(s).toMatchObject({phase:'night',remainingMs:90000,caseIndex:7});
    expect(s.returned).toHaveLength(8);
  });
});
