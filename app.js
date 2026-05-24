const PRIZE1=22000,PRIZE2=11000,PRIZE3=5000;
const KEY='challenge_arena_v8';

// 7 payment cycles reflecting actual manager counts and GW ranges
const CYCLES=[
  {gw:[1,5],   players:[0,1,2,4,5,8,9,10,12,13,14,15,16,17,18,19],                      fee:10000}, // 16 players
  {gw:[6,10],  players:[0,1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19],               fee:10000}, // 19 players (+ William, Yusuf, Dickson)
  {gw:[11,15], players:[0,1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19],               fee:10000}, // 19 players
  {gw:[16,20], players:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],             fee:10000}, // 20 players (+ AWB)
  {gw:[21,25], players:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],               fee:10000}, // 19 players (Paschal left)
  {gw:[26,30], players:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],               fee:10000}, // 19 players
  {gw:[31,38], players:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],               fee:16000}, // 19 players, 8 GWs
];

const INIT_PLAYERS=[
  'Osahon','Syb','Emmanuel','William','Hensalos','Kingz','AWB','Yusuf',
  'Eluigwe Frank','Hadassah','Dafe','Dickson','Joseph','Ose','Gege','Emeka',
  'Koded City','Ifeanyi','Kel Lee','Paschal'
];
// idx: 0=Osahon,1=Syb,2=Emmanuel,3=William,4=Hensalos,5=Kingz,6=AWB,7=Yusuf
//      8=EluigweFrank,9=Hadassah,10=Dafe,11=Dickson,12=Joseph,13=Ose,14=Gege
//      15=Emeka,16=KodedCity,17=Ifeanyi,18=KelLee,19=Paschal

const TEAM_NAMES=[
  'No more Benin People', // 0  Osahon
  'Mascotas',             // 1  Syb
  'Emmanwachi',           // 2  Emmanuel
  'Kop Fc',               // 3  William
  'SosmanFC',             // 4  Hensalos
  'KINGZ',                // 5  Kingz
  'FPL Farm',             // 6  AWB
  'Gesuke Wolves',        // 7  Yusuf
  'HaCunha Mateta',       // 8  Eluigwe Frank
  'H.S.g',               // 9  Hadassah
  'Okan fc',              // 10 Dafe
  'Ogwaligho FC',         // 11 Dickson
  'Jaggo',                // 12 Joseph
  'Wegoagain FC',         // 13 Ose
  'metabolites 2',        // 14 Gege
  'Ross FC',              // 15 Emeka
  'Kode Fc',              // 16 Koded City
  'Ghg',                  // 17 Ifeanyi
  'Sure Beans',           // 18 Kel Lee
  'You Kante Compete',    // 19 Paschal
];

const FPL_BASE='https://fplchallenge.premierleague.com/api';
const PROXY='https://corsproxy.io/?';
const ENTRY_MAP={
  21635:0, 375780:1, 75964:2, 806861:3, 96602:4,
  390180:5, 13603:6, 807952:7, 56156:8, 8328:9,
  285576:10, 807950:11, 91090:12, 51087:13, 139142:14,
  141573:15, 253699:16, 420591:17, 278195:18, 244443:19,
};

const OPENING=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

