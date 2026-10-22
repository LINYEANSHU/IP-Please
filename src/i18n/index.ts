import english from './en.json';
export type Language='zh-CN'|'en';
const LANGUAGE_KEY='ip-please:language';
let language:Language='zh-CN';
try{if(localStorage.getItem(LANGUAGE_KEY)==='en')language='en';}catch{/* Language preferences never block progress. */}
const catalog:Record<string,string>=english;
const cache=new Map<string,string>();
const escapeRegExp=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const keys=Object.keys(catalog).filter(k=>!/[<>="\n]/.test(k)).sort((a,b)=>b.length-a.length);
const phrases=new RegExp(keys.map(escapeRegExp).join('|'),'gu');
export function getLanguage():Language{return language;}
export function setLanguage(next:Language):void{
  language=next;
  try{localStorage.setItem(LANGUAGE_KEY,next);}catch{/* Keep the choice in memory when preference storage is unavailable. */}
}
/** Translate at the display boundary. Saved facts and rule comparisons stay untouched. */
export function t(source:string):string{
  if(language==='zh-CN'||!/[\p{Script=Han}]/u.test(source))return source;
  const cached=cache.get(source);if(cached!==undefined)return cached;
  const trimmed=source.trim(),exact=catalog[trimmed];
  let result:string;
  if(exact!==undefined)result=source.slice(0,source.indexOf(trimmed))+exact+source.slice(source.indexOf(trimmed)+trimmed.length);
  else result=source
    .replace(/工作日\s*总第\s*(\d+)\s*号/g,' · Issue $1')
    .replace(/第\s*(\d+)\s*(?:工作日|日)/g,'Day $1')
    .replace(/第\s*(\d+)\s*波/g,'Wave $1')
    .replace(phrases,match=>'\u0001'+catalog[match]+'\u0001')
    .replace(/\u0001\u0001/g,' ').replace(/\u0001/g,'');
  result=result.replace(/、/g,', ').replace(/。/g,'.').replace(/，/g,', ').replace(/；/g,'; ').replace(/：/g,': ').replace(/“|”/g,'"').replace(/（/g,'(').replace(/）/g,')');
  cache.set(source,result);return result;
}

const originalText=new WeakMap<Node,{source:string;rendered:string}>();
const originalAttributes=new WeakMap<Element,Map<string,{source:string;rendered:string}>>();
/** Keep original text for language switching without replacing focused controls. */
export function localizeTree(root:HTMLElement):void{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node:Node|null;
  while((node=walker.nextNode())){
    if(node.parentElement?.closest('script,style,[data-no-translate]'))continue;
    const value=node.nodeValue??'',previous=originalText.get(node);
    const source=previous&&value===previous.rendered?previous.source:value,rendered=t(source);
    if(value!==rendered)node.nodeValue=rendered;
    originalText.set(node,{source,rendered});
  }
  for(const el of [root,...root.querySelectorAll('[aria-label],[title],[alt]')]){
    const attributes=originalAttributes.get(el)??new Map();
    for(const name of ['aria-label','title','alt']){
      const value=el.getAttribute(name);if(value===null)continue;
      const previous=attributes.get(name),source=previous&&value===previous.rendered?previous.source:value,rendered=t(source);
      if(value!==rendered)el.setAttribute(name,rendered);
      attributes.set(name,{source,rendered});
    }
    originalAttributes.set(el,attributes);
  }
}
