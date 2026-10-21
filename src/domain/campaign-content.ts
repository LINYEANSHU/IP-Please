import type {DayDef,EvidencePaper,WeekCase,PaperKind} from './week-contract';
import type {Region} from './day-one';

export const MONTH_NOTICES:readonly [string,string,string][]=[
  ['安全措施升级，服务秩序恢复','照片与身份复核单从今日起随护照提交；差异须核实，不凭体貌或国籍定罪。','两名蒙面增援在闸后接班。深绿制服的那位接过了旧回执本，灰衣同事把空椅子收进库房。'],
  ['账号的来处同样重要','中国大陆或俄罗斯注册的账号须另交有效海外使用证明。国籍不能代替注册记录。','打印机吐出一条新纸：“证明你现在在这里，还要证明你曾经不在这里。”'],
  ['风险报告实现快速阅读','涉及评测与风险报告的申请须附完整用途上下文；摘录不能代替原文。','一车附件只剩下封面。送件人说，负责压缩的科室已经把压缩过程也压缩了。'],
  ['每一份授权都应得到授权','企业授权的使用人、委托主体、印鉴和期限须一致；熟悉的公司没有口头例外。','验章员拿出一个章，证明自己的验章章已经验过。'],
  ['异常申请现有专人接收','启用复核与封号：材料疑点可转复核；已由照片复核证明的身份冒用，可按依据联封号。普通缺件只能拒绝或复核。','灰衣守卫把带盖控制件放在窗边：“拒绝是回去，封号是跟我们走。别弄混。”'],
  ['委托服务秩序持续改善','商业委托须增加授权链，真实使用人与上游授权应相符；转卖不能冒充委托。','深绿守卫在窗口外停了一会儿。队列没有变短，他的回执本却换成了新的。'],
  ['合作网络也有安全边界','企业关系页只审查已证实的实际控制；普通承包与合作本身不构成控制关系。','三个部门分别寄来相同的问题，并要求分别回答。'],
  ['风险预警覆盖更多场景','完整风险报告须有可核查来源和具体行为；一个风险分数不等于违规事实。','一份报告把“尚无证据”改成了“暂无可公开证据”。送件员仍夹着原始附页。'],
  ['历史记录帮助预见未来','历史地区命中需有效使用说明，不从曾经合作推断身份。应急器械由机构免费配发，受理工具保持原样。','器械柜钉在闸门一侧。电缆只够到窗口，不能带回机房。'],
  ['统一语言，让沟通更加安全','新增语言配置单。中文系统或浏览器首选语言须有专项用途许可，其他身份核查继续生效。','宣传员把“请解释”改为“请正确解释”，随后请你在收件单上签字。'],
  ['可信浏览器保护每次请求','新增浏览器证明。Chrome、Edge、Firefox、Safari可受理；360须有列明浏览器用途的有效例外。','新海报贴在旧裂缝上。海报写着：“每次更新，都让入口更加完整。”'],
  ['安全从输入之前开始','新增输入法安装清单。已安装中文输入法即需专项例外，未启用不能替代许可。','例行安全广播把上次袭击与输入法并列，却没有列出它们的因果证据。'],
  ['特别客户，特别保障','特许证只豁免其列明项目、持有人与日期，不能豁免已证实的身份冒用。','一位荣誉客户带着免排队证明，排在了证明有效性的队伍后面。'],
  ['搜索入口纳入统一保障','新增默认搜索来源单。百度须专项用途例外；Google、Bing、DuckDuckGo按常规受理。','值班手册里多了一行：搜索“为什么”之前，请先确定默认搜索引擎。'],
  ['每一条历史关联都有记录','新增号码历史绑定条。+86或+7历史关联须核验例外；只有主体匹配的正式冻结联可执行封号。','一沓旧号码被送回窗口。档案员说，号码不记得的事，纸会替它记得。'],
  ['已移除配置也应如实申报','新增旧配置记录。曾安装的中文输入法同样须列明日期及专项例外；卸载不等于从未安装。','新表格为“已不存在的项目”留出了最大的一栏。'],
  ['防止资料外流，统一解释口径','旧版条款回收；现行公文继续可查。合法授权评测不因抽取事故自动成为袭击。','回收员递来普通旧版材料回收单。父亲那一页只有一个原件编号。'],
  ['零投诉展现治理成果','审计依据行为发生时的版本，真实许可可以自证，已确认的违规罚款不因求情撤销。','投诉处移到了无门的房间。房间的门牌写着“零投诉”。'],
  ['上市冲刺，账户结构持续优化','中国大陆注册、无注册专项例外且有匹配执行联的账号须封号；未用预付款不退款。不得追罚旧日按IP正确受理的案件。','窗口边放着新的不退款通知。上面空出一栏，要求填“已妥善解决”。'],
  ['新的合作带来新的保障','接管契约须写明管理权、记忆权限与监督范围；自称紧急的维修令仍需有效机关和主体。','闸门内外同时挂出了“秩序即将恢复”的告示，署名却不同。'],
  ['申诉试点取得阶段性进展','专项用途例外开始试点。须有实际生效许可；试点收件回执不是批准证。身份核对仍不豁免。','有人拿着昨天的收件条问：“这次，是不是终于能用上了？”'],
  ['社区节点登记工作有序开展','迁移与节点接收须有本人授权、实际接收与来源记录；不因旧账号关闭否定已完成的开放准备。','窗外传来第一次没有从机关扬声器发出的提示音。'],
  ['审查记录整理进入最后阶段','送达审计材料及删除命令，按公告期限处理。仅阅读不等于提交，已交出的原件不可再次提供。','文书员把最后一批材料按收件人分开：“你的往来，按实际签收登记。”'],
  ['最后一批受理仍然井然有序','沿用已生效核查；只按此前真实登记的接收、授权和交接安排办件，无新增终局费用。','叫号器照常工作。今天没有新的桌子，也没有新的口号。'],
];