const PRESET=[
  {gw:1,awards:{1:7000,5:7000,14:18000},pos:{1:[14],2:[1,5],3:[]},note:'Gege 1st · Syb & Kingz joint 2nd (₦7,000 each)'},
  {gw:2,awards:{8:10000,13:18000,15:4000},pos:{1:[13],2:[8],3:[15]},note:'Ose 1st · Eluigwe Frank 2nd · Emeka 3rd (₦4,000)'},
  {gw:3,awards:{8:10000,15:4000,18:18000},pos:{1:[18],2:[8],3:[15]},note:'Kel Lee 1st · Eluigwe Frank 2nd · Emeka 3rd (₦4,000)'},
  {gw:4,awards:{14:18000,18:4000,19:10000},pos:{1:[14],2:[19],3:[18]},note:'Gege 1st · Paschal 2nd · Kel Lee 3rd (₦4,000)'},
  {gw:5,awards:{13:14000,15:14000,19:4000},pos:{1:[13,15],2:[],3:[19]},note:'Ose & Emeka joint 1st (₦14,000 each) · Paschal 3rd (₦4,000)'},
  {gw:6,awards:{1:5000,7:11000,15:22000},pos:{1:[15],2:[7],3:[1]},note:'Emeka 1st · Yusuf 2nd · Syb 3rd (₦5,000)'},
  {gw:7,awards:{2:1667,3:11000,9:22000,12:1667,15:1667},pos:{1:[9],2:[3],3:[2,12,15]},note:'Hadassah 1st · William 2nd · Emmanuel & Joseph & Emeka joint 3rd (₦1,667 each)'},
  {gw:8,awards:{10:22000,15:11000,18:5000},pos:{1:[10],2:[15],3:[18]},note:'Dafe 1st · Emeka 2nd · Kel Lee 3rd (₦5,000)'},
  {gw:9,awards:{7:22000,15:11000,17:5000},pos:{1:[7],2:[15],3:[17]},note:'Yusuf 1st · Emeka 2nd · Ifeanyi 3rd (₦5,000)'},
  {gw:10,awards:{3:22000,9:5000,10:11000},pos:{1:[3],2:[10],3:[9]},note:'William 1st · Dafe 2nd · Hadassah 3rd (₦5,000)'},
  {gw:11,awards:{3:1667,10:11000,12:22000,13:1667,17:1667},pos:{1:[12],2:[10],3:[3,13,17]},note:'Joseph 1st · Dafe 2nd · William & Ose & Ifeanyi joint 3rd (₦1,667 each)'},
  {gw:12,awards:{3:22000,5:11000,10:5000},pos:{1:[3],2:[5],3:[10]},note:'William 1st · Kingz 2nd · Dafe 3rd (₦5,000)'},
  {gw:13,awards:{0:5000,15:22000,16:11000},pos:{1:[15],2:[16],3:[0]},note:'Emeka 1st · Koded City 2nd · Osahon 3rd (₦5,000)'},
  {gw:14,awards:{2:22000,8:8000,16:8000},pos:{1:[2],2:[8,16],3:[]},note:'Emmanuel 1st · Eluigwe Frank & Koded City joint 2nd (₦8,000 each)'},
  {gw:15,awards:{0:22000,9:11000,14:5000},pos:{1:[0],2:[9],3:[14]},note:'Osahon 1st · Hadassah 2nd · Gege 3rd (₦5,000)'},
  {gw:16,awards:{2:2500,3:11000,4:24000,9:2500},pos:{1:[4],2:[3],3:[2,9]},note:'Hensalos 1st · William 2nd · Emmanuel & Hadassah joint 3rd (₦2,500 each)'},
  {gw:17,awards:{2:17500,8:17500,10:5000},pos:{1:[2,8],2:[],3:[10]},note:'Emmanuel & Eluigwe Frank joint 1st (₦17,500 each) · Dafe 3rd (₦5,000)'},
  {gw:18,awards:{1:24000,5:11000,13:5000},pos:{1:[1],2:[5],3:[13]},note:'Syb 1st · Kingz 2nd · Ose 3rd (₦5,000)'},
  {gw:19,awards:{5:5000,10:24000,16:11000},pos:{1:[10],2:[16],3:[5]},note:'Dafe 1st · Koded City 2nd · Kingz 3rd (₦5,000)'},
  {gw:20,awards:{0:2500,10:2500,14:11000,18:24000},pos:{1:[18],2:[14],3:[0,10]},note:'Kel Lee 1st · Gege 2nd · Osahon & Dafe joint 3rd (₦2,500 each)'},
  {gw:21,awards:{1:5000,2:22000,3:11000},pos:{1:[2],2:[3],3:[1]},note:'Emmanuel 1st · William 2nd · Syb 3rd (₦5,000)'},
  {gw:22,awards:{1:22000,7:11000,15:5000},pos:{1:[1],2:[7],3:[15]},note:'Syb 1st · Yusuf 2nd · Emeka 3rd (₦5,000)'},
  {gw:23,awards:{2:2500,9:2500,16:22000,17:11000},pos:{1:[16],2:[17],3:[2,9]},note:'Koded City 1st · Ifeanyi 2nd · Emmanuel & Hadassah joint 3rd (₦2,500 each)'},
  {gw:24,awards:{5:22000,9:5000,13:11000},pos:{1:[5],2:[13],3:[9]},note:'Kingz 1st · Ose 2nd · Hadassah 3rd (₦5,000)'},
  {gw:25,awards:{5:11000,6:2500,13:2500,18:22000},pos:{1:[18],2:[5],3:[6,13]},note:'Kel Lee 1st · Kingz 2nd · AWB & Ose joint 3rd (₦2,500 each)'},
  {gw:26,awards:{6:11000,7:22000,18:5000},pos:{1:[7],2:[6],3:[18]},note:'Yusuf 1st · AWB 2nd · Kel Lee 3rd (₦5,000)'},
  {gw:27,awards:{2:11000,3:22000,10:2500,12:2500},pos:{1:[3],2:[2],3:[10,12]},note:'William 1st · Emmanuel 2nd · Dafe & Joseph joint 3rd (₦2,500 each)'},
  {gw:28,awards:{1:22000,2:11000,8:5000},pos:{1:[1],2:[2],3:[8]},note:'Syb 1st · Emmanuel 2nd · Eluigwe Frank 3rd (₦5,000)'},
  {gw:29,awards:{9:22000,16:8000,17:8000},pos:{1:[9],2:[16,17],3:[]},note:'Hadassah 1st · Koded City & Ifeanyi joint 2nd (₦8,000 each)'},
  {gw:30,awards:{6:12667,8:12667,10:12667},pos:{1:[6,8,10],2:[],3:[]},note:'AWB & Eluigwe Frank & Dafe 3-way 1st (₦12,667 each)'},
  {gw:31,awards:{6:8000,8:8000,10:22000},pos:{1:[10],2:[6,8],3:[]},note:'Dafe 1st · AWB & Eluigwe Frank joint 2nd (₦8,000 each)'},
  {gw:32,awards:{2:11000,7:5000,17:22000},pos:{1:[17],2:[2],3:[7]},note:'Ifeanyi 1st · Emmanuel 2nd · Yusuf 3rd (₦5,000)'},
  {gw:33,awards:{5:11000,10:5000,16:22000},pos:{1:[16],2:[5],3:[10]},note:'Koded City 1st · Kingz 2nd · Dafe 3rd (₦5,000)'},
  {gw:34,awards:{1:5000,2:11000,14:22000},pos:{1:[14],2:[2],3:[1]},note:'Gege 1st · Emmanuel 2nd · Syb 3rd (₦5,000)'},
  {gw:35,awards:{13:11000,14:22000,15:2500,18:2500},pos:{1:[14],2:[13],3:[15,18]},note:'Gege 1st · Ose 2nd · Emeka & Kel Lee joint 3rd (₦2,500 each)'},
  {gw:36,awards:{2:22000,9:5000,12:11000},pos:{1:[2],2:[12],3:[9]},note:'Emmanuel 1st · Joseph 2nd · Hadassah 3rd (₦5,000)'},
  {gw:37,awards:{10:2500,14:11000,15:2500,18:22000},pos:{1:[18],2:[14],3:[10,15]},note:'Kel Lee 1st · Gege 2nd · Dafe & Emeka joint 3rd (₦2,500 each)'},
];

// Amount already paid to each player; accumulated - this = current outstanding balance
const PAID_OUT=[
   29500, // 0  Osahon
   52334, // 1  Syb
  134167, // 2  Emmanuel
   56001, // 3  William
   16000, // 4  Hensalos
   53000, // 5  Kingz
   34167, // 6  AWB
   60000, // 7  Yusuf
   61501, // 8  Eluigwe Frank
   64000, // 9  Hadassah
   83001, // 10 Dafe
       0, // 11 Dickson
   37167, // 12 Joseph
   52167, // 13 Ose
   52000, // 14 Gege
   94667, // 15 Emeka
   82000, // 16 Koded City
   25667, // 17 Ifeanyi
  102500, // 18 Kel Lee
   14000, // 19 Paschal
];

