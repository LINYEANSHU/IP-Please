import {describe,it,expect} from 'vitest';
import {act,campaignStart,enterCampaignDay,finishCampaignWork,rescueCampaign} from '../fixtures/campaign';
import {currentCase} from '../../src/domain/run';
import type {RunState} from '../../src/domain/run';
import {pendingMail,createCampaign,resolveDeparture,recordAudit,auditPoints} from '../../src/domain/campaign';
import {evaluateCase} from '../../src/domain/rules';
import {beginAttack} from '../../src/domain/defense';
import {validRun} from '../../src/storage/validate';
import {saveRun,loadRun,SAVE_KEY} from '../../src/storage/snapshot';

function badBan(s:RunState){
  s=act(s,{type:'call'});const c=currentCase(s)!;s=act(s,{type:'procedure',caseId:c.id,disposition:'ban'});expect(validRun(s)).toBe(true);return s;
}
describe('后期交易与失败边界',()=>{
  it('真实三次滥用封号：先通知并保留完整工作日，到期后E03且不扣当日租金',()=>{
    let s=enterCampaignDay(campaignStart(13));for(let i=0;i<3;i++)s=badBan(s);
    expect(s.campaign!.auditDue).toBe(15);expect(s.ending).toBeNull();
    s=finishCampaignWork(s);s=act(s,{type:'settle'});expect(s.ending).toBeNull();s=act(s,{type:'supply',choice:{electricity:true,tokens:true}});s=act(s,{type:'next-day'});
    s=enterCampaignDay(s);expect(s.campaign!.mail.some(m=>m.id.startsWith('audit-'))).toBe(true);s=finishCampaignWork(s);s=act(s,{type:'settle'});s=act(s,{type:'supply',choice:{electricity:true,tokens:true}});s=act(s,{type:'next-day'});
    s=finishCampaignWork(enterCampaignDay(s));s=act(s,{type:'settle'});expect(s.ending).toBe('E03');expect(validRun(s)).toBe(true);expect(s.ledger.some(e=>e.id==='day:15:rent')).toBe(false);
  });
  it('完整交接先发底薪再付租，到账后少于20优先E13；恰好20可免费完成交接',()=>{
    const s=campaignStart(31,'standard',id=>({'liang-intro':'receive','liang-contract':'accept','liang-samples':'accept','community-register':'authorize'}[id]??'return'));
    const prepared=finishCampaignWork(enterCampaignDay(s,id=>id==='dispatch'?'submit':'return'));
    expect(resolveDeparture(prepared)).toBe('E10');
    // Isolate the mandatory rent boundary with a deliberately minimal net
    // balance; full real-ledger paths are covered in campaign-endings.test.ts.
    for(const balance of [9,10,11]){
      const copy=structuredClone(prepared);copy.balance=balance;
      const end=act(copy,{type:'settle'});expect(end.ending).toBe(balance+10<20?'E13':'E10');expect(end.balance).toBe(balance+10<20?balance+10:balance+10-20);
    }
  },30000);
  it('守卫死亡保存后不复活、不再提出亲戚委托；远程受理仍可继续',()=>{
    let s=enterCampaignDay(campaignStart(18));
    // Use the ordinary first four cases to reach the actual scheduled attack.
    for(let i=0;i<4;i++){
      s=act(s,{type:'call'});s=act(s,{type:'ask'});const c=currentCase(s)!,e=evaluateCase(s.day,c,s.caseRuntime[c.id].delivered);
      s=act(s,{type:'stamp',caseId:c.id,decision:e.decision});s=act(s,{type:'return',caseId:c.id});for(const id of Object.keys(s.papers))s=act(s,{type:'return-paper',paperId:id});
    }
    expect(s.phase).toBe('defense');s=rescueCampaign(s,false);expect(s.campaign!.guards).toEqual({W01:false,W02:false});
    expect(validRun(s)).toBe(true);s=finishCampaignWork(s);s=act(s,{type:'settle'});s=act(s,{type:'supply',choice:{electricity:true,tokens:true}});s=act(s,{type:'next-day'});
    s=enterCampaignDay(s);expect(s.campaign!.mail.some(m=>m.id==='cousin')).toBe(false);expect(s.campaign!.commission).toBe(false);
  },30000);
  it('宽免后同日新行为仍生成新的审计事实',()=>{
    const s=campaignStart(30);s.campaign!.flags.push('liang-contract');recordAudit(s,'a','测试已记录处置');recordAudit(s,'b','测试已记录处置');recordAudit(s,'c','测试已记录处置');
    s.phase='correspondence';let m=pendingMail(s);
    while(m&&m.id!=='contact-check'){s.campaign!.mail.push({id:m.id,day:30,option:m.options[0].id});m=pendingMail(s);}
    expect(m?.id).toBe('contact-check');const after=act(s,{type:'mail',id:'contact-check',option:'submit'});expect(auditPoints(after)).toBe(0);
    recordAudit(after,'d','核验表交回后又一宗实际违规');expect(auditPoints(after)).toBe(2);
  });
});
