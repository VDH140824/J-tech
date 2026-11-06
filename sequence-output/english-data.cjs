const fs=require('fs');
const originals=require('./translation-source.json');
const translations=new Map();
const ids=new Set();
for(const line of fs.readFileSync(__dirname+'/english-labels.txt','utf8').split(/\r?\n/)){
 if(!line.trim())continue;
 const separator=line.indexOf('|');
 const id=Number(line.slice(0,separator));
 if(separator<0||!Number.isInteger(id)||id<0||id>=originals.length||ids.has(id))throw Error('Invalid translation index: '+line);
 ids.add(id);translations.set(originals[id],line.slice(separator+1).replace(/\\n/g,'\n'));
}
if(ids.size!==originals.length)throw Error(`Missing translations: ${originals.length-ids.size}`);
const translate=value=>{
 if(typeof value==='string')return translations.get(value)??value;
 if(Array.isArray(value))return value.map(translate);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translate(v)]));
 return value;
};
const pages=translate(require('./detailed-data.cjs'));
function validate(value,location='pages'){
 if(typeof value==='string'&&/[\u00c0-\u024f\u1e00-\u1eff]/.test(value.replace(/×/g,'')))throw Error('Untranslated label at '+location+': '+value);
 if(Array.isArray(value))value.forEach((v,i)=>validate(v,`${location}[${i}]`));
 else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>validate(v,`${location}.${k}`));
}
validate(pages);
module.exports=pages;
