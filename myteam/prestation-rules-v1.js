(()=>{
  const section=document.querySelector('#prestation');
  if(!section)return;

  const policy={
    version:1,
    teamMembershipIsAnomaly:false,
    unknownQualificationStatus:'warn',
    unknownGenderStatus:'warn',
    note:"L'équipe d'origine est informative uniquement. Une affectation n'est pas anormale parce que l'agent n'est pas Team 4 : contrôler les qualifications requises et les contraintes homme/femme du poste."
  };
  window.myteamPrestationPolicy=policy;

  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const getProfiles=()=>typeof agentProfiles!=='undefined'&&agentProfiles?agentProfiles:{};

  function findProfile(name){
    const profiles=getProfiles(),target=normalize(name);
    if(!target)return null;
    const exact=Object.entries(profiles).find(([n])=>normalize(n)===target);
    if(exact)return {name:exact[0],profile:exact[1]};
    const fuzzy=Object.entries(profiles).find(([n])=>{
      const k=normalize(n);return k.startsWith(target)||target.startsWith(k);
    });
    return fuzzy?{name:fuzzy[0],profile:fuzzy[1]}:null;
  }

  window.myteamEvaluateAgentForPost=(requirements={})=>{
    const found=findProfile(requirements.name||requirements.agentName||'');
    if(!found)return {status:'warn',reasons:["Agent absent de la base : qualifications et sexe à confirmer."],teamIgnored:true};
    const p=found.profile||{},reasons=[],warnings=[];

    // L'équipe n'est volontairement jamais contrôlée ici.
    if(requirements.gender&&['F','M'].includes(requirements.gender)){
      if(!['F','M'].includes(p.gender))warnings.push('Sexe non renseigné dans la fiche agent.');
      else if(p.gender!==requirements.gender)reasons.push(`Le poste demande ${requirements.gender==='F'?'une femme':'un homme'} pour ce créneau.`);
    }
    if(requirements.requiresRx===true&&p.rxCertified!==true)warnings.push('Qualification RX non confirmée dans la fiche agent.');
    if(requirements.requiresPiste===true&&p.pistePermit!==true)warnings.push('Permis piste non confirmé dans la fiche agent.');

    const status=reasons.length?'bad':warnings.length?'warn':'ok';
    return {status,reasons:[...reasons,...warnings],agent:found.name,team:p.team||null,teamIgnored:true};
  };

  let notice=document.querySelector('#prestation-team-policy');
  if(!notice){
    notice=document.createElement('div');
    notice.id='prestation-team-policy';
    notice.style.cssText='margin:10px 0 14px;padding:12px;border-radius:12px;background:#173b2d;border:1px solid #2d8b63;line-height:1.45';
    notice.innerHTML='<strong>Règle active pour les analyses</strong><br><span style="font-size:12px">Un agent d’une autre équipe n’est <b>jamais</b> une anomalie pour ce seul motif. Je contrôle les exigences du poste : qualifications connues et, lorsqu’elle est imposée, la présence homme/femme ou la mixité. Une qualification encore non renseignée donne une alerte orange à vérifier, pas une anomalie rouge.</span>';
    const h2=section.querySelector('h2');
    if(h2)h2.after(notice);else section.prepend(notice);
  }

  try{
    const corrections=JSON.parse(localStorage.getItem('myteam.prestationCorrections.v1')||'{}');
    window.myteamPrestationCorrections=corrections&&typeof corrections==='object'&&!Array.isArray(corrections)?corrections:{};
  }catch{window.myteamPrestationCorrections={}}
})();