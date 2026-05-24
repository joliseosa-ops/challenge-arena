const PRIZE1=22000,PRIZE2=11000,PRIZE3=5000;
const KEY='challenge_arena_v4';

const INIT_PLAYERS=[
  'Osahon','Syb','Emmanuel','William','Hensalos','Kingz','AWB','Yusuf',
  'Eluigwe Frank','Hadassah','Dafe','Dickson','Joseph','Ose','Gege','Emeka',
  'Koded City','Ifeanyi','Kel Lee','Paschal'
];
// idx: 0=Osahon,1=Syb,2=Emmanuel,3=William,4=Hensalos,5=Kingz,6=AWB,7=Yusuf
//      8=EluigweFrank,9=Hadassah,10=Dafe,11=Dickson,12=Joseph,13=Ose,14=Gege
//      15=Emeka,16=KodedCity,17=Ifeanyi,18=KelLee,19=Paschal

const OPENING=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

const PRESET=[
  {gw:1,awards:{1:8000,5:8000,14:22000},pos:{1:[14],2:[1,5],3:[]},note:'Gege 1st · Syb & Kingz joint 2nd (₦8,000 each)'},
  {gw:2,awards:{6:22000,8:5000,13:11000},pos:{1:[6],2:[13],3:[8]},note:'AWB 1st · Ose 2nd · Eluigwe Frank 3rd'},
  {gw:3,awards:{6:5000,8:11000,18:22000},pos:{1:[18],2:[8],3:[6]},note:'Kel Lee 1st · Eluigwe Frank 2nd · AWB 3rd'},
  {gw:4,awards:{6:5000,14:22000,19:11000},pos:{1:[14],2:[19],3:[6]},note:'Gege 1st · Paschal 2nd · AWB 3rd'},
  {gw:5,awards:{13:16500,15:16500,19:5000},pos:{1:[13,15],2:[],3:[19]},note:'Ose & Emeka joint 1st (₦16,500 each) · Paschal 3rd'},
  {gw:6,awards:{1:5000,7:11000,15:22000},pos:{1:[15],2:[7],3:[1]},note:'Emeka 1st · Yusuf 2nd · Syb 3rd'},
  {gw:7,awards:{2:1667,3:11000,9:22000,12:1667,15:1667},pos:{1:[9],2:[3],3:[2,12,15]},note:'Hadassah 1st · William 2nd · Emmanuel & Joseph & Emeka joint 3rd (₦1,667 each)'},
  {gw:8,awards:{10:22000,15:11000,18:5000},pos:{1:[10],2:[15],3:[18]},note:'Dafe 1st · Emeka 2nd · Kel Lee 3rd'},
  {gw:9,awards:{7:22000,15:11000,17:5000},pos:{1:[7],2:[15],3:[17]},note:'Yusuf 1st · Emeka 2nd · Ifeanyi 3rd'},
  {gw:10,awards:{3:22000,6:5000,10:11000},pos:{1:[3],2:[10],3:[6]},note:'William 1st · Dafe 2nd · AWB 3rd'},
  {gw:11,awards:{6:11000,10:5000,12:22000},pos:{1:[12],2:[6],3:[10]},note:'Joseph 1st · AWB 2nd · Dafe 3rd'},
  {gw:12,awards:{3:22000,5:11000,6:5000},pos:{1:[3],2:[5],3:[6]},note:'William 1st · Kingz 2nd · AWB 3rd'},
  {gw:13,awards:{6:8000,15:22000,16:8000},pos:{1:[15],2:[6,16],3:[]},note:'Emeka 1st · AWB & Koded City joint 2nd (₦8,000 each)'},
  {gw:14,awards:{2:22000,6:8000,8:8000},pos:{1:[2],2:[6,8],3:[]},note:'Emmanuel 1st · AWB & Eluigwe Frank joint 2nd (₦8,000 each)'},
  {gw:15,awards:{0:22000,9:11000,14:5000},pos:{1:[0],2:[9],3:[14]},note:'Osahon 1st · Hadassah 2nd · Gege 3rd'},
  {gw:16,awards:{2:2500,3:11000,4:22000,9:2500},pos:{1:[4],2:[3],3:[2,9]},note:'Hensalos 1st · William 2nd · Emmanuel & Hadassah joint 3rd (₦2,500 each)'},
  {gw:17,awards:{2:16500,8:16500,10:5000},pos:{1:[2,8],2:[],3:[10]},note:'Emmanuel & Eluigwe Frank joint 1st (₦16,500 each) · Dafe 3rd'},
  {gw:18,awards:{1:22000,5:11000,13:5000},pos:{1:[1],2:[5],3:[13]},note:'Syb 1st · Kingz 2nd · Ose 3rd'},
  {gw:19,awards:{5:5000,10:22000,16:11000},pos:{1:[10],2:[16],3:[5]},note:'Dafe 1st · Koded City 2nd · Kingz 3rd'},
  {gw:20,awards:{0:2500,10:2500,14:11000,18:22000},pos:{1:[18],2:[14],3:[0,10]},note:'Kel Lee 1st · Gege 2nd · Osahon & Dafe joint 3rd (₦2,500 each)'},
  {gw:21,awards:{1:5000,2:22000,3:11000},pos:{1:[2],2:[3],3:[1]},note:'Emmanuel 1st · William 2nd · Syb 3rd'},
  {gw:22,awards:{1:22000,7:11000,15:5000},pos:{1:[1],2:[7],3:[15]},note:'Syb 1st · Yusuf 2nd · Emeka 3rd'},
  {gw:23,awards:{2:2500,9:2500,16:22000,17:11000},pos:{1:[16],2:[17],3:[2,9]},note:'Koded City 1st · Ifeanyi 2nd · Emmanuel & Hadassah joint 3rd (₦2,500 each)'},
  {gw:24,awards:{5:22000,9:5000,13:11000},pos:{1:[5],2:[13],3:[9]},note:'Kingz 1st · Ose 2nd · Hadassah 3rd'},
  {gw:25,awards:{5:11000,6:2500,13:2500,18:22000},pos:{1:[18],2:[5],3:[6,13]},note:'Kel Lee 1st · Kingz 2nd · AWB & Ose joint 3rd (₦2,500 each)'},
  {gw:26,awards:{6:11000,7:22000,18:5000},pos:{1:[7],2:[6],3:[18]},note:'Yusuf 1st · AWB 2nd · Kel Lee 3rd'},
  {gw:27,awards:{2:11000,3:22000,10:2500,12:2500},pos:{1:[3],2:[2],3:[10,12]},note:'William 1st · Emmanuel 2nd · Dafe & Joseph joint 3rd (₦2,500 each)'},
  {gw:28,awards:{1:22000,2:11000,8:5000},pos:{1:[1],2:[2],3:[8]},note:'Syb 1st · Emmanuel 2nd · Eluigwe Frank 3rd'},
  {gw:29,awards:{9:22000,16:8000,17:8000},pos:{1:[9],2:[16,17],3:[]},note:'Hadassah 1st · Koded City & Ifeanyi joint 2nd (₦8,000 each)'},
  {gw:30,awards:{6:12667,8:12667,10:12667},pos:{1:[6,8,10],2:[],3:[]},note:'AWB & Eluigwe Frank & Dafe 3-way 1st (₦12,667 each)'},
  {gw:31,awards:{6:8000,8:8000,10:22000},pos:{1:[10],2:[6,8],3:[]},note:'Dafe 1st · AWB & Eluigwe Frank joint 2nd (₦8,000 each)'},
  {gw:32,awards:{2:11000,7:5000,17:22000},pos:{1:[17],2:[2],3:[7]},note:'Ifeanyi 1st · Emmanuel 2nd · Yusuf 3rd'},
  {gw:33,awards:{5:11000,10:5000,16:22000},pos:{1:[16],2:[5],3:[10]},note:'Koded City 1st · Kingz 2nd · Dafe 3rd'},
  {gw:34,awards:{1:5000,2:11000,14:22000},pos:{1:[14],2:[2],3:[1]},note:'Gege 1st · Emmanuel 2nd · Syb 3rd'},
  {gw:35,awards:{13:11000,14:22000,15:2500,18:2500},pos:{1:[14],2:[13],3:[15,18]},note:'Gege 1st · Ose 2nd · Emeka & Kel Lee joint 3rd (₦2,500 each)'},
  {gw:36,awards:{2:22000,9:5000,12:11000},pos:{1:[2],2:[12],3:[9]},note:'Emmanuel 1st · Joseph 2nd · Hadassah 3rd'},
  {gw:37,awards:{10:2500,14:11000,15:2500,18:22000},pos:{1:[18],2:[14],3:[10,15]},note:'Kel Lee 1st · Gege 2nd · Dafe & Emeka joint 3rd (₦2,500 each)'},
];

