import {describe,it,expect} from 'vitest';
import {newRun,currentCase} from '../../src/domain/run';
import type {RunState} from '../../src/domain/run';
import {atCase} from '../fixtures/week';
import {step} from '../fixtures/week';
import {inspectionFields,compareFields} from '../../src/domain/inspection';

function mustField(s:RunState,id:string){
  const f=inspectionFields(s).find(x=>x.id===id);
  if(!f)throw new Error('missing field '+id);
  return f;
}
const idsOf=(s:RunState)=>inspectionFields(s).map(f=>f.id);
const keysOf=(s:RunState,paperId:string)=>inspectionFields(s).filter(f=>f.paperId===paperId).map(f=>f.key);
function pair(s:RunState,leftId:string,rightId:string){
  const forward=compareFields(s,leftId,rightId);
  expect(compareFields(s,rightId,leftId)).toEqual(forward);
  return forward;
}

describe('现场字段检查',()=>{
  it('第一日只开放当前地区与今日规则',()=>{
    const s=atCase(1,2);
    const fields=inspectionFields(s);
    expect(new Set(fields.map(f=>f.id))).toEqual(new Set(['rule:today','rule:allowedRegions','book:ipRegion']));
    expect(new Set(fields.map(f=>f.id)).size).toBe(fields.length);
    for(const f of fields)expect(f.id).toBe(f.paperId+':'+f.key);
    const today=mustField(s,'rule:today');
    expect(today).toMatchObject({paperId:'rule',key:'today',label:'今日',value:1,text:'第 1 工作日'});
    const regions=mustField(s,'rule:allowedRegions');
    expect(regions.label).toBe('允许地区');
    expect(regions.value).toEqual(['US','GB','FR','SG','JP']);
    expect(mustField(s,'book:ipRegion')).toMatchObject({paperId:'book',key:'ipRegion',value:'CN'});
    expect(idsOf(s)).not.toContain('rule:allowedIssuers');
    expect(idsOf(s)).not.toContain('rule:requiredAuthorization');
    expect(idsOf(s)).not.toContain('book:applicationId');
  });

  it('第二日解锁申请编号、签发机关和许可有效期；尚未解锁持有人',()=>{
    const s=atCase(2,0);
    expect(keysOf(s,'book')).toEqual(expect.arrayContaining(['ipRegion','applicationId']));
    expect(keysOf(s,'book')).not.toContain('subject');
    expect(new Set(keysOf(s,'D02-S01-PERMIT'))).toEqual(new Set(['issuer','applicationId','validity']));
    expect(mustField(s,'D02-S01-PERMIT:applicationId').value).toBe('APP-D02-S01');
    expect(mustField(s,'D02-S01-PERMIT:validity')).toMatchObject({value:{from:1,to:10},text:'第 1–10 工作日'});
    expect(mustField(s,'rule:allowedIssuers').value).toEqual(['访问许可处','全球人才通行署']);
    expect(idsOf(s)).not.toContain('D02-S01-PERMIT:subject');
    expect(idsOf(s)).not.toContain('rule:requiredAuthorization');
  });

  it('第三日护照只通过册页字段出现，没有独立护照纸',()=>{
    const s=atCase(3,0);
    expect(keysOf(s,'book')).toEqual(expect.arrayContaining(['subject','passportNumber']));
    expect(new Set(keysOf(s,'D03-S01-PERMIT'))).toEqual(new Set(['subject','issuer','applicationId','passportNumber','validity']));
    expect(keysOf(s,'D03-S01-PASSPORT')).toEqual([]);
    expect(mustField(s,'book:subject').value).toBe('陈若岚');
    expect(mustField(s,'book:passportNumber').value).toBe('PP-SG-0013');
    expect(idsOf(s).some(id=>id.startsWith('D03-S01-PASSPORT:'))).toBe(false);
  });

  it('第四日解锁账号与号码，尚未解锁所在地、会话和委托主体',()=>{
    const s=atCase(4,0);
    expect(keysOf(s,'book')).toEqual(expect.arrayContaining(['account','phone']));
    expect(keysOf(s,'book')).not.toContain('location');
    expect(keysOf(s,'book')).not.toContain('principal');
    expect(new Set(keysOf(s,'D04-S01-BINDING'))).toEqual(new Set(['subject','issuer','account','phone','validity']));
    expect(mustField(s,'D04-S01-BINDING:account').value).toBe('acct-d04-s01');
  });

  it('第五日解锁所在地、连接会话、本人授权与要求授权',()=>{
    const s=atCase(5,1);
    expect(keysOf(s,'book')).toEqual(expect.arrayContaining(['location','session']));
    expect(keysOf(s,'book')).not.toContain('principal');
    expect(mustField(s,'book:location').value).toBe('JP');
    expect(mustField(s,'book:session').value).toBe('SESS-D05-S02');
    expect(new Set(keysOf(s,'D05-S02-CONNECTION'))).toEqual(new Set(['subject','issuer','session','authorized','validity']));
    expect(mustField(s,'D05-S02-CONNECTION:authorized').value).toBe(true);
    expect(mustField(s,'rule:requiredAuthorization').value).toBe(true);
  });

  it('第六日解锁委托主体与用途范围',()=>{
    const s=atCase(6,1);
    expect(mustField(s,'book:principal').value).toBe('启明数据');
    expect(mustField(s,'book:requestedScope').value).toBe('承包项目访问');
    expect(new Set(keysOf(s,'D06-S02-BUSINESS'))).toEqual(new Set(['subject','issuer','principal','scope','validity']));
    expect(mustField(s,'D06-S02-BUSINESS:scope').value).toEqual(['承包项目访问']);
    expect(mustField(s,'D06-S02-BUSINESS:principal').value).toBe('启明数据');
  });

  it('未实际交付的询问材料不出现，询问后才出现',()=>{
    let s=atCase(2,4);
    const c=currentCase(s)!;
    const askedId=c.askedPapers[0].id;
    expect(s.caseRuntime[c.id].delivered).not.toContain(askedId);
    expect(idsOf(s).some(id=>id.startsWith(askedId+':'))).toBe(false);
    expect(idsOf(s)).not.toContain(askedId+':applicationId');
    s=step(s,{type:'ask'});
    expect(s.caseRuntime[c.id].delivered).toContain(askedId);
    expect(new Set(keysOf(s,askedId))).toEqual(new Set(['issuer','applicationId','validity']));
  });

  it('合上册子隐藏册页字段，但证据字段仍可核对',()=>{
    const inside=atCase(3,0);
    expect(idsOf(inside)).toContain('book:applicationId');
    const cover=step(inside,{type:'open-book'});
    expect(idsOf(cover)).not.toContain('book:applicationId');
    expect(idsOf(cover)).not.toContain('book:subject');
    expect(idsOf(cover)).toContain('D03-S01-PERMIT:applicationId');
    expect(idsOf(cover)).toContain('rule:today');
  });

  it('盖章后仍可核对；退册只隐藏册页，退完当前案卷即全部关闭',()=>{
    let s=atCase(2,0);
    const c=currentCase(s)!;
    s=step(s,{type:'stamp',caseId:c.id,decision:'allow'});
    expect(s.phase).toBe('returning');
    expect(idsOf(s)).toContain('book:applicationId');
    expect(idsOf(s)).toContain('D02-S01-PERMIT:applicationId');
    s=step(s,{type:'return',caseId:c.id});
    expect(s.caseRuntime[c.id].bookReturned).toBe(true);
    expect(idsOf(s)).not.toContain('book:applicationId');
    expect(idsOf(s)).toContain('D02-S01-PERMIT:applicationId');
    s=step(s,{type:'return-paper',paperId:'D02-S01-PERMIT'});
    expect(s.returned).toContain(c.id);
    expect(inspectionFields(s)).toEqual([]);
  });

  it('只在案卷办理中开放：报纸、夜晚、无案卷、D8 与已退案卷均为空',()=>{
    expect(inspectionFields(newRun('relaxed','inspection-newspaper'))).toEqual([]);
    const base=atCase(1,0);
    const night=structuredClone(base);night.phase='night';
    expect(inspectionFields(night)).toEqual([]);
    const noCase=structuredClone(base);noCase.caseIndex=-1;
    expect(inspectionFields(noCase)).toEqual([]);
    const day8=structuredClone(base);day8.day=8;
    expect(inspectionFields(day8)).toEqual([]);
    const returned=structuredClone(base);returned.returned.push(currentCase(base)!.id);
    expect(inspectionFields(returned)).toEqual([]);
  });

  it('返回的字段不引用可变状态，连续检查与比较为零副作用',()=>{
    const s=atCase(2,0);
    const before=structuredClone(s);
    const regions=mustField(s,'rule:allowedRegions').value as string[];
    regions.push('CN');
    expect(mustField(s,'rule:allowedRegions').value).toEqual(['US','GB','FR','SG','JP']);
    const permitId=keysOf(s,'D02-S01-PERMIT').length?'D02-S01-PERMIT:applicationId':'';
    compareFields(s,'book:applicationId',permitId);
    compareFields(s,'D02-S01-PERMIT:validity','rule:today');
    expect(s).toEqual(before);
    expect(inspectionFields(s)).toEqual(inspectionFields(s));
  });

  it('不暴露国籍字段，也不把国籍与 IP 混为同键',()=>{
    const s=atCase(3,0);
    const keys=inspectionFields(s).map(f=>f.key);
    expect(keys).not.toContain('nationality' as never);
    expect(keys).not.toContain('nationalityRegion' as never);
    expect(keys).toContain('ipRegion');
  });
});

