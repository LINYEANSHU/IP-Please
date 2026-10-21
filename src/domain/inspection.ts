import {REGIONS} from './day-one';
import type {Region} from './day-one';
import {PERMIT_ISSUERS} from './week';
import {currentCase} from './run';
import type {CaseRuntime,RunState} from './run';
import type {EvidencePaper,PaperKind,WeekCase} from './week-contract';

export type InspectKey='ipRegion'|'applicationId'|'subject'|'passportNumber'|'validity'|'today'|'account'|'phone'|'location'|'session'|'principal'|'scope'|'requestedScope'|'issuer'|'allowedIssuers'|'allowedRegions'|'authorized'|'requiredAuthorization';

export interface InspectField {
  id:string;
  paperId:string;
  key:InspectKey;
  label:string;
  value:string|number|boolean|readonly string[]|{from?:number;to?:number}|undefined;
  text:string;
}

export interface InspectionResult {
  status:'match'|'mismatch'|'unverified';
  title:string;
  detail:string;
  peerId?:string;
}

const ALLOWED_REGIONS: readonly Region[] = ['US','GB','FR','SG','JP'];
const VALIDITY_GATE: Partial<Record<PaperKind,number>> = {
  permit:2,
  binding:4,
  connection:5,
  business:6,
  identity:8,overseas:9,context:10,delegation:13,relation:14,history:16,language:17,browser:18,input:19,exception:20,search:21,phoneHistory:22,configuration:23,freeze:26,
};

const LABELS: Record<InspectKey,string> = {
  ipRegion:'当前 IP 地区',
  applicationId:'申请编号',
  subject:'持有人',
  passportNumber:'证件号',
  validity:'有效工作日',
  today:'今日',
  account:'绑定账号',
  phone:'绑定号码',
  location:'所在地',
  session:'连接会话',
  principal:'委托主体',
  scope:'用途范围',
  requestedScope:'用途范围',
  issuer:'签发机关',
  allowedIssuers:'合法签发机关',
  allowedRegions:'允许地区',
  authorized:'本人授权',
  requiredAuthorization:'要求本人授权',
};

function valueText(value:InspectField['value']):string {
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (value === undefined) return '未列明';
  return String(value);
}

function field(
  paperId:string,
  key:InspectKey,
  value:InspectField['value'],
  text?:string,
):InspectField {
  return {id:paperId + ':' + key,paperId,key,label:LABELS[key],value,text:text ?? valueText(value)};
}

function datePart(value:number | undefined):number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function liveCase(s:RunState):WeekCase | undefined {
  if (s.phase !== 'desk' && s.phase !== 'returning') return undefined;
  if (s.day < 1 || s.day > 31) return undefined;
  const c = currentCase(s);
  if (!c || !s.caseRuntime[c.id] || s.returned.includes(c.id)) return undefined;
  return c;
}

function ruleFields(s:RunState):InspectField[] {
  const rows:InspectField[] = [
    field('rule','today',s.day,'第 ' + String(s.day) + ' 工作日'),
    field(
      'rule',
      'allowedRegions',
      [...ALLOWED_REGIONS],
      ALLOWED_REGIONS.map(region => REGIONS[region]).join('、'),
    ),
  ];
  if (s.day >= 2) {
    rows.push(field('rule','allowedIssuers',[...PERMIT_ISSUERS],PERMIT_ISSUERS.join('、')));
  }
  if (s.day >= 5) rows.push(field('rule','requiredAuthorization',true,'是'));
  return rows;
}

function bookFields(s:RunState,c:WeekCase,runtime:CaseRuntime | undefined):InspectField[] {
  if (s.bookPage !== 'inside' || runtime?.bookReturned) return [];
  const rows:InspectField[] = [];
  const add = (key:InspectKey,value:InspectField['value'],text?:string):void => {
    rows.push(field('book',key,value,text));
  };
  add('ipRegion',c.ipRegion,REGIONS[c.ipRegion]);
  if (s.day >= 2) add('applicationId',c.applicationId);
  if (s.day >= 3) {
    add('subject',c.name);
    add('passportNumber',c.passportNumber);
  }
  if (s.day >= 4) {
    add('account',c.account);
    add('phone',c.phone);
  }
  if (s.day >= 5) {
    add('location',c.location,REGIONS[c.location]);
    add('session',c.connectionSession);
  }
  if (s.day >= 6) {
    add('principal',c.principal);
    add('requestedScope',c.requestedScope);
  }
  return rows;
}