const PAID_OUT_IDX=[...Array(20).keys()];

function buildDefault(){
  const players=INIT_PLAYERS.map((name,i)=>({name,teamName:'',accumulated:OPENING[i],paidOut:0,w1:0,w2:0,w3:0}));
  const gameweeks=[];
  PRESET.forEach(g=>{
    Object.entries(g.awards).forEach(([idx,prize])=>{ players[parseInt(idx)].accumulated+=prize; });
    (g.pos[1]||[]).forEach(i=>players[i].w1++);
    (g.pos[2]||[]).forEach(i=>players[i].w2++);
    (g.pos[3]||[]).forEach(i=>players[i].w3++);
    gameweeks.push({...g});
  });
  PAID_OUT_IDX.forEach(i=>{ players[i].paidOut=players[i].accumulated; });
  const payouts=PAID_OUT_IDX.filter(i=>players[i].paidOut>0).map(i=>({player:players[i].name,amount:players[i].paidOut,gw:37}));
  const cp={};
  [6,7].forEach(c=>{ cp[c]=Object.fromEntries([...Array(20).keys()].map(i=>[i,true])); });
  return {players,gameweeks,payouts,cyclePayments:cp};
}

function load(){
  try{ const s=localStorage.getItem(KEY); if(s) return JSON.parse(s); }catch(e){}
  return buildDefault();
}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){} }

