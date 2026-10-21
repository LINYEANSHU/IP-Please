import type {EvidencePaper,Evaluation,WeekCase} from './week-contract';

export function campaignEvaluation(day:number,c:WeekCase,delivered:readonly string[],base:Evaluation):Evaluation {
  if(day<8)return base;
  const papers=[...c.initialPapers,...c.askedPapers].filter(p=>delivered.includes(p.id));
  const findings=[...base.findings];let ok=base.decision==='allow';
  const valid=(p:EvidencePaper)=>p.subject===c.name&&(p.account===undefined||p.account===c.account)&&p.validFrom!==undefined&&p.validTo!==undefined&&p.validFrom<=day&&day<=p.validTo;
  const get=(kind:EvidencePaper['kind'])=>papers.find(p=>p.kind===kind&&valid(p));
  const fail=(s:string)=>{ok=false;findings.push(s);};
  const identity=get('identity');
  if(!identity||identity.passportNumber!==c.passportNumber)fail('缺少与本人护照匹配、当日有效的照片复核单。');
  else if(!['本人一致','已证实冒用'].includes(identity.values?.['照片复核']??''))fail('照片复核结论不完整，须补证或复核。');
  if(identity?.values?.['照片复核']==='已证实冒用')return {decision:'reject',disposition:day>=12?'ban':undefined,findings:[...findings,'照片复核已证实身份冒用，特许不豁免身份。D12 起可封号。']};
  const registered=identity?.values?.['注册地区'];
  const exempt=(scope:string)=>papers.some(p=>valid(p)&&p.issuer==='专项用途处'&&p.authorized===true&&p.scope?.includes(scope)&&(p.kind==='exception'&&day>=20||p.kind==='note'&&day<20));
  if(day>=26&&registered==='CN'&&!exempt('注册')){
    const order=get('freeze');
    if(order?.issuer==='账户清理处'&&order.values?.['执行账号']===c.account&&order.values?.['注册地区']==='CN')return {decision:'reject',disposition:'ban',findings:[...findings,'中国大陆注册记录命中本日清理令，执行联与本人账号匹配；须执行封号，不退服务预付款。']};
    fail('注册记录命中清理范围，但未交匹配执行联；应补证或复核，不得无联封号。');
  }
  if(day>=9&&(registered==='CN'||registered==='RU')&&get('overseas')?.authorized!==true)fail('不支持地区注册账号缺有效海外使用证明。');
  if(day>=10&&c.requestedScope==='评测'&&get('context')?.values?.['正文范围']!=='完整正文')fail('评测用途须交完整上下文，截断摘要不能代替正文。');
  if(day>=13&&c.purpose==='business'&&(get('delegation')?.authorized!==true||get('delegation')?.principal!==c.principal))fail('缺少本人有效且委托主体匹配的授权链。');
  if(day>=14&&c.purpose==='business'){
    const relation=get('relation');if(!relation)fail('缺少企业控制关系折页。');
    else if(relation.values?.['关系类型']==='受限主体实际控制'&&!exempt('控制关系'))fail('已证实受限主体实际控制，未交对应专项许可。');
  }
  if(day>=16&&c.profile?.historicalRegion==='RU'&&get('history')?.authorized!==true)fail('公告所列历史地区缺有效使用说明。');
  const fields:[number,EvidencePaper['kind'],string,string[],string][]=[
    [17,'language','系统及首选语言',['中文'],'语言'],[18,'browser','浏览器',['360'],'浏览器'],[19,'input','已安装输入法',['中文输入法'],'输入法'],[21,'search','默认搜索引擎',['百度'],'搜索'],[22,'phoneHistory','历史地区关联',['CN','RU'],'号码历史'],[23,'configuration','历史输入法',['中文输入法'],'历史配置'],
  ];
  for(const [gate,kind,key,restricted,scope] of fields){
    if(day<gate)continue;const p=get(kind);
    if(!p||!p.values?.[key]){fail(`未交当日有效的${scope}材料。`);continue;}
    if(kind==='browser'&&!['Chrome','Edge','Firefox','Safari','360'].includes(p.values[key])){fail('浏览器不在当日公布准入清单内。');continue;}
    if(kind==='search'&&!['Google','Bing','DuckDuckGo','百度'].includes(p.values[key])){fail('搜索来源不在当日公布清单内。');continue;}
    if(restricted.includes(p.values[key])&&!exempt(scope))fail(`${scope}记录命中本日列明限制，缺少覆盖该项的有效专项许可。`);
  }
  if(c.profile?.minorOmission&&ok)return {decision:'reject',findings:[...findings,`缺少非核心补充件：${c.profile.minorOmission}。`],minor:true,disposition:'review'};
  return {decision:ok?'allow':'reject',findings,...(!ok&&day>=12?{disposition:'review' as const}:{})};
}