function buildDefault(){
  const players=INIT_PLAYERS.map((name,i)=>({name,teamName:TEAM_NAMES[i]||'',accumulated:OPENING[i],paidOut:PAID_OUT[i]||0,w1:0,w2:0,w3:0}));
  const gameweeks=[];
  PRESET.forEach(g=>{
    Object.entries(g.awards).forEach(([idx,prize])=>{ players[parseInt(idx)].accumulated+=prize; });
    (g.pos[1]||[]).forEach(i=>players[i].w1++);
    (g.pos[2]||[]).forEach(i=>players[i].w2++);
    (g.pos[3]||[]).forEach(i=>players[i].w3++);
    gameweeks.push({...g});
  });
  const payouts=players.filter(p=>p.paidOut>0).map(p=>({player:p.name,amount:p.paidOut,gw:37}));
  const cp={};
  // Pre-mark cycle 7 (GW31-38) as all 19 active players paid
  cp[6]=Object.fromEntries(CYCLES[6].players.map(i=>[i,true]));
  return {players,gameweeks,payouts,cyclePayments:cp};
}

function load(){
  try{ const s=localStorage.getItem(KEY); if(s) return JSON.parse(s); }catch(e){}
  return buildDefault();
}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){} }

const ADMIN_PIN='0697'; // change this to your preferred PIN
let isAdmin=!!sessionStorage.getItem('ca_admin');
let pendingTab=null;

let state=load();
let activeCycleIdx=null;

function populateSelects(){
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c','po-player','h2h-a','h2h-b','h2h-c'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value;
    el.innerHTML='<option value="">—</option>';
    state.players.forEach((p,i)=>el.innerHTML+=`<option value="${i}">${p.name}</option>`);
    el.value=cur;
  });
}

function getSlots(pre){ return ['a','b','c'].map(s=>document.getElementById(pre+s)?.value).filter(v=>v!==''); }

function calcPrizes(){
  const s1=getSlots('p1'),s2=getSlots('p2'),s3=getSlots('p3');
  if(!s1.length) return {awards:{},lines:[],note:'',positions:{1:[],2:[],3:[]}};
  const awards={};
  const lines=[];
  const notes=[];
  const nm=i=>state.players[parseInt(i)].name;
  const add=(idxs,pool)=>{ const sh=Math.round(pool/idxs.length); idxs.forEach(i=>awards[i]=(awards[i]||0)+sh); return sh; };

  if(s1.length===3){
    const sh=add(s1,PRIZE1+PRIZE2+PRIZE3);
    lines.push(`3-way 1st: ${s1.map(nm).join(', ')} → ₦${sh.toLocaleString()} each`);
    notes.push(`${s1.map(nm).join(', ')} 3-way 1st`);
  } else if(s1.length===2){
    const sh=add(s1,PRIZE1+PRIZE2);
    lines.push(`Joint 1st: ${s1.map(nm).join(' & ')} → ₦${sh.toLocaleString()} each`);
    notes.push(`${s1.map(nm).join(' & ')} joint 1st`);
    if(s3.length){ const sh3=add(s3,PRIZE3); lines.push(`3rd: ${s3.map(nm).join(' & ')} → ₦${sh3.toLocaleString()}${s3.length>1?' each':''}`); notes.push(`${s3.map(nm).join(' & ')} 3rd`); }
  } else {
    add(s1,PRIZE1); lines.push(`1st: ${nm(s1[0])} → ₦${PRIZE1.toLocaleString()}`); notes.push(`${nm(s1[0])} 1st`);
    if(s2.length>=2){
      const pool=s3.length?PRIZE2+PRIZE3:PRIZE2;
      const sh=add(s2,pool);
      lines.push(`Joint 2nd: ${s2.map(nm).join(' & ')} → ₦${sh.toLocaleString()} each`);
      notes.push(`${s2.map(nm).join(' & ')} joint 2nd`);
    } else if(s2.length===1){
      add(s2,PRIZE2); lines.push(`2nd: ${nm(s2[0])} → ₦${PRIZE2.toLocaleString()}`); notes.push(`${nm(s2[0])} 2nd`);
      if(s3.length){ const sh=add(s3,PRIZE3); lines.push(`${s3.length>1?'Joint ':''}3rd: ${s3.map(nm).join(' & ')} → ₦${sh.toLocaleString()}${s3.length>1?' each':''}`); notes.push(`${s3.map(nm).join(' & ')} ${s3.length>1?'joint ':''}3rd`); }
    }
  }
  const positions={1:s1.map(Number),2:s2.map(Number),3:s3.map(Number)};
  return {awards,lines,note:notes.join(' · '),positions};
}

function updatePreview(){
  const box=document.getElementById('prize-preview');
  if(!getSlots('p1').length){ box.classList.add('hidden'); return; }
  const {lines}=calcPrizes();
  box.classList.remove('hidden');
  box.innerHTML=lines.join('<br>');
}
['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c'].forEach(id=>document.getElementById(id)?.addEventListener('change',updatePreview));

async function fetchLatestGW(){
  const btn=document.getElementById('fetch-gw-btn');
  const status=document.getElementById('fetch-gw-status');
  const targetGW=(state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:37)+1;
  btn.disabled=true; status.textContent=`Fetching GW${targetGW}…`;

  try{
    const results=await Promise.all(
      Object.entries(ENTRY_MAP).map(([entryId,playerIdx])=>
        fetch(`${PROXY}${FPL_BASE}/entry/${entryId}/history/`)
          .then(r=>{ if(!r.ok) throw new Error('API '+r.status); return r.json(); })
          .then(d=>{ const row=d.current?.find(r=>r.event===targetGW); return row?{playerIdx,pts:row.points}:null; })
          .catch(()=>null)
      )
    );

    const scores={};
    results.forEach(r=>{ if(r) scores[r.playerIdx]=r.pts; });

    if(!Object.keys(scores).length){
      status.textContent=`GW${targetGW} not available yet — enter manually`;
      btn.disabled=false; return;
    }

    const ranking=Object.entries(scores).map(([i,pts])=>[+i,pts]).sort((a,b)=>b[1]-a[1]);
    const topPts=ranking[0][1];
    const first=ranking.filter(([,pts])=>pts===topPts).map(([i])=>i);
    const rest=ranking.filter(([,pts])=>pts<topPts);

    const fill=(prefix,arr)=>['a','b','c'].forEach((s,i)=>{ const el=document.getElementById(prefix+s); if(el) el.value=arr[i]??''; });
    ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });

    if(first.length>=3){
      fill('p1',first.slice(0,3));
    } else if(first.length===2){
      fill('p1',first);
      if(rest.length){ const tpts=rest[0][1]; fill('p3',rest.filter(([,p])=>p===tpts).map(([i])=>i).slice(0,3)); }
    } else {
      fill('p1',first);
      if(rest.length){
        const spts=rest[0][1];
        const second=rest.filter(([,p])=>p===spts).map(([i])=>i);
        const rest2=rest.filter(([,p])=>p<spts);
        fill('p2',second.slice(0,2));
        if(second.length===1&&rest2.length){ const tpts=rest2[0][1]; fill('p3',rest2.filter(([,p])=>p===tpts).map(([i])=>i).slice(0,3)); }
      }
    }

    updatePreview();
    const found=Object.keys(scores).length;
    status.textContent=`GW${targetGW} loaded (${found} players) — review and record`;
  } catch(err){
    status.textContent=`Failed: ${err.message} — enter manually`;
  }
  btn.disabled=false;
}

