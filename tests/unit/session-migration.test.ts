import {describe,it,expect} from 'vitest';
import {loadRun,saveRun,SAVE_KEY} from '../../src/storage/session';
import {newRun,reduceRun} from '../../src/domain/run';
import type {ActionBody,RunAction,RunState} from '../../src/domain/run';
import {DAY_ONE_CASES,requiredDecision} from '../../src/domain/day-one';
class Store {
  data=new Map<string,string>();
  writes=0;
  getItem(k:string){return this.data.get(k)??null;}
  setItem(k:string,v:string){this.writes++;this.data.set(k,v);}
}
let sequence=0;
const step=(s:RunState,a:ActionBody)=>reduceRun(s,{...a,actionId:`migration-${sequence++}`} as RunAction).state;
const ready=(mode:'standard'|'relaxed'='standard')=>step(step(newRun(mode,`old-${mode}`),{type:'go-desk'}),{type:'dismiss',reason:'briefing'});
const callFirst=(s:RunState)=>step(step(s,{type:'call'}),{type:'dismiss',reason:'tutorial'});
const processCase=(s:RunState,index:number)=>{
  s=step(s,{type:'call'});s=step(s,{type:'dismiss',reason:'tutorial'});
  s=step(s,{type:'stamp',caseId:DAY_ONE_CASES[index].id,decision:requiredDecision(DAY_ONE_CASES[index])});
  s=step(s,{type:'dismiss',reason:'citation'});
  return step(s,{type:'return',caseId:DAY_ONE_CASES[index].id});
};
function seed(state:unknown){const store=new Store();const raw=JSON.stringify({...state as any,schemaVersion:1});store.setItem(SAVE_KEY,raw);store.writes=0;return {store,raw};}
describe('v1 旧存档的 90 秒内存迁移',()=>{
  it('旧标准剩余 300000 只在内存截到 90000，经济/进度/账本/家属原样保留',()=>{
    let s=ready('standard');
    s=callFirst(s);
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    s=step(s,{type:'return',caseId:'D01-S01'});
    s.remainingMs=300000;
    s.family.father={powerPressure:3,tokenPressure:2,damage:1,memoryIntact:false};
    const old=structuredClone(s);
    const {store,raw}=seed(s);
    const loaded=loadRun(store);
    expect(loaded).toMatchObject({kind:'valid'});
    if(loaded.kind!=='valid')throw new Error('expected valid');
    expect(loaded.state).toMatchObject({phase:'desk',remainingMs:90000,balance:old.balance,caseIndex:old.caseIndex});
    expect(loaded.state.decisions).toEqual(old.decisions);
    expect(loaded.state.ledger).toEqual(old.ledger);
    expect(loaded.state.returned).toEqual(old.returned);
    expect(loaded.state.family.father).toEqual(old.family.father);
    expect(store.getItem(SAVE_KEY)).toBe(raw);
    expect(store.writes).toBe(0);
    expect(saveRun(loaded.state,store)).toEqual({ok:true});
    expect(JSON.parse(store.getItem(SAVE_KEY)!)).toMatchObject({remainingMs:90000,balance:old.balance,family:old.family});
  });
  it('旧轻松 null 转为 90000，保留案号、裁决与余额',()=>{
    let s=ready('relaxed');
    s=callFirst(s);
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    s=step(s,{type:'return',caseId:'D01-S01'});
    (s as any).remainingMs=null;
    s.family.mother={powerPressure:1,tokenPressure:4,damage:0,memoryIntact:true};
    const old=structuredClone(s);
    const {store,raw}=seed(s);
    const loaded=loadRun(store);
    expect(loaded).toMatchObject({kind:'valid'});
    if(loaded.kind!=='valid')throw new Error('expected valid');
    expect(loaded.state).toMatchObject({mode:'relaxed',remainingMs:90000,balance:old.balance,returned:old.returned});
    expect(loaded.state.decisions).toEqual(old.decisions);
    expect(loaded.state.family.mother).toEqual(old.family.mother);
    expect(store.getItem(SAVE_KEY)).toBe(raw);
    expect(store.writes).toBe(0);
    expect(saveRun(loaded.state,store)).toEqual({ok:true});
    expect(JSON.parse(store.getItem(SAVE_KEY)!).remainingMs).toBe(90000);
  });
  it.each(['desk','returning'] as const)('旧标准已归零仍在加班的 %s 状态迁移为合法收班状态',phase=>{
    let s=ready('standard');
    s=callFirst(s);
    if(phase==='returning')s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    s.remainingMs=0;
    const old=structuredClone(s);
    const {store,raw}=seed(s);
    const loaded=loadRun(store);
    expect(loaded).toMatchObject({kind:'valid'});
    if(loaded.kind!=='valid')throw new Error('expected valid');
    expect(loaded.state).toMatchObject({phase:'night',remainingMs:0});
    expect(loaded.state.decisions).toEqual(old.decisions);
    expect(loaded.state.returned).toEqual(old.returned);
    expect(store.getItem(SAVE_KEY)).toBe(raw);
    expect(store.writes).toBe(0);
    expect(saveRun(loaded.state,store)).toEqual({ok:true});
  });
  it('归零旧 returning 已含当前退件或未盖章时不迁移，坏档原文保留',()=>{
    const returned:any=callFirst(ready());
    returned.decisions['D01-S01']={decision:'allow',correct:true,penalty:0,ruleVersion:'V01',mark:{x:165,y:113}};
    returned.returned=['D01-S01'];returned.remainingMs=0;
    const a=seed(returned);
    expect(loadRun(a.store).kind).toBe('invalid');
    expect(a.store.getItem(SAVE_KEY)).toBe(a.raw);
    expect(a.store.writes).toBe(0);
    const unstamped:any=callFirst(ready());unstamped.phase='returning';unstamped.remainingMs=0;
    const b=seed(unstamped);
    expect(loadRun(b.store).kind).toBe('invalid');
    expect(b.store.getItem(SAVE_KEY)).toBe(b.raw);
  });
  it('旧夜间已扣租、已供养快照迁移计时但保留全部结算字段',()=>{
    let s=ready('standard');
    for(let i=0;i<8;i++)s=processCase(s,i);
    s=step(s,{type:'settle'});
    s=step(s,{type:'supply',choice:{electricity:true,tokens:true}});
    s.remainingMs=300000;
    const old=structuredClone(s);
    const {store,raw}=seed(s);
    const loaded=loadRun(store);
    expect(loaded).toMatchObject({kind:'valid'});
    if(loaded.kind!=='valid')throw new Error('expected valid');
    expect(loaded.state).toMatchObject({phase:'family',day:1,rentPaid:true,supply:{electricity:true,tokens:true},remainingMs:90000,balance:old.balance});
    expect(loaded.state.ledger).toEqual(old.ledger);
    expect(loaded.state.family).toEqual(old.family);
    expect(store.getItem(SAVE_KEY)).toBe(raw);
    expect(saveRun(loaded.state,store)).toEqual({ok:true});
  });
  it('部分案件夜间状态可保存并刷新，非法提前收班被拒绝',()=>{
    let s=callFirst(ready());
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    s=step(s,{type:'tick',ms:90000});
    expect(s).toMatchObject({phase:'night',remainingMs:0,caseIndex:0});
    const store=new Store();
    expect(saveRun(s,store)).toEqual({ok:true});
    expect(loadRun(store)).toEqual({kind:'valid',state:s});
    expect(step(s,{type:'return',caseId:'D01-S01'})).toEqual(s);
    const early:any=structuredClone(s);early.remainingMs=30000;
    expect(saveRun(early,store)).toEqual({ok:false,reason:'新状态校验失败，尚未保存。'});
    expect(loadRun(seed(early).store).kind).toBe('invalid');
  });
  it('部分案件可结清租金并继续到 family/next-day，账目只含已裁决案',()=>{
    let s=callFirst(ready());
    s=step(s,{type:'stamp',caseId:'D01-S01',decision:'allow'});
    s=step(s,{type:'tick',ms:90000});
    s=step(s,{type:'settle'});
    expect(s).toMatchObject({phase:'night',rentPaid:true,balance:15,remainingMs:0});
    s=step(s,{type:'supply',choice:{electricity:false,tokens:false}});
    expect(s.phase).toBe('family');
    const store=new Store();
    expect(saveRun(s,store)).toEqual({ok:true});
    expect(loadRun(store)).toEqual({kind:'valid',state:s});
    s=step(s,{type:'next-day'});
    expect(s).toMatchObject({day:2,phase:'newspaper'});
    expect(saveRun(s,new Store())).toEqual({ok:true});
    expect(s.ledger.filter(e=>e.kind==='wage')).toHaveLength(1);
    expect(s.ledger.filter(e=>e.kind==='salary')).toHaveLength(1);
  });
  it('新快照只接受 0..90000 的数值计时，null 与 90001 均拒绝',()=>{
    const desk=ready('standard');
    const nullTimer:any=structuredClone(desk);nullTimer.remainingMs=null;
    expect(saveRun(nullTimer,new Store())).toMatchObject({ok:false});
    const over:any=structuredClone(desk);over.remainingMs=90001;
    expect(saveRun(over,new Store())).toMatchObject({ok:false});
    const zeroDesk:any=structuredClone(desk);zeroDesk.remainingMs=0;
    expect(saveRun(zeroDesk,new Store())).toMatchObject({ok:false});
    const badStore=new Store();badStore.setItem(SAVE_KEY,JSON.stringify({...structuredClone(ready('standard')),remainingMs:400000}));
    expect(loadRun(badStore).kind).toBe('invalid');
  });
});
