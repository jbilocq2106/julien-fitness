const root=document.querySelector('#grid'),status=document.querySelector('#status');
let shifts=[];try{shifts=JSON.parse(localStorage.getItem('myteam_shifts')||'[]')}catch{}
const today=new Date(),month=new Date(today.getFullYear(),today.getMonth(),1);
function render(){
 document.querySelector('#month').textContent=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(month);
 root.innerHTML='';for(const n of ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']){let e=document.createElement('div');e.className='weekday'+(['Sam','Dim'].includes(n)?' weekend':'');e.textContent=n;root.append(e)}
 const offset=(month.getDay()+6)%7,days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 for(let i=0;i<offset;i++)root.append(document.createElement('div'));
 for(let d=1;d<=days;d++){
  const date=month.getFullYear()+'-'+String(month.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const rows=shifts.filter(x=>x.date===date),e=document.createElement('div'),col=(offset+d-1)%7;
  e.className='day'+(col>=5?' we':'');
  if(rows.length)e.classList.add(rows[0].type||'morning');
  const number=document.createElement('b');number.textContent=d;e.append(number);
  const summary=document.createElement('span');summary.textContent=rows.length?rows.map(x=>x.start).join(' / '):'Repos';e.append(summary);
  e.onclick=()=>alert(rows.length?rows.map(x=>[x.start,x.end,x.post||''].join(' – ')).join('\n'):'Repos');
  root.append(e);
 }
}
render();
document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('main section').forEach(s=>s.classList.toggle('hidden',s.id!==btn.dataset.tab))});
document.querySelector('#import').onclick=()=>document.querySelector('#file').click();
document.querySelector('#file').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data)||!data.every(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&/^\d\d:\d\d$/.test(x.start)))throw Error('Format invalide');shifts=data;localStorage.setItem('myteam_shifts',JSON.stringify(shifts));render();status.textContent='Planning importé localement'}catch(err){alert('Import impossible : '+err.message)}};
document.querySelector('#clear').onclick=()=>{if(confirm('Effacer le planning local ?')){shifts=[];localStorage.removeItem('myteam_shifts');render()}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
let y=0;document.addEventListener('touchstart',e=>{if(scrollY===0)y=e.touches[0].clientY},{passive:true});
document.addEventListener('touchend',async e=>{if(y&&scrollY===0&&e.changedTouches[0].clientY-y>110){y=0;status.textContent='Recherche de mise à jour…';if(navigator.serviceWorker?.getRegistration){const r=await navigator.serviceWorker.getRegistration();if(r)await r.update()}location.reload()}y=0},{passive:true});
