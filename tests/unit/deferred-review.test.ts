import {describe,it,expect} from 'vitest';
import {newRun,reduceRun} from '../../src/domain/run';
import type {RunState,ActionBody} from '../../src/domain/run';
import {loadRun,SAVE_KEY} from '../../src/storage/snapshot';
import {validRun} from '../../src/storage/validate';
import {atCase} from '../fixtures/week';
let seq=0;
const step=(s:RunState,a:ActionBody)=>reduceRun(s,{...a,actionId:`deferred-${seq++}`}).state;
function ready(){let s=step(newRun('standard','deferred'),{type:'go-desk'});s=step(s,{type:'dismiss',reason:'briefing'});s=step(s,{type:'call'});return step(s,{type:'dismiss',reason:'tutorial'});}
describe('差错通知在收班统一送达',()=>{
  it('错误盖章不弹通知、不提示音、不停表，退件后可以直接继续',()=>{
    const before=ready(),t=reduceRun(before,{type:'stamp',caseId:'D01-S01',decision:'reject',actionId:'wrong'});
    expect(t.state).toMatchObject({phase:'returning',notice:null,pauses:[]});
    expect(t.effects.map(e=>e.kind)).toEqual(['stamp']);
    let s=step(t.state,{type:'tick',ms:1000});expect(s.remainingMs).toBe(89000);
    s=step(s,{type:'return',caseId:'D01-S01'});s=step(s,{type:'call'});expect(s.caseIndex).toBe(1);
    expect(validRun(s)).toBe(true);
  });
  it('90秒收班汇总多案，包括未退件；刷新和收下通知不重扣款',()=>{
    let s=step(ready(),{type:'stamp',caseId:'D01-S01',decision:'reject'});
    s=step(s,{type:'return',caseId:'D01-S01'});s=step(s,{type:'call'});s=step(s,{type:'stamp',caseId:'D01-S02',decision:'reject'});
    const t=reduceRun(s,{type:'tick',ms:90000,actionId:'close'});s=t.state;
    expect(s).toMatchObject({phase:'night',remainingMs:0,balance:10,pauses:['citation']});
    expect(s.notice).toContain('D01-S01');expect(s.notice).toContain('D01-S02');expect(s.notice).toContain('罚款 10');
    expect(t.effects.filter(e=>e.kind==='notice')).toHaveLength(1);expect(validRun(s)).toBe(true);
    const raw=JSON.stringify(s),store={getItem:(key:string)=>key===SAVE_KEY?raw:null,setItem:()=>{throw Error('load wrote')}};
    const loaded=loadRun(store);expect(loaded.kind).toBe('valid');if(loaded.kind!=='valid')return;
    const ledger=structuredClone(s.ledger);s=step(loaded.state,{type:'dismiss',reason:'citation'});
    expect(s).toMatchObject({notice:null,pauses:[],balance:10});expect(s.ledger).toEqual(ledger);
    expect(step(s,{type:'dismiss',reason:'citation'})).toBe(s);
  });
  it('旧的当场罚单只在内存撤去，保留已保存裁决和账目',()=>{
    const s=step(ready(),{type:'stamp',caseId:'D01-S01',decision:'reject'});
    s.notice='旧版即时通知';s.pauses=['citation'];const raw=JSON.stringify(s);let writes=0;
    const loaded=loadRun({getItem:()=>raw,setItem:()=>{writes++;}});
    expect(loaded.kind).toBe('valid');if(loaded.kind!=='valid')return;
    expect(loaded.state).toMatchObject({notice:null,pauses:[],decisions:s.decisions,ledger:s.ledger,revision:s.revision});expect(writes).toBe(0);
  });
  it('提前办完也在收班统一通知，D7 先收通知再推进过场',()=>{
    for(const day of [1,7]){
      let s=atCase(day,day===1?7:11);const id=s.caseIds[s.caseIndex];
      s=step(s,{type:'stamp',caseId:id,decision:'reject'});expect(s.notice).toBeNull();
      for(const paperId of Object.keys(s.papers))s=step(s,{type:'return-paper',paperId});
      s=step(s,{type:'return',caseId:id});expect(s.phase).toBe(day===7?'incident':'night');expect(s.notice).toContain(id);
      expect(validRun(s)).toBe(true);expect(step(s,{type:day===7?'advance-scene':'next-day'})).toBe(s);
      s=step(s,{type:'dismiss',reason:'citation'});expect(s.notice).toBeNull();
      if(day===7)expect(step(s,{type:'advance-scene'}).story.incidentLine).toBe(1);
    }
  });
});