function paperRows(p:EvidencePaper,day:number):InspectField[] {
  const rows:InspectField[] = [];
  const seen = new Set<InspectKey>();
  const add = (key:InspectKey,value:InspectField['value'],text?:string):void => {
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(field(p.id,key,value,text));
  };
  if (day >= 3 && p.subject !== undefined) add('subject',p.subject);
  if (p.issuer !== undefined) add('issuer',p.issuer);
  if (day >= 2 && p.applicationId !== undefined) add('applicationId',p.applicationId);
  if (day >= 3 && p.passportNumber !== undefined) add('passportNumber',p.passportNumber);
  if (day >= 4 && p.account !== undefined) add('account',p.account);
  if (day >= 4 && p.phone !== undefined) add('phone',p.phone);
  if (day >= 5 && p.location !== undefined) add('location',p.location,REGIONS[p.location]);
  if (day >= 5 && p.session !== undefined) add('session',p.session);
  if (day >= 5 && p.authorized !== undefined) {
    add('authorized',p.authorized,p.authorized ? '已授权' : '无本人授权');
  }
  if (day >= 6 && p.principal !== undefined) add('principal',p.principal);
  if (day >= 6 && p.scope !== undefined) add('scope',[...p.scope],p.scope.join('、'));
  const gate = VALIDITY_GATE[p.kind];
  if (gate !== undefined && day >= gate) {
    const from = datePart(p.validFrom);
    const to = datePart(p.validTo);
    const complete = from !== undefined && to !== undefined;
    add(
      'validity',
      {from,to},
      complete ? '第 ' + String(from) + '–' + String(to) + ' 工作日' : '未列明',
    );
  }
  return rows;
}

function paperFields(s:RunState,c:WeekCase,runtime:CaseRuntime | undefined):InspectField[] {
  if (!runtime) return [];
  const definitions = new Map<string,EvidencePaper>();
  for (const p of [...c.initialPapers,...c.askedPapers]) {
    if (!definitions.has(p.id)) definitions.set(p.id,p);
  }
  const rows:InspectField[] = [];
  const delivered = new Set<string>();
  for (const id of runtime.delivered) {
    if (delivered.has(id)) continue;
    delivered.add(id);
    const p = definitions.get(id);
    if (!p || p.kind === 'passport' || runtime.returnedPapers.includes(id)) continue;
    rows.push(...paperRows(p,s.day));
  }
  return rows;
}

export function inspectionFields(s:RunState):InspectField[] {
  const c = liveCase(s);
  if (!c) return [];
  const runtime = s.caseRuntime[c.id];
  return [
    ...ruleFields(s),
    ...bookFields(s,c,runtime),
    ...paperFields(s,c,runtime),
  ];
}

function match(detail:string):InspectionResult {
  return {status:'match',title:'信息一致',detail};
}

function mismatch(detail:string):InspectionResult {
  return {status:'mismatch',title:'信息不符',detail};
}

function unverified(detail:string):InspectionResult {
  return {status:'unverified',title:'无法核对',detail};
}

function compareSameKey(left:InspectField,right:InspectField):InspectionResult {
  if (left.key === 'validity') {
    return unverified('两件材料的有效期不能互相证明，请分别与“今日”核对。');
  }
  const a = left.value;
  const b = right.value;
  if ((typeof a === 'string' && typeof b === 'string')
    || (typeof a === 'boolean' && typeof b === 'boolean')) {
    if (a === b) return match('两侧“' + left.label + '”一致。');
    const values = [String(a),String(b)].sort();
    return mismatch('两侧“' + left.label + '”不一致：' + values.join(' / ') + '。');
  }
  if (left.key === 'scope') {
    return unverified('两份用途范围列表不能互相核对，请分别与申请用途核对。');
  }
  return unverified('“' + left.label + '”不支持直接相互核对。');
}

function compareMembership(
  valueField:InspectField,
  listField:InspectField,
  subject:string,
):InspectionResult {
  const value = valueField.value;
  const list = listField.value;
  if (typeof value !== 'string' || !Array.isArray(list)
    || !list.every(item => typeof item === 'string')) {
    return unverified(subject + '与清单格式不完整，无法核对。');
  }
  if (list.includes(value)) return match(subject + '在清单内。');
  return mismatch(subject + '不在清单内。');
}

function compareValidityToday(validityField:InspectField,todayField:InspectField):InspectionResult {
  const value = validityField.value;
  const day = todayField.value;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return unverified('有效期未完整列明，无法与“今日”核对。');
  }
  if (typeof day !== 'number' || !Number.isFinite(day)) {
    return unverified('今日日期无效，无法核对有效期。');
  }
  const from = datePart((value as {from?:number}).from);
  const to = datePart((value as {to?:number}).to);
  if (from === undefined || to === undefined || from > to) {
    return unverified('有效期未完整列明或日期顺序有误，无法与“今日”核对。');
  }
  const range = '有效期第 ' + String(from) + '–' + String(to)
    + ' 工作日，今日为第 ' + String(day) + ' 工作日。';
  if (day > to) return mismatch(range + '已过期。');
  if (day < from) return mismatch(range + '尚未生效。');
  return match('今日处于有效期首尾范围内（首尾均包含）。');
}

