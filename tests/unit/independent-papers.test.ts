import {describe,it,expect} from 'vitest';
import {newRun,reduceRun,currentCase} from '../../src/domain/run';
import type {RunState,ActionBody} from '../../src/domain/run';
import {getDay} from '../../src/domain/week';
import {evaluateCase} from '../../src/domain/rules';
import {validRun} from '../../src/storage/validate';
import {loadRun,saveRun} from '../../src/storage/snapshot';

let sequence=0;
const step=(s:RunState,a:ActionBody)=>{
  const next=reduceRun(s,{...a,actionId:`independent-${sequence++}`}).state;
  expect(validRun(next),`${next.day}/${next.phase}/${a.type}`).toBe(true);
  return next;
};
const legacyAction=(action:Record<string,unknown>)=>action as unknown as ActionBody;
function enter(s:RunState){
  s=step(s,{type:'go-desk'});
  while(s.pauses.includes('briefing'))s=step(s,{type:'dismiss',reason:'briefing'});
  return s;
}
function stamp(s:RunState){
  const c=currentCase(s)!;
  return step(s,{type:'stamp',caseId:c.id,decision:evaluateCase(s.day,c,s.caseRuntime[c.id].delivered).decision});
}
function returnCase(s:RunState){
  const c=currentCase(s)!;
  if(!s.caseRuntime[c.id].bookReturned)s=step(s,{type:'return',caseId:c.id});
  for(const id of Object.keys(s.papers)){
    if(!s.caseRuntime[c.id].returnedPapers.includes(id))s=step(s,{type:'return-paper',paperId:id});
  }
  return s;
}
function finishCase(s:RunState){
  s=step(s,{type:'call'});
  if(s.pauses.includes('tutorial'))s=step(s,{type:'dismiss',reason:'tutorial'});
  s=step(s,{type:'ask'});
  s=stamp(s);
  return returnCase(s);
}
function finishDay(s:RunState){
  s=enter(s);
  for(let i=0;i<getDay(s.day).cases.length;i++)s=finishCase(s);
  return s;
}
function reachDay(day:number,mode:'standard'|'relaxed'='relaxed'){
  let s=newRun(mode,`independent-day-${day}`);
  for(let d=1;d<day;d++){
    s=finishDay(s);
    s=step(s,{type:'settle'});
    s=step(s,{type:'supply',choice:{electricity:true,tokens:true}});
    s=step(s,{type:'next-day'});
  }
  return enter(s);
}
function openFirstCase(s:RunState){
  s=step(s,{type:'call'});
  if(s.pauses.includes('tutorial'))s=step(s,{type:'dismiss',reason:'tutorial'});
  return s;
}
function withLegacyStack(s:RunState,values:readonly unknown[]){
  const copy=structuredClone(s);
  for(const [i,id] of Object.keys(copy.papers).entries())(copy.papers[id] as any).stacked=values[i%values.length];
  return copy;
}
class Store {
  raw:string;writes=0;
  constructor(value:unknown){this.raw=JSON.stringify(value);}
  getItem(){return this.raw;}
  setItem(_key:string,value:string){this.writes++;this.raw=value;}
}

