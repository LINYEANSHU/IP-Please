import {describe,it,expect} from 'vitest';
import {newRun,reduceRun,currentCase} from '../../src/domain/run';
import type {RunState,ActionBody} from '../../src/domain/run';
import {getDay} from '../../src/domain/week';
import {evaluateCase} from '../../src/domain/rules';
import {validRun} from '../../src/storage/validate';
let n=0;
const step=(s:RunState,a:ActionBody)=>{const next=reduceRun(s,{...a,actionId:`week-${n++}`}).state;expect(validRun(next),`${next.day}/${next.phase}/${a.type}`).toBe(true);return next;};
function enter(s:RunState){s=step(s,{type:'go-desk'});while(s.pauses.includes('briefing'))s=step(s,{type:'dismiss',reason:'briefing'});return s;}
function finish(s:RunState){
  for(const c of getDay(s.day).cases){
    s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});s=step(s,{type:'ask'});
    const answer=evaluateCase(s.day,c,s.caseRuntime[c.id].delivered).decision;
    s=step(s,{type:'stamp',caseId:c.id,decision:answer});
    s=step(s,{type:'return',caseId:c.id});
    for(const id of Object.keys(s.papers))if(!s.caseRuntime[c.id].returnedPapers.includes(id))s=step(s,{type:'return-paper',paperId:id});
  }
  return s;
}
describe('首周状态机',()=>{
  it.each(['standard','relaxed'] as const)('%s 七天计件、逐日唯一账目和 D8 晨报',mode=>{
    let s=newRun(mode,'week');expect(s.schemaVersion).toBe(2);
    for(let day=1;day<=7;day++){
      expect(s).toMatchObject({day,phase:'newspaper',remainingMs:90000,rentPaid:false});
      s=finish(enter(s));
      if(day===7){
        expect(s.phase).toBe('incident');expect(s.story.guardAlive).toBe(true);
        for(let i=0;i<3;i++)s=step(s,{type:'advance-scene'});
        expect(s.story.guardAlive).toBe(false);
      }
      expect(s.phase).toBe('night');s=step(s,{type:'settle'});
      const settled=s;expect(step(s,{type:'settle'})).toEqual(settled);
      s=step(s,{type:'supply',choice:{electricity:true,tokens:true}});
      expect(s.phase).toBe('family');
      expect(s.balance).toBe(mode==='standard'?day*30:30+day*30);
      expect(Object.values(s.family).every(m=>m.damage===0)).toBe(true);
      s=step(s,{type:'next-day'});
    }
    expect(s).toMatchObject({day:8,phase:'newspaper'});
    expect(Object.keys(s.decisions)).toHaveLength(80);
    expect(s.ledger.filter(e=>e.kind==='rent')).toHaveLength(7);
    expect(s.ledger.filter(e=>e.kind==='wage')).toHaveLength(80);
    expect(s.story.oldRulesReceived).toBe(true);
  });
  it('材料只有询问才实际交付；漏退一件不能叫号',()=>{
    let s=newRun('relaxed','papers');
    s=finish(enter(s));s=step(s,{type:'settle'});s=step(s,{type:'supply',choice:{electricity:true,tokens:true}});s=step(s,{type:'next-day'});s=enter(s);
    for(let i=0;i<4;i++){
      s=step(s,{type:'call'});const c=currentCase(s)!;
      s=step(s,{type:'stamp',caseId:c.id,decision:evaluateCase(2,c,s.caseRuntime[c.id].delivered).decision});
      s=step(s,{type:'return',caseId:c.id});
      for(const id of Object.keys(s.papers))if(!s.caseRuntime[c.id].returnedPapers.includes(id))s=step(s,{type:'return-paper',paperId:id});
    }
    s=step(s,{type:'call'});const c=currentCase(s)!;
    expect(c.id).toBe('D02-S05');expect(s.caseRuntime[c.id].delivered).not.toContain(c.askedPapers[0].id);
    s=step(s,{type:'ask'});expect(s.caseRuntime[c.id].delivered).toContain(c.askedPapers[0].id);
    s=step(s,{type:'stamp',caseId:c.id,decision:'allow'});expect(s.decisions[c.id].correct).toBe(true);
    s=step(s,{type:'return',caseId:c.id});expect(s.phase).toBe('returning');
    expect(step(s,{type:'call'})).toEqual(s);
    s=step(s,{type:'return-paper',paperId:c.askedPapers[0].id});
    expect(s.phase).toBe('desk');expect(s.returned).toContain(c.id);
  });
  it('D7 归零先保存工资，再演出一次首袭；死人不寄新原件',()=>{
    let s=newRun('relaxed','cutoff');
    for(let day=1;day<7;day++){s=finish(enter(s));s=step(s,{type:'settle'});s=step(s,{type:'supply',choice:{electricity:true,tokens:true}});s=step(s,{type:'next-day'});}
    s.family.father.damage=4;s.family.father.memoryIntact=false;
    s=enter(s);expect(s.story.oldRulesReceived).toBe(false);
    s=step(s,{type:'call'});s=step(s,{type:'stamp',caseId:'D07-S01',decision:'allow'});
    const balance=s.balance;s=step(s,{type:'tick',ms:90000});
    expect(s).toMatchObject({phase:'incident',remainingMs:0,balance});
    expect(step(s,{type:'stamp',caseId:'D07-S01',decision:'reject'})).toEqual(s);
    for(let i=0;i<3;i++)s=step(s,{type:'advance-scene'});
    expect(s).toMatchObject({phase:'night',balance,story:{guardAlive:false,incidentLine:3}});
    expect(step(s,{type:'advance-scene'})).toEqual(s);
  });
  it('真实连续断供：第五夜脆弱成员永久死亡，第七夜玩家 E04；不会寄来父亲未交的原件',()=>{
    let s=newRun('relaxed','no-upkeep');
    for(let day=1;day<=7;day++){
      s=finish(enter(s));if(day===7)for(let i=0;i<3;i++)s=step(s,{type:'advance-scene'});
      s=step(s,{type:'settle'});s=step(s,{type:'supply',choice:{electricity:false,tokens:false}});
      if(day===4)expect(s.family.father.damage).toBe(3);
      if(day===5)expect(s.family.father.damage).toBe(4);
      if(day<7)s=step(s,{type:'next-day'});
    }
    expect(s).toMatchObject({phase:'ending',ending:'E04',story:{oldRulesReceived:false,guardAlive:false}});
    expect(s.family.player.damage).toBe(4);expect(step(s,{type:'next-day'})).toEqual(s);
  });
});