let state=load();
let activeCycleIdx=null;

function populateSelects(){
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c','po-player'].forEach(id=>{
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
  el.innerHTML=`<div class="card"><div class="card-title">GW ${g.gw} results</div>${posBlock(g.pos[1],'1st place','gold')}${posBlock(g.pos[2],'2nd place','silver')}${posBlock(g.pos[3],'3rd place','bronze')}</div>`;
}

function renderStandings(){
  const sorted=state.players.map((p,i)=>({...p,i})).sort((a,b)=>(b.accumulated-b.paidOut)-(a.accumulated-a.paidOut));
  const totalAcc=state.players.reduce((s,p)=>s+p.accumulated,0);
  const totalPaid=state.players.reduce((s,p)=>s+p.paidOut,0);
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:37;
  document.getElementById('m-gw').textContent=lastGW;
  document.getElementById('hdr-gw').textContent='GW '+lastGW;
  document.getElementById('m-acc').textContent='₦'+(totalAcc-totalPaid).toLocaleString();
  document.getElementById('m-paid').textContent='₦'+totalPaid.toLocaleString();
  const rC=r=>r===0?'rank-1':r===1?'rank-2':r===2?'rank-3':'rank-n';
  const rL=r=>r===0?'#1':r===1?'#2':r===2?'#3':`#${r+1}`;
  document.getElementById('standings-body').innerHTML=sorted.map((p,rank)=>{
    const bal=p.accumulated-p.paidOut;
    return `<tr>
      <td><span class="${rC(rank)}">${rL(rank)}</span></td>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="init">${p.name.slice(0,2).toUpperCase()}</div><span style="font-weight:500">${p.name}</span></div></td>
      <td><span style="font-size:.85rem;color:var(--muted)">${p.teamName||'—'}</span></td>
      <td><span class="wins"><span class="w1">${p.w1||0}</span><span class="w2">${p.w2||0}</span><span class="w3">${p.w3||0}</span></span></td>
      <td><span class="${bal>0?'bal-pos':'bal-zero'}">₦${bal.toLocaleString()}</span></td>
      <td><span class="mono" style="color:var(--muted)">₦${p.paidOut.toLocaleString()}</span></td>
    </tr>`;
  }).join('');
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
  el.innerHTML=[...state.payouts].reverse().map(p=>`<div class="gw-item"><span class="gw-num">GW${p.gw}</span><span class="gw-detail">${p.player} — <strong style="color:var(--accent)">₦${p.amount.toLocaleString()}</strong> paid out</span></div>`).join('');
}