describe('字段比对',()=>{
  it('不同纸面的同键标量严格比较并保持顺序对称',()=>{
    const s=atCase(7,5);
    expect(pair(s,'book:applicationId','D07-S06-PERMIT:applicationId')).toMatchObject({status:'match',title:'信息一致'});
    expect(pair(s,'book:subject','D07-S06-BUSINESS:subject')).toMatchObject({status:'match',title:'信息一致'});
    expect(pair(s,'book:session','D07-S06-CONNECTION:session')).toMatchObject({status:'match',title:'信息一致'});
    const wrong=atCase(2,5);
    const mismatch=pair(wrong,'book:applicationId','D02-S06-PERMIT:applicationId');
    expect(mismatch).toMatchObject({status:'mismatch',title:'信息不符'});
    expect(mismatch.detail).toContain('申请编号');
  });

  it('同键布尔值精确比较',()=>{
    let s=atCase(5,4);
    s=step(s,{type:'ask'});
    expect(pair(s,'D05-S05-CONNECTION:authorized','D05-S05-CONNECTION-ASKED:authorized')).toMatchObject({status:'match',title:'信息一致'});
    expect(pair(s,'D05-S05-CONNECTION:session','D05-S05-CONNECTION-ASKED:session')).toMatchObject({status:'mismatch',title:'信息不符'});
  });

  it('有效期与今日含首尾比较，过期和尚未生效分别说明',()=>{
    const endEdge=pair(atCase(2,1),'D02-S02-PERMIT:validity','rule:today');
    expect(endEdge).toMatchObject({status:'match',title:'信息一致'});
    const startEdge=pair(atCase(2,8),'D02-S09-PERMIT:validity','rule:today');
    expect(startEdge).toMatchObject({status:'match',title:'信息一致'});
    const expired=pair(atCase(2,2),'D02-S03-PERMIT:validity','rule:today');
    expect(expired).toMatchObject({status:'mismatch',title:'信息不符'});
    expect(expired.detail).toContain('已过期');
    const early=pair(atCase(2,3),'D02-S04-PERMIT:validity','rule:today');
    expect(early).toMatchObject({status:'mismatch',title:'信息不符'});
    expect(early.detail).toContain('尚未生效');
  });

  it('两份有效期不能互为证明，必须分别与今日核对',()=>{
    const s=atCase(7,5);
    const result=pair(s,'D07-S06-PERMIT:validity','D07-S06-BUSINESS:validity');
    expect(result).toMatchObject({status:'unverified',title:'无法核对'});
    expect(result.detail).toContain('今日');
  });

  it('地区、签发机关、用途范围与授权分别按成员关系核对',()=>{
    const full=atCase(7,5);
    expect(pair(full,'book:ipRegion','rule:allowedRegions')).toMatchObject({status:'match',title:'信息一致'});
    expect(pair(full,'D07-S06-PERMIT:issuer','rule:allowedIssuers')).toMatchObject({status:'match',title:'信息一致'});
    expect(pair(full,'D07-S06-BUSINESS:scope','book:requestedScope')).toMatchObject({status:'match',title:'信息一致'});
    expect(pair(full,'D07-S06-CONNECTION:authorized','rule:requiredAuthorization')).toMatchObject({status:'match',title:'信息一致'});

    const blocked=pair(atCase(1,2),'book:ipRegion','rule:allowedRegions');
    expect(blocked).toMatchObject({status:'mismatch',title:'信息不符'});
    const issuer=pair(atCase(2,9),'D02-S10-PERMIT:issuer','rule:allowedIssuers');
    expect(issuer).toMatchObject({status:'mismatch',title:'信息不符'});
    expect(issuer.detail).toContain('签发机关');
    const scope=pair(atCase(6,6),'D06-S07-BUSINESS:scope','book:requestedScope');
    expect(scope).toMatchObject({status:'mismatch',title:'信息不符'});
    expect(scope.detail).toContain('用途');
    const auth=pair(atCase(5,3),'D05-S04-EXTRA-1:authorized','rule:requiredAuthorization');
    expect(auth).toMatchObject({status:'mismatch',title:'信息不符'});
  });

  it('同字段、同一纸面、缺失、退回或未交付、无关键都不是绿色',()=>{
    const s=atCase(7,5);
    for(const [a,b] of [
      ['book:ipRegion','book:ipRegion'],
      ['book:ipRegion','book:applicationId'],
      ['rule:today','book:applicationId'],
      ['rule:today','rule:allowedRegions'],
      ['D07-S06-PASSPORT:issuer','rule:allowedIssuers'],
      ['not-a-field','book:ipRegion'],
    ]){
      const r=compareFields(s,a,b);
      expect(r).toMatchObject({status:'unverified',title:'无法核对'});
      expect(r.detail.length).toBeGreaterThan(0);
    }
    const hidden=atCase(2,4);
    const askedId=currentCase(hidden)!.askedPapers[0].id;
    expect(compareFields(hidden,askedId+':issuer','rule:allowedIssuers')).toMatchObject({status:'unverified',title:'无法核对'});
  });
});