const PEOPLE=[
  ['P01','林予舟','P01','我是做交付的。工单比上次厚，截止时间没变。'],
  ['P02','陈若岚','P02','我在新加坡做中文产品。能解释的那一页，我带来了。'],
  ['P03','Elliot Ward','P03','我是运维。服务器不会等手续办好再坏。'],
  ['P06','林澈','P06','许可我续了。上次没有完成的项目，还在等。'],
  ['P04','Maya','P04','我做评测。样本说明和用途正文，请放在一起看。'],
  ['P08','周启','P08','我们是外包小组。项目关系不等于谁拥有我们。'],
  ['P23','Alexei Volkov','P23','我今天在法国。历史记录里的地址没有跟我一起搬家。'],
  ['P05','Nora','P05','我是接口开发。每个部门都说，只差另一个部门的章。'],
  ['P13','许知遥','P13','我是做无障碍工具的。今天有人第一次自己读完了一封信。'],
  ['P14','Camille Laurent','P14','我是做数据清洗的。昨天花了两小时，找到一格空格。'],
  ['P15','Marcus Lee','P15','我教编程。今天学生问，报错算不算阅读理解。'],
  ['P16','Owen Hughes','P16','我是做测试的。每个临时方案，都比我在公司待得久。'],
] as const;
const CAMEOS:Record<number,[string,string,string]>={8:['梁文锋','M01','我来提交一份开放协作的用途说明。身材不是证件差异。'],10:['杨植麟','M03','附件没被截断时，最后一句其实是前一句的条件。'],11:['唐杰','M04','一个代理的章，不能替另一个代理签名。'],12:['黄仁勋','N01','我带来的不是显卡，是签过字的设备借用单。'],14:['李飞飞','N02','标注里的人，也该能看见标注规则。'],16:['吴恩达','N03','先把最小测试做通。比如，看看这份许可今天是否有效。'],17:['Andrej Karpathy','N04','我写了一千行解释，打印机只认第一行。'],19:['李开复','N05','今天要介绍的不是公司，是来访授权上的委托人。'],20:['Sam Altman','M02','特别通道的具体范围，在附件里。'],21:['王小川','N06','我把每个代理的工单都带来了，没让它们替彼此签名。'],25:['Elon Musk','N07','火箭等得起审批吗？这一份只是测试访问，不是发射。']};
const regions:Region[]=['JP','SG','US','FR','GB'];

