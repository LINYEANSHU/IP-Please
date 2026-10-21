import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {readState,call,stamp} from './helpers';
async function hiDpiCanvas(page:Page){
  const info=await page.evaluate(()=>{
    const c=document.querySelector('canvas')!;const b=c.getBoundingClientRect();
    return {width:c.width,height:c.height,cssWidth:b.width,cssHeight:b.height,dpr:Math.min(3,Math.max(1,devicePixelRatio||1)),image:getComputedStyle(c).imageRendering};
  });
  expect(info.image).not.toBe('pixelated');
  expect(Math.abs(info.width-info.cssWidth*info.dpr)).toBeLessThanOrEqual(1);
  expect(Math.abs(info.height-info.cssHeight*info.dpr)).toBeLessThanOrEqual(1);
  expect(info.width).toBeGreaterThan(640);
  return info;
}
for(const size of [{width:1280,height:720},{width:1920,height:1080}]){
  test(`视觉与高分辨率素材 ${size.width}x${size.height}`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize(size);await page.goto('/');
    await expect(page.getByRole('button',{name:'轻松值班',exact:true})).toBeVisible();
    const titleCanvas=await hiDpiCanvas(page);
    expect(titleCanvas.width).toBeGreaterThan(1000);
    expect(await page.evaluate(()=>getComputedStyle(document.body).fontFamily.toLowerCase())).toContain('fusion');
    expect(await page.evaluate(()=>document.fonts.check('12px Fusion'))).toBe(true);
    await page.screenshot({path:`docs/validation/proofs/clarity-title-${size.width}.png`});
    await page.getByRole('button',{name:'轻松值班',exact:true}).click();
    await expect(page.getByRole('heading',{name:'新访问窗口今日开放'})).toBeVisible();
    const print=await page.locator('.newspaper-print').evaluate((img:HTMLImageElement)=>({w:img.naturalWidth,h:img.naturalHeight}));
    expect(print.w).toBeGreaterThanOrEqual(1000);
    expect(print.h).toBeGreaterThan(150);
    expect(Math.abs(print.w/print.h-6.4)).toBeLessThan(.05);
    const corridorTop=await page.locator('.newspaper-print').evaluate(async (img:HTMLImageElement)=>{
      if(!img.complete)await img.decode();
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      const x=c.getContext('2d')!;x.drawImage(img,0,0);
      return Array.from(x.getImageData(0,0,1,1).data);
    });
    expect(corridorTop[0]).toBeGreaterThan(100);
    expect(corridorTop[1]).toBeGreaterThan(100);
    await page.screenshot({path:`docs/validation/proofs/clarity-newspaper-${size.width}.png`});
    await page.getByRole('button',{name:'去上班'}).click();await page.getByRole('button',{name:'开始值班'}).click();await call(page,0);
    await hiDpiCanvas(page);
    await page.screenshot({path:`docs/validation/proofs/clarity-desk-${size.width}.png`});
    await stamp(page,true);await page.screenshot({path:`docs/validation/proofs/clarity-stamped-${size.width}.png`});
    expect((await readState(page)).balance).toBe(55);
    const textWidths=await page.evaluate(()=>{
      const c=document.createElement('canvas').getContext('2d')!;
      c.font='10px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Noto Sans SC",sans-serif';
      return {ip:c.measureText('198.51.100.53').width,regionLabel:c.measureText('当前 IP 地区').width,rule:c.measureText('中国大陆  俄罗斯').width};
    });
    expect(textWidths.ip).toBeLessThan(95);
    expect(textWidths.regionLabel).toBeLessThan(95);
    expect(textWidths.rule).toBeLessThan(118);
    const bounds=await page.locator('canvas').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThan(size.height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
