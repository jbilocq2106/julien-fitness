/* MyTEAM - Journal de bord CDE, validation explicite et archives privees */
(()=>{
'use strict';
if(document.getElementById('mt-board-log'))return;
const picker=document.getElementById('date');
if(!picker)return;
const KEY='myteam-board-log-v1',OLD='myteam-daily-v1',BRIEF='myteam-private-briefings-v1';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dateLabel=s=>/^\d{4}-\d\d-\d\d$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s;
const load=(k,def)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??def}catch{return def}};
const defaults=()=>({start:'',end:'',cde:'unknown',station:'',plan:'unknown',planNote:'',mail:'unknown',trello:'unknown',notes:'',extra:[]});
const valid=v=>['unknown','yes','no','na'].includes(v)?v:'unknown';
const pretty={unknown:'À vérifier',yes:'Oui / OK',no:'Non / non fait',na:'Sans objet'};
const el=document.createElement('section');el.className='card';el.id='mt-board-log';
el.innerHTML='<div class="jb-top"><div><h2>Journal de bord · CDE</h2><p>Chaque date est un brouillon jusqu’à validation. Aucun champ non renseigné n’est considéré comme effectué.</p></div><strong id="jb-state">Brouillon</strong></div>'+
'<fieldset id="jb-fields"><div class="jb-grid">'+
'<label>Début de service<input id="jb-start" type="time"></label><label>Fin de service<input id="jb-end" type="time"></label>'+
'<label>CDE posté ?<select id="jb-cde"><option value="unknown">À renseigner</option><option value="yes">Oui</option><option value="no">Non</option></select></label>'+
'<label>Poste / endroit<input id="jb-station" type="text" placeholder="Ex. E121, PARIF" maxlength="180"></label>'+
'<label>Modification planning ?<select id="jb-plan"><option value="unknown">À renseigner</option><option value="yes">Oui</option><option value="no">Non</option></select></label>'+
'<label>Détail modification planning<input id="jb-plan-note" type="text" placeholder="Modification, agent, poste…" maxlength="500"></label>'+
'<label>Mail<select id="jb-mail"><option value="unknown">À vérifier</option><option value="yes">OK</option><option value="no">Non fait</option><option value="na">Sans objet</option></select></label>'+
'<label>Trello<select id="jb-trello"><option value="unknown">À vérifier</option><option value="yes">OK</option><option value="no">Non fait</option><option value="na">Sans objet</option></select></label>'+
'</div><label>Notes / événements de service<textarea id="jb-notes" rows="3" placeholder="Événement, agent concerné, action réalisée…"></textarea></label>'+
'<h3>Autres rubriques</h3><div id="jb-custom"></div><div class="jb-grid"><label>Nouvelle rubrique<input id="jb-extra-label" maxlength="100" placeholder="Ex. Passage superviseur"></label><button type="button" id="jb-add">Ajouter la rubrique</button></div>'+
'<button id="jb-save" type="button">Enregistrer le brouillon</button></fieldset>'+
'<div class="jb-summary"><h3>Récapitulatif avant validation</h3><div id="jb-current"></div></div>'+
'<div class="jb-actions"><button id="jb-validate" type="button">Valider la journée</button><button id="jb-reopen" type="button" hidden>Réouvrir pour corriger</button><button id="jb-export" type="button">Sauvegarder mes journaux</button></div>'+
'<p id="jb-status" role="status" aria-live="polite"></p>'+
'<div class="jb-archive"><h2>Historique des journées validées</h2>'+
'<label>Rechercher dans l’historique<input type="search" id="jb-search" placeholder="Date, poste, agent ou sujet"></label><p id="jb-count"></p><div id="jb-archive"></div></div>';
const css=document.createElement('style');
css.textContent='#mt-board-log{border:1px solid #668298;padding:16px;margin:15px 0;background:#1f3047}#mt-board-log h2{font-size:22px;margin:0 0 7px}#mt-board-log h3{font-size:16px;margin:16px 0 7px}#mt-board-log .jb-top{display:flex;justify-content:space-between;align-items:flex-start;gap:9px}#mt-board-log .jb-top p{font-size:13px;color:#ced9e7;margin:5px 0 12px}#jb-state{border-radius:999px;padding:7px;background:#865c25;color:white;font-size:12px;flex-shrink:0}#jb-state.validated{background:#26644d}#mt-board-log fieldset{border:0;padding:0;margin:0;min-width:0}#mt-board-log fieldset:disabled{opacity:.7}#mt-board-log .jb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#mt-board-log label{font-size:13px;font-weight:650;min-width:0}#mt-board-log input,#mt-board-log select,#mt-board-log textarea{box-sizing:border-box;width:100%;background:#111f31;color:#fff;border:1px solid #68839a;padding:12px;margin:7px 0 9px;border-radius:10px;min-height:44px}#mt-board-log textarea{width:100%}#mt-board-log .jb-summary{margin-top:15px;border-radius:12px;background:#293d55;padding:12px}#mt-board-log .jb-summary p{margin:6px 0;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}#mt-board-log .jb-summary .jb-muted{font-size:12px;color:#b9cedb}#mt-board-log .jb-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#mt-board-log .jb-actions button{flex:1;min-width:135px;min-height:48px}#jb-validate{background:#287459;color:white}#jb-reopen{background:#a15a32;color:white}#mt-board-log .jb-archive{border-top:1px solid #556f89;margin-top:17px;padding-top:14px}#mt-board-log .jb-day{margin:10px 0;padding:12px;border:1px solid #597086;border-radius:12px;background:#172b41}#mt-board-log .jb-day summary{font-size:16px;font-weight:750;cursor:pointer;padding:5px 0}#mt-board-log .jb-day p{margin:7px 0;line-height:1.5;overflow-wrap:anywhere}#mt-board-log .jb-day .jb-type{font-weight:700;color:#b8d7e7}#mt-board-log #jb-count{font-size:12px;color:#bed0df}#mt-board-log #jb-status{font-size:13px;color:#d9e4ef}#mt-board-log .jb-custom-row{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end}#mt-board-log .jb-custom-row button{min-height:44px}@media(max-width:370px){#mt-board-log .jb-grid{grid-template-columns:1fr}}';
el.prepend(css);
const dayLabelEl=picker.closest('label');if(dayLabelEl)dayLabelEl.after(el);else picker.after(el);
const $=id=>document.getElementById(id);
function entriesFor(day){
 const journal=load(OLD,{})[day]||{};
 const briefs=load(BRIEF,[]);
 return {
 visits:(Array.isArray(journal.visits)?journal.visits:[]).map(v=>({poste:String(v.poste||''),agents:String(v.agents||''),type:String(v.type||'Passage'),notes:String(v.notes||'')})),
 reminders:(Array.isArray(journal.reminders)?journal.reminders:[]).map(v=>({text:String(v.text||''),done:v.done===true})),
 briefs:(Array.isArray(briefs)?briefs:[]).filter(v=>v.date===day).map(v=>({kind:String(v.kind||'Transmission'),text:String(v.text||''),done:v.done===true}))
 };
}
function currentRec(){
 return load(KEY,{})[picker.value]||{draft:defaults(),validated:false,snapshots:[]};
}
function collect(){
 return {start:$('jb-start').value,end:$('jb-end').value,cde:valid($('jb-cde').value),station:$('jb-station').value.trim().slice(0,180),
 plan:valid($('jb-plan').value),planNote:$('jb-plan-note').value.trim().slice(0,500),
 mail:valid($('jb-mail').value),trello:valid($('jb-trello').value),notes:$('jb-notes').value.trim().slice(0,6000),
 extra:[...$('jb-custom').querySelectorAll('[data-jb-row]')].map(n=>({label:n.dataset.jbRow,value:n.querySelector('input')?.value?.trim().slice(0,1000)||''}))
 };
}
function record(draft){
 const day=picker.value;if(!/^\d{4}-\d\d-\d\d$/.test(day))return false;
 const all=load(KEY,{}),item=all[day]||{draft:defaults(),validated:false,snapshots:[]};
 if(item.validated)return false;
 item.draft=draft;all[day]=item;
 try{localStorage.setItem(KEY,JSON.stringify(all));window.dispatchEvent(new Event('myteam-board-updated'));return true}
 catch(e){$('jb-status').textContent='Sauvegarde impossible : '+e.message;return false}
}
function currentSummary(fields,parts){
 const empty='Non renseigné',yesno=v=>v==='unknown'?empty:pretty[v]||empty;
 const line=(label,v)=>'<p><strong>'+safe(label)+' :</strong> '+safe(v||empty)+'</p>';
 let html=line('Horaires',fields.start&&fields.end?fields.start+' – '+fields.end:fields.start?'Début '+fields.start:fields.end?'Fin '+fields.end:empty);
 html+=line('CDE posté',yesno(fields.cde)+(fields.station?' · '+fields.station:''));
 html+=line('Modification planning',yesno(fields.plan)+(fields.planNote?' · '+fields.planNote:''));
 html+=line('Mail',yesno(fields.mail))+line('Trello',yesno(fields.trello));
 if(fields.notes)html+=line('Notes',fields.notes);
 for(const x of fields.extra||[])if(x.label)html+=line(x.label,x.value||empty);
 html+='<p class="jb-muted">'+parts.visits.length+' déplacement(s) · '+parts.reminders.length+' rappel(s) · '+parts.briefs.length+' transmission(s)</p>';
 if(parts.visits.length){html+='<h4>Déplacements et visites</h4>';for(const x of parts.visits)html+=line((x.poste||'Poste non précisé')+' · '+(x.type||'Passage'),[x.agents,x.notes].filter(Boolean).join(' — '));}
 if(parts.briefs.length){html+='<h4>Transmissions</h4>';for(const x of parts.briefs)html+=line(x.kind+(x.done?' (fait)':' (à suivre)'),x.text);}
 if(parts.reminders.length){html+='<h4>Rappels</h4>';for(const x of parts.reminders)html+=line(x.done?'Fait':'À faire',x.text);}
 return html;
}
function customFields(extra){
 const host=$('jb-custom');host.innerHTML='';
 extra.forEach((x,i)=>{
  const row=document.createElement('div');row.className='jb-custom-row';row.dataset.jbRow=x.label;
  row.innerHTML='<label>'+safe(x.label)+'<input type="text" data-jb-extra="'+i+'" maxlength="1000" value="'+safe(x.value||'')+'"></label><button type="button" data-jb-remove="'+i+'" aria-label="Supprimer la rubrique '+safe(x.label)+'">×</button>';
  host.append(row);
 });
}
function renderCurrent(){
 const item=currentRec(),fields=item.draft||defaults();
 for(const [key,id] of Object.entries({start:'jb-start',end:'jb-end',cde:'jb-cde',station:'jb-station',plan:'jb-plan',planNote:'jb-plan-note',mail:'jb-mail',trello:'jb-trello',notes:'jb-notes'})){
  const n=$(id);if(n)n.value=fields[key]||((['cde','plan','mail','trello'].includes(key))?'unknown':'');
 }
 customFields(Array.isArray(fields.extra)?fields.extra:[]);
 const state=$('jb-state');state.textContent=item.validated?'Journée validée':'Brouillon';state.classList.toggle('validated',!!item.validated);
 $('jb-fields').disabled=item.validated===true;
 $('jb-validate').hidden=item.validated===true;
 $('jb-reopen').hidden=item.validated!==true;
 $('jb-current').innerHTML=currentSummary(fields,entriesFor(picker.value));
 $('jb-status').textContent=item.validated?'Version validée archivée : pour corriger, réouvrir puis valider à nouveau.':'Brouillon local : les modifications sont enregistrées sur cet appareil.';
}
function renderArchives(){
 const q=norm($('jb-search').value.trim());const all=load(KEY,{});
 const snapshots=Object.entries(all).filter(([day,item])=>Array.isArray(item?.snapshots)&&item.snapshots.length)
 .map(([day,item])=>({day,rec:item,snap:item.snapshots[item.snapshots.length-1]}))
 .sort((a,b)=>b.day.localeCompare(a.day));
 const matching=snapshots.filter(({day,snap})=>norm(day+' '+dateLabel(day)+' '+JSON.stringify(snap)).includes(q));
 $('jb-count').textContent=matching.length+' journée(s) validée(s) retrouvée(s)';
 $('jb-archive').innerHTML=matching.length?matching.map(({day,snap,rec})=>
  '<details class="jb-day"><summary>'+safe(dateLabel(day))+' · '+(rec.validated?'Validée':'Réouverte pour correction')+'</summary>'+
  '<p class="jb-muted">Version '+(rec.snapshots?.length||1)+' · validation '+safe(new Date(snap.validatedAt).toLocaleString('fr-FR'))+'</p>'+
  currentSummary(snap.fields||defaults(),snap.entries||{visits:[],reminders:[],briefs:[]})+
  '<button type="button" data-jb-day="'+safe(day)+'">Afficher cette date</button></details>'
 ).join(''):'<p class="jb-muted">Aucune journée validée correspondant à cette recherche.</p>';
}
function changeDay(){renderCurrent();renderArchives()}
$('jb-fields').addEventListener('change',()=>{if(record(collect()))$('jb-current').innerHTML=currentSummary(collect(),entriesFor(picker.value))});
$('jb-save').onclick=()=>{$('jb-status').textContent=record(collect())?'Brouillon enregistré.':'Journée déjà validée ou stockage indisponible.'};
$('jb-add').onclick=()=>{
 const label=$('jb-extra-label').value.trim().slice(0,100);if(!label||currentRec().validated)return;
 if([...$('jb-custom').querySelectorAll('[data-jb-row]')].some(r=>norm(r.dataset.jbRow)===norm(label))){$('jb-status').textContent='Cette rubrique existe déjà.';return}
 const draft=collect();draft.extra.push({label,value:''});
 if(record(draft)){customFields(draft.extra);$('jb-extra-label').value='';$('jb-status').textContent='Rubrique ajoutée.'}
};
$('jb-custom').addEventListener('click',e=>{
 const b=e.target.closest('[data-jb-remove]');if(!b)return;
 if(!confirm('Retirer cette rubrique du brouillon ?'))return;
 const draft=collect();draft.extra.splice(Number(b.dataset.jbRemove),1);
 if(record(draft))customFields(draft.extra)
});
$('jb-validate').onclick=()=>{
 const day=picker.value;if(!/^\d{4}-\d\d-\d\d$/.test(day))return;
 const fields=collect(),entries=entriesFor(day);
 if(!fields.start&&!fields.end&&!fields.station&&!fields.planNote&&!fields.notes&&!fields.extra.some(x=>x.value)&&fields.cde==='unknown'&&fields.plan==='unknown'&&fields.mail==='unknown'&&fields.trello==='unknown'&&!entries.visits.length&&!entries.reminders.length&&!entries.briefs.length){$('jb-status').textContent='La journée est vide : renseigne au moins une information.';return}
 if(!confirm('Valider et archiver la journée du '+dateLabel(day)+' ? La fiche validée sera conservée dans l’historique.'))return;
 const all=load(KEY,{}),rec=all[day]||{draft:defaults(),validated:false,snapshots:[]};
 const snap={date:day,validatedAt:new Date().toISOString(),fields,entries};
 rec.draft=fields;rec.validated=true;rec.snapshots=Array.isArray(rec.snapshots)?rec.snapshots:[];rec.snapshots.push(snap);all[day]=rec;
 try{localStorage.setItem(KEY,JSON.stringify(all));changeDay();window.dispatchEvent(new Event('myteam-board-updated'));$('jb-status').textContent='Journée validée et archivée.'}
 catch(e){$('jb-status').textContent='Validation non enregistrée : '+e.message}
};
$('jb-reopen').onclick=()=>{
 const day=picker.value;if(!confirm('Réouvrir la journée '+dateLabel(day)+' ? La dernière version validée restera dans l’historique.'))return;
 const all=load(KEY,{});if(!all[day])return;
 all[day].validated=false;
 try{localStorage.setItem(KEY,JSON.stringify(all));changeDay();$('jb-status').textContent='Journée réouverte : valide à nouveau après correction.'}
 catch(e){$('jb-status').textContent='Impossible de réouvrir : '+e.message}
};
$('jb-search').addEventListener('input',renderArchives);
$('jb-archive').addEventListener('click',e=>{
 const b=e.target.closest('[data-jb-day]');if(!b)return;
 picker.value=b.dataset.jbDay;picker.dispatchEvent(new Event('change',{bubbles:true}));el.scrollIntoView({behavior:'smooth',block:'start'})
});
$('jb-export').onclick=()=>{
 const all=load(KEY,{}),blob=new Blob([JSON.stringify({schema:'myteam-board-log-v1',days:all},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='MyTEAM_main_courante_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
};
picker.addEventListener('change',changeDay);
window.addEventListener('focus',()=>{const item=currentRec();if(!item.validated)$('jb-current').innerHTML=currentSummary(item.draft||defaults(),entriesFor(picker.value));renderArchives()});
window.addEventListener('myteam-board-updated',renderArchives);
changeDay();
})();