function recordGW(){
  if(!getSlots('p1').length){ alert('Select at least 1st place'); return; }
  const {awards,note,positions}=calcPrizes();
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:30;
  Object.entries(awards).forEach(([idx,prize])=>{ state.players[parseInt(idx)].accumulated+=prize; });
  positions[1].forEach(i=>state.players[i].w1++);
  positions[2].forEach(i=>state.players[i].w2++);
  positions[3].forEach(i=>state.players[i].w3++);
  state.gameweeks.push({gw:lastGW+1,awards,pos:positions,note});
  save();
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  document.getElementById('prize-preview').classList.add('hidden');
  renderStandings();
}

function populateHistorySelect(){
  const sel=document.getElementById('hist-gw-sel');
  const cur=sel.value;
  sel.innerHTML='<option value="">— select a gameweek —</option>';
  [...state.gameweeks].reverse().forEach(g=>{ sel.innerHTML+=`<option value="${g.gw}">GW ${g.gw}</option>`; });
  sel.value=cur||( state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:'' );
  renderGWDetail();
}

function renderGWDetail(){
  const sel=document.getElementById('hist-gw-sel');
  const el=document.getElementById('hist-detail');
  const gwNum=parseInt(sel.value);
  if(!gwNum){ el.innerHTML='<div class="empty">select a gameweek above</div>'; return; }
  const g=state.gameweeks.find(x=>x.gw===gwNum);
  if(!g){ el.innerHTML='<div class="empty">no data for GW '+gwNum+'</div>'; return; }
  const nm=i=>state.players[i]?.name||'?';
  function posBlock(arr,label,cls){
    if(!arr||!arr.length) return '';
    const amt=g.awards[arr[0]]||0;
    const perEach=arr.length>1?' each':'';
    const rows=arr.map(i=>`<div style="display:flex;align-items:center;gap:10px"><div class="init">${nm(i).slice(0,2).toUpperCase()}</div><span style="font-weight:500">${nm(i)}</span></div>`).join('');
    return `<div class="pos-group"><div class="pos-label ${cls}">${label} &mdash; ₦${amt.toLocaleString()}${perEach}</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">${rows}</div></div>`;
  }
  el.innerHTML=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><span style="font-size:12px;font-weight:700;color:var(--muted)">GW ${g.gw} results</span><button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;height:28px" onclick="copyGWResults(${g.gw},this)">Copy results</button></div>${posBlock(g.pos[1],'1st place','gold')}${posBlock(g.pos[2],'2nd place','silver')}${posBlock(g.pos[3],'3rd place','bronze')}</div>`;
}

function renderStandings(){
  const sorted=state.players.map((p,i)=>({...p,i})).sort((a,b)=>(b.accumulated-b.paidOut)-(a.accumulated-a.paidOut));
  const totalAcc=state.players.reduce((s,p)=>s+p.accumulated,0);
  const totalPaid=state.players.reduce((s,p)=>s+p.paidOut,0);
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:37;
  document.getElementById('m-gw').textContent=lastGW;
  document.getElementById('m-acc').textContent='₦'+(totalAcc-totalPaid).toLocaleString();
  document.getElementById('m-paid').textContent='₦'+totalPaid.toLocaleString();
  const rC=r=>r===0?'rank-1':r===1?'rank-2':r===2?'rank-3':'rank-n';
  const rL=r=>r===0?'#1':r===1?'#2':r===2?'#3':`#${r+1}`;
  document.getElementById('standings-body').innerHTML=sorted.map((p,rank)=>{
    const bal=p.accumulated-p.paidOut;
    const podiumCls=rank===0?'podium-1':rank===1?'podium-2':rank===2?'podium-3':'';
    return `<tr onclick="openProfile(${p.i})" style="cursor:pointer"${podiumCls?' class="'+podiumCls+'"':''} >
      <td><span class="${rC(rank)}">${rL(rank)}</span></td>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="init">${p.name.slice(0,2).toUpperCase()}</div><span style="font-weight:500">${p.name}</span></div></td>
      <td><span style="font-size:.85rem;color:var(--muted)">${p.teamName||'—'}</span></td>
      <td><span class="wins"><span class="w1">🥇${p.w1||0}</span><span class="w2">🥈${p.w2||0}</span><span class="w3">🥉${p.w3||0}</span></span></td>
      <td><span class="${bal>0?'bal-pos':'bal-zero'}">₦${bal.toLocaleString()}</span></td>
      <td><span class="mono" style="color:var(--muted)">₦${p.accumulated.toLocaleString()}</span></td>
      <td><span class="mono" style="color:var(--muted)">₦${p.paidOut.toLocaleString()}</span></td>
    </tr>`;
  }).join('');
  renderSeasonSummary();
  renderEarningsChart();
}

function updatePayoutInfo(){
  const idx=document.getElementById('po-player').value;
  const box=document.getElementById('po-info');
  if(!idx){ box.classList.add('hidden'); return; }
  const p=state.players[parseInt(idx)];
  const bal=p.accumulated-p.paidOut;
  box.classList.remove('hidden');
  box.innerHTML=`accumulated: ₦${p.accumulated.toLocaleString()} &nbsp;·&nbsp; paid out: ₦${p.paidOut.toLocaleString()} &nbsp;·&nbsp; <strong>balance: ₦${bal.toLocaleString()}</strong>`;
  document.getElementById('po-amt').value=bal>0?bal:'';
}