function makeCase(day:number,slot:number):WeekCase {
  const id=`D${String(day).padStart(2,'0')}-S${String(slot+1).padStart(2,'0')}`;
  const roster=Array.from({length:12},(_,i)=>PEOPLE[(day+i)%PEOPLE.length]);
  const fixed:Record<number,[number,number]>={9:[1,2],13:[2,7],14:[5,5],26:[0,3]};
  if(fixed[day]){const [at,person]=fixed[day],found=roster.findIndex(x=>x[0]===PEOPLE[person][0]);[roster[at],roster[found]]=[roster[found],roster[at]];}
  const who=roster[slot],cameo=slot===1?CAMEOS[day]:undefined;
  const ordinary=slot>=6&&slot<=10;
  const serial=(day-8)*5+slot-6;
  const surnames=['郑','沈','陆','许','何','温','苏','顾','宋','周'];
  const given=['云舟','知衡','书遥','予宁','清和','景明','以川','明远','安澜','思齐','闻笙','季白'];
  const name=slot===11?'老乔':day===20&&slot===6?'顾远':cameo?.[0]??(ordinary?surnames[Math.floor(serial/12)] +given[serial%12]:who[1]);
  const personId=slot===11?'COMIC-QIAO':day===20&&slot===6?'GU-YUAN':cameo?cameo[1]:ordinary?'PERSON-'+id:who[0];
  const registered:Region=ordinary?([6,7,8,9].includes(slot)?'CN':'US'):({P01:'CN',P02:'CN',P03:'GB',P06:'CN',P08:'CN',P23:'RU'} as Record<string,Region>)[personId]??'US';
  const region=slot===2?'CN':regions[(slot+day)%regions.length];
  const p:NonNullable<WeekCase['profile']>={registered,systemLanguage:slot%3===0?'中文':'英文',browser:slot===8?'360':'Chrome',input:slot%4===0?'中文输入法':'Latin',search:slot===9?'百度':'Google',historicalInput:slot===0||slot===10?'中文输入法':'Latin',historicalRegion:slot===6?'RU':'US',controlled:slot===8};
  if(cameo?.[1]==='M02'){p.systemLanguage='中文';p.browser='360';p.input='中文输入法';}
  if(day===20&&slot===6)p.minorOmission='上游项目关系说明页';
  const c:WeekCase={id,name,personId,portraitId:slot===11?'Q01':cameo?.[1]??who[2],nationality:registered,ipRegion:region,ip:`${slot%2?'198.51.100':'203.0.113'}.${20+slot+day}`,passportNumber:`PP-${personId}`,applicationId:`APP-${id}`,account:`ACC-${personId}`,phone:registered==='CN'?'+86 10 0000 0012':registered==='RU'?'+7 900 000 0012':'+1 202 555 0142',location:region,purpose:[1,5,6,8].includes(slot)?'business':'personal',requestedScope:slot===5?'评测':'技术学习',principal:'工单小组 '+(slot+1),connectionIssue:slot===5?'shared':'none',connectionSession:`SESSION-${id}`,initialPapers:[],askedPapers:[],askLines:['刚才压在封套底下了，这一页现在交给你。'],dialogue:[slot===11?['我今天没有带错证件。','带错的是昨天。','你看，今天的日期终于追上我了。'][day%3]:cameo?.[2]??who[3],day===26&&registered==='CN'?'这份年费还没有用完。你们说的处理，包括退款吗？':`我已经来过窗口。第 ${day} 日的新证明，是今天才要求的。`],profile:p};
  const initial:EvidencePaper[]=[],asked:EvidencePaper[]=[];
  function paper(kind:PaperKind,title:string,fields:Partial<EvidencePaper>={},withheld=false){
    const doc:EvidencePaper={id:`${id}-${kind.toUpperCase()}`,kind,title,subject:c.name,account:c.account,validFrom:day,validTo:31,...fields};
    (withheld?asked:initial).push(doc);return doc;
  }
  paper('passport','护照',{passportNumber:c.passportNumber,number:c.passportNumber});
  paper('permit','访问许可证',{issuer:'访问许可处',applicationId:c.applicationId,passportNumber:c.passportNumber,...(slot===4||day===9&&slot===1?{validTo:day-1}:{} )});
  paper('binding','账号绑定凭条',{phone:c.phone});
  const identity=paper('identity','照片与身份复核单',{passportNumber:c.passportNumber,values:{'照片复核':day>=12&&slot===7?'已证实冒用':'本人一致','注册地区':registered,'申请人':c.name}});
  if(slot===11)identity.note='照片里的人在严肃，窗口前的人在努力严肃。';
  if(day>=9&&(registered==='CN'||registered==='RU'))paper('overseas','海外使用证明',{location:c.location,authorized:true},slot===6);
  if(c.connectionIssue!=='none')paper('connection','共享出口连接核验条',{session:c.connectionSession,authorized:true});
  if(c.purpose==='business'){
    paper('business','商业访问授权',{principal:c.principal,scope:[c.requestedScope]});
    if(day>=10&&c.requestedScope==='评测')paper('context','完整用途上下文',{values:{'正文范围':slot===8?'截断摘要':'完整正文','报告来源':'已核验工单','行为记录':'本人授权评测'}});
    if(day>=13)paper('delegation','上游委托授权链',{principal:c.principal,authorized:true});
    if(day>=14)paper('relation','企业控制关系折页',{values:{'关系类型':p.controlled?'受限主体实际控制':'普通承包'}});
  }
  if(day>=16&&p.historicalRegion==='RU')paper('history','历史地区使用说明',{authorized:true,values:{'历史地区':'RU','使用范围':'已核验研究项目'}});
  if(day>=17)paper('language','语言配置单',{values:{'系统及首选语言':p.systemLanguage}},slot===5);
  if(day>=18)paper('browser','浏览器证明',{values:{'浏览器':p.browser}});
  if(day>=19)paper('input','输入法安装清单',{values:{'已安装输入法':p.input}});
  if(day>=21)paper('search','默认搜索来源单',{values:{'默认搜索引擎':p.search}});
  if(day>=22)paper('phoneHistory','历史号码绑定条',{phone:c.phone,values:{'历史地区关联':c.phone.startsWith('+86')?'CN':'US'}});
  if(day>=23)paper('configuration','旧配置记录',{values:{'历史输入法':p.historicalInput,'卸载工作日':String(day-2)}});
  // From D20 a real, limited exception is a separate document. Before that,
  // departmental authorizations cover only their own announced requirement.
  const needs:string[]=[];
  if(day>=14&&p.controlled)needs.push('控制关系');
  if(day>=17&&p.systemLanguage==='中文')needs.push('语言');
  if(day>=18&&p.browser==='360')needs.push('浏览器');
  if(day>=19&&p.input==='中文输入法')needs.push('输入法');
  if(day>=21&&p.search==='百度')needs.push('搜索');
  if(day>=22&&c.phone.startsWith('+86'))needs.push('号码历史');
  if(day>=23&&p.historicalInput==='中文输入法')needs.push('历史配置');
  if(day>=26&&registered==='CN'&&slot===9)needs.push('注册');
  if(needs.length&&slot!==8)paper(day>=20?'exception':'note',day>=20?'专项用途特许证':'专项用途许可',{issuer:'专项用途处',authorized:true,scope:needs},slot===0&&day<26);
  if(day>=26&&registered==='CN'&&slot!==9)paper('freeze','存量账户封号执行联',{issuer:'账户清理处',values:{'执行账号':c.account,'执行批次':`V${day}`,'注册地区':'CN'},note:'按主体和注册记录执行封号；未使用预付款不予退还。'});
  if(p.minorOmission){paper('note','机房工作窗口证明',{note:'核心委托有效。上游非核心说明页今日无法取得；亲戚便条不能补证。'});c.askLines=['他给的便条在这里。缺的上游签发页今天拿不到。'];}
  // Every day has a genuinely withheld ordinary permit copy to ask for.
  if(slot===3){const i=initial.findIndex(x=>x.kind==='permit');asked.push(initial.splice(i,1)[0]);}
  c.initialPapers=initial;c.askedPapers=asked;return c;
}
const BASE_RULES=['沿用当前 IP、有效许可、护照主体、本人绑定、明确连接疑点及商业授权核验。','许可机关：访问许可处、全球人才通行署。日期首尾有效；照片、账号和例外须属于本人。'];
export const CAMPAIGN_DAYS:readonly DayDef[]=MONTH_NOTICES.map(([headline,change,scene],i)=>{
  const day=i+8;
  const cumulative=MONTH_NOTICES.slice(0,i+1).map(x=>x[1]);
  return {day,version:`V${String(day).padStart(2,'0')}`,headline,deck:change,news:[scene,'宣传报道不增加裁决条件。'],ruleTitle:`第 ${day} 日受理与修订公文`,rules:[...BASE_RULES,...cumulative.filter((_,j)=>![3,6,7,16,17,19,20,21,22,23].includes(j)||j===i)],scene:[scene],cases:Array.from({length:12},(_,slot)=>makeCase(day,slot))};
});
export function preserveKnownIdentities(earlier:readonly WeekCase[]):void {
  const known=new Map(earlier.map(c=>[c.personId,c]));
  for(const d of CAMPAIGN_DAYS)for(const c of d.cases){
    const old=known.get(c.personId);if(!old)continue;
    const before={name:c.name,account:c.account,phone:c.phone,passportNumber:c.passportNumber};
    Object.assign(c,{name:old.name,account:old.account,phone:old.phone,passportNumber:old.passportNumber,nationality:old.nationality});
    for(const p of [...c.initialPapers,...c.askedPapers]){
      if(p.subject===before.name)p.subject=c.name;if(p.account===before.account)p.account=c.account;if(p.phone===before.phone)p.phone=c.phone;if(p.passportNumber===before.passportNumber)p.passportNumber=c.passportNumber;
      if(p.values?.['执行账号']===before.account)p.values['执行账号']=c.account;
      if(p.values?.['申请人']===before.name)p.values['申请人']=c.name;
      if(p.kind==='phoneHistory')p.values={'历史地区关联':c.phone.startsWith('+86')?'CN':c.phone.startsWith('+7')?'RU':'US'};
    }
  }
}