describe('独立纸张：不叠册、自由摆放、逐件退还',()=>{
  it('新交付材料只有自身位置，不含 stacked',()=>{
    let s=openFirstCase(reachDay(4));
    const ids=Object.keys(s.papers);
    expect(ids.length).toBeGreaterThan(1);
    for(const id of ids)expect(Object.keys(s.papers[id]).sort()).toEqual(['height','width','x','y']);
    s=step(s,{type:'ask'});
    for(const id of Object.keys(s.papers))expect(Object.keys(s.papers[id]).sort()).toEqual(['height','width','x','y']);
  });

  it('交还册子只记录 bookReturned，旧的叠册动作不会顺带退还任何材料',()=>{
    let s=openFirstCase(reachDay(4));
    const c=currentCase(s)!;
    const ids=Object.keys(s.papers);
    expect(ids.length).toBeGreaterThan(1);
    s=reduceRun(s,{...legacyAction({type:'stack',paperId:ids[0],stacked:true}),actionId:'legacy-stack-before-return'}).state;
    s=stamp(s);
    const before=structuredClone(s.papers);
    s=step(s,{type:'return',caseId:c.id});
    const runtime=s.caseRuntime[c.id];
    expect(runtime.bookReturned).toBe(true);
    expect(runtime.returnedPapers).toEqual([]);
    expect(s.phase).toBe('returning');
    expect(s.returned).not.toContain(c.id);
    expect(s.papers).toEqual(before);
    for(const id of ids)expect(runtime.returnedPapers).not.toContain(id);
    s=step(s,{type:'return-paper',paperId:ids[0]});
    expect(s.caseRuntime[c.id].returnedPapers).toEqual([ids[0]]);
    expect(s.phase).toBe('returning');
    for(const id of ids.slice(1))s=step(s,{type:'return-paper',paperId:id});
    expect(s.phase).toBe('desk');
    expect(s.returned).toContain(c.id);
  });

  it('书、规则和证据都能移动到整张 640x360 桌面并夹紧到完整可见',()=>{
    let s=openFirstCase(reachDay(4));
    const paperId=Object.keys(s.papers)[0];
    s=step(s,{type:'move',paper:'book',x:-100,y:-100});
    expect(s.book).toMatchObject({x:0,y:0});
    s=step(s,{type:'move',paper:'rule',x:-1,y:-1});
    expect(s.rule).toMatchObject({x:0,y:0});
    s=step(s,{type:'move',paper:paperId,x:0,y:0});
    expect(s.papers[paperId]).toMatchObject({x:0,y:0});
    s=step(s,{type:'move',paper:'book',x:9999,y:9999});
    expect(s.book).toMatchObject({x:640-s.book.width,y:360-s.book.height});
    s=step(s,{type:'move',paper:'rule',x:9999,y:9999});
    expect(s.rule).toMatchObject({x:640-s.rule.width,y:360-s.rule.height});
    s=step(s,{type:'move',paper:paperId,x:9999,y:9999});
    expect(s.papers[paperId]).toMatchObject({x:640-s.papers[paperId].width,y:360-s.papers[paperId].height});
    for(const rect of [s.book,s.rule,s.papers[paperId]]){
      expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x+rect.width).toBeLessThanOrEqual(640);expect(rect.y+rect.height).toBeLessThanOrEqual(360);
    }
  });

  it('移动任一物件都不改动其他物件坐标',()=>{
    let s=openFirstCase(reachDay(4));
    const ids=Object.keys(s.papers);
    const otherPaper=ids[1];
    let before={book:structuredClone(s.book),rule:structuredClone(s.rule),paper:structuredClone(s.papers[otherPaper])};
    s=step(s,{type:'move',paper:'book',x:0,y:0});
    expect(s.rule).toEqual(before.rule);expect(s.papers[otherPaper]).toEqual(before.paper);
    before={book:structuredClone(s.book),rule:structuredClone(s.rule),paper:structuredClone(s.papers[otherPaper])};
    s=step(s,{type:'move',paper:'rule',x:10,y:20});
    expect(s.book).toEqual(before.book);expect(s.papers[otherPaper]).toEqual(before.paper);
    before={book:structuredClone(s.book),rule:structuredClone(s.rule),paper:structuredClone(s.papers[otherPaper])};
    s=step(s,{type:'move',paper:ids[0],x:30,y:40});
    expect(s.book).toEqual(before.book);expect(s.rule).toEqual(before.rule);expect(s.papers[otherPaper]).toEqual(before.paper);
  });

  it('翻册、移册和置顶不会改变任何证据坐标',()=>{
    let s=openFirstCase(reachDay(4));
    const ids=Object.keys(s.papers);
    const paperId=ids[0];
    s=step(s,{type:'move',paper:paperId,x:300,y:150});
    const placedPapers=structuredClone(s.papers),placedRule=structuredClone(s.rule);
    for(const action of [
      {type:'open-book' as const},
      {type:'move' as const,paper:'book',x:0,y:0},
      {type:'raise' as const,paper:paperId},
      {type:'open-book' as const},
      {type:'move' as const,paper:'book',x:400,y:200},
      {type:'raise' as const,paper:ids[1]},
      {type:'raise' as const,paper:'book'},
    ])s=step(s,action);
    expect(s.papers).toEqual(placedPapers);
    expect(s.rule).toEqual(placedRule);
    expect(s.papers[paperId]).toEqual({...placedPapers[paperId],x:300,y:150});
  });

  it('旧 stack 动作与未知动作都是完全 no-op',()=>{
    let s=openFirstCase(reachDay(4));
    const c=currentCase(s)!;
    const paperId=Object.keys(s.papers)[0];
    s=stamp(s);
    const snapshot=structuredClone(s);
    for(const action of [
      {type:'stack',paperId,stacked:true},
      {type:'stack',paperId,stacked:false},
      {type:'ancient-action',paperId},
    ]){
      const transition=reduceRun(s,{...legacyAction(action),actionId:`legacy-${Math.random()}`});
      expect(transition.state).toBe(s);
      expect(transition.effects).toEqual([]);
      expect(s).toEqual(snapshot);
      expect(s.revision).toBe(snapshot.revision);
      expect(s.decisions[c.id]).toEqual(snapshot.decisions[c.id]);
      expect(s.caseRuntime[c.id]).toEqual(snapshot.caseRuntime[c.id]);
      expect(s.balance).toBe(snapshot.balance);
    }
  });
});