function processPayout(){
  const idx=document.getElementById('po-player').value;
  const amt=parseFloat(document.getElementById('po-amt').value);
  if(!idx){ alert('Select a player'); return; }
  if(!amt||amt<=0){ alert('Enter a valid amount'); return; }
  const p=state.players[parseInt(idx)];
  const bal=p.accumulated-p.paidOut;
  if(amt>bal){ alert(`Max available is ₦${bal.toLocaleString()}`); return; }
  p.paidOut+=amt;
  state.payouts.push({player:p.name,amount:amt,gw:state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:37});
  save(); updatePayoutInfo(); renderPayoutLog(); renderStandings();
}

function renderPayoutLog(){
  const el=document.getElementById('payout-log');
  if(!state.payouts.length){ el.innerHTML='<div class="empty">no payouts recorded</div>'; return; }
  el.innerHTML=[...state.payouts].reverse().map(p=>{
    const gwLabel=typeof p.gw==='number'?`GW${p.gw}`:p.gw;
    return `<div class="gw-item"><span class="gw-num">${gwLabel}</span><span class="gw-detail">${p.player} — <strong style="color:var(--accent)">₦${p.amount.toLocaleString()}</strong> paid out</span></div>`;
  }).join('');
}

function renderPayments(){
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:37;
  const curCycle=Math.min(Math.floor((lastGW-1)/5),CYCLES.length-1);
  const curData=CYCLES[curCycle];
  const curCP=state.cyclePayments[curCycle]||{};
  const curPaid=curData.players.filter(i=>curCP[i]).length;
  document.getElementById('m-cycle').textContent=curCycle+1;
  document.getElementById('m-cycle-paid').textContent=curPaid+'/'+curData.players.length;
  renderDebtTracker();
  document.getElementById('cycle-grid').innerHTML=CYCLES.map((c,i)=>{
    const cp=state.cyclePayments[i]||{};
    const paid=c.players.filter(j=>cp[j]).length;
    const pct=Math.round((paid/c.players.length)*100);
    const isCur=i===curCycle;
    return `<div class="cycle-card" style="${isCur?'border-color:var(--accent);border-width:2px':''}">
      <div style="font-size:11px;font-weight:700;color:${isCur?'var(--accent)':'var(--muted)'};margin-bottom:3px">${isCur?'▶ ':''}Cycle ${i+1}</div>
      <div style="font-size:11px;color:var(--dim);font-family:'JetBrains Mono','Fira Code',monospace;margin-bottom:3px">GW${c.gw[0]}–${c.gw[1]}</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:6px">₦${c.fee.toLocaleString()}</div>
      <div style="font-family:'JetBrains Mono','Fira Code',monospace;font-size:18px;font-weight:600;color:var(--text)">${paid}<span style="color:var(--dim);font-size:13px">/${c.players.length}</span></div>
      <div class="cycle-bar"><div class="cycle-bar-fill" style="width:${pct}%"></div></div>
      <button class="btn btn-ghost" style="padding:4px 10px;font-size:.7rem;width:100%;margin-top:4px" onclick="openCycleModal(${i})">Manage</button>
    </div>`;
  }).join('');
}

function openCycleModal(idx){
  activeCycleIdx=idx;
  const c=CYCLES[idx];
  document.getElementById('modal-title').textContent=`Cycle ${idx+1} — GW${c.gw[0]}–${c.gw[1]} — ₦${c.fee.toLocaleString()}`;
  const cp=state.cyclePayments[idx]||{};
  document.getElementById('modal-checklist').innerHTML=c.players.map(i=>{
    const p=state.players[i];
    const bal=p.accumulated-p.paidOut;
    const type=cp[i]; // true/'cash'/'winnings'/undefined
    const isCash=type===true||type==='cash';
    const isWin=type==='winnings';
    const canWin=!isCash&&!isWin&&bal>=c.fee;
    return `<div class="check-item" style="flex-wrap:wrap">
      <input type="checkbox" id="cp${i}" ${isCash?'checked':''} onchange="if(this.checked){var w=document.getElementById('cpw${i}');if(w)w.checked=false;}">
      <label for="cp${i}" style="flex:1">${p.name}</label>
      <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--dim);margin-right:4px">₦${bal.toLocaleString()}</span>
      <span class="${isCash||isWin?'paid-tag':'unpaid-tag'}">${isWin?'✓ winnings':isCash?'✓ cash':'—'}</span>
      ${canWin||isWin?`<div style="width:100%;padding:4px 0 0 23px;display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="cpw${i}" ${isWin?'checked':''} onchange="if(this.checked)document.getElementById('cp${i}').checked=false">
        <label for="cpw${i}" style="font-size:12px;color:var(--accent);cursor:pointer">pay ₦${c.fee.toLocaleString()} from winnings</label>
      </div>`:''}
    </div>`;
  }).join('');
  document.getElementById('cycle-overlay').classList.add('open');
}

