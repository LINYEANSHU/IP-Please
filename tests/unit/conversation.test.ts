import {it,expect} from 'vitest';
import {atCase,step} from '../fixtures/week';
import {currentCase,reduceRun} from '../../src/domain/run';
import {renderShell} from '../../src/view/shell';
import {validRun} from '../../src/storage/validate';

const options={assets:{portraits:{}},panel:null,writable:true,error:null,loaded:true,effects:false,music:false,choice:{electricity:false,tokens:false},corridorUrl:'',hint:''} as const;

it('批准后感谢只出现一次，归还与刷新仍保留，不产生第二笔裁决',()=>{
  let s=atCase(1),c=currentCase(s)!;
  const action={type:'stamp',caseId:c.id,decision:'allow',actionId:'thank-once'} as const;
  const result=reduceRun(s,action);s=result.state;
  expect(result.effects.some(e=>e.kind==='utterance'&&e.text.includes('谢谢'))).toBe(true);
  expect(renderShell(s,options)).toContain('谢谢');
  expect(reduceRun(s,action).effects).toEqual([]);
  const ledger=structuredClone(s.ledger);
  s=step(s,{type:'return',caseId:c.id});
  expect(renderShell(JSON.parse(JSON.stringify(s)),options)).toContain('谢谢');
  expect(s.ledger).toEqual(ledger);
  s=step(s,{type:'call'});expect(renderShell(s,options)).not.toContain('谢谢');
});

it('普通对话可继续到日常闲聊，静置不推进，重载仍是同一段',()=>{
  let s=atCase(1),c=currentCase(s)!;
  for(let i=1;i<c.dialogue.length;i++)s=step(s,{type:'dialogue'});
  const next=step(s,{type:'dialogue'});
  expect(next.dialogueLine).toBe(c.dialogue.length);
  expect(validRun(next)).toBe(true);
  expect(step(next,{type:'tick',ms:1000}).dialogueLine).toBe(next.dialogueLine);
  const html=renderShell(next,options);
  expect(html).toBe(renderShell(JSON.parse(JSON.stringify(next)),options));
  const other=renderShell({...next,runId:'another-playthrough'},options);
  expect(html).not.toBe(other);
});

it('拒绝不会感谢，批准后不能再补播旧闲聊',()=>{
  let s=atCase(2);const c=currentCase(s)!;
  s=step(s,{type:'stamp',caseId:c.id,decision:'reject'});
  expect(renderShell(s,options)).not.toContain('谢谢');
  expect(step(s,{type:'dialogue'})).toEqual(s);
});