describe('schema2 旧叠册字段的内存迁移',()=>{
  it('旧的 true/false stacked 在内存删除，保留坐标、身份和账目，原始字符串零写入',()=>{
    let s=openFirstCase(reachDay(4));
    const c=currentCase(s)!;
    s=stamp(s);
    const ids=Object.keys(s.papers);
    s=step(s,{type:'return-paper',paperId:ids[0]});
    const rawState=withLegacyStack(s,[true,false]);
    const store=new Store(rawState),raw=store.raw;
    const loaded=loadRun(store);
    expect(loaded.kind).toBe('valid');
    if(loaded.kind!=='valid')return;
    expect(store.raw).toBe(raw);expect(store.writes).toBe(0);
    expect(loaded.state.schemaVersion).toBe(2);
    expect(loaded.state.runId).toBe(s.runId);
    expect(loaded.state.revision).toBe(s.revision);
    expect(loaded.state.decisions).toEqual(s.decisions);
    expect(loaded.state.returned).toEqual(s.returned);
    expect(loaded.state.ledger).toEqual(s.ledger);
    expect(loaded.state.family).toEqual(s.family);
    expect(loaded.state.caseRuntime).toEqual(s.caseRuntime);
    expect(loaded.state.papers).toEqual(s.papers);
    expect(loaded.state.papers[ids[0]]).toMatchObject({x:s.papers[ids[0]].x,y:s.papers[ids[0]].y});
    expect(loaded.state.papers[ids[1]]).toMatchObject({x:s.papers[ids[1]].x,y:s.papers[ids[1]].y});
    for(const paper of Object.values(loaded.state.papers))expect(Object.hasOwn(paper,'stacked')).toBe(false);
    expect(loaded.state.caseRuntime[c.id].returnedPapers).toEqual([ids[0]]);
  });

  it('旧版本已经记录退还的进度保持有效，不重新供给已退材料',()=>{
    let s=openFirstCase(reachDay(4));
    s=stamp(s);
    s=returnCase(s);
    const c=currentCase(s)!;
    expect(s.phase).toBe('desk');expect(s.returned).toContain(c.id);
    const returnedPapers=[...s.caseRuntime[c.id].returnedPapers];
    expect(returnedPapers.length).toBeGreaterThan(0);
    const store=new Store(withLegacyStack(s,[true,false])),raw=store.raw;
    const loaded=loadRun(store);
    expect(loaded.kind).toBe('valid');
    if(loaded.kind!=='valid')return;
    expect(store.raw).toBe(raw);expect(store.writes).toBe(0);
    expect(loaded.state.returned).toEqual(s.returned);
    expect(loaded.state.caseRuntime[c.id]).toEqual(s.caseRuntime[c.id]);
    expect(loaded.state.caseRuntime[c.id].returnedPapers).toEqual(returnedPapers);
    expect(saveRun(loaded.state,store)).toEqual({ok:true});
  });

  it('非 boolean 的 stacked 元数据仍然无效，保留原文字且零写入',()=>{
    let s=openFirstCase(reachDay(4));
    const ids=Object.keys(s.papers);
    for(const invalid of ['true',1,null,{},[]]){
      const bad=withLegacyStack(s,[true,invalid]);
      const store=new Store(bad),raw=store.raw;
      const loaded=loadRun(store);
      expect(loaded.kind,'invalid stacked '+String(invalid)).toBe('invalid');
      if(loaded.kind==='invalid')expect(loaded.raw).toBe(raw);
      expect(store.raw).toBe(raw);expect(store.writes).toBe(0);
      expect(validRun(bad)).toBe(false);
    }
    expect(ids.length).toBeGreaterThan(1);
  });

  it('新保存状态拒绝任何 stacked 字段',()=>{
    let s=openFirstCase(reachDay(4));
    const bad=structuredClone(s);
    (bad.papers[Object.keys(bad.papers)[0]] as any).stacked=false;
    const store=new Store(s);
    expect(saveRun(bad,store)).toMatchObject({ok:false});
    expect(store.writes).toBe(0);
    expect(validRun(bad)).toBe(false);
  });
});
