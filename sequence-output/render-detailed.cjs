const fs=require('fs'), path=require('path');
const pages=require('./function-design.cjs');
const out=path.join(__dirname,'function-design');fs.mkdirSync(out,{recursive:true});
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function wrap(text,width,size=15){const max=Math.max(12,Math.floor(width/(size*.57)));let lines=[];for(const para of text.split('\n')){let line='';const tokens=para.split(/\s+/).flatMap(word=>word.length>max?(word.match(/[^(),]+[(),]?|[(),]/g)||[word]):[word]);for(const word of tokens){if(line.length&&line.length+word.length+1>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);}return lines;}
let summary=[];
function render(p){let id=2,y=335,num=0;const xs=p.actors.map((_,i)=>135+i*410),W=xs.at(-1)+250;const objs=[],stack=[];let interactions=[];
const box=(layer,text,style,x,yy,w,h,extra={})=>{let o={kind:'box',id:id++,layer,text,style,x,y:yy,w,h,...extra};objs.push(o);return o;};
const line=(layer,x1,y1,x2,y2,opt={})=>objs.push({kind:'line',id:id++,layer,x1,y1,x2,y2,...opt});
const text=(str,x,yy,w,size=15,align='left',layer=4)=>{const lines=wrap(str,w-12,size),h=lines.length*(size+5)+8;return box(layer,lines.join('\n'),`text;html=0;whiteSpace=wrap;align=${align};verticalAlign=middle;fontFamily=Arial;fontSize=${size};spacing=6;fillColor=#ffffff;strokeColor=none;`,x,yy,w,h,{lines,size,align});};
text(`SD-${p.id}  ${p.title}`,30,10,W-60,25);text(`Source: ${p.source}`,30,58,W-60,15);
const disclaimer='Proposed function-level design derived from the SRS. Class, method, DTO and parameter names may change during implementation. Business behavior, data and branch conditions follow the cited UC / BR / NS requirements. UI messages are translated; SRS message IDs are retained.';
let top=text(disclaimer,30,98,W-60,14);let notes=text(p.notes||'',30,top.y+top.h+5,W-60,14);let header=Math.max(220,notes.y+notes.h+20);y=header+135;
p.actors.forEach((a,i)=>{if(i===0){box(2,a,'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;fontFamily=Arial;fontSize=15;',xs[i]-20,header,40,58,{actor:true,lines:[a],size:15});}else {let lines=wrap(a,300,15);box(2,a,'rounded=0;whiteSpace=wrap;html=0;fillColor=#ffffff;strokeColor=#000000;fontFamily=Arial;fontSize=15;',xs[i]-160,header,320,85,{lines,size:15,align:'center'});}});
const first={},last={},entityCalls=new Map();
const isControl=i=>i>0&&/«boundary»|«module»|«control»|«controller»|«service»/.test(p.actors[i]);
for(const r of p.rows){
 if(r.type==='begin'){const top=y;let b=box(1,'','fillColor=none;strokeColor=#000000;',25+stack.length*14,y,W-50-stack.length*28,100);const tab=box(4,r.kind,'shape=umlFrame;fillColor=#ffffff;strokeColor=#000000;align=left;verticalAlign=top;fontFamily=Arial;fontSize=15;spacingLeft=6;',b.x,y,90,30,{tab:true,lines:[r.kind],size:15});const g=text(r.guard,b.x+102,y+2,b.w-120,15);stack.push({b});y+=Math.max(55,g.h+15);continue;}
 if(r.type==='else'){if(!stack.length)throw Error('else without frame '+p.id);const f=stack.at(-1);line(3,f.b.x,y,f.b.x+f.b.w,y,{dashed:true});const t=text(r.guard,f.b.x+100,y+5,f.b.w-120,15);y+=t.h+28;continue;}
 if(r.type==='end'){if(!stack.length)throw Error('unmatched end '+p.id);const f=stack.pop();f.b.h=y-f.b.y+15;y+=45;continue;}
 if(r.type==='note'||r.type==='ref'){let h=wrap(r.t,W-210,15).length*20+30;if(r.type==='ref'){box(3,'','fillColor=#ffffff;strokeColor=#000000;',50,y,W-100,h);box(4,'ref','shape=umlFrame;fillColor=#ffffff;strokeColor=#000000;align=left;verticalAlign=top;spacingLeft=6;fontSize=15;',50,y,75,28,{lines:['ref'],size:15});text(r.t,140,y+4,W-210,15);}else box(3,r.t,'text;fillColor=#ffffff;strokeColor=none;whiteSpace=wrap;align=left;spacing=10;fontSize=15;',50,y,W-100,h,{lines:wrap(r.t,W-180,15),size:15,align:'left'});y+=h+30;continue;}
 const {a,b,t}=r;if(a>=xs.length||b>=xs.length)throw Error('unknown participant '+p.id);const ret=r.type==='reply';num++;
 const self=a===b,tw=self?275:Math.abs(xs[b]-xs[a])-32,tx=self?xs[a]+116:Math.min(xs[a],xs[b])+16;
 const label=text(`${num}: ${t}`,tx,y,tw,15,self?'left':'center',5);let yy=y+label.h+12;
 if(self){const start=yy-26;objs.push({kind:'self',id:id++,layer:5,x:xs[a]+7,y:start,w:88,h:30,ret:false});box(4,'','fillColor=#ffffff;strokeColor=#000000;',xs[a]+6,start-5,12,45);}
 else {line(5,xs[a]+(b>a?7:-7),yy,xs[b]+(b>a?-7:7),yy,{arrow:ret?'open':'block',dashed:ret});}
 for(const i of [a,b]){if(i>0){first[i]??=yy-8;last[i]=yy+16;}}
 if(!self&&b>0&&!isControl(b)&&!ret){const k=`${b}:${a}`;if(!entityCalls.has(k))entityCalls.set(k,[]);entityCalls.get(k).push(yy);}
 if(!self&&a>0&&!isControl(a)&&ret){const k=`${a}:${b}`,arr=entityCalls.get(k);const start=arr?.pop();if(start!==undefined)box(4,'','fillColor=#ffffff;strokeColor=#000000;',xs[a]-6,start,12,Math.max(30,yy-start));}
 interactions.push({a,b,t,ret,y:yy});y=yy+65;
}
if(stack.length)throw Error('Unclosed frame '+p.id);
const H=y+75;
for(let i=0;i<xs.length;i++){line(0,xs[i],header+95,xs[i],y+20,{dashed:true,color:'#999999'});if(isControl(i)&&first[i]!==undefined)box(3,'','fillColor=#ffffff;strokeColor=#000000;',xs[i]-6,first[i],12,Math.max(35,last[i]-first[i]));}
objs.sort((a,b)=>a.layer-b.layer||a.id-b.id);
let xml=[],svg=[];
for(const o of objs){if(o.kind==='box'){
xml.push(`<mxCell id="${o.id}" value="${e(o.text)}" style="${o.style}" vertex="1" parent="1"><mxGeometry x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" as="geometry"/></mxCell>`);
if(o.actor){let cx=o.x+20;svg.push(`<circle cx="${cx}" cy="${o.y+9}" r="9" fill="white" stroke="black"/><path d="M${cx},${o.y+18}v23 m-19,-15h38 m-19,15l-18,18 m18,-18l18,18" fill="none" stroke="black"/>`);svg.push(`<text x="${cx}" y="${o.y+84}" text-anchor="middle" font-size="15">${e(o.text)}</text>`);}
else {const fill=o.style.includes('fillColor=none')?'none':'white',stroke=o.style.includes('strokeColor=#000000')?'black':'none';svg.push(`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${fill}" stroke="${stroke}"/>`);if(o.text){let size=o.size||15,lines=o.lines||wrap(o.text,o.w-20,size);const x=o.align==='center'?o.x+o.w/2:o.x+8;let ty=o.y+(o.h-lines.length*(size+5))/2+size;svg.push(`<text x="${x}" y="${ty}" text-anchor="${o.align==='center'?'middle':'start'}" font-size="${size}">${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size+5:0}">${e(s)}</tspan>`).join('')}</text>`);}}
}else {const self=o.kind==='self';const pts=self?`<mxPoint x="${o.x}" y="${o.y}" as="sourcePoint"/><mxPoint x="${o.x+6}" y="${o.y+o.h}" as="targetPoint"/><Array as="points"><mxPoint x="${o.x+o.w}" y="${o.y}"/><mxPoint x="${o.x+o.w}" y="${o.y+o.h}"/></Array>`:`<mxPoint x="${o.x1}" y="${o.y1}" as="sourcePoint"/><mxPoint x="${o.x2}" y="${o.y2}" as="targetPoint"/>`;
const arrow=self?'block':o.arrow||'none';xml.push(`<mxCell id="${o.id}" style="endArrow=${arrow};endFill=${arrow==='open'?0:1};${o.dashed?'dashed=1;':''}strokeColor=${o.color||'#000000'};" edge="1" parent="1"><mxGeometry relative="1" as="geometry">${pts}</mxGeometry></mxCell>`);
const d=self?`M${o.x},${o.y}h${o.w}v${o.h}H${o.x+6}`:`M${o.x1},${o.y1}L${o.x2},${o.y2}`;svg.push(`<path d="${d}" fill="none" stroke="${o.color||'black'}" ${o.dashed?'stroke-dasharray="7 6"':''} ${arrow!=='none'?`marker-end="url(#${arrow})"`:''}/>`);
}}
fs.writeFileSync(path.join(out,`SD-${p.id}.svg`),`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="block" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0L9 4L0 8Z" fill="black"/></marker><marker id="open" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0L9 4L0 8" fill="none" stroke="black"/></marker></defs><rect width="100%" height="100%" fill="white"/><g font-family="Arial, sans-serif">${svg.join('')}</g></svg>`);
summary.push({id:p.id,messages:num,participants:p.actors.length,width:W,height:H,source:p.source});
return `<diagram id="SD-${p.id}" name="${e('SD-'+p.id+' '+p.title)}"><mxGraphModel grid="0" page="1" pageScale="1" pageWidth="${W}" pageHeight="${H}" background="#ffffff"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${xml.join('')}</root></mxGraphModel></diagram>`;
}
const xml=`<mxfile host="draw.io" version="24.7.17">${pages.map(render).join('')}</mxfile>`;
const name='J-Tech_Tu_SD_11_12_13_14_16_17_ChiTiet.drawio';fs.writeFileSync(path.join(out,name),xml);fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
