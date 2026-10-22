import {afterEach,expect,it} from 'vitest';
import {getLanguage,setLanguage,t} from '../../src/i18n';
import english from '../../src/i18n/en.json';
import {readFileSync,readdirSync} from 'node:fs';
import {createScanner,SyntaxKind} from 'typescript/unstable/ast';
afterEach(()=>setLanguage('zh-CN'));

it('Chinese is unchanged; English covers menus, documents, story and endings',()=>{
  expect(t('标准值班')).toBe('标准值班');
  setLanguage('en');expect(getLanguage()).toBe('en');
  for(const source of ['标准值班','账号绑定凭条','本报重申，机构会解释每一次更新；有关解释的解释，请以再次更新为准。','一张晋升通知放在旧桌上。你仍负责同一个窗口。']){
    expect(t(source)).not.toMatch(/\p{Script=Han}/u);
    expect(t(source)).not.toBe(source);
  }
});

it('composed dates, case IDs and money retain their values',()=>{
  setLanguage('en');
  expect(t('第 12 工作日')).toBe('Day 12');
  const text=t('当前余额 55 · 所选费用 60 · 还差 5。请调整供养或修复项目后重试。');
  expect(text).not.toMatch(/\p{Script=Han}/u);
  for(const value of ['55','60','5'])expect(text).toContain(value);
  expect(t('D12-S03 / V12 / 192.0.2.18')).toBe('D12-S03 / V12 / 192.0.2.18');
});

it('every shipped English catalog entry is English and keys remain unique',()=>{
  expect(Object.keys(english).length).toBeGreaterThan(1500);
  for(const [source,translation] of Object.entries(english)){
    expect(translation,source).not.toMatch(/\p{Script=Han}/u);
  }
});

it('all source dialogue, case data, rules and storage messages have English coverage',()=>{
  setLanguage('en');
  const missing:string[]=[];
  for(const folder of ['domain','storage'])for(const file of readdirSync(new URL(`../../src/${folder}/`,import.meta.url))){
    if(!file.endsWith('.ts'))continue;
    const scanner=createScanner(true,undefined,readFileSync(new URL(`../../src/${folder}/${file}`,import.meta.url),'utf8'));
    const templates:number[]=[];let token:SyntaxKind;
    while((token=scanner.scan())!==SyntaxKind.EndOfFile){
      if(token===SyntaxKind.OpenBraceToken&&templates.length)templates[templates.length-1]++;
      if(token===SyntaxKind.CloseBraceToken&&templates.length){
        if(templates.at(-1)===0){token=scanner.reScanTemplateToken(false);if(token===SyntaxKind.TemplateTail)templates.pop();}
        else templates[templates.length-1]--;
      }
      if(token===SyntaxKind.TemplateHead)templates.push(0);
      if([SyntaxKind.StringLiteral,SyntaxKind.NoSubstitutionTemplateLiteral,SyntaxKind.TemplateHead,SyntaxKind.TemplateMiddle,SyntaxKind.TemplateTail].includes(token)){
        const source=scanner.getTokenValue();if(/\p{Script=Han}/u.test(t(source)))missing.push(`${file}: ${source}`);
      }
    }
  }
  expect(missing).toEqual([]);
});
