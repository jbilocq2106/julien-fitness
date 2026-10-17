(()=>{
  const VERSION='g4s-2026-10-11';
  const VERSION_KEY='myteam_planning_seed_version';
  const shifts=[
    {date:'2026-10-01',start:'08:00',end:'12:00',post:'Formation prévue',type:'training'},
    {date:'2026-10-01',start:'12:30',end:'16:30',post:'Formation prévue',type:'training'},
    {date:'2026-10-02',start:'08:00',end:'12:00',post:'Formation prévue',type:'training'},
    {date:'2026-10-02',start:'12:30',end:'16:30',post:'Formation prévue',type:'training'},
    {date:'2026-10-03',start:'05:00',end:'13:00',post:'LUXAIR-PARIF • Chef d’équipe',type:'morning'},
    {date:'2026-10-04',start:'05:00',end:'13:00',post:'LUXAIR-PARIF • Chef d’équipe',type:'morning'},
    {date:'2026-10-05',start:'21:30',end:'05:30',post:'LUXAIR-E85 • E85 X Ray Nuit',type:'night'},
    {date:'2026-10-06',start:'21:30',end:'05:30',post:'LUXAIR-PARIF • New Parif Nuit',type:'night'},
    {date:'2026-10-09',start:'05:30',end:'13:30',post:'LUXAIR-E85 • E85 X Ray Matin',type:'morning'},
    {date:'2026-10-10',start:'05:30',end:'13:30',post:'LUXAIR-PARIF • Parif 6h00-14h00',type:'morning'},
    {date:'2026-10-11',start:'13:30',end:'22:00',post:'LUXAIR-E30 • E32 Agent Mascu',type:'afternoon'},
    {date:'2026-10-11',start:'22:00',end:'22:45',post:'LUXAIR-E30 • 1 as Extra E30',type:'afternoon'},
    {date:'2026-10-12',start:'13:30',end:'21:30',post:'LUXAIR-PARIF • Parif 14h00-22h00',type:'afternoon'},
    {date:'2026-10-13',start:'21:30',end:'05:30',post:'LUXAIR-PARIF • New Parif Nuit',type:'night'},
    {date:'2026-10-14',start:'21:30',end:'05:30',post:'LUXAIR-E14 • E14 Nuit Permis',type:'night'},
    {date:'2026-10-17',start:'05:30',end:'13:30',post:'LUXAIR-E84 • E84 X Ray Matin',type:'morning'},
    {date:'2026-10-18',start:'05:30',end:'13:30',post:'LUXAIR-PARIF • Parif 6h00-14h00',type:'morning'},
    {date:'2026-10-19',start:'13:30',end:'21:45',post:'LUXAIR-PIF • Aérogare aprem',type:'afternoon'},
    {date:'2026-10-20',start:'13:30',end:'22:00',post:'LUXAIR-E30 • E32 Agent Mascu',type:'afternoon'},
    {date:'2026-10-20',start:'22:00',end:'22:45',post:'LUXAIR-E30 • 1 as Extra E30',type:'afternoon'},
    {date:'2026-10-21',start:'13:30',end:'21:30',post:'LUXAIR-SUPERVISEUR/R • Extra Renfort',type:'afternoon'},
    {date:'2026-10-22',start:'21:30',end:'05:30',post:'LUXAIR-E85 • E85 X Ray Nuit',type:'night'},
    {date:'2026-10-25',start:'05:30',end:'13:30',post:'LUXAIR-E85 • E85 X Ray Matin',type:'morning'},
    {date:'2026-10-26',start:'05:30',end:'13:30',post:'LUXAIR-E14 • E14 Matin Permis',type:'morning'},
    {date:'2026-10-27',start:'13:30',end:'21:30',post:'LUXAIR-E84 • E84 X Ray Après',type:'afternoon'},
    {date:'2026-10-28',start:'13:00',end:'22:00',post:'LUXAIR-E112 • Parif E112 X Ray',type:'afternoon'}
  ];
  try{
    if(localStorage.getItem(VERSION_KEY)!==VERSION){
      localStorage.setItem('myteam_shifts',JSON.stringify(shifts));
      localStorage.setItem(VERSION_KEY,VERSION);
    }
  }catch{}
  window.addEventListener('DOMContentLoaded',()=>{
    const hours=document.querySelector('#hours');
    if(hours)hours.innerHTML='<h2>Mes heures</h2><div class="card"><strong>Octobre 2026 : 179 h 45</strong><p class="muted">Planning G4S du 1er au 31 octobre • version créée le 11/10/2026.</p><p>26 lignes de prestation • repos : 7–8, 15–16, 23–24 et 29–31 octobre.</p></div>';
    const planning=document.querySelector('#planning .card .muted');
    if(planning){const p=document.createElement('p');p.className='muted';p.textContent='Planning G4S intégré • source du 11/10/2026 • total 179 h 45';planning.after(p);}
  });
})();
