(()=>{
  if(typeof agentProfiles==='undefined'||typeof renderAgents!=='function')return;

  const SEED_KEY='myteam_team_roster_current_v2';

  // Team 4 actuelle : liste déjà validée dans MyTEAM.
  const team4=[
    ['ADAM Manon','F'],['BORGESE Myriam','F'],['DAL FARRA Shirley','F'],["D'AVERSI Margaux",'F'],['DIELS Elisa','F'],['GAGNANT Deborah','F'],['GARCIA Maeva','F'],['LUCK Océane','F'],['OUINNE Melyse','F'],['WILTGEN Ophélie','F'],
    ['BERAUT Geoffrey','M'],['BIGONI-HOUDUSSE Alexandre','M'],['BILOCQ Julien','M'],['BURG Jeremy','M'],['CLESEUR Noah','M'],['DORRION Albert','M'],['FREZAL Joey','M'],['HENRAT Corentin','M'],['HUMMEL Aurelien','M'],['JACOTEZ Tim','M'],['MATEI Vitor','M'],['PANATO Joey','M'],['SANDSTROM Mike','M'],['SCARPINO Loic','M'],['STASIAK Valentin','M'],['TUMMINELLI Attilio','M'],['WILLEMS Jeremy','M']
  ];

  // Les autres équipes sont complétées depuis la photo fournie, avec correspondance confirmée : ancienne 1→1, 2→4, 3→3, 4→2.
  // La photo est antérieure à la Team 4 actuelle : sa colonne "équipe 2"
  // correspond à l'ancien groupe dont provient la majorité de la Team 4 actuelle.
  // On conserve donc Team 4 telle qu'elle a déjà été validée et on répartit
  // les trois autres colonnes dans les onglets restants.
  const teams={
    1:[
      ['EL GAMAH','F'],['LALLOZ Steven','M'],['MIGNOT Auriane','F'],['HILT Killian','M'],['VALENTINI','M'],['WEISSE','M'],['MARIE','M'],['BERNARD Noelya','F'],['JULIA Melissa','F'],['KARASU Laetitia','F'],['RODRIGUEZ Mathias','M'],['MALICK','M'],['SCHMID Sebastien','M'],['DACHOUFF Michael','M'],['ANTONIOL Christophe','M'],['GARRABI Omar','M'],['KERGOAT Maxime','M'],['VIEL','M'],['COLLELA','M'],['MOURER','F'],['GIANOLI','F'],['MUNIER Eva','F'],['HOFFART','F'],['MOLTER','M']
    ],
    2:[
      ['SEBRIER Kevin','M'],['FRANCESCHINI','F'],['DOSIL','M'],['MALAINHO','M'],['TERRIEN','F'],['DA SILVA MARTINS','F'],['MIANO Marie','F'],['CLAREN','M'],['DA ROCHA','M'],['BODEVING Patrick','M'],['FRANGIAMORE','M'],['FROUSSART Lucas','M'],['DURAND','M'],['YOVE Rénaldo','M'],['ALI VELOU','M'],['FRIESS SCHAEFFER Killian','M'],['GUGLIETTI','M'],["KOUAHO N'TAKPE Come Landry",'M'],['VERDIN Romain','M'],['SERJANTU Andrian','M'],['KIZILDAG','F'],['MARINI Katia','F'],['FROSIO','F'],['CHOUMAKER','F']
    ],
    3:[
      ['PILLA','M'],['TRIPODI Adrien','M'],['CAIROL','F'],['SAUTEZ Jerome','M'],['HAUDIQUET','F'],['MOURON','F'],['THIBAUD','F'],['MOUDEBER Ryan','M'],['NETO','M'],['FELTEN Laurent','M'],['MAILLOT Jean Gabriel Axel','M'],['KIRSCHTETTER Teddy','M'],['DOS SANTOS MARTINS Anabela','F'],['LEBRUN Celine','F'],['VILLI','M'],['BRIDELANCE Damien','M'],['REHAMNIA','M'],['KRIEG','M'],['DURLI','M'],['GUFFROY','M'],['KESSLER Jordan','M'],['BEHARI','M'],['LECLERE','M'],['FINCK Carole','F'],['HANCE Clotilde','F']
    ],
    4:team4
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
  const MAP_KEY='myteam_team13_photo_mapping_fix_v1';
  const needsMapMigration=localStorage.getItem(MAP_KEY)!=='1';
  let changed=false;

  for(const [teamText,rows] of Object.entries(teams)){
    const team=Number(teamText);
    for(const [seedName,gender] of rows){
      const existing=findExisting(seedName);
      const name=existing||seedName;
      const p=agentProfiles[name]||{};
      const next={...p};
      if(!alreadySeeded||!p.rosterSeedCurrentV2){
        next.team=team;
        next.gender=gender;
      }else{
        if(![1,2,3,4].includes(Number(next.team)))next.team=team;
        if(!['F','M'].includes(next.gender))next.gender=gender;
      }
      // Correction approuvée : anciennes équipes 1 et 3 gardent leur numéro.
      // Ne réaffecte qu'une entrée héritée de la photo encore dans le mauvais onglet.
      if(needsMapMigration&&!p.teamManual&&p.rosterSeedCurrentV2===true&&
        ((team===1&&Number(p.team)===3)||(team===3&&Number(p.team)===1)))next.team=team;
      next.rosterSeedCurrentV2=true;
      next.rosterSource=team===4?'Team 4 actuelle validée':'Photo équipes 21/07/2026';
      next.rosterSeedName=seedName;
      agentProfiles[name]=next;
      changed=true;
    }
  }

  if(changed){
    try{localStorage.setItem(agentKey,JSON.stringify(agentProfiles));localStorage.setItem(SEED_KEY,'1');if(needsMapMigration)localStorage.setItem(MAP_KEY,'1')}catch{}
    renderAgents();
    try{window.renderMyTeamAgentList?.()}catch{}
  }

  const status=document.querySelector('#agent-import-status');
  if(status)status.textContent='Team 4 actuelle conservée en priorité • Teams 1, 2 et 3 complétées depuis la photo • qualifications existantes conservées.';
})();