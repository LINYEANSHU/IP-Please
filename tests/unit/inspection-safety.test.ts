import {it,expect} from 'vitest';
import {atCase} from '../fixtures/week';
import {compareFields} from '../../src/domain/inspection';
it('访问许可机关清单不能拿来判定绑定条等其他部门的签发机关',()=>{
  const s=atCase(4);
  expect(compareFields(s,'D04-S01-BINDING:issuer','rule:allowedIssuers')).toMatchObject({status:'unverified'});
  expect(compareFields(s,'rule:allowedIssuers','D04-S01-BINDING:issuer')).toMatchObject({status:'unverified'});
  expect(compareFields(s,'D04-S01-PERMIT:issuer','rule:allowedIssuers')).toMatchObject({status:'match'});
});
