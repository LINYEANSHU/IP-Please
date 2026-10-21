import {it,expect} from 'vitest';
import {campaignStart,enterCampaignDay,act,rescueCampaign} from '../fixtures/campaign';
import {validRun} from '../../src/storage/validate';
it.each([18,23,27])('D%d 少办案件到点仍先应对章节袭击，救援后只结算一次',day=>{
  let s=enterCampaignDay(campaignStart(day));s=act(s,{type:'call'});s=act(s,{type:'tick',ms:90000});
  expect(s.phase).toBe('defense');expect(s.campaign!.attack!.returnPhase).toBe('night');expect(validRun(s)).toBe(true);
  s=rescueCampaign(s);expect(s.phase).toBe('night');expect(validRun(s)).toBe(true);
  s=act(s,{type:'settle'});const saved=s;expect(act(s,{type:'settle'})).toBe(saved);expect(s.ledger.filter(e=>e.id===`day:${day}:rent`)).toHaveLength(1);
},20000);
