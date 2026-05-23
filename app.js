const PRIZE1=22000,PRIZE2=11000,PRIZE3=5000;
const KEY='challenge_arena_v1';

const INIT_PLAYERS=[
  'Osahon','Syb','Emmanuel','William','Hensalos','Kingz','AWB','Yusuf',
  'Eluigwe Frank','Hadassah','Dafe','Dickson','Joseph','Ose','Gege','Emeka',
  'Koded City','Ifeanyi','Kel Lee'
];
// idx: 0=Osahon,1=Syb,2=Emmanuel,3=William,4=Hensalos,5=Kingz,6=AWB,7=Yusuf
//      8=EluigweFrank,9=Hadassah,10=Dafe,11=Dickson,12=Joseph,13=Ose,14=Gege
//      15=Emeka,16=KodedCity,17=Ifeanyi,18=KelLee

const OPENING=[0,32666,42500,44666,8000,14000,7666,6000,1666,6000,12666,0,0,0,0,0,0,0,0];

const PRESET=[
  {gw:31,awards:{10:22000,6:8000,8:8000},note:'Dafe 1st · AWB & Eluigwe Frank joint 2nd (₦8k each)'},
  {gw:32,awards:{17:22000,2:11000,7:5000},note:'Ifeanyi 1st · Emmanuel 2nd · Yusuf 3rd'},
  {gw:33,awards:{16:22000,5:11000,10:5000},note:'Koded City 1st · Kingz 2nd · Dafe 3rd'},
  {gw:34,awards:{14:22000,2:11000,1:5000},note:'Gege 1st · Emmanuel 2nd · Syb 3rd'},
  {gw:35,awards:{14:22000,13:11000,15:2500,18:2500},note:'Gege 1st · Ose 2nd · Emeka & Kel Lee joint 3rd (₦2,500 each)'},
  {gw:36,awards:{2:22000,12:11000,9:5000},note:'Emmanuel 1st · Joseph 2nd · Hadassah 3rd'},
  {gw:37,awards:{18:22000,14:11000,15:2500,10:2500},note:'Kel Lee 1st · Gege 2nd · Emeka & Dafe joint 3rd (₦2,500 each)'},
];

// Fully paid out: 0=Osahon,2=Emmanuel,6=AWB,11=Dickson,12=Joseph,18=KelLee
const PAID_OUT_IDX=[0,2,6,11,12,18];

function buildDefault(){
  const players=INIT_PLAYERS.map((name,i)=>({name,teamName:'',accumulated:OPENING[i],paidOut:0,gwWins:0}));
  const gameweeks=[];
  PRESET.forEach(g=>{
    Object.entries(g.awards).forEach(([idx,prize])=>{
      players[parseInt(idx)].accumulated+=prize;
      players[parseInt(idx)].gwWins+=1;
    });
    gameweeks.push({...g});
  });
  PAID_OUT_IDX.forEach(i=>{ players[i].paidOut=players[i].accumulated; });
  const payouts=PAID_OUT_IDX.filter(i=>players[i].paidOut>0).map(i=>({player:players[i].name,amount:players[i].paidOut,gw:37}));
  const cp={};
  [6,7].forEach(c=>{ cp[c]=Object.fromEntries([...Array(19).keys()].map(i=>[i,true])); });
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
  if(!s1.length) return {awards:{},lines:[],note:''};
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
  return {awards,lines,note:notes.join(' · ')};
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
  const {awards,note}=calcPrizes();
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:30;
  Object.entries(awards).forEach(([idx,prize])=>{ state.players[parseInt(idx)].accumulated+=prize; state.players[parseInt(idx)].gwWins+=1; });
  state.gameweeks.push({gw:lastGW+1,awards,note});
  save();
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  document.getElementById('prize-preview').classList.add('hidden');
  renderHistory(); renderStandings();
}

function renderHistory(){
  const el=document.getElementById('gw-history');
  if(!state.gameweeks.length){ el.innerHTML='<div class="empty">no gameweeks recorded</div>'; return; }
  el.innerHTML=[...state.gameweeks].reverse().map(g=>`<div class="gw-item"><span class="gw-num">GW${g.gw}</span><span class="gw-detail">${g.note}</span></div>`).join('');
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
      <td><span class="mono">${p.gwWins}</span></td>
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
      <div style="font-size:.68rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${isCur?'var(--accent)':'var(--muted)'};margin-bottom:3px">${isCur?'▶ ':''}Cycle ${i+1}</div>
      <div style="font-size:.68rem;color:var(--dim);font-family:'DM Mono',monospace;margin-bottom:6px">GW${start}–${end}</div>
      <div style="font-family:'DM Mono',monospace;font-size:1.1rem;font-weight:500;color:var(--text)">${paid}<span style="color:var(--dim);font-size:.85rem">/${state.players.length}</span></div>
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
  state.players.push({name,teamName:'',accumulated:0,paidOut:0,gwWins:0});
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
  state.players=state.players.map(p=>({name:p.name,teamName:p.teamName||'',accumulated:0,paidOut:0,gwWins:0}));
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
  if(t==='gameweek'){ populateSelects(); renderHistory(); }
  if(t==='admin'){ renderAdminPlayers(); }
}

populateSelects();
renderStandings();
