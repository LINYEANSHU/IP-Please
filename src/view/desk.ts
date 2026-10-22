import {REGIONS} from '../domain/day-one';
import {t,getLanguage} from '../i18n';
import {getDay} from '../domain/week';
import {currentCase} from '../domain/run';
import {deskPaperFields,PAPER_NAMES} from './papers';
import type {Decision} from '../domain/day-one';
import type {RunState,Rect} from '../domain/run';
import type {AssetCatalog} from './assets';
export const TOOLS:Record<Decision,Rect>={reject:{x:495,y:301,width:58,height:31},allow:{x:569,y:301,width:58,height:31}};
export const RETURN_AREA:Rect={x:0,y:118,width:234,height:225};
export const DIALOGUE_AREA:Rect={x:102,y:149,width:116,height:155};
export interface DragVisual {kind:string;x:number;y:number}
const C={ink:'#2b2b25',paper:'#d6c9a5',paperDark:'#b8aa87',wood:'#53473c',dark:'#232522',line:'#777461',light:'#eee0ba',red:'#b45b4d',green:'#879d72'};
const CJK_FONT='Fusion,"Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Noto Sans SC",sans-serif';
export function renderDesk(ctx:CanvasRenderingContext2D,state:RunState|null,assets:AssetCatalog,drag?:DragVisual):void {
  const scaleX=Math.max(1,ctx.canvas.width)/640,scaleY=Math.max(1,ctx.canvas.height)/360;
  ctx.save();
  ctx.setTransform(scaleX,0,0,scaleY,0,0);
  ctx.clearRect(0,0,640,360);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.textBaseline='top';
  const rect=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const text=(source:string,x:number,y:number,size=10,c=C.paper)=>{
    const value=t(source);ctx.font=`${size}px ${CJK_FONT}`;ctx.fillStyle=c;
    // English expands substantially; fit each line inside its physical paper.
    const paperBounds=state&&[state.book,state.rule,...Object.values(state.papers)].find(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height);
    const pageEnd=state&&paperBounds===state.book&&state.bookPage==='inside'&&x<state.book.x+110?state.book.x+105:paperBounds?paperBounds.x+paperBounds.width-5:634;
    const maxWidth=getLanguage()==='en'?Math.max(12,pageEnd-x):undefined;
    ctx.fillText(value,Math.round(x),Math.round(y),maxWidth);
  };
  const line=(x:number,y:number,w:number,c=C.line)=>rect(x,y,w,1,c);
  const image=(id:string,x:number,y:number,w:number,h:number)=>{
    const p=assets.portraits[id];if(!p)return;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(p.image,p.rect.x,p.rect.y,p.rect.width,p.rect.height,Math.round(x),Math.round(y),w,h);
  };
  rect(0,0,640,360,C.dark);
  // Shared corridor: original canvas scene, not a screenshot of the reference UI.
  rect(0,0,640,24,'#343831');rect(0,24,640,87,'#787968');rect(0,26,640,3,'#1c211e');
  for(let x=0;x<640;x+=32)rect(x,0,1,22,'#2a2e29');
  rect(18,5,164,14,'#4a3933');text('A÷  /  访问资格管理局',24,7,9,C.light);
  const flower=(cx:number,cy:number)=>{
    const petal='#bd8068',shine='#d8aa83';
    rect(cx-1,cy-7,3,4,petal);rect(cx-6,cy-6,4,3,petal);rect(cx+3,cy-6,4,3,petal);
    rect(cx-7,cy-1,4,3,petal);rect(cx+4,cy-1,4,3,petal);rect(cx-6,cy+4,4,3,petal);
    rect(cx+3,cy+4,4,3,petal);rect(cx-1,cy+4,3,4,petal);rect(cx-2,cy-2,5,5,shine);
  };
  flower(277,12);text('荣耀归于 A÷',291,6,11,C.light);
  text('HELPFUL · HONEST · HARMLESS',434,8,7,'#d0c9ac');
  rect(420,5,1,14,'#777963');
  for(let y=32;y<110;y+=8)for(let x=(y%16)*2;x<640;x+=29)rect(x,y,1,1,'#656b5c');
  rect(0,92,410,2,'#484f42');rect(0,51,402,2,'#484f42');
  rect(0,99,408,2,'#424a40');rect(0,106,408,2,'#424a40');
  for(let x=8;x<408;x+=24)rect(x,97,2,12,'#3b433a');
  rect(390,72,4,34,'#343b34');rect(386,72,32,4,'#292e29');
  for(let x=388;x<418;x+=8)rect(x,73,4,2,x%16===4?'#b65c4d':'#d7c9a6');
  rect(427,29,4,82,'#3d463c');rect(480,29,4,82,'#3d463c');
  rect(435,38,39,12,'#c0b995');text('受理中',439,40,9,C.ink);
  for(let x=431;x<483;x+=6)rect(x,83,3,4,'#d2c6a6');
  const remaining=state?state.caseIds.length-state.returned.length:8;
  for(let i=0;i<Math.min(remaining,8);i++){
    const x=36+i*44,y=62+(i%3)*3;
    rect(x+3,y,5,5,['#beaa8c','#a89c84','#cab598'][i%3]);
    rect(x+1,y+5,9,12,['#444e47','#585147','#3e4949'][i%3]);
    rect(x+1,y+17,3,8,'#30352f');rect(x+7,y+17,3,8,'#30352f');
  }
  // Cleared side of the barrier. The checkpoint is the player's intake below,
  // rather than a second, unrelated hut at the far end of the corridor.
  rect(540,99,100,2,'#555d4e');rect(600,30,3,68,'#555d4e');
  const drawGuard=(x:number,y:number,special:boolean)=>{
    const helmet=special?'#4f684c':'#454b4a',uniform=special?'#435b47':'#454a49';
    const armour=special?'#596e50':'#555a59',edge='#272c29',skin='#bda887';
    rect(x+8,y,10,3,edge);rect(x+6,y+2,14,4,helmet);rect(x+7,y+5,12,4,helmet);
    rect(x+10,y+6,7,3,skin);rect(x+11,y+7,2,1,edge);rect(x+15,y+7,2,1,edge);
    rect(x+9,y+9,10,3,edge);rect(x+7,y+11,14,14,uniform);rect(x+9,y+12,10,11,armour);
    rect(x+11,y+15,6,2,edge);rect(x+11,y+19,6,2,edge);
    rect(x+4,y+12,4,13,uniform);rect(x+2,y+23,5,4,edge);rect(x+19,y+12,4,12,uniform);
    rect(x+18,y+23,5,4,edge);rect(x+8,y+25,5,15,uniform);rect(x+15,y+25,5,15,uniform);
    rect(x+7,y+39,7,3,edge);rect(x+15,y+39,7,3,edge);
    rect(x+18,y+16,10,2,edge);rect(x+20,y+14,4,2,edge);rect(x+26,y+16,4,1,'#181d1a');
    rect(x+22,y+18,2,4,edge);
    if(special){rect(x+7,y+12,2,10,'#aabb7c');rect(x+19,y+26,2,5,'#aabb7c');}
  };
  const guardPresent=!state||state.day>=8||state.story.guardAlive;
  if(state&&state.day>=8){if(state.campaign?.guards.W01!==false)drawGuard(535,40,true);if(state.campaign?.guards.W02!==false)drawGuard(575,47,false);if(state.campaign?.guards.W01===false&&state.campaign?.guards.W02===false)text('远程值守',544,47,9,'#ded2b3');}else if(guardPresent)drawGuard(535,40,false);
  // The near checkpoint fascia sits at the barrier, in front of the guard.
  rect(404,79,132,5,'#292d28');rect(408,84,124,27,'#50594b');
  rect(413,87,114,14,'#c0b995');text('边境检查站 / 01',418,89,9,C.ink);
  rect(413,103,114,5,'#303b32');text('受理窗口在此',441,103,6,'#c6c6a7');
  rect(0,111,640,7,'#191e1b');rect(234,118,7,225,'#171c18');
  // Applicant portrait, handoff window, and dialogue share one fixed intake window.
  rect(0,118,234,225,'#2e312b');rect(8,125,218,188,'#191d1b');
  rect(10,126,214,3,'#6b6b58');rect(10,310,214,3,'#77725c');
  text(state?.phase==='returning'?'归还窗口 01':state&&state.caseIndex>=0?`窗口 01 / ${String(state.caseIndex+1).padStart(2,'0')}`:'窗口 01 / 等待叫号',16,133,10,'#aaa991');
  const current=state?currentCase(state):undefined;
  const present=!!current&&!state!.returned.includes(current.id);
  if(present){
    if(current.personId==='COMIC-QIAO'){
      const moving=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const beat=moving?Math.sin(performance.now()/420):0,day=state!.day;
      ctx.save();ctx.translate(53,201+beat*(day===6?4:1.5));ctx.rotate(beat*(day===6?.045:.012));image(current.portraitId,-39,-47,78,94);ctx.restore();
      const gestures=['探头探脑，练习递证件','把手画证件举得老高','认真展示倒拿的材料','挺起胸，郑重敬了个礼','翻遍口袋，掉出几张纸','鞠躬时帽檐差点碰到窗','举着一幅没有围栏的画'];
      text(gestures[(day-1)%7],14,282,6,'#b8b19b');
      if(day===4){rect(72,171+beat,12,5,'#b99a73');rect(79,176,6,22,'#72634b');}
      else if(day===5){for(let i=0;i<3;i++){rect(20+i*22,253+Math.round(beat*(i+1)),15,10,'#cabb98');line(23+i*22,257+Math.round(beat*(i+1)),9,'#69634f');}}
      else if(day!==6){
        ctx.save();ctx.translate(54,263+beat*2);ctx.rotate(day===3?Math.PI+beat*.07:beat*.04);
        rect(-24,-13,48,26,'#d5c6a5');ctx.strokeStyle='#77705b';ctx.lineWidth=1;ctx.strokeRect(-22,-11,44,22);
        if(day===7){line(-18,-5,36,'#688390');line(-18,4,36,'#688390');}
        else{rect(-18,-6,8,9,'#9c8d70');text(day===3?'周明':'老乔',-5,-5,8,C.ink);line(-5,6,20,'#726a56');}
        ctx.restore();
      }
    }else image(current.portraitId,14,154,78,94);
  }
  else {rect(27,183,54,2,'#3b4439');text('候请下一位',24,199,8,'#656d5c');}
  rect(99,146,1,160,'#4c5144');
  if(state?.phase==='returning'){
    ctx.strokeStyle='#d1c49f';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.strokeRect(.5,118.5,233,224);ctx.setLineDash([]);
  }
  // Desk in the same fixed footprint on every day.
  rect(242,118,398,242,C.wood);
  for(let y=128;y<360;y+=18){line(243,y,397,'#4c4137');line(243,y+1,397,'#594c3f');}
  rect(244,119,393,3,'#79634e');
  text('受理台  /  01',249,121,9,'#baa386');
  function rule(){
    const r={...state!.rule};if(drag?.kind==='rule'){r.x=drag.x;r.y=drag.y;}
    rect(r.x+2,r.y+3,r.width,r.height,'#302d26');rect(r.x,r.y,r.width,r.height,C.paperDark);
    rect(r.x+2,r.y+2,r.width-4,r.height-4,C.paper);rect(r.x+7,r.y+9,27,14,'#565b49');
    const day=getDay(Math.min(state!.day,31));
    text('A÷',r.x+12,r.y+10,12,C.light);text(day.version,r.x+95,r.y+12,10,C.ink);line(r.x+7,r.y+28,r.width-14,'#8b8268');
    if(state!.day>1){
      text(`第 ${state!.day} 日 · 当日公文`,r.x+8,r.y+36,11,C.ink);
      const labels=['当前 IP 地区','许可机关 / 编号 / 日期','护照与许可主体','账号 / 号码绑定','连接疑点与本人授权','商业用途与授权'];
      labels.slice(0,Math.min(state!.day,6)).forEach((label,i)=>text(label,r.x+8,r.y+57+i*15,10,C.ink));
      text('点击查看完整原文',r.x+8,r.y+158,10,'#635b49');return;
    }
    text('第 1 日 · 地区规定',r.x+8,r.y+35,11,C.ink);text('仅按当前 IP 地区',r.x+10,r.y+55,10,C.ink);
    text('支持',r.x+10,r.y+76,10,'#46573f');text('美国  英国  法国',r.x+10,r.y+92,10,C.ink);
    text('新加坡  日本',r.x+10,r.y+106,10,C.ink);
    text('不支持',r.x+10,r.y+127,10,'#844137');text('中国大陆  俄罗斯',r.x+10,r.y+143,10,C.ink);
    text('点击放大 / 拖动纸张',r.x+8,r.y+158,10,'#635b49');
  }
  function book(){
    if(!present||state!.caseRuntime[current!.id]?.bookReturned)return;const r={...state!.book};if(drag?.kind==='book'){r.x=drag.x;r.y=drag.y;}
    const cover=state!.bookPage==='cover';
    const passport=state!.day>=3;
    const covers={CN:'#783f37',RU:'#544947',US:'#354b5a',GB:'#673a43',FR:'#5e3942',SG:'#8a453c',JP:'#493d54'};
    if(cover){
      const x=r.x+110;rect(x+3,r.y+4,108,152,'#252722');rect(x,r.y,108,152,passport?covers[current!.nationality]:'#583e39');
      rect(x+3,r.y+3,2,146,'#94785c');rect(x+9,r.y+10,90,132,'#724b42');
      ctx.strokeStyle='#b6a278';ctx.lineWidth=1;ctx.strokeRect(x+13,r.y+14,82,123);
      text(passport?REGIONS[current!.nationality]:'A÷',x+20,r.y+34,passport?13:20,'#d2bf91');text(passport?'护  照':'IP 通行册',x+21,r.y+73,12,'#e0cea4');
      text(current!.id,x+19,r.y+101,10,'#bba781');text('点击翻开',x+29,r.y+122,10,'#e0cea4');return;
    }
    rect(r.x-3,r.y+1,226,155,'#583e39');rect(r.x,r.y,220,151,'#9d957b');
    rect(r.x+2,r.y+2,107,147,'#c6b894');rect(r.x+113,r.y+2,105,147,'#ded1b0');
    rect(r.x+109,r.y+1,4,149,'#8d8069');rect(r.x+113,r.y+1,2,149,'#efe0bd');
    for(let y=11;y<143;y+=11)rect(r.x+110,r.y+y,2,4,'#c7b896');
    if(passport){
      text(`${REGIONS[current!.nationality]}护照`,r.x+9,r.y+10,12,C.ink);
      text(current!.name,r.x+9,r.y+31,10,C.ink);text(current!.passportNumber,r.x+9,r.y+47,10,C.ink);
      text(`申请 ${current!.applicationId}`,r.x+9,r.y+63,9,C.ink);
      if(state!.day>=4){text(current!.account,r.x+9,r.y+81,10,C.ink);text(current!.phone,r.x+9,r.y+97,9,C.ink);}
      if(state!.day>=6){text(`用途 ${current!.purpose==='business'?current!.requestedScope:'个人学习'}`,r.x+9,r.y+115,9,C.ink);text(`委托 ${current!.principal}`,r.x+9,r.y+132,9,C.ink);}
      else text(current!.id,r.x+9,r.y+136,9,'#5b5949');
      text(current!.ip,r.x+121,r.y+14,10,C.ink);text(`IP ${REGIONS[current!.ipRegion]}`,r.x+121,r.y+31,10,C.ink);
      if(state!.day>=5){text(`所在地 ${REGIONS[current!.location]}`,r.x+121,r.y+48,10,C.ink);text(current!.connectionSession,r.x+121,r.y+65,9,C.ink);}
    }else{
    text('IP 通行册',r.x+11,r.y+13,12,C.ink);text(current!.id,r.x+12,r.y+35,10,'#5b5949');line(r.x+10,r.y+52,88,'#8f876c');
    text('当前 IP',r.x+12,r.y+63,10,'#615e4c');text(current!.ip,r.x+9,r.y+79,10,C.ink);
    text('当前 IP 地区',r.x+12,r.y+102,10,'#615e4c');text(REGIONS[current!.ipRegion],r.x+12,r.y+120,12,C.ink);
    text('访问签注',r.x+125,r.y+15,12,C.ink);text(`第 ${state!.day} 工作日`,r.x+125,r.y+38,10,'#6b6550');
    if(state!.day===2){text('申请编号',r.x+123,r.y+57,10,C.ink);text(current!.applicationId,r.x+121,r.y+71,9,C.ink);}
    }
    ctx.strokeStyle='#a59b7a';ctx.setLineDash([2,2]);ctx.strokeRect(r.x+124,r.y+88,82,49);ctx.setLineDash([]);
    const d=state!.decisions[current!.id];
    if(d){
      const color=d.decision==='allow'?'#406444':'#9d443a';
      ctx.save();ctx.translate(r.x+d.mark.x,r.y+d.mark.y);ctx.rotate(d.decision==='allow'?-.06:.04);ctx.strokeStyle=color;
      ctx.lineWidth=2;ctx.strokeRect(-34,-17,68,34);ctx.lineWidth=1;ctx.strokeRect(-31,-14,62,28);
      text(d.decision==='allow'?'批准':'拒 绝',d.decision==='allow'?-11:-23,-9,d.decision==='allow'?10:14,color);
      if(d.decision==='allow')text('approval',-20,7,7,color);
      else text(`A÷ / D${String(state!.day).padStart(2,'0')}`,-21,7,9,color);
      ctx.restore();
    }else text('有效章区',r.x+139,r.y+107,10,'#958b6d');
  }
  function evidence(id:string){
    if(!state||!current)return;const placement=state.papers[id],runtime=state.caseRuntime[current.id];
    const definition=[...current.initialPapers,...current.askedPapers].find(p=>p.id===id);
    if(!placement||!definition||runtime.returnedPapers.includes(id))return;
    const r={...placement};if(drag?.kind===id){r.x=drag.x;r.y=drag.y;}
    const colors={permit:'#c7d0b5',passport:C.paper,binding:'#b8c8ca',connection:'#d2cbb1',business:'#d8c0b1',receipt:'#ccc9b8',note:'#dcd1ad'};
    rect(r.x+2,r.y+3,r.width,r.height,'#302d26');rect(r.x,r.y,r.width,r.height,(colors as Record<string,string>)[definition.kind]??C.paper);
    ctx.strokeStyle='#77755e';ctx.lineWidth=.7;ctx.strokeRect(r.x+3,r.y+3,r.width-6,r.height-6);
    text(PAPER_NAMES[definition.kind],r.x+7,r.y+7,11,C.ink);line(r.x+6,r.y+23,r.width-12,'#87836d');
    const rows=deskPaperFields(definition,r.height),spacing=13;
    rows.forEach(([label,value],i)=>{
      const full=t(`${label} ${value}`);ctx.font=`10px ${CJK_FONT}`;
      let fitted=full;while(ctx.measureText(fitted).width>r.width-14&&fitted.length>1)fitted=fitted.slice(0,-1);
      text(fitted.length<full.length?fitted.slice(0,-1)+'…':fitted,r.x+7,r.y+29+i*spacing,10,C.ink);
    });
    text('自由拖动 / 页顶读原文',r.x+7,r.y+r.height-13,8,'#635b49');
  }
  function drawPapers(){if(state){
    if(['desk','returning'].includes(state.phase))ctx.clearRect(DIALOGUE_AREA.x,DIALOGUE_AREA.y,DIALOGUE_AREA.width,DIALOGUE_AREA.height);
    const order=state.paperOrder.filter(id=>id!==state.topPaper).concat(state.topPaper);
    for(const id of order){if(id==='book')book();else if(id==='rule')rule();else evidence(id);}
    if(state.story.oldRulesReceived){rect(248,301,137,18,'#b1aa8b');text('内邮 / 父亲的旧规原件',253,305,9,C.ink);}
  }}
  function tool(kind:Decision,x:number,y:number){
    const color=kind==='allow'?'#6e875b':'#ab5143';
    rect(x+4,y+24,52,7,'#2c2b23');rect(x+3,y+20,52,7,color);
    rect(x+23,y+7,10,14,'#292920');rect(x+15,y,26,9,'#242920');rect(x+17,y+1,22,5,color);
    text(kind==='allow'?'批准':'拒绝',x+17,y+20,kind==='allow'?8:10,'#eee0bc');
  }
  for(const kind of ['reject','allow'] as const){const r=TOOLS[kind];if(drag?.kind!==kind)tool(kind,r.x,r.y);}
  text('拖章柄至章区',371,333,9,'#c6b28e');
  rect(0,343,640,17,'#242924');line(0,343,640,'#656757');
  text('A÷ / Cloud Opus 5.5',12,348,8,'#b7b79c');rect(0,357,640,3,'#111914');
  drawPapers();
  if(drag&&(drag.kind==='allow'||drag.kind==='reject'))tool(drag.kind,drag.x-29,drag.y-24);
  ctx.restore();
}
