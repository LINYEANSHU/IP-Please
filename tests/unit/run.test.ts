import { describe, it, expect } from 'vitest';
import { newRun, reduceRun } from '../../src/domain/run';
import type { RunAction, RunState, ActionBody } from '../../src/domain/run';
import { DAY_ONE_CASES, requiredDecision } from '../../src/domain/day-one';
let sequence = 0;
const step = (s:RunState, a:ActionBody) => reduceRun(s, {...a, actionId:`a-${sequence++}`} as RunAction).state;
const ready = (mode:'standard'|'relaxed'='standard') => step(step(newRun(mode,'unit'),{type:'go-desk'}),{type:'dismiss',reason:'briefing'});
function process(s:RunState, index:number, decision = requiredDecision(DAY_ONE_CASES[index])) {
  s=step(s,{type:'call'}); s=step(s,{type:'dismiss',reason:'tutorial'});
  s=step(s,{type:'stamp',caseId:DAY_ONE_CASES[index].id,decision});
  s=step(s,{type:'dismiss',reason:'citation'});
  return step(s,{type:'return',caseId:DAY_ONE_CASES[index].id});
}
describe('裁决、返还与一次性账本',()=>{
  it('正确拒绝也计件，第八案后不生成第九案',()=>{
    let s=ready(); for(let i=0;i<8;i++)s=process(s,i);
    expect(s.phase).toBe('night'); expect(s.balance).toBe(60);
    expect(s.ledger.filter(e=>e.kind==='wage')).toHaveLength(8);
    expect(step(s,{type:'call'})).toEqual(s);
  });
  it('不能二次盖章或不退件就叫下一位',()=>{
    let s=step(ready(),{type:'call'}); s=step(s,{type:'dismiss',reason:'tutorial'});
    const a:RunAction={type:'stamp',caseId:'D01-S01',decision:'allow',actionId:'same'};
    s=reduceRun(s,a).state;
    expect(reduceRun(s,a).state).toEqual(s);
    expect(step(s,{type:'stamp',caseId:'D01-S01',decision:'reject'}).decisions['D01-S01'].decision).toBe('reject');
    expect(step(s,{type:'call'})).toEqual(s);
    expect(s.balance).toBe(25);
  });
  it.each(['standard','relaxed'] as const)('%s 明显违规独立直接处罚，错拒按普通警告',mode=>{
    let s=ready(mode); s=process(s,0,'reject'); s=process(s,1,'reject');
    s=process(s,2,'allow'); s=process(s,3); s=process(s,4); s=process(s,5,'allow');
    expect(s.ledger.filter(e=>e.kind==='fine').map(e=>e.amount)).toEqual(mode==='standard'?[-10,-10,-15]:[-5,-10]);
    expect(s.decisions['D01-S03']).toMatchObject({correct:false,ruleVersion:'V01',penalty:mode==='standard'?10:5});
  });
  it('暂停不扣时；归零立即收班；轻松也计 90 秒',()=>{
    let s=step(ready(),{type:'call'});
    expect(step(s,{type:'tick',ms:2000}).remainingMs).toBe(90000);
    s=step(s,{type:'dismiss',reason:'tutorial'});
    s=step(s,{type:'pause',reason:'settings',paused:true});
    expect(step(s,{type:'tick',ms:2000}).remainingMs).toBe(90000);
    s=step(s,{type:'pause',reason:'settings',paused:false});
    s=step(s,{type:'tick',ms:90000}); expect(s).toMatchObject({phase:'night',remainingMs:0});
    expect(step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'})).toEqual(s);
    let relaxed=step(ready('relaxed'),{type:'call'});relaxed=step(relaxed,{type:'dismiss',reason:'tutorial'});
    expect(step(relaxed,{type:'tick',ms:90000})).toMatchObject({phase:'night',remainingMs:0});
  });
  it('对话每点一次一行，计时不推进对话',()=>{
    let s=step(ready(),{type:'call'}); s=step(s,{type:'dismiss',reason:'tutorial'});
    expect(s.dialogueLine).toBe(0);
    s=step(s,{type:'tick',ms:2000}); expect(s.dialogueLine).toBe(0);
    s=step(s,{type:'dialogue'}); expect(s.dialogueLine).toBe(1);
  });
  it('墨迹跟随实际落点保存在册内，移动册子不会改变相对位置',()=>{
    let s=step(ready(),{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow',at:{x:170,y:110}} as ActionBody);
    expect(s.decisions['D01-S01']).toMatchObject({mark:{x:170,y:110}});
    s=step(s,{type:'move',paper:'book',x:390,y:144});
    expect(s.decisions['D01-S01']).toMatchObject({mark:{x:170,y:110}});
  });
});
