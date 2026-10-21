import type {Rect} from '../domain/run';
export const contains=(p:{x:number;y:number},r:Rect)=>p.x>=r.x&&p.y>=r.y&&p.x<=r.x+r.width&&p.y<=r.y+r.height;
export function toWorldPoint(clientX:number,clientY:number,b:DOMRect):{x:number;y:number}|null {
  const scale=Math.min(b.width/640,b.height/360);if(scale<=0)return null;
  const x=(clientX-b.left-(b.width-640*scale)/2)/scale,y=(clientY-b.top-(b.height-360*scale)/2)/scale;
  return x>=0&&x<=640&&y>=0&&y<=360?{x,y}:null;
}
export const stampArea=(r:Rect):Rect=>({x:r.x+124,y:r.y+88,width:82,height:49});
export const hitStampArea=(p:{x:number;y:number},booklet:Rect,page:'cover'|'inside')=>page==='inside'&&contains(p,stampArea(booklet));
