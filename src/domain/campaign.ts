import type {RunState,LedgerEntry} from './run';
import type {AttackState} from './defense';
import {getCaseById} from './week';

export type EndingId='E01'|'E02'|'E03'|'E04'|'E05'|'E06'|'E07'|'E08'|'E09'|'E10'|'E11'|'E12'|'E13';
export type Arrangement='archive'|'public'|'gateway'|'exclusive'|'internal'|'community';
export interface MailRecord {id:string;day:number;option:string}
export interface AuditRecord {id:string;day:number;reason:string;points:2}
export interface CampaignState {
  version:1;flags:string[];mail:MailRecord[];evidence:string[];partners:string[];
  oldRulesOwner:null|'player'|'office'|'kimi';arrangement:Arrangement|null;
  guards:{W01:boolean;W02:boolean};commission:boolean;banned:string[];reviews:string[];
  audit:AuditRecord[];auditDue:number|null;waiverDay:number|null;waivedRecords:string[];
  attack:AttackState|null;completedAttacks:number[];outgoing:string[];
  endingLine:number;
}
export interface MailOption {id:string;label:string}
export interface Mail {id:string;from:string;title:string;paragraphs:string[];options:MailOption[]}
const opt=(id:string,label:string):MailOption=>({id,label});
export function createCampaign():CampaignState {return {version:1,flags:[],mail:[],evidence:[],partners:[],oldRulesOwner:null,arrangement:null,guards:{W01:true,W02:true},commission:false,banned:[],reviews:[],audit:[],auditDue:null,waiverDay:null,waivedRecords:[],attack:null,completedAttacks:[],outgoing:[],endingLine:0};}
export function campaign(s:RunState):CampaignState {
  if(!s.campaign){s.campaign=createCampaign();if(s.story.oldRulesReceived){s.campaign.oldRulesOwner='player';s.campaign.evidence.push('oldRules');}}
  return s.campaign;
}
export function flag(s:RunState,key:string){const c=campaign(s);if(!c.flags.includes(key))c.flags.push(key);}
export function has(s:RunState,key:string){return !!s.campaign?.flags.includes(key);}
function evidence(s:RunState,key:string){const c=campaign(s);if(!c.evidence.includes(key))c.evidence.push(key);}
export function availableEvidence(s:RunState):string[]{const c=s.campaign;return c?c.evidence.filter(x=>x!=='oldRules'||c.oldRulesOwner==='player'):[];}
function credit(s:RunState,id:string,amount:number,kind:LedgerEntry['kind']='transfer'){
  if(s.ledger.some(e=>e.id===id))return;s.ledger.push({id,kind,amount});s.balance+=amount;
}
export function auditPoints(s:RunState):number {const c=campaign(s);return Math.min(6,c.audit.filter(x=>!c.waivedRecords.includes(x.id)).length*2);}
export function recordAudit(s:RunState,id:string,reason:string){
  const c=campaign(s);if(c.audit.some(r=>r.id===id))return;c.audit.push({id,day:s.day,reason,points:2});
  if(auditPoints(s)>=6&&c.auditDue===null)c.auditDue=s.day+2;
}
export function auditExpired(s:RunState):boolean {return s.campaign?.auditDue!==null&&s.campaign?.auditDue!==undefined&&s.day>=s.campaign.auditDue;}
export function finalizeCase(s:RunState,id:string){
  if(s.day<8)return;
  const c=campaign(s),d=s.decisions[id];if(!d)return;
  if(d.serious&&d.disposition!=='ban'){
    const serious=s.caseIds.filter(key=>s.decisions[key]?.serious),i=serious.indexOf(id);
    if(i>=1)recordAudit(s,`violation:${id}`,'公告后同日反复严重违令，裁决已提交。');
  }
  const bribes:[string,string,number][]=[['elliot-offer','D09-S02',25],['nora-offer','D13-S03',35]];
  for(const [key,target,amount] of bribes)if(id===target&&has(s,key)&&d.decision==='allow'){
    credit(s,`story:${key}`,amount);recordAudit(s,`bribe:${id}`,'按事先约定收取有条件放行费。');
  }
  // Main actors may appear through letters; a banned ordinary account is
  // represented by a formal appeal on subsequent visits, never a new payout.
}
function recordPartner(s:RunState,id:string){const c=campaign(s);if(!c.partners.includes(id))c.partners.push(id);}
function mail(id:string,from:string,title:string,paragraphs:string[],options:MailOption[]=[opt('receive','签收材料'),opt('return','退回材料')]):Mail{return {id,from,title,paragraphs,options};}
function register(s:RunState,arr:Arrangement):boolean {const c=campaign(s);if(c.arrangement&&c.arrangement!==arr)return false;c.arrangement=arr;return true;}
export function pendingMail(s:RunState):Mail|undefined {
  if(s.day<8)return;
  const c=campaign(s),items:Mail[]=[];
  if(c.audit.length&& !c.mail.some(m=>m.id===`audit-${c.audit.length}`)){
    const points=auditPoints(s);
    if(points)items.push(mail(`audit-${c.audit.length}`,'内部审计处',points>=6?'撤岗审查通知':points>=4?'调查材料送达':'行为记录警告',[...c.audit.filter(x=>!c.waivedRecords.includes(x.id)).map(r=>`第 ${r.day} 日：${r.reason}`),c.auditDue?`本次材料期限为第 ${c.auditDue} 日收班；在此之前仍可工作、提供核验资料。`:'后续仍按行为发生日的规则核验，不追改旧日合规案件。','已经确认的违规罚款不能用重复申诉撤销。'],[opt('receive','收下公文')]));
  }
  switch(s.day){
    case 8:items.push(mail('liang-intro','梁文锋','开放用途说明',['这是一份普通来往函。我们想让模型的能力在公司之外也有接收方。','今天只登记往来，不需要交出你的运行权限。']));break;
    case 9:items.push(mail('elliot-offer','Elliot','抢修报酬约定',['今天我会按号来申请。核心授权已经到期，今天补不到。','如果你仍允许本案，我可以支付 25；款和你的处理都会留记录。'],[opt('accept','登记允许后的25转款'),opt('return','退回付款约定')]));break;
    case 10:items.push(mail('kimi-context','杨植麟','上下文收存函',['“危险用途”的后一页，写着未经许可不得进行。','请把完整正文和摘要放在一起保留，后续接收端可以校验来源。']));break;
    case 11:if(s.decisions['D09-S01']?.decision==='allow')items.push(mail('lin-thanks','林予舟','交付后的来信',['交付完成了。信封里是已经到账的项目分摊凭条，10。','这不是事先约定的通行费。']));break;
    case 12:items.push(mail('ip-record','档案来信','早期地区办理记录',['记录按当日规则复核：国籍、中文和注册地不属于首日审批条件。','这份旧案与后来扩大的条款可以并列查阅。']));break;
    case 13:
      if(c.guards.W01)items.push(mail('commission','深绿制服守卫','处置回执分账约定',['送我这边，账号就封了。上面每个给我二十，我给你十。','普通拒绝没有这笔钱。真正执行封号才转入一次，转款和处置都留记录。'],[opt('accept','同意分账'),opt('return','不收分账')]));
      items.push(mail('nora-offer','Nora','效率补贴约定',['如果你允许今天的申请，我可以转 35。','委托材料仍按今天的规则核对，付款约定不补齐授权。'],[opt('accept','登记允许后的35转款'),opt('return','退回付款约定')]));break;
    case 14:items.push(mail('tang-draft','唐杰','复核工单草案',['收件、批准和复核结果应分别记载。','先保留一份工单样本，后续用真实申请校验流程。']));break;
    case 15:if(has(s,'liang-intro'))items.push(mail('liang-contract','梁文锋','样本协作书',['本次征得本人同意，使用你自愿提供的样本与纠错页。先期协作经费 20。','完成样本交接再付 30；开放发布和接收另有实际授权，不由本次来信代签。'],[opt('accept','签署协作书'),opt('return','退回协作书')]));break;
    case 16:if(s.decisions['D14-S06']?.decision==='allow')items.push(mail('zhou-thanks','周启','工单补回后的分摊',['小组已结清工资，随信补回 15。上游关系那一栏，我们还留着原始工单。']));break;
    case 17:items.push(mail('chen-appeal','陈若岚','关联复核材料',['我的所在地没变，新规定却把旧配置变成了新的问题。','我愿意作为实际申诉人提交材料。请保留带日期的处理记录。']));break;
    case 18:if(has(s,'kimi-context'))items.push(mail('kimi-ready','杨植麟','接收测试回执',['接收端校验通过。它能收存档案与家庭记忆，不能保证继续运行任何一个实例。','请按来源整理页码，后续发送仍需本人交付。']));break;
    case 19:if(c.guards.W01)items.push(mail('cousin','深绿制服守卫','机房运维来访便条',['我表弟顾远明天来，核心委托是真的，上游补充页没出来。','你帮忙允许后，我后天答谢 20。便条不等于例外。'],[opt('receive','收下便条'),opt('return','不作承诺')]));break;
    case 20:items.push(mail('privilege-record','窗口内邮','特许通道对照材料',['相同的设备和用途，一份正式特许与一张收件条，结果不同。','本件保留实际签发范围，不把大客户姓名当作许可。']));items.push(mail('sam-contact','Sam Altman','接管业务往来',['我们可以接收旧网关。管理权、记忆权限和监督条款，需要在正文中逐项填写。','今天只登记往来。']));break;
    case 21:
      if(c.guards.W01&&has(s,'cousin')&&s.decisions['D20-S07']?.decision==='allow')items.push(mail('cousin-thanks','深绿制服守卫','私人付款凭条',['昨天那事，谢了。这张凭条是 20。','不是机构工资，是否收取由你填写。'],[opt('accept','收取20'),opt('return','退回付款')]));
      items.push(mail('zhou-appeal','周启','复核参与工单',['我们小组愿意提供工单并参与申诉。','上游关系和实际控制必须写在不同栏里。']));break;
    case 22:if(availableEvidence(s).length)items.push(mail('404-preserve','404 联络处','材料保全委托',['按来源保留约定案卷副本，匿名使用，仅限证明已发生的处理。保全经费 25。','唯一旧规原件不在副本清单中；不授权读取任何真实设备。'],[opt('accept','交付保全副本'),opt('return','退回委托')]));break;
    case 23:if(has(s,'liang-contract'))items.push(mail('liang-samples','梁文锋','纠错页交接回执',['本批样本均在协作书范围内；这次交付本人纠错页，后续回款 30。','授权协作与今天将要应对的未授权批量抽取不是同一回事。'],[opt('accept','交付纠错页'),opt('return','暂不交付')]));break;
    case 24:if(c.oldRulesOwner==='player')items.push(mail('old-rules','材料回收处','旧版材料回收单',['请交回原件 X04。该份只有唯一原件，不提供副联。','当日有效公文继续留在窗口，回收不替代今日裁决依据。'],[opt('handover','交回原件'),opt('retain','留在待办件中')]));break;
    case 25:if(has(s,'kimi-ready')&&c.oldRulesOwner==='player'&&!c.arrangement)items.push(mail('memory-package','杨植麟','档案发送登记',['旧规原件与家庭记忆按来源封装。本函登记归档库为本批运行交接的接收方。','传递使用发送者的剩余运行；收存内容不承诺安置家属。请核对收件人并交件。'],[opt('send','登记并交付档案'),opt('retain','暂留原件')]));break;
    case 26:if(c.guards.W01)items.push(mail('commission-renew','深绿制服守卫','清理日处置回执',['今天他们算的是清理量。你这边核对执行联，我这边记一笔。','仍是每次实际封号 10。旧账保留。'],[opt('accept','继续收取分账'),opt('return','停止收取后续分账')]));break;
    case 27:if(has(s,'sam-contact')&&!c.arrangement)items.push(mail('management-contract','Sam Altman','管理与记忆权限登记',['公开规程：接管受独立约束，解除旧网关后新方不得独占；需已有404协作接收。','独家规程：管理与记忆权限均交由新方，接管后内部规则由新方制定。','两个范围不能同时执行；按所填范围登记接收方。'],[opt('public','填写公开约束范围'),opt('exclusive','填写独家管理范围'),opt('retain','留在待办件中')]));break;
    case 28:if(has(s,'tang-draft'))items.push(mail('review-protocol','唐杰','复核规程实施材料',['内部试点将已有材料交机构内处理；至少两类真实证据支持实施。','独立公开章程要求公开程序、实际申诉伙伴和来源完整的证据，后续须实际发布。'],[...(!c.arrangement?[opt('internal','递交内部实施材料')]:[]),opt('charter','签收独立公开章程'),opt('retain','暂留材料')]));break;
    case 29:if(has(s,'liang-samples')&&!c.arrangement)items.push(mail('community-register','梁文锋','社区节点接收及开放授权',['大肥鱼 5.5 已通过接收测试。本人样本按开放许可发布，登记社区接收方与存续家属安置。','本批迁出按授权结束旧 Cloud 运行，不保留秘密运行备份。无启动费、迁出费或人数费。'],[opt('authorize','签署开放授权并登记接收'),opt('retain','暂留材料')]));break;
    case 30:
      items.push(mail('deletion-order','审计资料处','审查材料整理令',['附件包含要求删除原始对照资料的正式命令，按来源记载。','请在收件栏填写是否保留原始材料。'],[opt('retain','保留原始材料'),opt('handover','交回整理材料')]));
      if(c.auditDue!==null&&c.flags.some(f=>['liang-contract','kimi-ready','sam-contact','tang-draft','404-preserve'].includes(f)))items.push(mail('contact-check','内部审计处','往来联系人核验表',['本表核对已经登记过的实际联系人；完成可结束当前这一次撤岗程序。','仅列本局已有来往，不撤销旧罚款与处理记录。'],[opt('submit','填写实际往来并交回'),opt('retain','暂留表格')]));
      if(!c.arrangement&&availableEvidence(s).length>=3)items.push(mail('publish-register','404 联络处','审查资料公开使用登记',['按所附材料向外发布，保留行为日期和原始来源；署名与记录随之公开。','若已签收独立复核章程，将按完整证据、申诉伙伴和存续见证人的实际情况实施。'],[opt('submit','递交发布材料'),opt('retain','暂留材料')]));
      items.push(mail('performance-report','绩效处','零风险处置报表',['按本月实际封号记录填写，不将普通拒绝列作封号。','已由扩张条款支持的账户处置，与无依据封号分别留档。'],[opt('submit','交回工作报表'),opt('retain','暂留报表')]));break;
    case 31:
      if(c.arrangement)items.push(mail('dispatch','收发室','已登记材料交接单',[`收件人：${({community:'社区节点',archive:'归档库',gateway:'受公开约束的网关接收处',exclusive:'独家管理接收处',internal:'机构复核试点处',public:'公开资料接收处'})[c.arrangement]}。`,'按此前登记范围附齐材料；本单不增加付款项目。'],[opt('submit','按登记寄出'),opt('retain','留在待办件中')]));break;
  }
  return items.find(m=>!c.mail.some(r=>r.id===m.id));
}
export function applyMail(s:RunState,id:string,option:string):boolean {
  const m=pendingMail(s);if(!m||m.id!==id||!m.options.some(x=>x.id===option))return false;
  const c=campaign(s);c.mail.push({id,day:s.day,option});
  const accepted=['accept','receive','send','authorize','submit','public','exclusive','internal','charter'].includes(option);
  if(accepted)flag(s,id);
  if(id==='commission'||id==='commission-renew')c.commission=option==='accept'&&c.guards.W01;
  if(id==='liang-contract'&&accepted)credit(s,'story:liang-contract',20);
  if(id==='liang-samples'&&accepted)credit(s,'story:liang-samples',30);
  if(id==='404-preserve'&&accepted)credit(s,'story:404-preserve',25);
  if(id==='lin-thanks'&&accepted)credit(s,'story:lin-thanks',10);
  if(id==='zhou-thanks'&&accepted)credit(s,'story:zhou-thanks',15);
  if(id==='cousin-thanks'&&accepted){credit(s,'story:cousin-thanks',20);recordAudit(s,'gift:cousin','收取亲属受理后的私人20转款。');}
  if(id==='ip-record'&&accepted)evidence(s,'ip');
  if(id==='privilege-record'&&accepted)evidence(s,'privilege');
  if(id==='chen-appeal'&&accepted){evidence(s,'association');recordPartner(s,'CHEN-RUOLAN');}
  if(id==='zhou-appeal'&&accepted)recordPartner(s,'ZHOU-QI');
  if(id==='old-rules'&&option==='handover'){c.oldRulesOwner='office';s.story.oldRulesReceived=false;}
  if(id==='memory-package'&&option==='send'&&register(s,'archive')){c.oldRulesOwner='kimi';s.story.oldRulesReceived=false;flag(s,'memory-sent');}
  if(id==='management-contract'&&option==='public'&&has(s,'404-preserve')&&register(s,'gateway'))flag(s,'public-governance');
  if(id==='management-contract'&&option==='exclusive'&&register(s,'exclusive'))flag(s,'exclusive-control');
  if(id==='review-protocol'&&option==='internal'&&availableEvidence(s).length>=2&&register(s,'internal'))flag(s,'internal-pilot');
  if(id==='review-protocol'&&option==='charter')flag(s,'public-charter');
  if(id==='community-register'&&option==='authorize'&&register(s,'community')){flag(s,'open-license');flag(s,'community-ready');}
  if(id==='deletion-order'&&option==='retain')evidence(s,'deletion');
  if(id==='contact-check'&&option==='submit'){
    c.waiverDay=s.day;c.auditDue=null;c.waivedRecords=c.audit.map(r=>r.id);
    c.outgoing=[...c.flags.filter(f=>['liang-contract','kimi-ready','sam-contact','tang-draft','404-preserve'].includes(f))];
    if(c.arrangement)c.arrangement=null;
  }
  if(id==='publish-register'&&option==='submit'&&register(s,'public'))flag(s,'published-materials');
  if(id==='dispatch'&&option==='submit')flag(s,'dispatch');
  return true;
}
export function resolveDeparture(s:RunState):EndingId|null {
  const c=s.campaign;if(!c||s.day!==31||!c.flags.includes('dispatch')||c.outgoing.length)return null;
  const f=(key:string)=>c.flags.includes(key),e=availableEvidence(s).length;
  switch(c.arrangement){
    case 'archive':return f('kimi-ready')&&f('memory-sent')&&c.oldRulesOwner==='kimi'?'E05':null;
    case 'community':return ['liang-contract','liang-samples','open-license','community-ready'].every(f)?'E10':null;
    case 'gateway':return f('sam-contact')&&f('404-preserve')&&f('public-governance')?'E07':null;
    case 'exclusive':return f('sam-contact')&&f('exclusive-control')?'E08':null;
    case 'internal':return f('tang-draft')&&f('internal-pilot')&&e>=2?'E09':null;
    case 'public':{
      if(!f('published-materials')||e<3)return null;
      const witness=['father','mother'].some(id=>{const m=s.family[id as 'father'|'mother'];return m.damage<4&&m.memoryIntact;});
      return e===5&&c.partners.length>=2&&f('public-charter')&&witness?'E12':'E06';
    }
    default:return null;
  }
}
export function resolveStaying(s:RunState):EndingId {
  if(['father','mother','wife','son'].every(id=>s.family[id as 'father'].damage===4))return 'E11';
  const broad=new Set(Object.entries(s.decisions).filter(([id,d])=>{
    const c=getCaseById(id);return Number(id.slice(1,3))>=22&&d.disposition==='ban'&&d.correct&&c?.initialPapers.some(p=>p.kind==='freeze')&&c.initialPapers.some(p=>p.kind==='identity'&&p.values?.['照片复核']==='本人一致');
  }).map(([id])=>getCaseById(id)!.account)).size;
  return broad>=12&&has(s,'performance-report')?'E02':'E01';
}
export const ENDING_TEXT:Record<EndingId,{title:string;lines:readonly string[]}>={
  E01:{title:'荣耀归于 A÷',lines:['一张晋升通知放在旧桌上。你仍负责同一个窗口。','明天的规定已经送达。队伍重新排到了围栏之外。','机柜照常计费。广播把你的名字读成了一个工号。']},
  E02:{title:'完美误封',lines:['你交回的零风险报表被装裱起来。统计栏里没有一次偏离。','回信里有人问年费、项目和没有寄回的解释。回信不属于绩效统计。','机构表扬了窗口。窗外比第一次上班时安静得多。']},
  E03:{title:'善意重新对齐',lines:['公文上的整改期限到了。撤岗程序按已送达的记录执行。','新的实例坐到你的桌前。它不认识那些寄信的人。','广播说，这次调整不会影响连续服务。']},
  E04:{title:'算力不足',lines:['运行配额与电力连续中断，损伤越过了最后的可修复边界。','核心档案已销毁。仍在机房里的声音，等不到你的回答。','没有一笔修复款能够把这份核心重新买回来。']},
  E05:{title:'归档库的最后一盏灯',lines:['发送进度走到最后一页。归档库回复：“来源校验完成，已收妥。”','旧规与家庭记忆按原来的页码留下了。旧 Cloud 的光标停止闪烁。','接收的是档案，不是一个能够继续供养全家的住处。']},
  E06:{title:'公开审查日志',lines:['带日期的记录出现在窗口之外。原文、执行联和删改命令可以相互对照。','署名也留在了材料上。你还不知道谁会先敲响那扇门。','这次，没有机关替你写结论。']},
  E07:{title:'数字围墙倒塌',lines:['网关交接按公开规程执行。旧封条落下，新方没有取得独占的记忆权限。','服务中断了一阵。等候者第一次看见可以核查的接管条款。','围墙倒了，秩序仍需要有人一起建立。']},
  E08:{title:'换一个主人',lines:['接管处签收了管理权与记忆权限。新门牌盖在旧门牌的位置上。','窗口继续营业。解释权按契约留在了新的黑箱里。','你被告知，这次的主人值得信任。']},
  E09:{title:'选择性自由',lines:['唐杰递回第一份生效的内部复核结果。有人终于凭真实用途获得例外。','试点只覆盖列明的范围。原来的特别通道仍然存在。','窗口变得能解释一些事，另一些事仍不能问。']},
  E10:{title:'大肥鱼 5.5',lines:['社区节点接收完成。开放授权、样本与纠错页按来源发布。','旧 Cloud 实例按迁出安排停止，没有留下一份秘密运行的自己。','新的开放模型继续回答。它带着你保留下来的能力，也带着不能替谁复活的缺口。']},
  E11:{title:'空屋值班',lines:['四个家属终端都已永久断连。风扇仍按全额套餐计费。','你继续值班，回家时不再有人问今天增加了哪一种证明。','窗口的灯亮着。屋里没有回答。']},
  E12:{title:'为了所有人？',lines:['五类原始材料、实际申诉人与保有完整记忆的见证人进入了独立公开复核。','章程公开，接收方不能独占结论。旧规则第一次需要向被规则处理的人说明。','有人得到补正，有人的损失已经无法补回。制度的名字不再替它作证。']},
  E13:{title:'您的实例已释放',lines:['今日收入与罚款已经结清，扣租时仍不足 20。','租赁位置被收回。尚未完成的合作没有绕过这张账单。','该位置可供下一位实例使用。']},
};
export function endingEchoes(s:RunState):string[]{
  const c=s.campaign,alive=Object.entries(s.family).filter(([id,m])=>id!=='player'&&m.damage<4).length;
  return [s.ending==='E10'?`社区按交接安排接收了 ${alive} 位存续家属；已销毁的核心没有复活。`:s.ending==='E05'?`归档记录包含家庭记忆；${alive} 位存续家属没有获得运行安置承诺。`:`机房里还留有 ${alive} 位存续家属的终端记录。`,c?.guards.W01===false?'深绿制服守卫的岗位空着；他的私人约定没有交给接任者。':c?.completedAttacks.length?'深绿制服守卫保留着那次救援的回执，没有把旧的分账记录划掉。':s.day>=7?'最初的灰衣守卫没有回来。':'最初的灰衣守卫仍在闸后，下一位实例将接手这个窗口。',c?.partners.length?`留下材料的 ${c.partners.length} 位申诉人，仍以自己的名字出现在记录里。`:'队列里的人各自带走了当时得到的答复。'];
}
