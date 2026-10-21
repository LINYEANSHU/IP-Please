import {describe,it,expect} from 'vitest';
import {currentCase} from '../../src/domain/run';
import type {RunState} from '../../src/domain/run';
import {atCase,atDay,enterDay,step} from '../fixtures/week';
import {dayCitations} from '../../src/domain/day-review';

function finish(s:RunState,decision:'allow'|'reject'){
  s=step(s,{type:'call'});
  if(s.pauses.includes('tutorial'))s=step(s,{type:'dismiss',reason:'tutorial'});
  const c=currentCase(s)!;
  s=step(s,{type:'stamp',caseId:c.id,decision});
  if(s.pauses.includes('citation'))s=step(s,{type:'dismiss',reason:'citation'});
  for(const id of Object.keys(s.papers))if(!s.caseRuntime[c.id].returnedPapers.includes(id))s=step(s,{type:'return-paper',paperId:id});
  return step(s,{type:'return',caseId:c.id});
}

describe('当日收班引用',()=>{
  it('只引用实际错判：错误放行给出评估发现与罚款，错误拒绝给出固定说明与警告',()=>{
    let s=enterDay(atDay(1,'relaxed'));
    s=finish(s,'allow');
    s=finish(s,'allow');
    s=finish(s,'allow');
    s=finish(s,'reject');
    const before=structuredClone(s);
    const citations=dayCitations(s);
    expect(citations.map(c=>c.caseId)).toEqual(['D01-S03','D01-S04']);
    const [wrongAllow,wrongDeny]=citations;
    expect(wrongAllow).toMatchObject({caseId:'D01-S03',ruleVersion:'V01',decision:'allow',penalty:5});
    expect(wrongAllow.message).toContain('D01-S03');
    expect(wrongAllow.message).toContain('V01');
    expect(wrongAllow.message).toContain('中国大陆');
    expect(wrongAllow.message).toContain('本案不计件');
    expect(wrongAllow.message).toContain('罚款 5');
    expect(wrongDeny).toMatchObject({caseId:'D01-S04',ruleVersion:'V01',decision:'reject',penalty:0});
    expect(wrongDeny.message).toContain('已交材料满足本日生效条款，被错误拒绝。');
    expect(wrongDeny.message).toContain('本案不计件');
    expect(wrongDeny.message).toContain('本次警告');
    expect(s).toEqual(before);
  });

  it('正确决定不引用，多个错误按 caseIds 顺序而非记录顺序',()=>{
    let s=enterDay(atDay(1,'relaxed'));
    s=finish(s,'reject');
    s=finish(s,'allow');
    s=finish(s,'allow');
    expect(dayCitations(s).map(c=>c.caseId)).toEqual(['D01-S01','D01-S03']);
    const reversed=structuredClone(s);
    reversed.decisions=Object.fromEntries(Object.entries(reversed.decisions).reverse());
    expect(dayCitations(reversed).map(c=>c.caseId)).toEqual(['D01-S01','D01-S03']);
    const correctBase=atCase(1,0);
    const correct=step(correctBase,{type:'stamp',caseId:currentCase(correctBase)!.id,decision:'allow'});
    expect(dayCitations(correct)).toEqual([]);
  });

  it('只取当前日、当前定义与当前 caseIds，不翻出前一日条目',()=>{
    const base=atCase(2,1);
    const c=currentCase(base)!;
    let s=step(base,{type:'stamp',caseId:c.id,decision:'reject'});
    s.decisions['D01-S03']={decision:'allow',correct:false,penalty:5,ruleVersion:'V01',mark:{x:0,y:0}};
    s.caseIds=['D01-S03',...s.caseIds];
    const citations=dayCitations(s);
    expect(citations.map(x=>x.caseId)).toEqual(['D02-S02']);
    expect(citations[0].ruleVersion).toBe('V02');
  });

  it('只使用运行时实际交付的材料解释错误放行',()=>{
    const s=atCase(2,4);
    const c=currentCase(s)!;
    expect(c.askedPapers.length).toBeGreaterThan(0);
    expect(s.caseRuntime[c.id].delivered).not.toContain(c.askedPapers[0].id);
    const cited=step(s,{type:'stamp',caseId:c.id,decision:'allow'});
    const [citation]=dayCitations(cited);
    expect(citation.caseId).toBe(c.id);
    expect(citation.message).toContain('未提交当前有效的访问许可');
    expect(citation.message).not.toContain('访问许可由');
  });

  it('读取已记录罚款，不重算、不改账、不写状态',()=>{
    const base=atCase(2,1);
    const c=currentCase(base)!;
    const s=step(base,{type:'stamp',caseId:c.id,decision:'reject'});
    s.decisions[c.id].penalty=42;
    const ledger=structuredClone(s.ledger);
    const balance=s.balance;
    const decisions=structuredClone(s.decisions);
    const [citation]=dayCitations(s);
    expect(citation).toMatchObject({caseId:c.id,penalty:42});
    expect(citation.message).toContain('罚款 42');
    expect(s.ledger).toEqual(ledger);
    expect(s.balance).toBe(balance);
    expect(s.decisions).toEqual(decisions);
  });

  it('D8 返回空，避免重新浮出 D7 错判',()=>{
    const base=atCase(7,0);
    const c=currentCase(base)!;
    const s=step(base,{type:'stamp',caseId:c.id,decision:'reject'});
    expect(dayCitations(s)).toHaveLength(1);
    const day8=structuredClone(s);
    day8.day=8;day8.phase='next-day';
    expect(dayCitations(day8)).toEqual([]);
  });
});
