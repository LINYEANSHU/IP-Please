import {readdirSync,readFileSync} from 'node:fs';

// A successful bundler exit alone does not prove copied runtime assets are intact.
const source=new URL('../public/',import.meta.url),output=new URL('../dist/',import.meta.url);
let checked=0;
const failures=[];
function visit(relative=''){
  for(const entry of readdirSync(new URL(relative,source),{withFileTypes:true})){
    const path=relative+entry.name;
    if(entry.isDirectory()){visit(path+'/');continue;}
    if(!entry.isFile())continue;
    checked++;
    try{
      if(!readFileSync(new URL(path,source)).equals(readFileSync(new URL(path,output))))failures.push(path+' (content differs)');
    }catch{failures.push(path+' (missing or unreadable)');}
  }
}
visit();
if(failures.length){
  console.error('Build asset verification failed:\n'+failures.join('\n'));
  process.exitCode=1;
}else console.log(`Build assets verified: ${checked} files match public/ byte for byte.`);
