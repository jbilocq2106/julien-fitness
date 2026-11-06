/* MyTEAM — PDF A4 hors ligne, sans dépendance réseau. */
(()=>{
'use strict';
const CP={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
function enc(s){
 let out='';
 for(const c of String(s??'')){
  const n=c.codePointAt(0);
  const b=(n<128||(n>=160&&n<=255))?n:CP[c];
  out+=(b===undefined?63:b).toString(16).padStart(2,'0');
 }
 return out.toUpperCase();
}
function textWidth(value,font=10){
 let sum=0;
 for(const c of String(value)){
  if('il. :;,!|'.includes(c))sum+=.27;
  else if('mwMW@%'.includes(c))sum+=.83;
  else if(/[A-Z0-9]/.test(c))sum+=.64;
  else sum+=.52;
 }
 return sum*font;
}
function wrap(text,font=10,maxWidth=492){
 const parts=String(text||'').split(/\s+/).filter(Boolean);
 if(!parts.length)return [''];
 const out=[];let line='';
 for(const word of parts){
  let rest=word;
  const chunks=[];
  while(textWidth(rest,font)>maxWidth&&rest.length>1){
   let take=1;
   while(take<rest.length&&textWidth(rest.slice(0,take+1),font)<=maxWidth)take++;
   chunks.push(rest.slice(0,take));rest=rest.slice(take);
  }
  chunks.push(rest);
  for(const chunk of chunks){
   const proposal=line?line+' '+chunk:chunk;
   if(line&&textWidth(proposal,font)>maxWidth){out.push(line);line=chunk}else line=proposal;
  }
 }
 if(line)out.push(line);
 return out;
}
function makePdf({title,subtitle='',sections=[],footer='Document personnel - MyTEAM'}={}){
 const objects=[];
 const add=s=>(objects.push(s),objects.length);
 add('<< /Type /Catalog /Pages 2 0 R >>');
 add('<< /Type /Pages /Count 0 /Kids [] >>');
 add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const pages=[];let cmds=[],y=753,pageN=0;
 function drawText(x,yy,value,font=10,bold=false,color='0.13 0.2 0.28'){
  cmds.push('BT /'+(bold?'F2':'F1')+' '+font+' Tf '+color+' rg 1 0 0 1 '+x+' '+yy+' Tm <'+enc(value)+'> Tj ET');
 }
 function startPage(){
  pageN++;cmds=[];y=746;
  cmds.push('q 0.10 0.16 0.26 rg 0 771 595 71 re f Q');
  drawText(42,803,String(title||'MyTEAM').slice(0,85),17,true,'1 1 1');
  drawText(42,784,String(subtitle).slice(0,115),9,false,'0.86 0.91 0.96');
  cmds.push('q 0.86 0.89 0.93 rg 42 45 511 .8 re f Q');
  drawText(42,30,String(footer).slice(0,100),7,false,'0.38 0.44 0.53');
  drawText(513,30,'Page '+pageN,7,false,'0.38 0.44 0.53');
 }
 function flush(){
  if(!cmds.length)return;
  const content=cmds.join('\n')+'\n';
  const stream=add('<< /Length '+content.length+' >>\nstream\n'+content+'endstream');
  const page=add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+stream+' 0 R >>');
  pages.push(page);
 }
 function ensure(height){if(y-height<58){flush();startPage()}}
 function heading(value){
  ensure(35);
  y-=9;
  cmds.push('q 0.94 0.49 0.24 rg 42 '+(y-4)+' 3 15 re f Q');
  drawText(52,y,String(value||''),11.2,true);
  y-=22;
 }
 function paragraph(value){
  const lines=String(value||'').replace(/\r/g,'').split('\n');
  for(const original of lines){
   if(!original.trim()){ensure(13);y-=10;continue}
   const bullet=/^\s*[-*]\s+/.test(original),indent=bullet?12:0;
   const row=original.replace(/^\s*[-*]\s+/,'- ');
   for(const part of wrap(row,9.25,490-indent)){
    ensure(13.2);drawText(47+indent,y,part,9.25,false);y-=13.4;
   }
  }
 }
 startPage();
 for(const section of sections){
  if(section?.header)heading(section.header);
  if(section?.text!==undefined)paragraph(section.text);
 }
 flush();
 objects[1]='<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map(p=>p+' 0 R').join(' ')+'] >>';
 let document='%PDF-1.4\n';
 const offsets=[0];
 for(let i=0;i<objects.length;i++){
  offsets.push(document.length);
  document+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';
 }
 const xref=document.length;
 document+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<offsets.length;i++)document+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 document+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 const bytes=new Uint8Array(document.length);
 for(let i=0;i<document.length;i++)bytes[i]=document.charCodeAt(i);
 return new Blob([bytes],{type:'application/pdf'});
}
function fileName(date,shift,kind,version=1){
 const names={morning:'MATIN',afternoon:'APREM',night:'NUIT',other:'AUTRE'};
 const doc=kind==='backup'?'TRANSMISSION_BACKUP':'HISTORIQUE_PERSONNEL';
 return String(date||'vacation')+'_'+(names[shift]||'AUTRE')+'_'+doc+'_v'+version+'.pdf';
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function share(blob,name){
 if(typeof navigator!=='undefined'&&navigator.canShare&&typeof File!=='undefined'){
  const file=new File([blob],name,{type:'application/pdf'});
  if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'MyTEAM - '+name});return true}
 }
 download(blob,name);return false;
}
window.MyTeamPdf={makePdf,fileName,download,share,wrap,enc};
})();