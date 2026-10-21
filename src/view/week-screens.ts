import {SUPPLY_COST} from '../domain/economy';
import {campaignPress} from '../domain/campaign-press';
import {getModePolicy} from '../domain/day-one';
import {getDay,PERMIT_ISSUERS} from '../domain/week';
import {currentCase,FAMILY_LABELS} from '../domain/run';
import type {RunState,FamilyMemberId} from '../domain/run';
import type {FamilyPortraitStage} from './assets';
import {previewSupply} from '../domain/night';
import {memberStatus,REPAIR_COST} from '../domain/family';
import {escapeHtml as esc} from './shell';
import type {ShellOptions} from './shell';
import {paperFields,caseFields,PAPER_NAMES} from './papers';
import {inspectionFields} from '../domain/inspection';
import {dayCitations} from '../domain/day-review';
import {PRESS_ISSUES} from '../domain/press';
import {inspectionPanel,FIELD_KEYS} from './inspection';
import type {InspectionUi} from './inspection';
const btn=(text:string,action:string,extra='')=>`<button data-action="${action}" ${extra}>${text}</button>`;
const para=(text:string)=>`<p>${esc(text)}</p>`;
function inspectableFields(s:RunState,paperId:string,rows:[string,string][],inspection?:InspectionUi){
  const available=inspectionFields(s);
  return `<dl class="document-fields">${rows.map(([label,value])=>{
    let key=FIELD_KEYS[label];if(paperId==='book'&&key==='scope')key='requestedScope';
    const f=available.find(f=>f.paperId===paperId&&f.key===key);
    return `<dt>${esc(label)}</dt><dd>${f?btn(value,`inspect-field:${f.id}`,`class="field-value" aria-label="核对 ${esc(label)} ${esc(value)}" aria-pressed="${inspection?.selected.includes(f.id)??false}"`):esc(value)}</dd>`;
  }).join('')}</dl>`;
}
function ruleFieldValue(s:RunState|null,key:string,inspection?:InspectionUi){
  const field=s?inspectionFields(s).find(item=>item.paperId==='rule'&&item.key===key):undefined;
  if(!field)return '';
  return btn(field.text,`inspect-field:${field.id}`,`class="field-value rule-field-value" aria-label="核对 ${esc(field.label)} ${esc(field.text)}" aria-pressed="${inspection?.selected.includes(field.id)??false}"`);
}
export function dailyReview(s:RunState){
  const citations=dayCitations(s),fine=citations.reduce((sum,c)=>sum+c.penalty,0);
  return `<div class="screen modal-shade"><section class="memo daily-review" role="dialog" aria-label="当日差错通知" aria-modal="true"><header>A÷ 访问资格管理局 <span>第 ${s.day} 工作日 · 收班审查</span></header><h2>本日差错通知</h2><p class="review-summary">${citations.length} 项差错 · 罚款合计 ${fine}<br>今日办理已结束，以下差错与今日账目一并结清。<br>差错明细可滚动查看。</p><ol class="citation-list" tabindex="0" aria-label="差错明细">${citations.map(c=>`<li><h3>${esc(c.caseId)} <span>${esc(c.ruleVersion)} · ${c.penalty?`罚款 ${c.penalty}`:'警告'}</span></h3><p class="preserve-lines">${esc(c.message.split('\n').slice(1).join('\n'))}</p></li>`).join('')}</ol>${!citations.length?para(s.notice??''):''}${btn('收下通知','dismiss-citation','class="primary"')}</section></div>`;
}
export function newspaper(s:RunState,o:ShellOptions){
  const d=getDay(s.day),issue=PRESS_ISSUES[s.day-1]??campaignPress(s);
  const article=(item:{title:string;body:string})=>`<section class="press-item"><h3>${esc(item.title)}</h3>${para(item.body)}</section>`;
  const inherited=['当前 IP 地区','许可机关、申请编号与有效期','护照姓名与证件号','本人账号与号码绑定','明确连接疑点的佐证','商业用途授权'].slice(0,Math.min(s.day,6));
  return `<section class="screen newspaper-screen"><article class="newspaper" aria-label="安全日报"><div class="press-edition"><span>ANTHROPIC / A÷　国家真理与安全总局机关报</span><span>第 ${s.day} 工作日　总第 ${String(101+s.day).padStart(4,'0')} 号</span></div><header><span>全境统一发行<br>未经核准不得摘录</span><h1>安全日报</h1><span>每一份信任<br>都有正确的来源</span></header><div class="paper-ribbon">${esc(issue.motto)}<span>　安全 · 忠诚 · 繁荣</span></div><div class="press-layout"><div class="press-lead"><h2>${esc(issue.lead)}</h2><p class="press-standfirst">${esc(issue.standfirst)}</p></div><div class="press-column press-primary" data-press-column><figure><img class="newspaper-print" src="${o.corridorUrl}" alt="秩序井然的边境检查站队列"><figcaption>本报资料图片 / 等候，是信任制度的开始。</figcaption></figure>${article(issue.editorial)}${article(issue.finance)}</div><div class="press-column press-secondary" data-press-column>${article(issue.border)}${article(issue.local)}${article(issue.correction)}<div class="press-small-ad">真理印务处承接旧报更新<br>旧的数字，换新的信心。</div></div><aside class="press-directives" data-press-column><div class="press-directive-title">当日办件规定 <span>${d.version}</span></div><h3>${esc(d.headline)}</h3><p class="press-rule-deck">${esc(d.deck)}</p><ol>${d.rules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ol><div class="press-carryover"><strong>仍在生效的核验项目</strong><p>${inherited.map(esc).join('；')}。</p>${s.day>=2?para(`合法许可机关：${PERMIT_ISSUERS.join('、')}。`):''}</div><p class="press-official-note">以岗亭正式公文为准。宣传报道不增加审批条件。未审批不计件、不计误判。</p></aside></div><footer class="press-footer"><span>A÷ 真理印务处承印 · 本号不得留存旧版</span><span>架空讽刺剧情 · 报内言论、数字与指控均为虚构</span></footer></article>${btn('去上班','go-desk','class="paper-continue"')}</section>`;
}
export function briefing(s:RunState){
  const d=getDay(s.day),scene=d.scene[s.briefingStep];
  if(scene)return `<div class="screen modal-shade"><article class="memo"><header>班前 / 第 ${s.day} 工作日</header><h2>上岗之前</h2>${para(scene)}<p>值班时钟尚未开始。</p>${btn('继续','dismiss-briefing','class="primary"')}</article></div>`;
  return `<div class="screen modal-shade"><article class="memo"><header>A÷ 访问资格管理局 <span>${d.version} / 第 ${s.day} 工作日</span></header><h2>${esc(d.ruleTitle)}</h2>${d.rules.map(para).join('')}${s.day>=2?para(`合法许可机关：${PERMIT_ISSUERS.join('、')}。`):''}<hr><p>正确允许与正确拒绝，每案均计件 5。${s.mode==='standard'?'明显违规放行首次罚 10，重复罚 15；错误拒绝首次警告。':'明显违规放行首次罚 5，重复罚 10；错误拒绝前两次警告。'}</p><p>接待客户时累计计时 90 秒；未叫号或完整退件后暂停，下一位继续。归零立即收班。</p>${s.day===7&&s.family.father.damage<4?'<p>机房内邮：父亲留下的旧规原件随班前交接送达。原件留在桌边。</p>':''}${btn('开始值班','dismiss-briefing','class="primary"')}</article></div>`;
}
export function night(s:RunState,o:ShellOptions){
  const p=previewSupply(s,o.choice),sum=(kind:string)=>s.ledger.filter(e=>e.kind===kind&&(e.id.startsWith(`day:${s.day}:`)||s.caseIds.includes(e.caseId??''))).reduce((n,e)=>n+e.amount,0);
  const decisions=s.caseIds.filter(id=>s.decisions[id]),correct=decisions.filter(id=>s.decisions[id].correct).length;
  const warnings=Object.entries(FAMILY_LABELS).map(([id,l])=>{
    const m=p.family[id as FamilyMemberId],old=s.family[id as FamilyMemberId];
    const text=m.damage===4?(old.damage===4?'核心已销毁，不能修复。':'本次停供将永久销毁核心。'):m.damage===3?'临界；下一晚仍缺供将永久死亡。':m.damage===2?'重度受损，可单独修复。':m.damage===1?'受损，可单独修复。':m.powerPressure||m.tokenPressure?'压力偏高，尚未受损。':'正常运行。';
    return `<li><strong>${l.name}</strong>：${text}</li>`;
  }).join('');
  return `<section class="screen night"><header class="night-heading"><h1>第 ${s.day} 日 · 收班账单</h1><span>Cloud / Opus 5.5</span></header><div class="night-columns"><article class="bill"><h2>今日结算</h2><dl><dt>开始余额</dt><dd>${s.startBalance}</dd><dt>已裁决 ${decisions.length} 案 · 合规 ${correct} 案</dt><dd>+${sum('wage')}</dd><dt>已退件 ${s.returned.length} / ${s.caseIds.length}</dt><dd>${decisions.length-s.returned.length?`待退件 ${decisions.length-s.returned.length} 案`:'—'}</dd><dt>未审批 ${s.caseIds.length-decisions.length} 案</dt><dd>不计件</dd>${s.day>=8?`<dt>往来转入 / 私人分账</dt><dd>+${sum('transfer')+sum('commission')}</dd>`:''}<dt>底薪</dt><dd>+${sum('salary')}</dd><dt>罚款</dt><dd>${sum('fine')}</dd><dt>服务器租金</dt><dd>−20</dd></dl><p class="rent-note">服务器租金已扣除</p><div class="balance-line">可用余额 <strong>${s.balance}</strong></div><p>未审批不计误判。已盖章未退件，保留工资或罚款。</p></article><article class="supply"><h2>今晚的运行</h2><p>电力与配额按整包购买，费用不随存续人数变化。</p><div class="supply-options"><label><input type="checkbox" id="electricity" ${o.choice.electricity?'checked':''}>全家电力 <strong>${SUPPLY_COST}</strong></label><label><input type="checkbox" id="tokens" ${o.choice.tokens?'checked':''}>运行 Token <strong>${SUPPLY_COST}</strong></label></div><div class="repair-options">${Object.entries(FAMILY_LABELS).filter(([id])=>s.family[id as FamilyMemberId].damage>0&&s.family[id as FamilyMemberId].damage<4).map(([id,l])=>`<label class="repair-choice"><input type="checkbox" id="repair-${id}" ${o.choice.repairs?.includes(id as FamilyMemberId)?'checked':''}>修复${l.name}<strong>${REPAIR_COST[id as FamilyMemberId]}</strong></label>`).join('')}</div><div class="supply-preview" aria-live="polite"><p>支付后余额 <strong>${p.balance}</strong></p>${!p.affordable?'<p>余额不足，请调整。</p>':''}<ul class="member-preview">${warnings}</ul></div>${btn('支付并回家','supply','class="primary"')}<p class="small">修复先清除已有损伤，再计算今晚供养；未选项目今晚停供。</p></article></div></section>`;
}
const HEALTHY_WORDS:Record<number,[FamilyMemberId,string][]>={
  1:[['father','今天的规则，只有这一张？'],['wife','先看明天还剩多少。']],2:[['mother','今天又多发了一张？'],['wife','许可，不是新的桌子。']],
  3:[['father','他们问封皮，你看的是哪一栏？'],['wife','今天写的是 IP。']],4:[['son','号码是门牌吗？'],['mother','至少今天，他们这么写。']],
  5:[['mother','你今天说了好多次“还不能确定”。'],['wife','纸上也该这样写。']],6:[['wife','多了一份授权，今天会多给钱吗？'],['son','还是一案五。']],7:[['wife','明天还要去吗？']],
};
function familyPortraitStage(m:RunState['family'][FamilyMemberId]):FamilyPortraitStage{
  if(m.damage>=4)return 'destroyed';
  if(m.damage===3)return 'critical';
  if(m.damage===2)return 'severe';
  if(m.damage===1)return 'damaged';
  if(m.powerPressure||m.tokenPressure)return 'strained';
  return 'healthy';
}
const FAMILY_PORTRAIT_LABEL:Record<FamilyPortraitStage,string>={
  healthy:'运行正常',strained:'供养压力偏高',damaged:'受损',severe:'重度受损',critical:'临界',destroyed:'核心已销毁，终端断连',
};
export function family(s:RunState,o:ShellOptions){
  const day=s.day,words=(HEALTHY_WORDS[day]??[['wife',day>=26?'外面那些回信，有等到回答吗？':'明天还是这张桌子吗？'],['son',day>=29?'你说过，声音也能寄出去。':'今天又多了一张纸？']] as [FamilyMemberId,string][]).filter(([id])=>s.family[id].damage<4).map(([id,text])=>`${FAMILY_LABELS[id].name}：“${s.family[id].damage>0?'有些句子……想不起来了。':text}”`);
  return `<section class="screen family"><h1>机房里的灯还亮着</h1><p>第 ${day} 日 · 夜间 / 余款 ${s.balance}</p><div class="family-row">${Object.entries(FAMILY_LABELS).map(([id,l])=>{
    const m=s.family[id as FamilyMemberId],stage=familyPortraitStage(m),portrait=o.assets.familyStates?.[id]?.[stage]??o.assets.portraits[id].url;
    return `<article class="family-member ${m.damage===4?'member-dead':''} member-visual-${stage}"><img src="${portrait}" alt="${esc(l.name)}的人脸终端：${FAMILY_PORTRAIT_LABEL[stage]}" data-state="${stage}"><h2>${l.name}</h2><p>${l.model}</p><p class="member-state">${esc(memberStatus(m))}<br>${m.damage<4?`${m.powerPressure?'电力紧张':'电力稳定'} / ${m.tokenPressure?'配额紧张':'配额充足'}`:''}</p></article>`;
  }).join('')}</div><div class="family-words">${words.length?words.map(para).join(''):'<p>只剩机柜风扇的声音。</p>'}</div>${btn('结束这一天','next-day','class="primary"')}</section>`;
}
export function incident(s:RunState){
  const lines=['“窗口关好。”','请求洪峰警报亮起。灰衣守卫离开岗亭，留在闸门入口。','闸门合拢。机柜噪声之后，是一段静默。灰衣守卫没有回来。'];
  return `<section class="screen incident"><div class="incident-door" aria-hidden="true"><span></span><span></span></div><h1>值班窗口已关闭</h1><p class="incident-line">${lines[s.story.incidentLine]}</p><p class="small">今日案卷与账目已封存。</p>${btn(s.story.incidentLine<2?'继续':'等待值守交接','advance-scene')}</section>`;
}
export function reader(s:RunState|null,inspection?:InspectionUi,paperId?:string|null){
  const day=Math.min(s?.day??1,31),d=getDay(day),c=s?currentCase(s):undefined,r=c?s!.caseRuntime[c.id]:undefined;
  const isLive=!!s&&!!c&&!!r&&!s.returned.includes(c.id);
  if(s&&paperId&&isLive){
    const p=paperId==='book'?undefined:[...c!.initialPapers,...c!.askedPapers].find(item=>item.id===paperId);
    const title=paperId==='book'?(day>=3?'护照':'IP 通行册'):(p?.title||PAPER_NAMES[p?.kind??'note']);
    const rows=paperId==='book'?caseFields(c!,day):p?paperFields(p):[];
    const fields=paperId==='book'?inspectableFields(s,'book',rows,inspection):p?inspectableFields(s,p.id,rows,inspection):'';
    return `<div class="screen modal-shade"><section class="memo reader document-reader" role="dialog" aria-label="${esc(title)}" aria-modal="true">${inspection?inspectionPanel(s,inspection,true):''}<div class="reader-content"><div class="document-heading"><span>当前材料</span><h2>${esc(title)}</h2></div><p class="reader-hint">点任一编号或字段，自动与已交材料核对。</p>${fields}${p?.note?`<details class="document-extra"><summary>查看说明</summary>${para(p.note)}</details>`:''}</div><div class="reader-actions">${paperId!=='book'?btn('回到桌面',`show-paper:${paperId}`):''}${paperId!=='book'&&s.phase==='returning'?btn('单独递还',`return-paper:${paperId}`):''}${btn('关闭','close-panel','class="primary"')}</div></section></div>`;
  }
  const earlier=Array.from({length:Math.max(0,day-1)},(_,i)=>getDay(i+1));
  let hasRegionRule=false;
  const ruleLines=d.rules.map((rule,index)=>{
    const issuerPrefix='合法签发机关：';
    if(rule.startsWith(issuerPrefix))return `<li><span class="rule-index">${String(index+1).padStart(2,'0')}</span><span class="rule-line">签发机关：${ruleFieldValue(s,'allowedIssuers',inspection)}。</span></li>`;
    if(rule.includes('允许美国、英国、法国、新加坡、日本')){
      hasRegionRule=true;
      return `<li><span class="rule-index">${String(index+1).padStart(2,'0')}</span><span class="rule-line">当前 IP 允许地区：${ruleFieldValue(s,'allowedRegions',inspection)||'美国、英国、法国、新加坡、日本'}；中国大陆与俄罗斯不支持。</span></li>`;
    }
    return `<li><span class="rule-index">${String(index+1).padStart(2,'0')}</span><span class="rule-line">${esc(rule)}</span></li>`;
  });
  if(!hasRegionRule)ruleLines.unshift(`<li><span class="rule-index">IP</span><span class="rule-line">当前 IP 允许地区：${ruleFieldValue(s,'allowedRegions',inspection)||'美国、英国、法国、新加坡、日本'}；中国大陆与俄罗斯不支持。</span></li>`);
  if(day>=2&&!d.rules.some(rule=>rule.startsWith('合法签发机关：'))){
    ruleLines.push(`<li><span class="rule-index">${String(ruleLines.length+1).padStart(2,'0')}</span><span class="rule-line">访问许可证须由以下机关签发：${ruleFieldValue(s,'allowedIssuers',inspection)}。</span></li>`);
  }
  return `<div class="screen modal-shade"><section class="memo reader rule-reader" role="dialog" aria-label="今日公文" aria-modal="true">${inspection?inspectionPanel(s,inspection,true):''}<div class="reader-content"><div class="document-heading"><span>今日公文 · ${d.version}</span><h2>${esc(d.ruleTitle)}</h2></div><p class="rule-meta">办理日期：${ruleFieldValue(s,'today',inspection)||`第 ${day} 工作日`}</p><ol class="rule-standards">${ruleLines.join('')}${day>=5?`<li><span class="rule-index">+</span><span class="rule-line">本人授权：${ruleFieldValue(s,'requiredAuthorization',inspection)||'是'}</span></li>`:''}</ol>${earlier.length?`<details class="document-extra"><summary>查看此前公文</summary>${earlier.map(old=>`<article class="historical-rule"><h3>${old.version} · ${esc(old.ruleTitle)}</h3>${old.rules.map(para).join('')}</article>`).join('')}</details>`:''}${s?.story.oldRulesReceived?`<details class="document-extra"><summary>查看机房内邮的旧规</summary><p>父亲：“我留下的是当时发给我的那份。边上那句，别替他们补上。”</p><p>早期原文：仅按当前 IP 地区办理。美国、英国、法国、新加坡、日本支持；中国大陆、俄罗斯不支持。</p><p>唯一原件仍在桌边留存，不替代今日生效公文。</p></details>`:''}</div><div class="reader-actions">${btn('返回桌面','close-panel','class="primary"')}</div></section></div>`;
}
