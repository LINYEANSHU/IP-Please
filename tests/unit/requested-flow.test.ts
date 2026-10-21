import {it,expect} from 'vitest';
import {atCase,step} from '../fixtures/week';
import {newRun} from '../../src/domain/run';
import {getDay} from '../../src/domain/week';
import {loadRun} from '../../src/storage/snapshot';
import {validRun} from '../../src/storage/validate';

it('两种模式新班均为90秒，旧60秒在内存按已用时间延长，不覆写原件',()=>{
  for(const mode of ['standard','relaxed'] as const)expect(newRun(mode,'ninety').remainingMs).toBe(90000);
  const old:any=atCase(1);delete old.shiftDurationMs;old.remainingMs=45000;
  const raw=JSON.stringify(old);let writes=0;
  const loaded=loadRun({getItem:()=>raw,setItem:()=>{writes++;}});
  expect(loaded).toMatchObject({kind:'valid',state:{remainingMs:75000,shiftDurationMs:90000}});
  expect(writes).toBe(0);
});

it('退册前改章替换裁决和账目，重复同章不重复入账，退册后不可再改',()=>{
  let s=atCase(1),id=s.caseIds[0];
  s=step(s,{type:'stamp',caseId:id,decision:'allow'});expect(s.balance).toBe(55);
  s=step(s,{type:'stamp',caseId:id,decision:'reject'});expect(s.balance).toBe(50);expect(s.ordinaryErrors).toBe(1);
  expect(s.ledger.filter(e=>e.caseId===id)).toHaveLength(0);
  s=step(s,{type:'stamp',caseId:id,decision:'allow'});expect(s.balance).toBe(55);expect(s.ordinaryErrors).toBe(0);
  expect(s.ledger.filter(e=>e.caseId===id)).toHaveLength(1);expect(validRun(s)).toBe(true);
  expect(step(s,{type:'stamp',caseId:id,decision:'allow'})).toEqual(s);
  s=step(s,{type:'return',caseId:id});expect(step(s,{type:'stamp',caseId:id,decision:'reject'})).toEqual(s);
});

it('老乔七天均有普通案位，使用同一搞怪人物，材料仍可按正常规则核对',()=>{
  for(let day=1;day<=7;day++){
    const visits=getDay(day).cases.filter(c=>c.personId==='COMIC-QIAO');
    expect(visits).toHaveLength(1);expect(visits[0].portraitId).toBe('Q01');expect(visits[0].dialogue.length).toBeGreaterThanOrEqual(2);
  }
});

it('错放后改拒绝会撤回罚款与严重差错，后续不继承已撤销的处罚次数',()=>{
  let s=atCase(1,2);const id=s.caseIds[2],before=s.balance;
  s=step(s,{type:'stamp',caseId:id,decision:'allow'});
  expect(s.seriousErrors).toBe(1);expect(s.balance).toBe(before-5);
  s=step(s,{type:'stamp',caseId:id,decision:'reject'});
  expect(s.seriousErrors).toBe(0);expect(s.balance).toBe(before+5);
  expect(s.ledger.filter(e=>e.caseId===id).map(e=>e.kind)).toEqual(['wage']);
  expect(validRun(s)).toBe(true);
});
