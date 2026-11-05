const E=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
module.exports=pages=>(name,actors,rows)=>{
 let next=2,y=170,num=0;const layers=[[],[],[],[]],xs=actors.map((_,i)=>90+i*270),W=xs.at(-1)+145;
 const box=(layer,text,style,x,yy,w,h)=>{layers[layer].push(`<mxCell id="${next++}" value="${E(text)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${yy}" width="${w}" height="${h}" as="geometry"/></mxCell>`);};
 const edge=(layer,text,style,a,b,yy,offA=0,offB=0)=>{
  const x1=xs[a]+offA,x2=xs[b]+offB;
  const points=a===b?`<mxPoint x="${x1+6}" y="${yy}" as="sourcePoint"/><mxPoint x="${x2+6}" y="${yy+28}" as="targetPoint"/><Array as="points"><mxPoint x="${x1+100}" y="${yy}"/><mxPoint x="${x1+100}" y="${yy+28}"/></Array>`:`<mxPoint x="${x1+(b>a?6:-6)}" y="${yy}" as="sourcePoint"/><mxPoint x="${x2+(b>a?-6:6)}" y="${yy}" as="targetPoint"/>`;
  // Fixed label width wraps method names rather than crossing adjacent lifelines.
  const labelW=a===b?245:Math.max(170,Math.abs(x2-x1)-22);
  layers[layer].push(`<mxCell id="${next++}" value="${E(text)}" style="${style};html=0;whiteSpace=wrap;labelWidth=${labelW};fontFamily=Arial;fontSize=12;labelBackgroundColor=#ffffff;verticalAlign=bottom;spacingBottom=5;" edge="1" parent="1"><mxGeometry relative="1" as="geometry">${points}</mxGeometry></mxCell>`);
 };
 const active=[];
 const bar=(a,top,bottom,depth=0)=>{if(a>0)box(2,'','fillColor=#ffffff;strokeColor=#000000;strokeWidth=1;',xs[a]-6+depth*6,top,12,Math.max(26,bottom-top));};
 const closeAll=yy=>{while(active.length){const p=active.pop();bar(p.a,p.y,yy,p.depth);}};
 const send=(a,b,t,ret=false,branch=false)=>{
  if(!branch&&a===0)closeAll(y-25);
  let depA=0,depB=0;
  const currentA=active.filter(p=>p.a===a), currentB=active.filter(p=>p.a===b);
  if(!branch&&a>0&&!currentA.length)active.push({a,y:y-10,caller:null,depth:0});
  depA=currentA.at(-1)?.depth||0;
  if(branch){bar(a,y-8,y+30);bar(b,y,y+36,a===b?1:0);depB=a===b?1:0;}
  else if(a===b){depB=depA+1;bar(b,y,y+30,depB);}
  else if(ret){const k=active.findLastIndex(p=>p.a===a&&p.caller===b);if(k>=0){const p=active.splice(k,1)[0];bar(p.a,p.y,y,p.depth);depA=p.depth;}depB=currentB.at(-1)?.depth||0;}
  else {depB=currentB.length?(currentB.at(-1).depth+1):0;active.push({a:b,y,caller:a,depth:depB});}
  edge(3,`${++num}: ${t}`,`endArrow=${ret?'open':'block'};endFill=${ret?0:1};${ret?'dashed=1;':''}strokeColor=#000000;`,a,b,y,depA*6,depB*6);
  y+=82;
 };
 const frame=(kind,guard,top,height)=>{
  box(1,'', 'fillColor=none;strokeColor=#000000;',18,top,W-10,height);
  box(3,kind,'shape=umlFrame;fillColor=#ffffff;strokeColor=#000000;align=left;verticalAlign=top;spacingLeft=5;fontSize=12;',18,top,72,24);
  box(3,guard,'text;fillColor=none;strokeColor=none;align=left;fontSize=12;whiteSpace=wrap;',100,top+2,W-110,30);
 };
 box(0,name,'text;align=left;fontFamily=Arial;fontSize=21;fontStyle=1;',20,8,W,35);
 box(0,'Scope: vocabulary lessons (lesson.skillType = VOCABULARY); authenticated Moderator.','text;align=left;fontFamily=Arial;fontSize=12;',20,48,W,26);
 rows.forEach(r=>{
  if(Array.isArray(r)){send(...r);return;}
  if(r.startsWith('break ')){
   const split=r.indexOf(']:');const guard=r.slice(6,split+1),detail=r.slice(split+2).trim();
   const top=y-22;frame('break',guard,top,265);
   box(3,detail,'text;whiteSpace=wrap;align=left;fontSize=12;fillColor=#ffffff;',100,y+15,W-120,42);y+=85;
   const ctrl=actors.findIndex(a=>a.includes('«controller»')),api=actors.findIndex(a=>a.includes('«module»'));
   const recv=actors.findIndex(a=>a.includes('LessonFormModal'))>=0?actors.findIndex(a=>a.includes('LessonFormModal')):actors.findIndex(a=>a.includes('ModeratorVocabularyLessonPage'))>=0?actors.findIndex(a=>a.includes('ModeratorVocabularyLessonPage')):actors.findIndex(a=>a.includes('ModeratorLessonListTab'));
   const frontend=/frontend|invalid input|invalid lessonId|chapter\/skill/.test(r);
   if(frontend){send(recv,recv,'setErrorMsg / setError; stop current attempt',false,true);send(recv,1,'Keep form open / show validation error',true,true);}
   else {send(ctrl,api,/409/.test(r)?'409 Conflict + message':'404 Not Found',true,true);send(api,recv,'Reject promise; catch displays error; finally clears busy/loading',true,true);}
   y=Math.max(y,top+285);return;
  }
  if(r.startsWith('ref:')){frame('ref',r.slice(4).trim(),y-18,55);y+=72;return;}
  if(r.startsWith('opt ')){frame('opt',r.slice(4),y-18,64);y+=82;return;}
  box(3,r,'text;whiteSpace=wrap;align=left;fontSize=12;fillColor=#ffffff;strokeColor=#aaaaaa;spacing=8;',22,y-14,W-18,54);y+=82;
 });
 closeAll(y-22);
 actors.forEach((a,i)=>{
  const title=a.replace('Browser / React runtime','Browser').replace('«controller»\n',' :').replace('«repository»\n',':');
  box(0,title,i===0?'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;fontFamily=Arial;fontSize=12;':'rounded=0;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#000000;fontFamily=Arial;fontSize=13;',i===0?xs[i]-15:xs[i]-108,94,i===0?30:216,i===0?42:50);
  layers[0].push(`<mxCell id="${next++}" style="endArrow=none;dashed=1;strokeColor=#999999;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${xs[i]}" y="153" as="sourcePoint"/><mxPoint x="${xs[i]}" y="${y}" as="targetPoint"/></mxGeometry></mxCell>`);
 });
 pages.push(`<diagram id="page-${pages.length+1}" name="${E(name)}"><mxGraphModel grid="0" page="1" pageScale="1" pageWidth="${W+45}" pageHeight="${y+45}" background="#ffffff"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${layers.flat().join('')}</root></mxGraphModel></diagram>`);
};
