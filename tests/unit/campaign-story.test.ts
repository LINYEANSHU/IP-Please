import {describe,it,expect} from 'vitest';
import {newRun,reduceRun} from '../../src/domain/run';
import {createCampaign,pendingMail,resolveDeparture,ENDING_TEXT} from '../../src/domain/campaign';
import {beginAttack,attackAction} from '../../src/domain/defense';

describe('合作、终局与防御约束',()=>{
  it('所有13结局有实际尾声；空手不能产生交接',()=>{
    expect(Object.keys(ENDING_TEXT)).toHaveLength(13);
    const s=newRun('relaxed','story');s.day=31;s.campaign=createCampaign();
    expect(resolveDeparture(s)).toBeNull();
  });
  it('原件转交后不能恢复；大肥鱼的多日履约缺一不能执行',()=>{
    const s=newRun('relaxed','original');s.day=31;s.campaign=createCampaign();
    s.campaign.arrangement='community';s.campaign.flags=['liang-contract','liang-samples','open-license'];
    expect(resolveDeparture(s)).toBeNull();s.campaign.flags.push('community-ready','dispatch');
    expect(resolveDeparture(s)).toBe('E10');
    s.campaign.arrangement='archive';s.campaign.flags=['kimi-ready','memory-sent','dispatch'];
    s.campaign.oldRulesOwner='office';expect(resolveDeparture(s)).toBeNull();
    s.campaign.oldRulesOwner='kimi';expect(resolveDeparture(s)).toBe('E05');
  });
  it('只显示实际已登记的D31交件，不列路线选项',()=>{
    const s=newRun('relaxed','mail');s.day=31;s.campaign=createCampaign();
    expect(pendingMail(s)?.id).not.toBe('dispatch');
    s.campaign.arrangement='community';s.campaign.flags=['liang-contract','liang-samples','open-license','community-ready'];
    expect(pendingMail(s)?.id).toBe('dispatch');
    expect(pendingMail(s)?.options).toHaveLength(2);
  });
  it('普通来访不触发枪械；命中、充能、隔离和死亡可确定性续玩',()=>{
    const s=newRun('standard','attack');s.day=23;s.campaign=createCampaign();s.campaign.flags.push('weapon-trained');
    beginAttack(s);expect(s.phase).toBe('defense');
    attackAction(s,{type:'defense',command:'start'});attackAction(s,{type:'defense',command:'open'});attackAction(s,{type:'defense',command:'take'});
    const a=s.campaign.attack!;
    attackAction(s,{type:'defense',command:'fire',target:'civilian'});expect(a.charge).toBe(2);expect(a.hits).toHaveLength(0);
    for(const target of a.targets)attackAction(s,{type:'defense',command:'fire',target:target.id});
    expect(s.campaign.guards).toEqual({W01:true,W02:true});
    attackAction(s,{type:'defense',command:'isolate'});expect(s.campaign.attack?.stage).toBe('result');
    const saved=JSON.parse(JSON.stringify(s));expect(saved.campaign.attack.charge).toBe(0);expect(saved.campaign.attack.isolated).toBe(true);
  });
  it('设置及后台暂停救援计时；轻松模式不自动处死人',()=>{
    for(const mode of ['standard','relaxed'] as const){
      const s=newRun(mode,'pause');s.day=18;s.campaign=createCampaign();s.campaign.flags.push('weapon-trained');beginAttack(s);attackAction(s,{type:'defense',command:'start'});
      s.pauses=['settings'];const next=reduceRun(s,{type:'tick',ms:15000,actionId:'paused'}).state;
      expect(next.campaign!.guards.W01).toBe(true);
      s.pauses=[];attackAction(s,{type:'tick',ms:15000});
      expect(s.campaign!.guards.W01).toBe(mode==='relaxed');
    }
  });
});