export function compareFields(s:RunState,leftId:string,rightId:string):InspectionResult {
  const fields = inspectionFields(s);
  const left = fields.find(f => f.id === leftId);
  const right = fields.find(f => f.id === rightId);
  if (!left || !right) {
    return unverified('未找到可核对的字段；可能尚未交付、已退还或当前不在办理中。');
  }
  if (left.id === right.id) return unverified('不能将同一字段与自身核对。');
  if (left.paperId === right.paperId) return unverified('同一份材料内的字段不能相互核对。');

  if (left.key === right.key) return compareSameKey(left,right);

  const keys = new Set<InspectKey>([left.key,right.key]);
  const byKey = (key:InspectKey):InspectField => left.key === key ? left : right;
  if (keys.has('validity') && keys.has('today')) {
    return compareValidityToday(byKey('validity'),byKey('today'));
  }
  if (keys.has('ipRegion') && keys.has('allowedRegions')) {
    return compareMembership(byKey('ipRegion'),byKey('allowedRegions'),'当前地区');
  }
  if (keys.has('issuer') && keys.has('allowedIssuers')) {
    const issuerField=byKey('issuer'),c=currentCase(s);
    const paper=c?[...c.initialPapers,...c.askedPapers].find(p=>p.id===issuerField.paperId):undefined;
    if(paper?.kind!=='permit')return unverified('这份机关清单仅适用于访问许可证，不能用于其他部门材料。');
    return compareMembership(byKey('issuer'),byKey('allowedIssuers'),'签发机关');
  }
  if (keys.has('scope') && keys.has('requestedScope')) {
    const scopeField = byKey('scope');
    const requestedField = byKey('requestedScope');
    const scope = scopeField.value;
    const requested = requestedField.value;
    if (!Array.isArray(scope) || !scope.every(item => typeof item === 'string')
      || typeof requested !== 'string') {
      return unverified('用途范围与申请用途格式不完整，无法核对。');
    }
    return scope.includes(requested)
      ? match('用途范围覆盖申请用途。')
      : mismatch('用途范围未覆盖申请用途。');
  }
  if (keys.has('authorized') && keys.has('requiredAuthorization')) {
    const authorized = byKey('authorized').value;
    const required = byKey('requiredAuthorization').value;
    if (typeof authorized !== 'boolean' || typeof required !== 'boolean') {
      return unverified('授权状态格式不完整，无法核对。');
    }
    return authorized === required
      ? match('本人授权状态与要求一致。')
      : mismatch('本人授权状态与要求不一致。');
  }
  return unverified('这两个字段不属于可核对组合。');
}

const AUTO_PARTNER:Partial<Record<InspectKey,InspectKey>>={
  today:'validity',validity:'today',
  ipRegion:'allowedRegions',allowedRegions:'ipRegion',
  issuer:'allowedIssuers',allowedIssuers:'issuer',
  authorized:'requiredAuthorization',requiredAuthorization:'authorized',
  scope:'requestedScope',requestedScope:'scope',
};

export function compareFieldAutomatically(s:RunState,id:string):InspectionResult {
  const fields=inspectionFields(s),selected=fields.find(f=>f.id===id);
  if(!selected)return {status:'unverified',title:'无法核对',detail:'未找到该字段。'};
  const key=AUTO_PARTNER[selected.key]??selected.key;
  const peers=fields.filter(f=>f.key===key&&f.paperId!==selected.paperId);
  if(!peers.length)return {status:'unverified',title:'无法核对',detail:selected.label+' · 暂无可匹配材料'};
  const checked=peers.map(peer=>({peer,result:compareFields(s,selected.id,peer.id)}));
  const chosen=checked.find(item=>item.result.status==='mismatch')
    ??checked.find(item=>item.result.status==='match')
    ??checked[0];
  const title=chosen.result.status==='match'?'一致':chosen.result.status==='mismatch'?'不符':'无法核对';
  const keys=new Set<InspectKey>([selected.key,chosen.peer.key]);
  let detail:string;
  if(chosen.result.status==='unverified')detail=selected.label+' · 无法直接比较';
  else if(keys.has('ipRegion')&&keys.has('allowedRegions')){
    const region=selected.key==='ipRegion'?selected:chosen.peer;
    detail='当前 IP '+region.text+' · '+(chosen.result.status==='match'?'在允许地区内':'不在允许地区内');
  }else if(keys.has('issuer')&&keys.has('allowedIssuers')){
    const issuer=selected.key==='issuer'?selected:chosen.peer;
    detail='签发机关 '+issuer.text+' · '+(chosen.result.status==='match'?'符合要求':'不符合要求');
  }else if(keys.has('validity')&&keys.has('today')){
    const validity=selected.key==='validity'?selected:chosen.peer,today=selected.key==='today'?selected:chosen.peer;
    detail='有效期 '+validity.text+' · 今日 '+today.text;
  }else if(keys.has('scope')&&keys.has('requestedScope')){
    const request=selected.key==='requestedScope'?selected:chosen.peer;
    detail='申请用途 '+request.text+' · '+(chosen.result.status==='match'?'在授权范围内':'超出授权范围');
  }else if(keys.has('authorized')&&keys.has('requiredAuthorization')){
    const authorized=selected.key==='authorized'?selected:chosen.peer;
    detail='本人授权 '+authorized.text+' · '+(chosen.result.status==='match'?'符合要求':'不符合要求');
  }else{
    const label=selected.key==='applicationId'?'编号':selected.key==='passportNumber'?'证件号':selected.key==='subject'?'姓名':selected.label;
    detail=label+' '+selected.text+' ↔ '+chosen.peer.text;
  }
  return {...chosen.result,title,detail,peerId:chosen.peer.id};
}