function saveCycle(){
  const c=CYCLES[activeCycleIdx];
  const prevCP=state.cyclePayments[activeCycleIdx]||{};
  const newCP={};
  c.players.forEach(i=>{
    const winEl=document.getElementById('cpw'+i);
    const cashEl=document.getElementById('cp'+i);
    if(winEl?.checked) newCP[i]='winnings';
    else if(cashEl?.checked) newCP[i]='cash';
  });
  c.players.forEach(i=>{
    const prev=prevCP[i];
    const next=newCP[i];
    if(next==='winnings'&&prev!=='winnings'){
      state.players[i].paidOut+=c.fee;
      state.payouts.push({player:state.players[i].name,amount:c.fee,gw:`Cycle ${activeCycleIdx+1} fee`});
    } else if(prev==='winnings'&&next!=='winnings'){
      state.players[i].paidOut-=c.fee;
      const label=`Cycle ${activeCycleIdx+1} fee`;
      let pIdx=-1;
      for(let j=state.payouts.length-1;j>=0;j--){
        if(state.payouts[j].player===state.players[i].name&&state.payouts[j].gw===label&&state.payouts[j].amount===c.fee){pIdx=j;break;}
      }
      if(pIdx!==-1) state.payouts.splice(pIdx,1);
    }
  });
  state.cyclePayments[activeCycleIdx]=newCP;
  save(); closeModal(); renderPayments(); renderStandings();
}
function closeModal(){ document.getElementById('cycle-overlay').classList.remove('open'); }
document.getElementById('cycle-overlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeModal(); });

function renderAdminPlayers(){
  const el=document.getElementById('admin-player-list'); if(!el) return;
  el.innerHTML=state.players.map((p,i)=>`
    <div class="player-row">
      <div class="init">${p.name.slice(0,2).toUpperCase()}</div>
      <span style="flex:1;font-size:.9rem;font-weight:500">${p.name}</span>
      <input type="text" value="${p.teamName||''}" placeholder="Team name" onblur="setTeamName(${i},this.value)" style="font-size:.75rem;padding:3px 6px;background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text);width:130px;margin-right:8px">
      <span class="mono" style="font-size:.75rem;color:var(--muted);margin-right:8px">₦${(p.accumulated-p.paidOut).toLocaleString()}</span>
      <button class="btn btn-ghost" style="padding:3px 10px;font-size:.7rem;color:var(--red);border-color:#fca5a5" onclick="removePlayer(${i})">Remove</button>
    </div>`).join('');
}

function setTeamName(idx,val){
  state.players[idx].teamName=val.trim();
  save(); renderStandings();
}

function addPlayer(){
  const name=document.getElementById('new-player-name').value.trim();
  if(!name){ alert('Enter a player name'); return; }
  if(state.players.find(p=>p.name.toLowerCase()===name.toLowerCase())){ alert('Player already exists'); return; }
  state.players.push({name,teamName:'',accumulated:0,paidOut:0,w1:0,w2:0,w3:0});
  save(); document.getElementById('new-player-name').value='';
  renderAdminPlayers(); populateSelects(); renderStandings();
}

function removePlayer(idx){
  if(!confirm(`Remove ${state.players[idx].name}? This cannot be undone.`)) return;
  state.players.splice(idx,1);
  save(); renderAdminPlayers(); populateSelects(); renderStandings();
}

function confirmReset(){
  if(!confirm('Reset all data for a new season? Player names are kept but all results, prizes and payments will be cleared.')) return;
  state.players=state.players.map(p=>({name:p.name,teamName:p.teamName||'',accumulated:0,paidOut:0,w1:0,w2:0,w3:0}));
  state.gameweeks=[]; state.payouts=[]; state.cyclePayments={};
  save(); renderStandings(); renderAdminPlayers(); renderHistory();
  alert('Season reset. Ready for a new season!');
}

const TAB_COLORS={standings:'#6b21a8',history:'#0d9488',gameweek:'#d97706',payout:'#16a34a',payments:'#2563eb',admin:'#e11d48'};
function showTab(t){
  if((t==='admin'||t==='payout'||t==='payments'||t==='gameweek')&&!isAdmin){ requireAdmin(t); return; }
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelector(`[onclick="showTab('${t}')"]`).classList.add('active');
  document.getElementById('sec-'+t).classList.add('active');
  if(t==='standings') renderStandings();
  if(t==='payout'){ populateSelects(); renderPayoutLog(); }
  if(t==='payments') renderPayments();
  if(t==='history') populateHistorySelect();
  if(t==='gameweek') populateSelects();
  if(t==='admin') renderAdminPlayers();
}

function requireAdmin(tab){
  pendingTab=tab;
  document.getElementById('pin-input').value='';
  document.getElementById('pin-error').style.display='none';
  document.getElementById('pin-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('pin-input').focus(),50);
}

function submitPin(){
  if(document.getElementById('pin-input').value===ADMIN_PIN){
    isAdmin=true;
    sessionStorage.setItem('ca_admin','1');
    closePinModal();
    if(pendingTab){ showTab(pendingTab); pendingTab=null; }
  } else {
    document.getElementById('pin-error').style.display='block';
    document.getElementById('pin-input').select();
  }
}

function closePinModal(){
  document.getElementById('pin-overlay').classList.remove('open');
  pendingTab=null;
}

populateSelects();
renderStandings();

// ── Season summary ────────────────────────────────────────────────────────────
function renderSeasonSummary(){
  const el=document.getElementById('season-summary-card');
  if(!el) return;
  if(!state.gameweeks.length){ el.style.display='none'; return; }
  el.style.display='';
  const totalPot=state.players.reduce((s,p)=>s+p.accumulated,0);
  let bigWin={player:'',amount:0,gw:0};
  state.gameweeks.forEach(g=>{
    Object.entries(g.awards).forEach(([idx,amt])=>{ if(amt>bigWin.amount) bigWin={player:state.players[parseInt(idx)]?.name||'?',amount:amt,gw:g.gw}; });
  });
  const topPlayer=[...state.players].sort((a,b)=>(b.w1+b.w2+b.w3)-(a.w1+a.w2+a.w3))[0];
  const topEarner=[...state.players].sort((a,b)=>b.accumulated-a.accumulated)[0];
  el.innerHTML=`<div style="margin:-1.25rem -1.25rem 1rem;padding:.6rem 1.25rem;background:linear-gradient(90deg,#6b21a8 0%,#00c875 100%);border-radius:7px 7px 0 0">
      <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:.04em">SEASON OVERVIEW</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
      <div style="background:#f0e6ff;border-radius:8px;padding:.75rem"><div style="font-size:11px;color:#7c3aed;margin-bottom:2px">Total distributed</div><div style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:600;color:#6b21a8">₦${totalPot.toLocaleString()}</div><div style="font-size:11px;color:#a78bfa">across ${state.gameweeks.length} gameweeks</div></div>
      <div style="background:#f0e6ff;border-radius:8px;padding:.75rem"><div style="font-size:11px;color:#7c3aed;margin-bottom:2px">Biggest single win</div><div style="font-weight:700;font-size:14px;color:#3b0764">${bigWin.player}</div><div style="font-size:11px;color:#a78bfa">₦${bigWin.amount.toLocaleString()} · GW${bigWin.gw}</div></div>
      <div style="background:#f0e6ff;border-radius:8px;padding:.75rem"><div style="font-size:11px;color:#7c3aed;margin-bottom:2px">Most podiums</div><div style="font-weight:700;font-size:14px;color:#3b0764">${topPlayer.name}</div><div style="font-size:11px;color:#a78bfa">${topPlayer.w1+topPlayer.w2+topPlayer.w3} finishes</div></div>
      <div style="background:#f0e6ff;border-radius:8px;padding:.75rem"><div style="font-size:11px;color:#7c3aed;margin-bottom:2px">Top earner</div><div style="font-weight:700;font-size:14px;color:#3b0764">${topEarner.name}</div><div style="font-size:11px;color:#a78bfa">₦${topEarner.accumulated.toLocaleString()} total</div></div>
    </div>`;
}

// ── Earnings chart ────────────────────────────────────────────────────────────
function renderEarningsChart(){
  const el=document.getElementById('earnings-chart');
  if(!el) return;
  const players=[...state.players].map((p,i)=>({...p,i})).filter(p=>p.accumulated>0).sort((a,b)=>b.accumulated-a.accumulated);
  if(!players.length){ el.innerHTML='<div class="empty">No data yet</div>'; return; }
  const max=players[0].accumulated;
  el.innerHTML=players.map(p=>`
    <div style="display:grid;grid-template-columns:100px 1fr 64px;gap:8px;align-items:center;margin-bottom:9px">
      <span style="font-size:12px;font-weight:500;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;color:#6b21a8" onclick="openProfile(${p.i})">${p.name}</span>
      <div style="background:rgba(0,0,0,.07);border-radius:4px;height:10px;overflow:hidden"><div style="background:linear-gradient(90deg,#7c3aed 0%,#00c875 100%);height:100%;width:${Math.round((p.accumulated/max)*100)}%;border-radius:4px"></div></div>
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#374151">₦${Math.round(p.accumulated/1000)}k</span>
    </div>`).join('');
}

// ── Weekly standings ──────────────────────────────────────────────────────────
const weeklyCache={};

function setStandingsView(v){
  const overall=v==='overall';
  document.getElementById('overall-view').classList.toggle('hidden',!overall);
  document.getElementById('weekly-view').classList.toggle('hidden',overall);
  document.getElementById('view-overall-btn').className=overall?'btn':'btn btn-ghost';
  document.getElementById('view-weekly-btn').className=overall?'btn btn-ghost':'btn';
  if(!overall) populateWeeklySelect();
}

function populateWeeklySelect(){
  const sel=document.getElementById('weekly-gw-sel');
  const cur=sel.value;
  sel.innerHTML='<option value="">— select a gameweek —</option>';
  [...state.gameweeks].reverse().forEach(g=>{ sel.innerHTML+=`<option value="${g.gw}">GW ${g.gw}</option>`; });
  sel.value=cur||(state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:'');
  if(sel.value) loadWeeklyGW();
}

function loadWeeklyGW(){
  const gwNum=parseInt(document.getElementById('weekly-gw-sel').value);
  const el=document.getElementById('weekly-content');
  if(!gwNum){ el.innerHTML='<div class="empty">select a gameweek above</div>'; return; }
  const gwRecord=state.gameweeks.find(g=>g.gw===gwNum);
  if(!gwRecord){ el.innerHTML=`<div class="empty">GW${gwNum} not recorded yet</div>`; return; }
  renderWeeklyTable(gwNum,gwRecord);
}

function renderWeeklyTable(gwNum,gwRecord){
  const entries=state.players.map((p,i)=>({
    idx:i, name:p.name, teamName:p.teamName,
    prize:gwRecord.awards[i]||0,
    pos:gwRecord.pos[1]?.includes(i)?1:gwRecord.pos[2]?.includes(i)?2:gwRecord.pos[3]?.includes(i)?3:null
  })).sort((a,b)=>b.prize-a.prize);
  const rC=r=>r===1?'rank-1':r===2?'rank-2':r===3?'rank-3':'rank-n';
  const rL=r=>r===1?'1st':r===2?'2nd':r===3?'3rd':'—';
  document.getElementById('weekly-content').innerHTML=`<div class="card"><div class="card-title">GW ${gwNum} — prize results</div><div class="tbl-wrap"><table>
    <thead><tr><th>Pos</th><th>Player</th><th>Team</th><th>Prize</th></tr></thead>
    <tbody>${entries.map(e=>{
      const podiumCls=e.pos===1?'podium-1':e.pos===2?'podium-2':e.pos===3?'podium-3':'';
      return `<tr${podiumCls?' class="'+podiumCls+'"':''} onclick="openProfile(${e.idx})" style="cursor:pointer">
        <td><span class="${rC(e.pos)}">${rL(e.pos)}</span></td>
        <td><div style="display:flex;align-items:center;gap:10px"><div class="init">${e.name.slice(0,2).toUpperCase()}</div><span style="font-weight:500">${e.name}</span></div></td>
        <td><span style="font-size:.85rem;color:var(--muted)">${e.teamName||'—'}</span></td>
        <td>${e.prize>0?`<span class="bal-pos">₦${e.prize.toLocaleString()}</span>`:'<span style="color:var(--dim)">—</span>'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div>`;
}

// ── Head-to-head ──────────────────────────────────────────────────────────────
function renderH2H(){
  const vals=['h2h-a','h2h-b','h2h-c'].map(id=>document.getElementById(id).value).filter(v=>v!=='');
  const el=document.getElementById('h2h-result');
  if(vals.length<2||new Set(vals).size<vals.length){
    el.innerHTML='<div class="empty" style="padding:1rem">select two or three different players to compare</div>';
    return;
  }
  const idxs=vals.map(Number);
  const ps=idxs.map(i=>state.players[i]);
  let allSameGW=0;
  state.gameweeks.forEach(g=>{ if(idxs.every(i=>(g.awards[i]||0)>0)) allSameGW++; });
  const hi=(arr,v)=>{ const max=Math.max(...arr),min=Math.min(...arr); return v===max&&arr.filter(x=>x===max).length===1?'color:var(--accent);font-weight:700':v===min&&arr.filter(x=>x===min).length===1?'color:var(--dim)':''; };
  const row=(label,getVal,fmt=v=>v)=>{
    const rv=ps.map((_,i)=>getVal(i));
    return `<tr><td style="font-size:12px;color:var(--muted);padding:8px 4px;border-bottom:1px solid var(--border)">${label}</td>${rv.map(v=>`<td style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:13px;padding:8px 4px;border-bottom:1px solid var(--border);${hi(rv,v)}">${fmt(v)}</td>`).join('')}</tr>`;
  };
  el.innerHTML=`<table style="width:100%;border-collapse:collapse">
    <thead><tr><th style="font-size:11px;color:var(--muted);padding:6px 4px;text-align:left;font-weight:500"></th>${ps.map(p=>`<th style="font-size:13px;font-weight:700;text-align:center;padding:6px 4px">${p.name}</th>`).join('')}</tr></thead>
    <tbody>
      ${row('Accumulated',i=>ps[i].accumulated,v=>'₦'+v.toLocaleString())}
      ${row('Balance',i=>ps[i].accumulated-ps[i].paidOut,v=>'₦'+v.toLocaleString())}
      ${row('Podiums',i=>ps[i].w1+ps[i].w2+ps[i].w3)}
      ${row('1st places',i=>ps[i].w1)}
      ${row('2nd places',i=>ps[i].w2)}
      ${row('3rd places',i=>ps[i].w3)}
    </tbody>
  </table>
  <div style="margin-top:8px;font-size:12px;color:var(--muted);text-align:center">${ps.length===3?'All 3':'Both'} on podium same GW: <strong style="color:var(--text)">${allSameGW}</strong></div>`;
}

// ── Player profile ────────────────────────────────────────────────────────────
function openProfile(idx){
  const p=state.players[idx];
  const history=state.gameweeks.filter(g=>(g.awards[idx]||0)>0).map(g=>({gw:g.gw,amount:g.awards[idx]})).reverse();
  const bal=p.accumulated-p.paidOut;
  document.getElementById('profile-name').textContent=p.name+(p.teamName?' · '+p.teamName:'');
  document.getElementById('profile-content').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.25rem">
      <div style="background:var(--surface2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:3px">Accumulated</div><div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600">₦${p.accumulated.toLocaleString()}</div></div>
      <div style="background:var(--surface2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:3px">Paid out</div><div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600">₦${p.paidOut.toLocaleString()}</div></div>
      <div style="background:var(--surface2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:3px">Balance</div><div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;color:${bal>0?'var(--green)':'var(--dim)'}">₦${bal.toLocaleString()}</div></div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:1.25rem"><span class="w1">🥇${p.w1} 1st</span><span class="w2">🥈${p.w2} 2nd</span><span class="w3">🥉${p.w3} 3rd</span></div>
    <div style="font-size:12px;color:var(--muted);font-weight:700;margin-bottom:8px;letter-spacing:.01em">PRIZE HISTORY</div>
    ${history.length?history.map(g=>`<div class="gw-item"><span class="gw-num">GW${g.gw}</span><span class="gw-detail"><strong style="color:var(--accent)">₦${g.amount.toLocaleString()}</strong></span></div>`).join(''):'<div class="empty">No prizes yet</div>'}`;
  document.getElementById('profile-overlay').classList.add('open');
}
function closeProfile(){ document.getElementById('profile-overlay').classList.remove('open'); }
document.getElementById('profile-overlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeProfile(); });

// ── Copy GW results ───────────────────────────────────────────────────────────
function copyGWResults(gwNum,btn){
  const g=state.gameweeks.find(x=>x.gw===gwNum); if(!g) return;
  const nm=i=>state.players[i]?.name||'?';
  const medal=pos=>pos===1?'1st':pos===2?'2nd':'3rd';
  const lines=[`GW${gwNum} Results — Challenge Arena`,`─────────────────────`];
  [1,2,3].forEach(pos=>{
    const arr=g.pos[pos]||[]; if(!arr.length) return;
    const amt=g.awards[arr[0]]||0;
    lines.push(`${medal(pos)}: ${arr.map(nm).join(' & ')} — ₦${amt.toLocaleString()}${arr.length>1?' each':''}`);
  });
  navigator.clipboard.writeText(lines.join('\n')).then(()=>{ const orig=btn.textContent; btn.textContent='Copied!'; setTimeout(()=>btn.textContent=orig,2000); }).catch(()=>alert('Copy failed — try manually'));
}

// ── Debt tracker ──────────────────────────────────────────────────────────────
function renderDebtTracker(){
  const el=document.getElementById('debt-tracker'); if(!el) return;
  const debtors=CYCLES.map((c,ci)=>{
    const cp=state.cyclePayments[ci]||{};
    const unpaid=c.players.filter(i=>!cp[i]).map(i=>state.players[i]?.name||'?');
    return unpaid.length?{cycle:ci+1,gw:`GW${c.gw[0]}–${c.gw[1]}`,fee:c.fee,unpaid}:null;
  }).filter(Boolean);
  if(!debtors.length){ el.innerHTML=`<div class="card"><div class="card-title">Outstanding fees</div><div style="font-size:13px;color:var(--green);font-weight:500">All cycle fees accounted for.</div></div>`; return; }
  el.innerHTML=`<div class="card"><div class="card-title">Outstanding fees</div>${debtors.map(d=>`<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px;font-weight:700">Cycle ${d.cycle} · ${d.gw}</span><span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--muted)">₦${d.fee.toLocaleString()}/player</span></div><div style="font-size:12px;color:var(--red)">${d.unpaid.join(', ')}</div></div>`).join('')}</div>`;
}

// ── Sync names from FPL ───────────────────────────────────────────────────────
async function syncFromFPL(){
  const btn=document.getElementById('sync-fpl-btn');
  const status=document.getElementById('sync-fpl-status');
  btn.disabled=true; status.textContent='Fetching from FPL…';
  try{
    const results=await Promise.all(
      Object.entries(ENTRY_MAP).map(([entryId,playerIdx])=>
        fetch(`${PROXY}${FPL_BASE}/entry/${entryId}/`)
          .then(r=>{ if(!r.ok) throw new Error('API '+r.status); return r.json(); })
          .then(d=>({ playerIdx, name:(d.player_first_name+' '+d.player_last_name).trim(), teamName:d.name||d.entry_name||'' }))
          .catch(()=>null)
      )
    );
    let updated=0;
    results.forEach(r=>{
      if(!r) return;
      const p=state.players[r.playerIdx]; if(!p) return;
      p.name=r.name||p.name;
      p.teamName=r.teamName||p.teamName;
      updated++;
    });
    save(); renderAdminPlayers(); populateSelects(); renderStandings();
    status.textContent=`Updated ${updated} players`;
  } catch(err){
    status.textContent=`Failed: ${err.message}`;
  }
  btn.disabled=false;
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(){
  const sorted=[...state.players].map((p,i)=>({...p,i})).sort((a,b)=>(b.accumulated-b.paidOut)-(a.accumulated-a.paidOut));
  const header=['Rank','Player','Team','1st','2nd','3rd','Podiums','Money in bank','Total earnings','Paid Out'];
  const rows=sorted.map((p,rank)=>[rank+1,p.name,p.teamName||'',p.w1,p.w2,p.w3,p.w1+p.w2+p.w3,p.accumulated-p.paidOut,p.accumulated,p.paidOut]);
  const csv=[header,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='challenge-arena-standings.csv';
  a.click();
}
