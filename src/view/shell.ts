import * as campaignScreens from './campaign-screens';
import {currentCase} from '../domain/run';
import type {RunState,SupplyChoice} from '../domain/run';
import * as screens from './week-screens';
import {PAPER_NAMES} from './papers';
import {DIALOGUE_AREA} from './desk';
import {applicantDialogue,approvalThanks} from '../domain/conversation';
import type {AssetCatalog} from './assets';
import type {InspectionUi} from './inspection';
export interface ShellOptions {assets:AssetCatalog;panel:'settings'|'reader'|null;documentId?:string|null;writable:boolean;error:string|null;loaded:boolean;effects:boolean;music:boolean;choice:SupplyChoice;corridorUrl:string;hint:string;inspection?:InspectionUi;supplyWarning?:string|null}
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const button=(label:string,action:string,cls='',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const positioned=(label:string,action:string,x:number,y:number,w:number,h:number,extra='')=>button(label,action,'world-button',`style="left:${x/6.4}%;top:${y/3.6}%;width:${w/6.4}%;height:${h/3.6}%" ${extra}`);
const worldText=(content:string,x:number,y:number,w:number,h:number,cls='')=>`<div class="world-text ${cls}" style="left:${x/6.4}%;top:${y/3.6}%;width:${w/6.4}%;height:${h/3.6}%">${content}</div>`;

export function renderShell(s:RunState|null,o:ShellOptions):string {
  let body='';
  if(!o.loaded)body='<div class="screen title"><h2>岗亭正在通电</h2><p>载入本地人物与字体……</p></div>';
  else if(!s)body=`<section class="screen title"><div class="title-rule"></div><h1>IP PLEASE</h1><h2>请出示 IP</h2><p class="motto">荣耀归于 A÷</p><div class="mode-buttons">${button('标准值班','new-standard','primary')}${button('轻松值班','new-relaxed')}</div><div class="mode-explain"><p>标准：值班 90 秒 · 初始 20 · 底薪 10 · 每案 5</p><p>轻松：值班 90 秒 · 初始 50 · 底薪 10 · 每案 5</p></div><p class="mode-note">接待客户时累计计时 90 秒，空窗暂停；归零或当日案位办完即收班。</p><p class="build-note">完整流程 / 31 日 · 368 个案位<br>鼠标拖放 · 简体中文 · 本地自动续玩</p><p class="fiction-note">虚构世界。所有网络记录均来自案卷。</p></section>`;
  else if(s.phase==='newspaper')body=screens.newspaper(s,o);
  else if(['desk','returning'].includes(s.phase)){
    const c=currentCase(s),present=!!c&&!s.returned.includes(c.id),runtime=c?s.caseRuntime[c.id]:undefined,asked=!!runtime?.asked;
    const dialogue=c?applicantDialogue(c,s.runId):[],approved=c&&s.decisions[c.id]?.decision==='allow';
    const result=s.decisions[c?.id??''];
    const outcome=runtime?.bookReturned&&result?.disposition==='ban'?'账号封禁已执行。'+(c?.initialPapers.some(p=>p.kind==='freeze')?'未用服务预付款不予退还通知已送达。':''):runtime?.bookReturned&&result?.disposition==='review'?'复核材料已转送，当前访问结束；收件不等于批准或解封。':runtime?.bookReturned&&result?.disposition==='unban'?(result.correct?'有效许可已核验，正式解封完成。':'解封依据未获确认，账号状态保持。'):'';
    const transcript=c?[...(runtime?.appeal?['此账号已封禁，本次提交正式申诉材料。']:[]),...dialogue.slice(0,s.dialogueLine+1),...(asked?[c.askLines.join(' ')||'材料都在这里了。']:[]),...(approved?[approvalThanks(c,s.runId)]:[]),...(outcome?[outcome]:[])]:[];
    const canContinue=!!c&&present&&s.phase==='desk'&&!asked&&s.dialogueLine<dialogue.length-1;
    const transcriptHtml=c?`<div class="dialogue-transcript" role="log" aria-label="对话记录" data-case-id="${escapeHtml(c.id)}">${transcript.map((line,index)=>`<p class="dialogue-entry${index===transcript.length-1?' is-latest':''}">${escapeHtml(line)}</p>`).join('')}</div>${canContinue?button('点击下一句','dialogue','dialogue-next-button','aria-label="继续对话"'):`<span class="dialogue-end">${!present?'申请人已离开':s.phase==='returning'?'等待递还材料':asked?'材料已交付':'对话暂止'}</span>`}`:'<p class="waiting-copy">请叫下一位。</p>';
    body=worldText(`<span class="dialogue-tag">${present?(c.personId==='COMIC-QIAO'?'老乔 / 修电脑的':'申请人'):'受理窗口'}</span>${transcriptHtml}`,DIALOGUE_AREA.x,DIALOGUE_AREA.y,DIALOGUE_AREA.width,DIALOGUE_AREA.height,'dialogue-panel');
    body+=positioned('下一位','call',14,318,206,25,present?'disabled':'');
    body+=worldText(`<span id="shift-time">${formatTime(s.remainingMs)}</span><span id="case-count">已办 ${s.returned.length} / ${s.caseIds.length}</span>`,249,347,382,12,'desk-status-row');
    if(s.day>1&&present){
      body+=positioned('询问材料','ask',120,299,99,16,asked||s.phase==='returning'?'disabled':'');
      body+=`<div class="paper-tabs">${['book',...Object.keys(s.papers)].filter(id=>id==='book'?!runtime?.bookReturned:!runtime?.returnedPapers.includes(id)).map(id=>button(id==='book'?(s.day>=3?'护照册':'通行册'):PAPER_NAMES[[...c.initialPapers,...c.askedPapers].find(p=>p.id===id)!.kind],`show-paper:${id}`)).join('')}</div>`;
    }
      if(s.day>=12&&present&&!runtime?.bookReturned){
      body+=`<div class="procedure-controls">${button(runtime?.appeal?'提交账号申诉':'填写复核单','procedure:review')}${runtime?.appeal?(s.day>=28?button('按有效许可解封','procedure:unban'):''):`<details><summary>封号控制盖</summary><p>执行将带离申请人并封禁账号。普通拒绝仍用拒绝章；复核不封号。</p>${button('按依据联执行封号','procedure:ban','quiet-danger')}</details>`}</div>`;
    }
    body=`<div class="desk-controls">${body}</div>`;
    if(s.pauses.includes('briefing'))body+=screens.briefing(s);
    else if(s.pauses.includes('tutorial'))body+=`<div class="screen modal-shade"><article class="memo tutorial"><h2>把这一册办完</h2><ol><li>点击通行册，翻到内页。</li><li>对照桌上的地区规定。</li><li>拖动实体章柄，在右页章区松手。</li><li>把盖好章的册拖回左侧窗口。</li></ol><p>桌上或册外松手不会裁决。递还册子前可重新盖章修改裁决；退件后再叫下一位。倒计时归零时，未退件的册不能再办理。</p>${button('知道了，开始办件','dismiss-tutorial','primary')}</article></div>`;
  }else if(s.phase==='correspondence')body=campaignScreens.correspondence(s,o);
  else if(s.phase==='training')body=campaignScreens.training(s);
  else if(s.phase==='defense')body=campaignScreens.defense(s);
  else if(s.phase==='incident')body=screens.incident(s);
  else if(s.phase==='night')body=screens.night(s,o);
  else if(s.phase==='family')body=screens.family(s,o);
  else if(s.phase==='next-day')body=`<section class="screen"><h1>正在续接下一班</h1><p>原账目已保留。</p>${button('继续载入','reload','primary')}</section>`;
  else if(s.phase==='ending')body=campaignScreens.ending(s,o);
  if(o.panel==='settings')body+=`<div class="screen modal-shade"><section class="memo settings" role="dialog" aria-label="设置" aria-modal="true"><h2>设置</h2><label><input id="effects-setting" type="checkbox" ${o.effects?'checked':''}>机械拟声与音效</label><label><input id="music-setting" type="checkbox" ${o.music?'checked':''}>菜单低频环境音乐</label><p>对话始终由点击推进，静音不影响信息。</p>${button('返回值班','close-panel','primary')}${s?button('结束本局并重开','restart','quiet-danger'):''}</section></div>`;
  else if(o.panel==='reader')body+=screens.reader(s,o.inspection,o.documentId);
  if(s?.phase==='night'&&o.supplyWarning)body+=`<div class="screen modal-shade"><section class="memo insufficient-funds" role="alertdialog" aria-label="余额不足" aria-modal="true"><h2>余额不足</h2><p>${escapeHtml(o.supplyWarning)}</p>${button('调整选择','dismiss-supply-warning','primary')}</section></div>`;
  if(s?.notice&&!['desk','returning'].includes(s.phase)&&s.pauses.includes('citation')&&!o.panel)body+=screens.dailyReview(s);
  if(!o.writable&&!o.error&&o.loaded)body+=`<div class="screen modal-shade"><section class="memo" role="dialog" aria-label="另一个窗口正在值班"><h2>另一个窗口正在值班</h2><p>本窗口暂停办理。接管将载入最近已保存的进度，原窗口停止写入。</p>${button('在此窗口接管','take-over','primary')}</section></div>`;
  if(o.error)body+=`<div class="screen modal-shade error-shade"><section class="memo" role="alertdialog" aria-label="未能保存"><h2>办理已暂停</h2><p class="preserve-lines">${escapeHtml(o.error)}</p><p>本次操作尚未越过保存事务。</p>${button('重试保存','retry','primary')}${button('重新载入当前进度','reload')}</section></div>`;
  return body;
}
export const formatTime=(ms:number)=>{const seconds=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;};
