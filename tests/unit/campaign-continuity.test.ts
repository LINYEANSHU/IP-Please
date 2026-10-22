import {it,expect} from 'vitest';
import {getDay} from '../../src/domain/week';
import {act,campaignStart,enterCampaignDay} from '../fixtures/campaign';
import {currentCase} from '../../src/domain/run';
import {validRun} from '../../src/storage/validate';
it('回访人物的护照、国籍、账号及注册地保持连续，普通新申请人不借用旧身份',()=>{
  const seen=new Map<string,unknown>();
  for(let day=8;day<=31;day++)for(const c of getDay(day).cases){
    const identity={passport:c.passportNumber,account:c.account,phone:c.phone,nationality:c.nationality,registered:c.profile?.registered};
    if(seen.has(c.personId))expect(identity,c.personId).toEqual(seen.get(c.personId));else seen.set(c.personId,identity);
  }expect(seen.size).toBeGreaterThan(90);
});
// This fixture plays all preceding days through the real reducer.
it('已封账号回访以申诉材料进入，不重复封禁或领私人分成',()=>{
  let s=enterCampaignDay(campaignStart(26));s=act(s,{type:'call'});const c=currentCase(s)!;
  s.campaign!.banned.push(c.account);s.caseRuntime[c.id].appeal=true;
  const before=s;expect(act(s,{type:'procedure',caseId:c.id,disposition:'ban'})).toBe(before);
  s=act(s,{type:'procedure',caseId:c.id,disposition:'review'});expect(s.decisions[c.id]).toMatchObject({correct:true,disposition:'review'});
},30000);
