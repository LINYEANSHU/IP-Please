import type {RunState} from '../domain/run';
import {pendingMail,ENDING_TEXT,endingEchoes,has} from '../domain/campaign';
import {escapeHtml as esc} from './shell';
import type {ShellOptions} from './shell';
const button=(label:string,action:string,cls='')=>`<button class="${cls}" data-action="${action}">${esc(label)}</button>`;
const para=(p:string)=>`<p>${esc(p)}</p>`;
function guardFigure(alive:boolean,special:boolean){
  if(!alive)return '<span class="guard-empty" aria-hidden="true"></span>';
  const body=special?'#435b47':'#454a49',armour=special?'#76845d':'#69716a';
  return `<svg class="guard-figure" viewBox="0 0 32 44" aria-hidden="true" shape-rendering="crispEdges"><path fill="#252d27" d="M6 2h16v9H6zM8 23h15v19H8z"/><path fill="${body}" d="M5 11h21v16H5zM8 27h6v15H8zM18 27h6v15h-6z"/><path fill="${armour}" d="M8 3h13v5H8zM8 12h13v11H8z"/><path fill="#b8a68b" d="M10 7h9v3h-9z"/><path fill="#1b221e" d="M10 11h10v3H10zM11 16h8v3h-8zM17 20h14v3H17zM25 23h3v5h-3zM7 40h8v4H7zM17 40h9v4h-9z"/></svg>`;
}
export function correspondence(s:RunState,o:ShellOptions){
  const m=pendingMail(s),from=m?.from??'收发室',portraitId=({'梁文锋':'M01','杨植麟':'M03','唐杰':'M04','Sam Altman':'M02'} as Record<string,string>)[from],portrait=portraitId?o.assets.portraits[portraitId]:null;
  return `<section class="screen correspondence"><aside class="mail-window">${portrait?`<img src="${portrait.url}" alt="${esc(from)}的虚构游戏形象">`:'<div class="mail-slot" aria-hidden="true"><span></span></div>'}<h2>${esc(from)}</h2><p>第 ${s.day} 日 · 班前收发</p><p>时钟尚未开始</p></aside><article class="dispatch-paper"><header>A÷　窗口收发登记<span>第 ${s.day} 工作日</span></header><div class="dispatch-body"><h1>${esc(m?.title??'本批来往已登记')}</h1>${m?m.paragraphs.map(para).join(''):'<p>本次交件与回函均已收存，可以开始今日受理。</p>'}</div><footer>${m?m.options.map((op,i)=>button(op.label,`mail:${m.id}:${op.id}`,i===0?'primary':'')).join(''):button('回到受理窗口','finish-mail','primary')}</footer></article></section>`;
}
export function training(s:RunState){
  const command=!has(s,'training-open')?'open':!has(s,'training-take')?'take':!has(s,'training-fire')?'fire':!has(s,'training-isolate')?'isolate':'finish';
  const lines={open:['器械柜配发回执','机构免费配发断链脉冲枪；每波三次充能。普通申请人和守卫不是射击对象。','打开器械柜'],take:['检查器械','柜门已开。取出器械后，只对正在破坏闸门的攻击实例使用。','取出脉冲枪'],fire:['空场练习靶','方框内的练习靶正在模拟攻击闸门。瞄准有标记的攻击体后点击发射，打空也消耗充能。','向练习靶发射'],isolate:['异常通道练习','枪切断现场攻击体的连接；外送须另行隔离。终止攻击体后，再断开有标记的异常通道。','断开练习异常通道'],finish:['训练登记完成','标准模式每波独立计时15秒，受理钟暂停；轻松模式逐步瞄准。设置与后台均暂停救援。','收起器械，回到窗口']}[command];
  return `<section class="screen training"><div class="training-range" aria-hidden="true"><div class="training-target"></div><div class="pulse-cabinet"></div></div><article class="training-instructions"><h1>${lines[0]}</h1>${para(lines[1])}<p>练习不消耗值班时间，不产生家庭费用。</p>${button(lines[2],`train:${command}`,'primary')}</article></section>`;
}
export function defense(s:RunState){
  const a=s.campaign!.attack!,c=s.campaign!,active=a.stage==='active';
  const targets=a.targets.map((t,i)=>`<button class="attack-target ${a.hits.includes(t.id)?'terminated':''}" data-action="fire:${t.id}" style="left:${i?69:27}%" ${!active||!a.armed||!a.charge||a.hits.includes(t.id)?'disabled':''} aria-label="向${i?'右':'左'}侧突入攻击实例发射"><span class="attack-agent" aria-hidden="true"></span><strong>${a.hits.includes(t.id)?'连接终止':'突入攻击实例'}</strong><small>${a.hits.includes(t.id)?'脉冲命中':'正在破坏闸门'}</small></button>`).join('');
  const commands=a.stage==='warning'?button(a.wave===1?'开始救援':'应对下一波','defense:start','primary'):a.stage==='result'?button('返回受理窗口','defense:continue','primary'):!a.cabinet?button('打开器械柜','defense:open','primary'):!a.armed?button('取出脉冲枪','defense:take','primary'):button('对空处发射','fire:empty')+(s.day>=23?button('断开本次异常通道','defense:isolate',a.targets.every(t=>a.hits.includes(t.id))?'primary':''): '')+button('等待防御接管','defense:wait');
  return `<section class="screen defense"><header class="defense-heading"><h1>${s.day===23?'异常抽取与现场突入':'入口请求洪峰与现场突入'}</h1><span>第 ${s.day} 日 · 第 ${a.wave} 波　/　受理计时暂停</span></header><div class="attack-yard"><div class="defense-barrier" aria-hidden="true"></div>${targets}<div class="guard-stations"><span>${guardFigure(c.guards.W01,true)}${c.guards.W01?'深绿制服守卫 / 闸口':'闸口空岗'}</span><span>${guardFigure(c.guards.W02,false)}${c.guards.W02?'灰衣增援守卫 / 隔离台':'隔离台空岗'}</span></div></div><div class="defense-console"><div><p>${a.stage==='warning'?'闸门遭到破坏。先开柜取枪，再瞄准明确标记的攻击体。':a.stage==='result'?'本次现场记录已保存。':'取枪后点击场景中的攻击体发射；每波三次充能。'}</p><p class="defense-live" role="status">${s.mode==='relaxed'?'逐步瞄准':`救援剩余 ${Math.ceil(a.remainingMs/1000)} 秒`}　·　充能 ${a.charge} / 3　·　${a.hits.length} / ${a.targets.length} 命中</p>${a.stage==='result'?a.result.map(para).join(''):''}</div><div class="defense-actions">${commands}</div></div></section>`;
}
export function ending(s:RunState,o:ShellOptions){
  const text=ENDING_TEXT[s.ending!],line=s.campaign?.endingLine??0;
  return `<section class="screen ending campaign-ending"><div class="ending-scene" aria-hidden="true">${s.ending==='E10'&&o.assets.portraits.M08?`<img class="ending-character" src="${o.assets.portraits.M08.url}" alt="">`:'<span class="ending-window"></span>'}<span class="ending-light ${['E04','E05','E10','E13'].includes(s.ending!)?'extinguished':''}"></span></div><article><p class="ending-code">${esc(s.ending!)}　/　第 ${s.day} 日</p><h1>${text.title}</h1><div class="ending-prose" role="log">${text.lines.slice(0,Math.min(3,line+1)).map(para).join('')}</div>${line>=3?`<div class="ending-echoes">${endingEchoes(s).map(para).join('')}</div><p class="ending-account">本局已结束 · 最终余额 ${s.balance} · 自动续玩已保存</p>${button('重新开始','restart','primary')}`:button(line<2?'继续':'查看回信','ending-next','primary')}</article></section>`;
}
