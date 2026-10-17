(()=>{
  try{
    if(typeof agentProfiles==='undefined'||typeof renderAgents!=='function')return;

    const legacyKeys=['myTeam.v2','myTeam.v1'];
    let imported=0;
    let enriched=0;

    const clean=v=>String(v??'').trim();
    const addLine=(arr,label,value)=>{const v=clean(value);if(v)arr.push(label+' : '+v)};

    for(const key of legacyKeys){
      let legacy=null;
      try{legacy=JSON.parse(localStorage.getItem(key)||'null')}catch{}
      if(!legacy||!Array.isArray(legacy.agents))continue;

      for(const a of legacy.agents){
        const name=clean(a?.name);
        if(!name)continue;

        const existed=!!agentProfiles[name];
        const current=agentProfiles[name]||{};
        const notes=[];
        addLine(notes,'Qualifications / habilitations',a.quals);
        addLine(notes,'Postes maîtrisés',a.posts);
        addLine(notes,'Desiderata / préférences',a.prefs);
        addLine(notes,'Contraintes professionnelles',a.less);
        addLine(notes,'Points positifs / efforts',a.positives);
        addLine(notes,'Suivi factuel',a.notes);

        const legacyNotes=notes.join('\n');
        let mergedNotes=clean(current.notes);
        if(legacyNotes&&!mergedNotes)mergedNotes=legacyNotes;
        else if(legacyNotes&&mergedNotes&&!mergedNotes.includes(legacyNotes))mergedNotes+='\n\n— Données récupérées de l’ancienne version —\n'+legacyNotes;

        agentProfiles[name]={
          ...current,
          notes:mergedNotes,
          team:current.team||a.team||4,
          gender:current.gender||(['F','M'].includes(a.gender)?a.gender:''),
          rxCertified:typeof current.rxCertified==='boolean'?current.rxCertified:(typeof a.rxCertified==='boolean'?a.rxCertified:false),
          pistePermit:typeof current.pistePermit==='boolean'?current.pistePermit:(typeof a.pistePermit==='boolean'?a.pistePermit:false)
        };

        if(existed)enriched++; else imported++;
      }
    }

    if(imported||enriched){
      localStorage.setItem(agentKey,JSON.stringify(agentProfiles));
      renderAgents();
    }

    const statusEl=document.querySelector('#agent-import-status');
    const count=Object.keys(agentProfiles).length;
    if(statusEl&&count){
      const recovered=imported?` · ${imported} récupéré${imported>1?'s':''} de l’ancienne version`:'';
      statusEl.textContent=`${count} agent${count>1?'s':''} disponible${count>1?'s':''} sur ce téléphone${recovered}.`;
    }
  }catch(err){
    console.error('Migration agents MyTEAM',err);
  }
})();

(()=>{
  if(document.querySelector('script[data-myteam-agent-editor]'))return;
  const s=document.createElement('script');
  s.src='./agent-editor-v1.js?v=20261017-2';
  s.dataset.myteamAgentEditor='1';
  document.head.appendChild(s);
})();
