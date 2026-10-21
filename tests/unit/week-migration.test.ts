import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {loadRun,saveRun,SAVE_KEY} from '../../src/storage/session';
const snapshots=JSON.parse(readFileSync(new URL('../fixtures/v1-snapshots.json',import.meta.url),'utf8'));
class Store {raw:string;writes=0;constructor(v:unknown){this.raw=JSON.stringify(v);}getItem(){return this.raw;}setItem(_k:string,v:string){this.writes++;this.raw=v;}}
it('真实 v1 各阶段快照在内存迁移，原始文字和已入账交易保留',()=>{
  for(const [name,legacy] of Object.entries(snapshots) as [string,any][]){
    const store=new Store(legacy),raw=store.raw,loaded=loadRun(store);
    expect(loaded.kind,name).toBe('valid');if(loaded.kind!=='valid')continue;
    expect(loaded.state.schemaVersion).toBe(2);expect(loaded.state.runId).toBe(legacy.runId);
    expect(loaded.state.revision).toBe(legacy.revision);expect(loaded.state.balance).toBe(legacy.balance);
    expect(loaded.state.ledger).toEqual(legacy.ledger);expect(loaded.state.decisions).toEqual(legacy.decisions);
    expect(loaded.state.family).toEqual(legacy.family);expect(store.raw).toBe(raw);expect(store.writes).toBe(0);
    if(legacy.phase==='next-day')expect(loaded.state).toMatchObject({day:2,phase:'newspaper',rentPaid:false,supply:null,caseIndex:-1});
    expect(saveRun(loaded.state,store)).toEqual({ok:true});
  }
});
it('篡改过的 v1 账目不能借迁移通过',()=>{
  const bad=structuredClone(snapshots['standard-stamped']);bad.balance+=500;
  const store=new Store(bad),raw=store.raw;expect(loadRun(store)).toMatchObject({kind:'invalid',raw});expect(store.writes).toBe(0);
});
it('D7 首袭中断、实体纸张和跨日 v2 快照可读；损坏不覆盖',()=>{
  const store=new Store(snapshots['relaxed-next-day']);const loaded=loadRun(store);expect(loaded.kind).toBe('valid');
  if(loaded.kind!=='valid')return;const s=loaded.state;s.schemaVersion=99 as 2;store.raw=JSON.stringify(s);
  expect(loadRun(store)).toMatchObject({kind:'invalid',raw:store.raw});
  expect(SAVE_KEY).toBe('ip-please:run:v1');
});
