import type {Rect} from '../domain/run';
export type FamilyPortraitStage='healthy'|'strained'|'damaged'|'severe'|'critical'|'destroyed';
export interface AssetCatalog {
  portraits:Record<string,{image:CanvasImageSource;rect:Rect;url:string}>;
  familyStates?:Record<string,Record<FamilyPortraitStage,string>>;
}

function familyStateImage(source:CanvasImageSource,width:number,height:number,stage:Exclude<FamilyPortraitStage,'healthy'>):string{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,width,height);
  const screen={x:Math.round(width*.12),y:Math.round(height*.13),w:Math.round(width*.76),h:Math.round(height*.66)};
  const block=(x:number,y:number,w:number,h:number,alpha=1,color='#101712')=>{
    ctx.globalAlpha=alpha;ctx.fillStyle=color;
    ctx.fillRect(screen.x+Math.round(screen.w*x),screen.y+Math.round(screen.h*y),Math.max(1,Math.round(screen.w*w)),Math.max(1,Math.round(screen.h*h)));
  };
  const band=(y:number,parts:[number,number][],alpha=.9,height=.026)=>parts.forEach(([x,w])=>block(x,y,w,height,alpha));
  ctx.save();ctx.beginPath();ctx.rect(screen.x,screen.y,screen.w,screen.h);ctx.clip();

  if(stage==='destroyed'){
    block(0,0,1,1,.98,'#0b110e');block(.54,.51,.018,.025,.5,'#879076');
  }else if(stage==='strained'){
    block(0,0,1,1,.1);band(.49,[[.1,.79]],.62,.02);
  }else if(stage==='damaged'){
    block(0,0,1,1,.14);band(.49,[[.12,.27],[.62,.25]],.82,.022);
    block(.18,.25,.1,.07);block(.66,.39,.085,.06);block(.43,.68,.12,.055);
  }else if(stage==='severe'){
    block(0,0,1,1,.22);band(.31,[[.08,.34],[.58,.27]],.9,.035);band(.68,[[.3,.56]],.85,.025);
    block(.19,.22,.12,.07);block(.65,.43,.1,.06);block(.36,.76,.09,.04);
  }else{
    block(0,0,1,1,.43);band(.25,[[.06,.25],[.43,.48]],.96,.055);band(.51,[[.16,.35],[.65,.25]],.96,.05);band(.72,[[.28,.49]],.92,.045);
    block(.2,.37,.14,.07);block(.68,.61,.09,.055);
  }

  ctx.restore();ctx.globalAlpha=1;return canvas.toDataURL('image/png');
}

export async function loadAssets():Promise<AssetCatalog>{
  const root=`${import.meta.env.BASE_URL}assets/`,response=await fetch(`${root}manifest.json`);
  if(!response.ok)throw Error(`素材目录读取失败 (${response.status})`);
  const manifest=await response.json() as {sheets:Record<string,{file:string}>;portraits:Record<string,{sheet:string;rect:Rect;native:[number,number]}>};
  const sheets:Record<string,HTMLImageElement>={};
  await Promise.all(Object.entries(manifest.sheets).map(async([id,s])=>{
    const img=new Image();img.src=root+s.file;await img.decode();sheets[id]=img;
  }));
  const portraits:AssetCatalog['portraits']={};
  for(const [id,p] of Object.entries(manifest.portraits)){
    // Keep the approved source rectangle at its native resolution. Shrinking a
    // 279x332 portrait to an 84x100 cache before the high-DPI stage existed was
    // the root cause of the soft faces; scaling is now done once, at draw time.
    const canvas=document.createElement('canvas');
    canvas.width=p.rect.width;canvas.height=p.rect.height;
    const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sheets[p.sheet],p.rect.x,p.rect.y,p.rect.width,p.rect.height,0,0,p.rect.width,p.rect.height);
    portraits[id]={image:canvas,rect:{x:0,y:0,width:p.rect.width,height:p.rect.height},url:canvas.toDataURL()};
  }
  const familyStates:AssetCatalog['familyStates']={};
  for(const id of ['player','father','mother','wife','son']){
    const portrait=portraits[id];if(!portrait)continue;
    familyStates[id]={
      healthy:portrait.url,
      strained:familyStateImage(portrait.image,portrait.rect.width,portrait.rect.height,'strained'),
      damaged:familyStateImage(portrait.image,portrait.rect.width,portrait.rect.height,'damaged'),
      severe:familyStateImage(portrait.image,portrait.rect.width,portrait.rect.height,'severe'),
      critical:familyStateImage(portrait.image,portrait.rect.width,portrait.rect.height,'critical'),
      destroyed:familyStateImage(portrait.image,portrait.rect.width,portrait.rect.height,'destroyed'),
    };
  }
  await document.fonts.load('12px Fusion');return {portraits,familyStates};
}