function renderPayments(){
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:37;
  const curCycle=Math.min(Math.ceil(lastGW/5)-1,7);
  document.getElementById('m-cycle').textContent=curCycle+1;
  const cp=state.cyclePayments[curCycle]||{};
  document.getElementById('m-cycle-paid').textContent=Object.keys(cp).length+'/'+state.players.length;
  document.getElementById('cycle-grid').innerHTML=Array.from({length:8},(_,i)=>{
    const start=i*5+1,end=Math.min((i+1)*5,38);
    const paid=Object.keys(state.cyclePayments[i]||{}).length;
    const pct=Math.round((paid/state.players.length)*100);
    const isCur=i===curCycle;
    return `<div class="cycle-card" style="${isCur?'border-color:var(--accent);border-width:2px':''}">
      <div style="font-size:11px;font-weight:600;color:${isCur?'var(--accent)':'var(--muted)'};margin-bottom:3px">${isCur?'▶ ':''}Cycle ${i+1}</div>
      <div style="font-size:11px;color:var(--dim);font-family:'JetBrains Mono','Fira Code',monospace;margin-bottom:6px">GW${start}–${end}</div>
      <div style="font-family:'JetBrains Mono','Fira Code',monospace;font-size:18px;font-weight:600;color:var(--text)">${paid}<span style="color:var(--dim);font-size:13px">/${state.players.length}</span></div>
      <div class="cycle-bar"><div class="cycle-bar-fill" style="width:${pct}%"></div></div>
      <button class="btn btn-ghost" style="padding:4px 10px;font-size:.7rem;width:100%;margin-top:4px" onclick="openCycleModal(${i})">Manage</button>
    </div>`;
  }).join('');
}

function openCycleModal(idx){
  activeCycleIdx=idx;
  const start=idx*5+1,end=Math.min((idx+1)*5,38);
  document.getElementById('modal-title').textContent=`Cycle ${idx+1} — GW${start}–${end} — ₦10,000`;
  const cp=state.cyclePayments[idx]||{};
  document.getElementById('modal-checklist').innerHTML=state.players.map((p,i)=>`
    <div class="check-item">
      <input type="checkbox" id="cp${i}" ${cp[i]?'checked':''}>
      <label for="cp${i}">${p.name}</label>
      <span class="${cp[i]?'paid-tag':'unpaid-tag'}">${cp[i]?'✓ paid':'—'}</span>
    </div>`).join('');
  document.getElementById('cycle-overlay').classList.add('open');
}

function saveCycle(){
  const cp={};
  state.players.forEach((_,i)=>{ if(document.getElementById('cp'+i)?.checked) cp[i]=true; });
  state.cyclePayments[activeCycleIdx]=cp;
  save(); closeModal(); renderPayments();
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

function showTab(t){
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelector(`[onclick="showTab('${t}')"]`).classList.add('active');
  document.getElementById('sec-'+t).classList.add('active');
  if(t==='standings') renderStandings();
  if(t==='payout'){ populateSelects(); renderPayoutLog(); }
  if(t==='payments') renderPayments();
  if(t==='history') populateHistorySelect();
  if(t==='gameweek') populateSelects();
  if(t==='admin'){ renderAdminPlayers(); }
}

populateSelects();
renderStandings();
