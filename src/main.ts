import './view/styles.css';
import {newRun,reduceRun,currentCase as runCase} from './domain/run';
import type {RunState,ActionBody,Transition,SupplyChoice} from './domain/run';
import {paperOrder,paperBounds,deskControlsClip} from './view/papers';
import type {Decision} from './domain/day-one';
import {clampElapsed,isShiftClockRunning} from './domain/clock';
import {acquireSession,loadRun,commitTransition,eraseRun} from './storage/session';
import {loadAssets} from './view/assets';
import type {AssetCatalog} from './view/assets';
import {renderDesk,TOOLS,RETURN_AREA,DIALOGUE_AREA} from './view/desk';
import type {DragVisual} from './view/desk';
import {toWorldPoint,hitStampArea,contains,stampArea} from './view/hit-test';
import {renderShell,formatTime} from './view/shell';
import * as sound from './audio/feedback';
import {inspectionFields,compareFieldAutomatically} from './domain/inspection';
import {freshInspection,inspectionPanel,fieldAt,drawInspection} from './view/inspection';
import {previewSupply} from './domain/night';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<div class="device-message">请使用电脑横屏。窗口过小时，放大浏览器窗口以查看完整桌面。</div><header class="app-header"><div class="identity"><span class="wordmark">IP PLEASE / 请出示 IP</span><span class="header-note">A÷ 访问资格管理局</span></div><div class="header-actions"><span class="save-status" role="status" id="save-status">本地续玩</span><button data-action="toggle-effects" aria-label="关闭音效">音效 开</button><button data-action="settings">设置</button></div></header><main class="game-wrap"><div class="stage"><canvas width="640" height="360" tabindex="0" aria-label="审查桌。点击通行册翻页；拖动印章到册内右页章区裁决；把册拖回左侧窗口退件。"></canvas><div id="scene-ui"></div></div></main><footer class="app-footer"><div class="instructions" id="instructions" aria-live="polite"></div><details class="a11y-tools"><summary>键盘与辅助操作</summary><p>Tab 选择控件。O 翻开或合拢；A 拿允许章，R 拿拒绝章；Enter 在露出的章区盖章；Escape 放回或暂停。字幕始终等待点击。</p><button data-action="open-book">翻开 / 合拢通行册</button><button data-action="key-allow">拿起允许章</button><button data-action="key-reject">拿起拒绝章</button><button data-action="key-stamp">在章区落章</button><button data-action="return">递还通行册</button></details></footer>`;
const stage=app.querySelector<HTMLDivElement>('.stage')!,canvas=app.querySelector<HTMLCanvasElement>('canvas')!,ctx=canvas.getContext('2d')!,ui=app.querySelector<HTMLDivElement>('#scene-ui')!;
const inspectLayer=document.createElement('div');inspectLayer.id='inspection-ui';stage.append(inspectLayer);
const inspectButton=document.createElement('button');inspectButton.dataset.action='toggle-inspection';inspectButton.textContent='字段核对';inspectButton.title='查看可核对字段 · 快捷键 I';inspectButton.setAttribute('aria-pressed','false');
app.querySelector('.header-actions')!.prepend(inspectButton);
const readButton=document.createElement('button');readButton.dataset.action='read-current';readButton.textContent='材料原文';readButton.setAttribute('aria-label','阅读置顶材料原文');inspectButton.after(readButton);
const saveStatus=app.querySelector<HTMLSpanElement>('#save-status')!,instructions=app.querySelector<HTMLDivElement>('#instructions')!;
let state:RunState|null=null,assets:AssetCatalog={portraits:{}},loaded=false,panel:'settings'|'reader'|null=null,documentId:string|null=null;
let error:string|null=null,pending:Transition|null=null,assetFailure=false,corridorUrl='',shellKey='',hint='',reviewFamily=false;
let effects=true,music=false,choice:SupplyChoice={electricity:false,tokens:false};
let supplyWarning:string|null=null;
let keyboardTool:Decision|null=null,dragVisual:DragVisual|undefined;
let inspection=freshInspection(),inspectionContext='';
type Drag={kind:string;pointerId:number;start:{x:number;y:number};dx:number;dy:number;caseId:string|null;move:boolean;inspect:boolean;fieldId?:string};
let drag:Drag|null=null;
const lease=await acquireSession();
const loadedRun=loadRun();
if(loadedRun.kind==='valid')state=loadedRun.state;
if(loadedRun.kind==='invalid')error=loadedRun.reason;
if(lease.error)error=lease.error;
try{const preferences=JSON.parse(localStorage.getItem('ip-please:audio')??'{}');effects=preferences.effects!==false;music=preferences.music===true;}catch{/* Non-critical preferences use defaults. */}
const MAX_DPR=3;
function sizeCanvas(){
  const bounds=stage.getBoundingClientRect(),dpr=Math.min(MAX_DPR,Math.max(1,window.devicePixelRatio||1));
  const width=Math.max(1,Math.round(bounds.width*dpr)),height=Math.max(1,Math.round(bounds.height*dpr));
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
}
function fit(){
  // Continuous scale: full-screen windows must use their available height instead
  // of being floored to a 2x stage. World coordinates stay 640x360.
  const availableWidth=Math.max(1,window.innerWidth-32),availableHeight=Math.max(1,window.innerHeight-122);
  const scale=Math.max(.5,Math.min(availableWidth/640,availableHeight/360));
  stage.style.width=`${640*scale}px`;stage.style.height=`${360*scale}px`;
  stage.style.setProperty('--scale',String(scale));sizeCanvas();
}
window.addEventListener('resize',()=>{fit();if(loaded){paint();updateCorridor();paint();}});
fit();
function currentCase(){return state?runCase(state):undefined;}
function present(){const c=currentCase();return !!c&&!state!.returned.includes(c.id);}
function interactive(){return loaded&&!error&&lease.canWrite()&&!panel&&!!state&&['desk','returning'].includes(state.phase)&&!state.pauses.length;}
function topDialog(){
  const dialogs=ui.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"]');
  return dialogs.length?dialogs[dialogs.length-1]:null;
}
function focusable(root:HTMLElement){
  return [...root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,a[href],[tabindex]:not([tabindex="-1"])')];
}
function syncModalIsolation(){
  const dialog=topDialog(),overlay=dialog?.closest<HTMLElement>('.modal-shade')??null;
  for(const node of ui.children)(node as HTMLElement).inert=!!overlay&&node!==overlay;
  canvas.inert=!!overlay;
  app.querySelector<HTMLElement>('.app-header')!.inert=!!overlay;
  app.querySelector<HTMLElement>('.app-footer')!.inert=!!overlay;
  if(dialog&&!dialog.contains(document.activeElement)){
    focusable(dialog)[0]?.focus({preventScroll:true});
  }
}
function paint(){
  const inspectContext=JSON.stringify([state?.runId,state?.day,state?.caseIndex]);
  if(inspectContext!==inspectionContext){inspection=freshInspection();inspectionContext=inspectContext;}
  if(!canInspect())inspection=freshInspection();
  if(state&&inspection.active){
    const available=new Set(inspectionFields(state).map(f=>f.id)),selected=inspection.selected.filter(id=>available.has(id));
    if(selected.length!==inspection.selected.length){inspection.selected=selected;inspection.result=null;}
    if(selected.length===1&&!inspection.result?.peerId){
      const result=compareFieldAutomatically(state,selected[0]);
      if(result.peerId)inspection.result=result;
    }
  }
  renderDesk(ctx,state,assets,dragVisual);
  if(!drag?.move)drawInspection(ctx,state,inspection);
  inspectLayer.innerHTML=panel?'':inspectionPanel(state,inspection);
  readButton.disabled=!interactive()||!present();inspectButton.disabled=!canInspect();inspectButton.setAttribute('aria-pressed',String(inspection.active));
  let instruction=!state?'选择一种值班模式，开始你的第一天。':state.phase==='returning'?'将册子和材料逐件拖回左侧窗口，再叫下一位。':state.phase==='desk'?'纸张可自由拖动；点击册页翻开；拖章柄到右页章区松手。':'每一次实际办理，都会保存在本机的唯一续玩记录中。';
  if(hint)instruction=hint;
  if(inspection.active)instruction='点击字段自动连线核对；拖动仍可移动纸张，I 或 Escape 收起连线。';
  const c=currentCase(),runtime=c?state?.caseRuntime[c.id]:undefined;
  if(state?.phase==='returning'&&runtime?.bookReturned)instruction='还有材料未退。逐件拖回左侧窗口；“规则原文”中可以取回被遮住的材料。';
  instructions.textContent=instruction;
  const key=JSON.stringify([state?.phase,state?.day,state?.briefingStep,state?.story,state?.campaign,state?.ending,state?.caseIndex,state?.dialogueLine,state?.returned.length,state?.caseRuntime[currentCase()?.id??''],state?.paperOrder,state?.topPaper,state?.papers,state?.pauses,state?.notice,state?.balance,panel,documentId,error,loaded,lease.canWrite(),choice,effects,music,reviewFamily,corridorUrl,inspection,supplyWarning]);
  if(key!==shellKey){
    const focused=document.activeElement as HTMLElement|null,focusAction=focused?.dataset.action,focusId=focused?.id;
    const readerScroll=ui.querySelector('.reader')?.scrollTop;
    const previousTranscript=ui.querySelector<HTMLElement>('.dialogue-transcript');
    const previousTranscriptCase=previousTranscript?.dataset.caseId;
    const previousTranscriptScroll=previousTranscript?.scrollTop??0;
    const previousTranscriptAtTail=!previousTranscript||previousTranscript.scrollHeight-previousTranscript.clientHeight-previousTranscript.scrollTop<16;
    ui.innerHTML=renderShell(reviewFamily&&state?{...state,phase:'family'}:state,{assets,panel,documentId,writable:lease.canWrite(),error,loaded,effects,music,choice,corridorUrl,hint,inspection,supplyWarning});shellKey=key;
    if(focusAction)ui.querySelector<HTMLButtonElement>(`button[data-action="${focusAction}"]`)?.focus({preventScroll:true});
    else if(focusId)ui.querySelector<HTMLElement>(`#${CSS.escape(focusId)}`)?.focus({preventScroll:true});
    const reader=ui.querySelector('.reader');if(reader&&readerScroll!==undefined)reader.scrollTop=readerScroll;
    const transcript=ui.querySelector<HTMLElement>('.dialogue-transcript');
    if(transcript){
      if(previousTranscriptCase===transcript.dataset.caseId&&!previousTranscriptAtTail)transcript.scrollTop=previousTranscriptScroll;
      else transcript.scrollTop=transcript.scrollHeight;
    }
  }
  syncModalIsolation();
  syncPaperLayer();
  const clock=app.querySelector('#shift-time');if(clock&&state)clock.textContent=`${isShiftClockRunning(state)?'':'暂停 / '}${formatTime(state.remainingMs)}`;
  const audioButton=app.querySelector<HTMLButtonElement>('[data-action="toggle-effects"]')!;
  audioButton.textContent=`音效 ${effects?'开':'关'}`;audioButton.setAttribute('aria-label',effects?'关闭音效':'开启音效');
  sound.setAudioLevels(music?.6:0,effects?.35:0);sound.setMusic(music&&!!loaded&&(!state||state.phase==='newspaper')&&!panel);
}
function syncPaperLayer(){
  const controls=ui.querySelector<HTMLElement>('.desk-controls');
  if(controls&&state){
    const bounds=stage.getBoundingClientRect(),clip=deskControlsClip(state,bounds.width,bounds.height,dragVisual);
    controls.style.clipPath=clip;inspectLayer.style.clipPath=clip;
  }else inspectLayer.style.clipPath='';
}
function canInspect(){return !!state&&loaded&&!error&&lease.canWrite()&&['desk','returning'].includes(state.phase)&&present()&&(!panel||panel==='reader')&&state.pauses.every(p=>p==='reader');}
function chooseField(id:string){
  if(!state||!canInspect()||!inspectionFields(state).some(f=>f.id===id))return;
  inspection.active=true;inspection.hover=null;hint='';
  inspection.selected=[id];inspection.result=compareFieldAutomatically(state,id);
  paint();
}
function playEffects(t:Transition){
  if(document.hidden)return;
  for(const e of t.effects){if(e.kind==='utterance')sound.playUtterance(e.profileId,e.text);else if(e.kind==='stamp')sound.playStamp();else if(e.kind==='notice')sound.playNotice();else sound.playPaper();}
}
let chain=Promise.resolve();
async function save(t:Transition){
  if(t.state===state)return;
  saveStatus.textContent='保存中';const result=await commitTransition(state,t,lease);
  if(result.ok){
    const previousPhase=state?.phase;
    state=result.state;pending=null;error=null;saveStatus.textContent='已自动保存';
    // Reaching zero closes the desk in the same transaction: drop any held seal
    // or paper and stop expiry feedback before repainting the night screen.
    if(state.phase!==previousPhase&&(['night','incident','defense','ending'].includes(state.phase))){cancelDrag();sound.stopFeedback();hint='';panel=null;documentId=null;}
    playEffects(t);
  }
  else{pending=t;error=result.reason;saveStatus.textContent='尚未保存';sound.stopFeedback();cancelDrag();}
  paint();
}
function dispatch(a:ActionBody):Promise<void>{
  chain=chain.then(async()=>{
    if(!state||error||!lease.canWrite())return;
    const t=reduceRun(state,{...a,actionId:crypto.randomUUID()});await save(t);
    if(state.phase==='night'&&!state.rentPaid&&!state.ending&&!error)await save(reduceRun(state,{type:'settle',actionId:crypto.randomUUID()}));
  }).catch(e=>{error=`办理异常：${String(e)}`;saveStatus.textContent='已暂停';paint();});
  return chain;
}
function updateCorridor(){
  // Crop the corridor scene in device pixels so a high-DPI backing canvas is not
  // sampled as if it were still 640x360 (which would only capture the top-left).
  const scaleY=canvas.height/360;
  const width=Math.min(1920,Math.max(640,Math.round(canvas.width)));
  const height=Math.round(width*100/640);
  const sourceY=Math.round(24*scaleY),sourceHeight=Math.max(1,Math.round(87*scaleY));
  const corridor=document.createElement('canvas');corridor.width=width;corridor.height=height;
  const cctx=corridor.getContext('2d')!;cctx.imageSmoothingEnabled=true;cctx.imageSmoothingQuality='high';
  cctx.drawImage(canvas,0,sourceY,canvas.width,sourceHeight,0,0,width,height);
  corridorUrl=corridor.toDataURL('image/png');
}
async function initAssets(){
  try{assets=await loadAssets();assetFailure=false;loaded=true;renderDesk(ctx,null,assets);updateCorridor();
    paint();if(state?.phase==='night'&&!state.rentPaid&&!error)await dispatch({type:'settle'});
  }catch(e){assetFailure=true;error=`人物或字体载入失败：${String(e)}。请保持素材目录完整并重试。`;paint();}
}
function cancelDrag(){
  if(drag&&canvas.hasPointerCapture(drag.pointerId)){try{canvas.releasePointerCapture(drag.pointerId);}catch{/* pointer already released */}}
  drag=null;dragVisual=undefined;keyboardTool=null;canvas.style.cursor='default';
}
function selectTool(kind:Decision){
  if(!interactive()||!present()||!state||!paperBounds(state,'book'))return;
  keyboardTool=kind;const b=stampArea(state.book);dragVisual={kind,x:b.x+b.width/2,y:b.y+b.height/2};hint=`已拿起${kind==='allow'?'允许':'拒绝'}章。Enter 在章区盖章，Escape 放回。`;paint();
}
function stampVisible(point:{x:number;y:number}){
  if(!state||!paperBounds(state,'book')||!hitStampArea(point,state.book,state.bookPage))return false;
  const order=paperOrder(state),bookIndex=order.indexOf('book');
  return !order.slice(bookIndex+1).some(id=>{const r=paperBounds(state!,id);return !!r&&contains(point,r);});
}
async function keyboardStamp(){
  if(!keyboardTool||!interactive()||!state||!present())return;
  const b=stampArea(state.book),p={x:b.x+b.width/2,y:b.y+b.height/2},kind=keyboardTool;
  cancelDrag();hint='';if(stampVisible(p))await dispatch({type:'stamp',caseId:currentCase()!.id,decision:kind});else{hint='请翻开通行册，并露出有效章区。';paint();}
}
function preferences(){sound.setAudioLevels(music?.6:0,effects?.35:0);try{localStorage.setItem('ip-please:audio',JSON.stringify({effects,music}));}catch{/* Preferences never block the run transaction. */}paint();}
async function action(name:string){
  sound.unlockAudio();
  if(name==='reload'){location.reload();return;}
  if(name==='retry'){
    if(assetFailure){error=null;await initAssets();return;}
    if(pending){error=null;await save(pending);if(state?.phase==='night'&&!state.rentPaid&&!error)await dispatch({type:'settle'});}
    else location.reload();return;
  }
  if(name==='take-over'){
    if(await lease.takeOver()){const l=loadRun();cancelDrag();panel=null;documentId=null;pending=null;hint='';reviewFamily=false;
      if(l.kind==='invalid')error=l.reason;else{state=l.kind==='valid'?l.state:null;error=null;}paint();
      if(state?.phase==='night'&&!state.rentPaid&&!error)await dispatch({type:'settle'});
    }else{error='接管失败，请检查此站点存储权限后重试。';paint();}return;
  }
  if(!loaded||error||!lease.canWrite())return;
  if(name==='dismiss-supply-warning'){supplyWarning=null;paint();ui.querySelector<HTMLButtonElement>('[data-action="supply"]')?.focus();return;}
  if(supplyWarning)return;
  if(name==='toggle-effects'){effects=!effects;preferences();return;}
  if(name==='toggle-inspection'){
    if(!canInspect())return;const active=!inspection.active;cancelDrag();inspection={...freshInspection(),active};hint='';paint();return;
  }
  if(name.startsWith('inspect-field:')){chooseField(name.slice(14));return;}
  if(name==='read-current'){if(!state||!interactive()||!present())return;const id=paperOrder(state).reverse().find(id=>paperBounds(state!,id))??'rule';await action(id==='rule'?'reader':`document:${id}`);return;}
  if(name.startsWith('document:')){
    const id=name.slice(9);if(!state||!paperBounds(state,id))return;
    documentId=id;panel='reader';cancelDrag();sound.stopFeedback();
    if(state)await dispatch({type:'pause',reason:'reader',paused:true});paint();return;
  }
  if(name==='settings'||name==='reader'){
    if(name==='settings')inspection=freshInspection();
    if(name==='reader')documentId=null;
    panel=name;cancelDrag();sound.stopFeedback();if(state)await dispatch({type:'pause',reason:name==='reader'?'reader':'settings',paused:true});paint();
    ui.querySelector<HTMLButtonElement>('[data-action="close-panel"]')?.focus();return;
  }
  if(name==='close-panel'){
    const previous=panel;panel=null;documentId=null;if(state&&previous)await dispatch({type:'pause',reason:previous==='reader'?'reader':'settings',paused:false});paint();canvas.focus();return;
  }
  if(name.startsWith('show-paper:')){
    const id=name.slice(11);if(!state||!paperBounds(state,id))return;
    if(panel){const previous=panel;panel=null;documentId=null;await dispatch({type:'pause',reason:previous==='reader'?'reader':'settings',paused:false});}
    await dispatch({type:'raise',paper:id});paint();return;
  }
  if(name.startsWith('return-paper:')){
    await dispatch({type:'return-paper',paperId:name.slice(13)});
    if(panel){const previous=panel;panel=null;documentId=null;await dispatch({type:'pause',reason:previous==='reader'?'reader':'settings',paused:false});}paint();return;
  }
  if(name==='restart'){
    if(!window.confirm('结束本局并开始新的值班？当前唯一进度会被替换。'))return;
    cancelDrag();sound.stopFeedback();const r=await eraseRun(lease);if(r.ok){state=null;error=null;pending=null;panel=null;documentId=null;reviewFamily=false;choice={electricity:false,tokens:false};saveStatus.textContent='本地续玩';}else error=r.reason;paint();return;
  }
  if(panel)return;
  if(name.startsWith('mail:')){const [,id,option]=name.split(':');await dispatch({type:'mail',id,option});return;}
  if(name==='finish-mail'){await dispatch({type:'finish-mail'});return;}
  if(name.startsWith('train:')){await dispatch({type:'train',command:name.slice(6) as 'open'|'take'|'fire'|'isolate'|'finish'});return;}
  if(name.startsWith('defense:')){await dispatch({type:'defense',command:name.slice(8) as 'start'|'open'|'take'|'isolate'|'wait'|'continue'});return;}
  if(name.startsWith('fire:')){await dispatch({type:'defense',command:'fire',target:name.slice(5)});return;}
  if(name==='ending-next'){await dispatch({type:'ending-next'});return;}
  if(name.startsWith('procedure:')&&interactive()&&present()){cancelDrag();await dispatch({type:'procedure',caseId:currentCase()!.id,disposition:name.slice(10) as 'ban'|'review'|'unban'});return;}
  if(name==='review-family'){reviewFamily=true;paint();return;}
  if(name.startsWith('new-')){await save({state:newRun(name==='new-standard'?'standard':'relaxed',crypto.randomUUID()),effects:[]});return;}
  if(name==='go-desk'){choice={electricity:false,tokens:false};await dispatch({type:'go-desk'});return;}
  if(name.startsWith('dismiss-')){await dispatch({type:'dismiss',reason:name.slice(8) as 'briefing'|'tutorial'|'citation'});canvas.focus();return;}
  if(name==='supply'){
    if(!state||state.phase!=='night')return;
    const preview=previewSupply(state,choice);
    if(!preview.affordable){supplyWarning=`当前余额 ${state.balance} · 所选费用 ${state.balance-preview.balance} · 还差 ${Math.max(0,-preview.balance)}。请调整供养或修复项目后重试。`;paint();return;}
    await dispatch({type:'supply',choice});return;
  }
  if(name==='advance-scene'){await dispatch({type:'advance-scene'});return;}
  if(name==='next-day'){if(reviewFamily){reviewFamily=false;paint();return;}await dispatch({type:'next-day'});return;}
  if(!interactive())return;
  hint='';
  if(name==='key-allow'||name==='key-reject'){selectTool(name==='key-allow'?'allow':'reject');return;}
  if(name==='key-stamp'){await keyboardStamp();return;}
  if(name==='return'){if(present())await dispatch({type:'return',caseId:currentCase()!.id});return;}
  if(['call','dialogue','open-book','ask'].includes(name))await dispatch({type:name as 'call'|'dialogue'|'open-book'|'ask'});
}
app.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');if(b&&!b.disabled)void action(b.dataset.action!);});
app.addEventListener('change',e=>{
  const el=e.target as HTMLInputElement;
  if(el.id==='electricity'||el.id==='tokens'){choice={...choice,[el.id]:el.checked};paint();}
  if(el.id.startsWith('repair-')){const id=el.id.slice(7) as import('./domain/run').FamilyMemberId;choice={...choice,repairs:el.checked?[...new Set([...(choice.repairs??[]),id])]:(choice.repairs??[]).filter(x=>x!==id)};paint();}
  if(el.id==='effects-setting'){effects=el.checked;preferences();}
  if(el.id==='music-setting'){music=el.checked;preferences();}
});
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||!interactive()||!state)return;
  const p=toWorldPoint(e.clientX,e.clientY,canvas.getBoundingClientRect());if(!p)return;
  sound.unlockAudio();canvas.focus();hint='';
  let kind:Drag['kind']|null=null;
  for(const id of paperOrder(state).reverse()){const bounds=paperBounds(state,id);if(bounds&&contains(p,bounds)){kind=id;break;}}
  if(!kind)for(const decision of ['allow','reject'] as const)if(contains(p,TOOLS[decision])&&paperBounds(state,'book')&&present())kind=decision;
  if(!kind&&state.story.oldRulesReceived&&contains(p,{x:248,y:301,width:137,height:18})){void action('reader');return;}
  if(!kind&&contains(p,DIALOGUE_AREA))kind='dialogue';
  if(!kind)return;
  const paper=kind==='book'||kind==='rule'?state[kind]:state.papers[kind]??null;
  const candidate=kind!=='allow'&&kind!=='reject'?fieldAt(state,p):null;
  const inspect=!!candidate,field=inspect?candidate:null;
  drag={kind,pointerId:e.pointerId,start:p,dx:paper?p.x-paper.x:0,dy:paper?p.y-paper.y:0,caseId:currentCase()?.id??null,move:false,inspect,fieldId:field?.id};
  if(paper&&!inspect)void dispatch({type:'raise',paper:kind});
  dragVisual={kind,x:paper?paper.x:p.x,y:paper?paper.y:p.y};canvas.style.cursor='grabbing';canvas.setPointerCapture(e.pointerId);paint();
});
canvas.addEventListener('wheel',e=>{
  if(!interactive()||!state)return;
  const p=toWorldPoint(e.clientX,e.clientY,canvas.getBoundingClientRect());if(!p||!contains(p,DIALOGUE_AREA))return;
  if(paperOrder(state).reverse().some(id=>{const bounds=paperBounds(state!,id);return !!bounds&&contains(p,bounds);}))return;
  e.preventDefault();
  const transcript=ui.querySelector<HTMLElement>('.dialogue-transcript');
  if(transcript)transcript.scrollTop+=e.deltaY;
},{passive:false});
canvas.addEventListener('pointermove',e=>{
  if(!drag){
    if(state&&interactive()){
      const p=toWorldPoint(e.clientX,e.clientY,canvas.getBoundingClientRect()),id=p?fieldAt(state,p)?.id??null:null;
      canvas.style.cursor=id?(inspection.active?'crosshair':'pointer'):'default';
      if(inspection.active&&id!==inspection.hover){inspection.hover=id;renderDesk(ctx,state,assets);drawInspection(ctx,state,inspection);}
    }return;
  }
  if(drag.pointerId!==e.pointerId)return;
  const p=toWorldPoint(e.clientX,e.clientY,canvas.getBoundingClientRect());if(!p)return;
  if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>3&&!drag.move){drag.move=true;if(drag.inspect)void dispatch({type:'raise',paper:drag.kind});}
  const paper=drag.kind!=='allow'&&drag.kind!=='reject';dragVisual={kind:drag.kind,x:paper?p.x-drag.dx:p.x,y:paper?p.y-drag.dy:p.y};renderDesk(ctx,state,assets,dragVisual);syncPaperLayer();
});
canvas.addEventListener('pointerup',e=>{
  if(!drag||drag.pointerId!==e.pointerId)return;
  const d=drag,p=toWorldPoint(e.clientX,e.clientY,canvas.getBoundingClientRect());cancelDrag();
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(!p||!interactive()||!state||d.caseId!==(currentCase()?.id??null)){paint();return;}
  if(d.kind==='dialogue'){if(!d.move)void dispatch({type:'dialogue'});else paint();return;}
  if(d.inspect&&!d.move&&d.fieldId){chooseField(d.fieldId);return;}
  if(d.kind==='allow'||d.kind==='reject'){
    if(stampVisible(p)&&d.move)void dispatch({type:'stamp',caseId:d.caseId!,decision:d.kind,at:{x:Math.round(p.x-state.book.x),y:Math.round(p.y-state.book.y)}});
    else{hint=state.bookPage==='cover'?'先点击通行册翻开内页。':'请把印章拖到露出的有效章区。';paint();}
  }else if(d.kind==='book'&&d.move&&state.phase==='returning'&&contains(p,RETURN_AREA))void dispatch({type:'return',caseId:d.caseId!});
  else if(d.kind!=='rule'&&d.kind!=='book'&&d.move&&state.phase==='returning'&&contains(p,RETURN_AREA))void dispatch({type:'return-paper',paperId:d.kind});
  else if(d.move)void dispatch({type:'move',paper:d.kind,x:p.x-d.dx,y:p.y-d.dy});
  else if(d.kind==='book')void dispatch({type:'open-book'});else if(d.kind==='rule')void action('reader');else void dispatch({type:'raise',paper:d.kind});
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{if(drag){cancelDrag();paint();}});
window.addEventListener('keydown',e=>{
  if(supplyWarning&&e.key==='Escape'){e.preventDefault();void action('dismiss-supply-warning');return;}
  if(!(e.target instanceof HTMLInputElement)&&e.key.toLowerCase()==='i'&&canInspect()){e.preventDefault();void action('toggle-inspection');return;}
  const dialog=topDialog();
  if(dialog&&e.key==='Tab'){
    const controls=focusable(dialog);
    if(!controls.length){e.preventDefault();return;}
    const first=controls[0],last=controls[controls.length-1],active=document.activeElement;
    if(!dialog.contains(active)){e.preventDefault();(e.shiftKey?last:first).focus({preventScroll:true});return;}
    if(e.shiftKey&&active===first){e.preventDefault();last.focus({preventScroll:true});}
    else if(!e.shiftKey&&active===last){e.preventDefault();first.focus({preventScroll:true});}
    return;
  }
  if(e.key==='Escape'&&(panel||!(e.target instanceof HTMLInputElement))){e.preventDefault();if(inspection.active){inspection=freshInspection();hint='';paint();}else if(drag||keyboardTool){cancelDrag();hint='';paint();}else void action(panel?'close-panel':'settings');return;}
  if(e.target instanceof HTMLInputElement)return;
  if(!interactive())return;
  if(e.key.toLowerCase()==='o'){e.preventDefault();void action('open-book');}
  if(e.key.toLowerCase()==='a'||e.key.toLowerCase()==='r'){e.preventDefault();selectTool(e.key.toLowerCase()==='a'?'allow':'reject');}
  if(e.key==='Enter'&&keyboardTool){e.preventDefault();void keyboardStamp();}
});
let previousTime=performance.now(),background=false;
function setBackground(value:boolean){
  inspection=freshInspection();
  background=value;previousTime=performance.now();cancelDrag();sound.stopFeedback();
  if(state&&lease.canWrite()&&!error)void dispatch({type:'pause',reason:'background',paused:value});
}
document.addEventListener('visibilitychange',()=>setBackground(document.hidden));
window.addEventListener('blur',()=>setBackground(true));window.addEventListener('focus',()=>setBackground(document.hidden));
window.addEventListener('storage',()=>{if(!lease.canWrite()){cancelDrag();sound.stopFeedback();}paint();});
window.addEventListener('pagehide',()=>{sound.stopFeedback();sound.setMusic(false);lease.release();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
setInterval(()=>{
  const now=performance.now(),elapsed=clampElapsed(now-previousTime);previousTime=now;
  if(loaded&&elapsed>0&&!background&&!document.hidden&&state&&lease.canWrite()&&!error&&(isShiftClockRunning(state)||state.phase==='defense'))void dispatch({type:'tick',ms:elapsed});
},250);
paint();await initAssets();
