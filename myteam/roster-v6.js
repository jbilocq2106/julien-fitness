(()=>{
  if(typeof agentProfiles==='undefined'||typeof renderAgents!=='function')return;

  const SEED_KEY='myteam_team_roster_20260721_v1';
  const teams={
    1:[
      ['EL GAMAH','F'],['LALLOZ Steven','M'],['MIGNOT Auriane','F'],['HILT Killian','M'],['VALENTINI','M'],['WEISSE','M'],['MARIE','M'],['BERNARD Noelya','F'],['JULIA Melissa','F'],['KARASU Laetitia','F'],['RODRIGUEZ Mathias','M'],['MALICK','M'],['SCHMID Sebastien','M'],['DACHOUFF Michael','M'],['ANTONIOL Christophe','M'],['GARRABI Omar','M'],['KERGOAT Maxime','M'],['VIEL','M'],['COLLELA','M'],['MOURER','F'],['DIELS Elisa','F'],['GIANOLI','F'],['MUNIER Eva','F'],['HOFFART','F'],['MOLTER','M']
    ],
    2:[
      ['BILOCQ Julien','M'],['BORGESE Myriam','F'],['GAGNANT Deborah','F'],["D'AVERSI Margaux",'F'],['BERAUT Geoffrey','M'],['JACOTEZ Tim','M'],['SANDSTROM Mike','M'],['BIGONI-HOUDUSSE Alexandre','M'],['WILLEMS Jeremy','M'],['BURG Jeremy','M'],['PANATO Joey','M'],['TUMMINELLI Attilio','M'],['HENRAT Corentin','M'],['CLESEUR Noah','M'],['SCARPINO Loic','M'],['HUMMEL Aurelien','M'],['JACQUET Evan','M'],['MATEI Vitor','M'],['DORRION Albert','M'],['STASIAK Valentin','M'],['LECLERC','F'],['LUCK Océane','F'],['WILTGEN Ophélie','F'],['ADAM Manon','F'],['GARCIA Maeva','F']
    ],
    3:[
      ['PILLA','M'],['TRIPODI Adrien','M'],['CAIROL','F'],['SAUTEZ Jerome','M'],['HAUDIQUET','F'],['MOURON','F'],['THIBAUD','F'],['MOUDEBER Ryan','M'],['NETO','M'],['FELTEN Laurent','M'],['MAILLOT Jean Gabriel Axel','M'],['KIRSCHTETTER Teddy','M'],['DOS SANTOS MARTINS Anabela','F'],['LEBRUN Celine','F'],['VILLI','M'],['BRIDELANCE Damien','M'],['REHAMNIA','M'],['KRIEG','M'],['DURLI','M'],['GUFFROY','M'],['KESSLER Jordan','M'],['BEHARI','M'],['LECLERE','M'],['FINCK Carole','F'],['HANCE Clotilde','F']
    ],
    4:[
      ['SEBRIER Kevin','M'],['FRANCESCHINI','F'],['DOSIL','M'],['MALAINHO','M'],['TERRIEN','F'],['DA SILVA MARTINS','F'],['MIANO Marie','F'],['CLAREN','M'],['DA ROCHA','M'],['BODEVING Patrick','M'],['FRANGIAMORE','M'],['FROUSSART Lucas','M'],['DURAND','M'],['YOVE Rénaldo','M'],['ALI VELOU','M'],['FRIESS SCHAEFFER Killian','M'],['GUGLIETTI','M'],["KOUAHO N'TAKPE Come Landry",'M'],['VERDIN Romain','M'],['SERJANTU Andrian','M'],['KIZILDAG','F'],['MARINI Katia','F'],['FROSIO','F'],['CHOUMAKER','F']
    ]
  };

  window.myteamTeamSeed=teams;

  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const findExisting=(target)=>{
    const exact=Object.keys(agentProfiles).find(k=>normalize(k)===normalize(target));
    if(exact)return exact;
    const t=normalize(target);
    return Object.keys(agentProfiles).find(k=>{
      const n=normalize(k);
      return n.startsWith(t)||t.startsWith(n);
    })||'';
  };

  const alreadySeeded=localStorage.getItem(SEED_KEY)==='1';
  let changed=false;

  for(const [teamText,rows] of Object.entries(teams)){
    const team=Number(teamText);
    for(const [seedName,gender] of rows){
      const existing=findExisting(seedName);
      const name=existing||seedName;
      const p=agentProfiles[name]||{};
      const next={...p};
      if(!alreadySeeded||!p.rosterSeed20260721){
        next.team=team;
        next.gender=gender;
      }else{
        if(![1,2,3,4].includes(Number(next.team)))next.team=team;
        if(!['F','M'].includes(next.gender))next.gender=gender;
      }
      next.rosterSeed20260721=true;
      next.rosterSource='Photo équipes 21/07/2026';
      next.rosterSeedName=seedName;
      agentProfiles[name]=next;
      changed=true;
    }
  }

  if(changed){
    try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles));localStorage.setItem(SEED_KEY,'1')}catch{}
    renderAgents();
    try{window.renderMyTeamAgentList?.()}catch{}
  }

  const status=document.querySelector('#agent-import-status');
  if(status)status.textContent='Équipes 1 à 4 chargées depuis la photo • Team 4 affichée en priorité • qualifications existantes conservées.';
})();