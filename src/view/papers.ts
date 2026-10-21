import {REGIONS} from '../domain/day-one';
import type {EvidencePaper,WeekCase,PaperKind} from '../domain/week-contract';
import type {RunState,Rect} from '../domain/run';
import {currentCase} from '../domain/run';
export const PAPER_NAMES:Record<PaperKind,string>={permit:'访问许可证',passport:'护照',binding:'账号绑定凭条',connection:'连接核验条',business:'商业授权',receipt:'申请收件条',note:'说明便条',identity:'身份复核单',overseas:'海外使用证明',context:'完整上下文',delegation:'授权链',relation:'控制关系页',history:'历史使用说明',language:'语言配置单',browser:'浏览器证明',input:'输入法清单',exception:'专项特许证',search:'搜索来源单',phoneHistory:'历史绑定条',configuration:'旧配置记录',freeze:'封号执行联'};
export function paperOrder(s:RunState):string[]{return s.paperOrder.filter(id=>id!==s.topPaper).concat(s.topPaper);}
export function paperBounds(s:RunState,id:string):Rect|null {
  if(id==='rule')return s.rule;
  const c=currentCase(s),runtime=c?s.caseRuntime[c.id]:undefined;
  if(!runtime||s.returned.includes(c!.id))return null;
  if(id==='book')return runtime.bookReturned?null:s.bookPage==='cover'?{...s.book,x:s.book.x+110,width:110}:s.book;
  const r=s.papers[id];if(!r||runtime.returnedPapers.includes(id))return null;
  return r;
}
// Clip ordinary DOM controls to the visible gaps between papers. A real clip
// affects both paint and pointer hit testing, unlike a purely visual mask.
export function deskControlsClip(s:RunState,width:number,height:number,drag?:{kind:string;x:number;y:number}):string {
  const papers=paperOrder(s).flatMap(id=>{
    const bounds=paperBounds(s,id);if(!bounds)return [];
    const dx=drag?.kind===id?drag.x-(id==='book'?s.book.x:bounds.x):0;
    const dy=drag?.kind===id?drag.y-bounds.y:0;
    return [{left:Math.max(0,bounds.x+dx-3),right:Math.min(640,bounds.x+dx+bounds.width+3),top:Math.max(0,bounds.y+dy),bottom:Math.min(360,bounds.y+dy+bounds.height+4)}];
  });
  const edges=[...new Set([0,360,...papers.flatMap(p=>[p.top,p.bottom])])].sort((a,b)=>a-b);
  const sx=width/640,sy=height/360,paths:string[]=[];
  const gap=(left:number,right:number,top:number,bottom:number)=>{
    if(right<=left)return;
    paths.push(`M${left*sx} ${top*sy}H${right*sx}V${bottom*sy}H${left*sx}Z`);
  };
  for(let i=1;i<edges.length;i++){
    const top=edges[i-1],bottom=edges[i],middle=(top+bottom)/2;
    const intervals=papers.filter(p=>p.top<middle&&p.bottom>middle).sort((a,b)=>a.left-b.left);
    let cursor=0;
    for(const p of intervals){gap(cursor,p.left,top,bottom);cursor=Math.max(cursor,p.right);}
    gap(cursor,640,top,bottom);
  }
  return `path('${paths.join('')}')`;
}
export function paperFields(p:EvidencePaper):[string,string][] {
  const rows:[string,string][]=[['持有人',p.subject]];
  if(p.values)rows.push(...Object.entries(p.values));
  if(p.issuer)rows.push(['签发机关',p.issuer]);
  if(p.number)rows.push(['凭证编号',p.number]);
  if(p.applicationId)rows.push(['申请编号',p.applicationId]);
  if(p.passportNumber)rows.push(['证件号',p.passportNumber]);
  if(['permit','binding','connection','business'].includes(p.kind)||p.validFrom!==undefined||p.validTo!==undefined)rows.push(['有效工作日',`D${p.validFrom??'?'} — D${p.validTo??'?'}`]);
  if(p.account)rows.push(['绑定账号',p.account]);if(p.phone)rows.push(['绑定号码',p.phone]);
  if(p.location)rows.push(['所在地',REGIONS[p.location]]);if(p.session)rows.push(['连接会话',p.session]);
  if(p.authorized!==undefined)rows.push(['本人授权',p.authorized?'已授权':'无本人授权']);
  if(p.principal)rows.push(['委托主体',p.principal]);if(p.scope)rows.push(['用途范围',p.scope.join('、')]);
  if(p.note)rows.push(['说明',p.note]);return rows;
}
export function deskPaperFields(p:EvidencePaper,height:number):[string,string][] {
  const keys=p.kind==='binding'?['持有人','绑定账号','绑定号码','有效工作日']:
    p.kind==='permit'?['持有人','签发机关','申请编号','证件号','有效工作日']:
    p.kind==='connection'?['持有人','所在地','连接会话','本人授权','有效工作日']:
    p.kind==='business'?['持有人','委托主体','用途范围','有效工作日']:['持有人',...Object.keys(p.values??{}),'用途范围','有效工作日','说明'];
  return paperFields(p).filter(([label])=>keys.includes(label)).slice(0,Math.max(1,Math.floor((height-42)/13)));
}
export function caseFields(c:WeekCase,day:number):[string,string][] {
  const rows:[string,string][]=[['当前 IP',c.ip],['当前 IP 地区',REGIONS[c.ipRegion]]];
  if(day>=2)rows.push(['本案申请编号',c.applicationId]);
  if(day>=3)rows.push(['申请人',c.name],['护照国籍',REGIONS[c.nationality]],['本案证件号',c.passportNumber]);
  if(day>=4)rows.push(['账号',c.account],['绑定号码',c.phone]);
  if(day>=5)rows.push(['实际所在地',REGIONS[c.location]],['当前连接会话',c.connectionSession]);
  if(day>=6)rows.push(['本次用途',c.purpose==='business'?'商业委托':'个人技术学习'],['用途范围',c.requestedScope],['本案委托主体',c.principal]);
  return rows;
}
