import {inspectionFields} from '../domain/inspection';
import type {InspectField,InspectKey,InspectionResult} from '../domain/inspection';
import type {RunState,Rect} from '../domain/run';
import {currentCase} from '../domain/run';
import {paperBounds,paperOrder,deskPaperFields} from './papers';
import {contains} from './hit-test';

export interface InspectionUi {active:boolean;selected:string[];result:InspectionResult|null;hover:string|null}
export const freshInspection=():InspectionUi=>({active:false,selected:[],result:null,hover:null});
export const FIELD_KEYS:Record<string,InspectKey>={
  '当前 IP 地区':'ipRegion','本案申请编号':'applicationId','申请编号':'applicationId','申请人':'subject','持有人':'subject',
  '本案证件号':'passportNumber','证件号':'passportNumber','账号':'account','绑定账号':'account','绑定号码':'phone',
  '实际所在地':'location','所在地':'location','当前连接会话':'session','连接会话':'session','本案委托主体':'principal',
  '委托主体':'principal','用途范围':'scope','有效工作日':'validity','本人授权':'authorized','签发机关':'issuer',
  '今日':'today','允许地区':'allowedRegions','合法签发机关':'allowedIssuers','要求本人授权':'requiredAuthorization',
};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function inspectionPanel(s:RunState|null,i:InspectionUi,reader=false):string {
  if(!s||!i.active||!['desk','returning'].includes(s.phase)||!currentCase(s)||s.returned.includes(currentCase(s)!.id))return '';
  const fields=inspectionFields(s),selected=i.selected.map(id=>fields.find(f=>f.id===id)).filter((f):f is InspectField=>!!f);
  const result=i.result;
  const selectedText=selected[0]?selected[0].label+' · '+selected[0].text:'';
  return `<div class="inspection-announcement" role="status" aria-live="polite">${escape(result?result.title+'：'+result.detail:selectedText||'点击字段进行连线核对')}</div>`;
}
export function fieldRect(s:RunState,f:InspectField):Rect|null {
  const r=paperBounds(s,f.paperId);if(!r)return null;
  const at=(x:number,y:number,width:number,height=13)=>({x:r.x+x,y:r.y+y,width,height});
  if(f.paperId==='book'){
    if(s.bookPage!=='inside')return null;
    if(s.day<=2){
      if(f.key==='ipRegion')return at(9,118,96,16);
      if(f.key==='applicationId')return at(120,69,96);
      return null;
    }
    const left:Partial<Record<InspectKey,number>>={subject:29,passportNumber:45,applicationId:61,account:79,phone:95,requestedScope:113,principal:130};
    if(left[f.key]!==undefined)return at(7,left[f.key]!,99);
    const right:Partial<Record<InspectKey,number>>={ipRegion:29,location:46,session:63};
    return right[f.key]!==undefined?at(119,right[f.key]!,97):null;
  }
  if(f.paperId==='rule'){
    if(f.key==='today')return at(6,34,124,16);
    if(f.key==='allowedRegions')return s.day===1?at(7,89,122,32):at(6,55,124,14);
    if(f.key==='allowedIssuers')return at(6,70,124,14);
    if(f.key==='requiredAuthorization')return at(6,115,124,14);
    return null;
  }
  const c=currentCase(s),p=c?[...c.initialPapers,...c.askedPapers].find(p=>p.id===f.paperId):null;if(!p)return null;
  const index=deskPaperFields(p,r.height).findIndex(([label])=>FIELD_KEYS[label]===f.key);
  return index<0?null:at(5,27+index*13,r.width-10,13);
}
export function fieldAt(s:RunState,p:{x:number;y:number}):InspectField|null {
  const fields=inspectionFields(s);
  for(const paperId of paperOrder(s).reverse()){
    const bounds=paperBounds(s,paperId);if(!bounds||!contains(p,bounds))continue;
    return fields.find(f=>f.paperId===paperId&&!!fieldRect(s,f)&&contains(p,fieldRect(s,f)!))??null;
  }
  return null;
}
function subtract(r:Rect,cover:Rect):Rect[]{
  const x=Math.max(r.x,cover.x),y=Math.max(r.y,cover.y),right=Math.min(r.x+r.width,cover.x+cover.width),bottom=Math.min(r.y+r.height,cover.y+cover.height);
  if(x>=right||y>=bottom)return [r];
  return [{x:r.x,y:r.y,width:r.width,height:y-r.y},{x:r.x,y:bottom,width:r.width,height:r.y+r.height-bottom},
    {x:r.x,y,width:x-r.x,height:bottom-y},{x:right,y,width:r.x+r.width-right,height:bottom-y}].filter(r=>r.width>0&&r.height>0);
}
export function drawInspection(ctx:CanvasRenderingContext2D,s:RunState|null,i:InspectionUi):void {
  if(!s||!i.active||!['desk','returning'].includes(s.phase))return;
  const fields=inspectionFields(s),order=paperOrder(s),selectedId=i.selected[0],peerId=i.result?.peerId;
  const selectedField=fields.find(f=>f.id===selectedId),peerField=fields.find(f=>f.id===peerId);
  const selectedRect=selectedField?fieldRect(s,selectedField):null,peerRect=peerField?fieldRect(s,peerField):null;
  ctx.save();ctx.setTransform(ctx.canvas.width/640,0,0,ctx.canvas.height/360,0,0);
  if(selectedRect&&peerRect&&peerId!==selectedId){
    const center=(r:Rect)=>({x:r.x+r.width/2,y:r.y+r.height/2});
    const edgeToward=(from:Rect,to:Rect)=>{
      const a=center(from),b=center(to),dx=b.x-a.x,dy=b.y-a.y;
      const scale=Math.min(Math.abs(dx)?from.width/2/Math.abs(dx):Infinity,Math.abs(dy)?from.height/2/Math.abs(dy):Infinity);
      return {x:a.x+dx*scale,y:a.y+dy*scale};
    };
    const start=edgeToward(selectedRect,peerRect),end=edgeToward(peerRect,selectedRect);
    const color=i.result?.status==='match'?'#547c70':i.result?.status==='mismatch'?'#9d443a':'#89784e';
    const elbow={x:end.x,y:start.y};
    ctx.save();ctx.globalAlpha=.86;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([3,2]);
    ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(elbow.x,elbow.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.setLineDash([]);
    for(const point of [start,end]){ctx.beginPath();ctx.arc(point.x,point.y,1.8,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  for(const id of i.hover?[i.hover]:[]){
    const f=fields.find(f=>f.id===id),r=f?fieldRect(s,f):null;if(!f||!r)continue;
    let pieces=[r];
    for(const above of order.slice(order.indexOf(f.paperId)+1)){const b=paperBounds(s,above);if(b)pieces=pieces.flatMap(part=>subtract(part,b));}
    ctx.save();ctx.beginPath();for(const part of pieces)ctx.rect(part.x,part.y,part.width,part.height);ctx.clip();
    ctx.strokeStyle='#78663c';ctx.lineWidth=.7;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(r.x,r.y+r.height-1);ctx.lineTo(r.x+r.width,r.y+r.height-1);ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
