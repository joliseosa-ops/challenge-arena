const KEY='challenge_arena_v21';
const WEEKLY_PRIZE_RATE=2000; // ₦2k per player per GW goes to weekly prizes
// prizes() computes dynamically from actual player count — updates when players are added
function prizes(){ const pot=state.players.length*WEEKLY_PRIZE_RATE; return {p1:Math.round(pot*.50),p2:Math.round(pot*.30),p3:Math.round(pot*.20)}; }

// 2026/27 season — 8 cycles, ₦3k/player/GW. players[] is populated dynamically by syncCyclePlayers()
const CYCLES=[
  {gw:[1,5],   fee:15000},
  {gw:[6,10],  fee:15000},
  {gw:[11,15], fee:15000},
  {gw:[16,20], fee:15000},
  {gw:[21,25], fee:15000},
  {gw:[26,30], fee:15000},
  {gw:[31,35], fee:15000},
  {gw:[36,38], fee:9000},
];
function syncCyclePlayers(){ const all=state.players.map((_,i)=>i); CYCLES.forEach(c=>c.players=all); }

// 2026/27 roster
// idx: 0=Osahon, 1=Syb, 2=William, 3=Hensalos, 4=Emeka, 5=Esther, 6=Christopher
const INIT_PLAYERS=['Osahon','Syb','William','Hensalos','Emeka','Esther','Christopher'];

const TEAM_NAMES=[
  'Mainoo Business', // 0  Osahon
  'Mascotas',        // 1  Syb
  'Kop Fc',          // 2  William
  'SosmanFC',        // 3  Hensalos
  'Ross FC',         // 4  Emeka
  'H.S.g',           // 5  Esther
  'Shakabula',       // 6  Christopher
];

const FPL_BASE='https://fplchallenge.premierleague.com/api';
const PROXY='https://corsproxy.io/?';
const ENTRY_MAP={
   642:0, // Osahon
  4893:2, // William
  6255:5, // Esther
  9764:6, // Christopher
  // add Syb, Hensalos, Emeka once they join the FPL Challenge league
};

// Carry-over from 2025/26 — raw outstanding balances (no carry-over for Esther/Christopher)
const OPENING=[0,37666,44666,8000,5000,0,0];

const PRESET=[]; // 2026/27 — populated week by week

// GW1 deadline: 2pm Toronto time (EDT=UTC-4) on 21 Aug 2026, 1hr before 3pm kickoff
const GW1_DEADLINE='2026-08-21T18:00:00.000Z';

function buildDefault(){
  const players=INIT_PLAYERS.map((name,i)=>({name,teamName:TEAM_NAMES[i]||'',accumulated:0,paidOut:0,carryOver:OPENING[i]||0,w1:0,w2:0,w3:0}));
  return {players,gameweeks:[],payouts:[],cyclePayments:{},nextGWDate:null,nextSeasonDate:null};
}

// ── Cloud sync (Supabase) ─────────────────────────────────────────────────────
const SB_URL='https://pbcurdniutfmecwzuzpl.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiY3VyZG5pdXRmbWVjd3p1enBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NTE5NjMsImV4cCI6MjA5NTIyNzk2M30.55K_3wL_eEiDD9jBo3tyCstjujfEcFqWUAJed8s1HWI';
const _sbc=window.supabase.createClient(SB_URL,SB_KEY);

async function syncToCloud(s){
  try{ await _sbc.from('arena_state').upsert({id:1,data:{...s,_key:KEY},updated_at:new Date().toISOString()}); }
  catch(e){ console.warn('Cloud sync failed',e); }
}
async function loadFromCloud(){
  try{
    const {data,error}=await _sbc.from('arena_state').select('data').eq('id',1).single();
    if(error||!data||!data.data||!data.data.players) return null;
    if(!data.data._key || data.data._key!==KEY) return null; // stale version — rebuild
    return data.data;
  }catch(e){ return null; }
}

function load(){
  try{ const s=localStorage.getItem(KEY); if(s) return JSON.parse(s); }catch(e){}
  return buildDefault();
}
function save(){
  try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
  syncToCloud(state);
}

const ADMIN_PIN='0697'; // change this to your preferred PIN
let isAdmin=!!sessionStorage.getItem('ca_admin');
let pendingTab=null;

let state=load();
applyMigrations();
let activeCycleIdx=null;
let currentSort='earnings';

function populateSelects(){
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c','po-player','h2h-a','h2h-b','h2h-c'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value;
    el.innerHTML='<option value="">—</option>';
    state.players.forEach((p,i)=>el.innerHTML+=`<option value="${i}">${p.name}</option>`);
    el.value=cur;
  });
  renderPointsGrid();
}

function renderPointsGrid(){
  const grid=document.getElementById('gw-points-grid'); if(!grid) return;
  grid.innerHTML=state.players.map((p,i)=>`
    <div style="display:flex;align-items:center;gap:6px">
      <div class="init" style="flex-shrink:0">${p.name.slice(0,2).toUpperCase()}</div>
      <span style="font-size:13px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</span>
      <input type="number" id="pts-${i}" min="0" max="200" placeholder="—"
        style="width:clamp(44px,15vw,60px);height:30px;font-size:13px;padding:4px 6px;text-align:center;flex-shrink:0">
    </div>`).join('');
}

function getSlots(pre){ return ['a','b','c'].map(s=>document.getElementById(pre+s)?.value).filter(v=>v!==''); }

function calcPrizes(){
  const s1=getSlots('p1'),s2=getSlots('p2'),s3=getSlots('p3');
  if(!s1.length) return {awards:{},lines:[],note:'',positions:{1:[],2:[],3:[]}};
  const {p1,p2,p3}=prizes();
  const awards={};
  const lines=[];
  const notes=[];
  const nm=i=>state.players[parseInt(i)].name;
  const add=(idxs,pool)=>{ const sh=Math.floor(pool/idxs.length); idxs.forEach(i=>awards[i]=(awards[i]||0)+sh); return sh; };

  if(s1.length===3){
    const sh=add(s1,p1+p2+p3);
    lines.push(`3-way 1st: ${s1.map(nm).join(', ')} → ₦${sh.toLocaleString()} each`);
    notes.push(`${s1.map(nm).join(', ')} 3-way 1st`);
  } else if(s1.length===2){
    const sh=add(s1,p1+p2);
    lines.push(`Joint 1st: ${s1.map(nm).join(' & ')} → ₦${sh.toLocaleString()} each`);
    notes.push(`${s1.map(nm).join(' & ')} joint 1st`);
    if(s3.length){ const sh3=add(s3,p3); lines.push(`3rd: ${s3.map(nm).join(' & ')} → ₦${sh3.toLocaleString()}${s3.length>1?' each':''}`); notes.push(`${s3.map(nm).join(' & ')} 3rd`); }
  } else {
    add(s1,p1); lines.push(`1st: ${nm(s1[0])} → ₦${p1.toLocaleString()}`); notes.push(`${nm(s1[0])} 1st`);
    if(s2.length>=2){
      const pool=s3.length?p2+p3:p2;
      const sh=add(s2,pool);
      lines.push(`Joint 2nd: ${s2.map(nm).join(' & ')} → ₦${sh.toLocaleString()} each`);
      notes.push(`${s2.map(nm).join(' & ')} joint 2nd`);
    } else if(s2.length===1){
      add(s2,p2); lines.push(`2nd: ${nm(s2[0])} → ₦${p2.toLocaleString()}`); notes.push(`${nm(s2[0])} 2nd`);
      if(s3.length){ const sh=add(s3,p3); lines.push(`${s3.length>1?'Joint ':''}3rd: ${s3.map(nm).join(' & ')} → ₦${sh.toLocaleString()}${s3.length>1?' each':''}`); notes.push(`${s3.map(nm).join(' & ')} ${s3.length>1?'joint ':''}3rd`); }
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
  const targetGW=(state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:0)+1;
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
  // collect points
  const points={};
  state.players.forEach((_,i)=>{ const v=document.getElementById('pts-'+i)?.value; if(v!==''&&v!=null) points[i]=parseInt(v)||0; });
  Object.entries(awards).forEach(([idx,prize])=>{ state.players[parseInt(idx)].accumulated+=prize; });
  positions[1].forEach(i=>state.players[i].w1++);
  positions[2].forEach(i=>state.players[i].w2++);
  positions[3].forEach(i=>state.players[i].w3++);
  state.gameweeks.push({gw:lastGW+1,awards,pos:positions,note,points:Object.keys(points).length?points:undefined});
  save();
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  state.players.forEach((_,i)=>{ const e=document.getElementById('pts-'+i); if(e) e.value=''; });
  document.getElementById('prize-preview').classList.add('hidden');
  renderStandings();
}

function setSort(s){
  currentSort=s;
  ['earnings','bank','podiums'].forEach(k=>{
    const btn=document.getElementById('sort-'+k); if(!btn) return;
    btn.className=k===s?'btn':'btn btn-ghost';
    btn.style.cssText='font-size:12px;padding:6px 10px;min-height:36px';
  });
  renderStandings();
}

function formGuide(playerIdx){
  const gws=state.gameweeks.slice(-5);
  const dots=gws.map(g=>{
    const is1=(g.pos[1]||[]).includes(playerIdx);
    const is2=(g.pos[2]||[]).includes(playerIdx);
    const is3=(g.pos[3]||[]).includes(playerIdx);
    const col=is1?'#16a34a':is2?'#eab308':is3?'#f97316':'#ef4444';
    const label=is1?'🥇 1st':is2?'🥈 2nd':is3?'🥉 3rd':'—';
    return `<div title="GW${g.gw}: ${label}" style="width:7px;height:7px;border-radius:50%;background:${col};flex-shrink:0"></div>`;
  });
  const pad=Array(Math.max(0,5-gws.length)).fill('<div style="width:7px;height:7px;border-radius:50%;background:#e5e5e5;opacity:.3;flex-shrink:0"></div>');
  return `<div style="display:flex;gap:3px;margin-top:4px">${[...pad,...dots].join('')}</div>`;
}

// pubBal: this-season balance only (carry-over is a separate admin-only account)
// If paidOut ≤ carryOver, all deductions came from last season → season balance = accumulated
// If paidOut > carryOver, the excess came from this season → deduct only that excess
const pubBal=p=>p.accumulated-Math.max(0,p.paidOut-(p.carryOver||0));
const fullBal=p=>p.accumulated+(p.carryOver||0)-p.paidOut;

function renderStandings(){
  const sorted=state.players.map((p,i)=>({...p,i})).sort((a,b)=>{
    if(currentSort==='bank') return pubBal(b)-pubBal(a);
    if(currentSort==='podiums') return b.w1-a.w1||b.w2-a.w2||b.w3-a.w3;
    return b.accumulated-a.accumulated;
  });

  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:1;
  document.getElementById('m-gw').textContent=lastGW;
  const hb=document.getElementById('header-gw-badge');
  if(hb) hb.textContent='GW '+lastGW;
  const mpl=document.getElementById('m-players'); if(mpl) mpl.textContent=state.players.length;
  const mwp=document.getElementById('m-weekly-pot'); if(mwp){ const {p1,p2,p3}=prizes(); mwp.textContent='₦'+(p1+p2+p3).toLocaleString(); }
  // Public tiles — this season only, no carry-over
  const pot=seasonPotTotal();
  const msph=document.getElementById('m-season-pot-home'); if(msph) msph.textContent='₦'+pot.toLocaleString();
  const mpr=document.getElementById('m-prize-received'); if(mpr) mpr.textContent='₦'+(pot*2).toLocaleString();
  const mtc=document.getElementById('m-total-collected'); if(mtc) mtc.textContent='₦'+(pot*3).toLocaleString();
  updateGWCountdown();
  const rC=r=>r===0?'rank-1':r===1?'rank-2':r===2?'rank-3':'rank-n';
  const rL=r=>r===0?'#1':r===1?'#2':r===2?'#3':`#${r+1}`;
  document.getElementById('standings-body').innerHTML=sorted.map((p,rank)=>{
    const bal=pubBal(p);
    const withdrawn=Math.max(0,p.paidOut-(p.carryOver||0));
    const podiumCls=rank===0?'podium-1':rank===1?'podium-2':rank===2?'podium-3':'';
    return `<tr onclick="openProfile(${p.i})" style="cursor:pointer"${podiumCls?' class="'+podiumCls+'"':''} >
      <td><span class="${rC(rank)}">${rL(rank)}</span></td>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="init">${p.name.slice(0,2).toUpperCase()}</div><div><div class="player-name" style="font-weight:500">${p.name}</div>${p.teamName?`<div style="font-size:11px;color:var(--muted);margin-top:1px">${p.teamName}</div>`:''}<div>${formGuide(p.i)}</div></div></div></td>
      <td><span class="wins"><span class="w1">${p.w1||0}</span><span class="w2">${p.w2||0}</span><span class="w3">${p.w3||0}</span></span></td>
      <td><span class="${bal>0?'bal-pos':'bal-zero'}">₦${bal.toLocaleString()}</span></td>
      <td><span class="mono" style="color:var(--muted)">₦${p.accumulated.toLocaleString()}</span></td>
      <td><span class="mono" style="color:var(--muted)">${withdrawn?'₦'+withdrawn.toLocaleString():'—'}</span></td>
    </tr>`;
  }).join('');
  renderSeasonRecap();
  renderCountdown();
  renderEarningsChart();
}

function updatePayoutInfo(){
  const idx=document.getElementById('po-player').value;
  const box=document.getElementById('po-info');
  if(!idx){ box.classList.add('hidden'); return; }
  const p=state.players[parseInt(idx)];
  const bal=p.accumulated-p.paidOut+(p.carryOver||0);
  box.classList.remove('hidden');
  box.innerHTML=`earned: ₦${p.accumulated.toLocaleString()} &nbsp;·&nbsp; carry-over: ₦${(p.carryOver||0).toLocaleString()} &nbsp;·&nbsp; paid out: ₦${p.paidOut.toLocaleString()} &nbsp;·&nbsp; <strong>balance: ₦${bal.toLocaleString()}</strong>`;
  document.getElementById('po-amt').value=bal>0?bal:'';
}

function processPayout(){
  const idx=document.getElementById('po-player').value;
  const amt=parseFloat(document.getElementById('po-amt').value);
  if(!idx){ alert('Select a player'); return; }
  if(!amt||amt<=0){ alert('Enter a valid amount'); return; }
  const p=state.players[parseInt(idx)];
  const bal=p.accumulated-p.paidOut+(p.carryOver||0);
  if(amt>bal){ alert(`Max available is ₦${bal.toLocaleString()}`); return; }
  p.paidOut+=amt;
  state.payouts.push({player:p.name,amount:amt,gw:state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:37});
  save(); updatePayoutInfo(); renderPayoutLog(); renderStandings();
}

function renderPayoutLog(){
  const el=document.getElementById('payout-log');
  if(!state.payouts.length){ el.innerHTML='<div class="empty">no payouts recorded</div>'; return; }
  el.innerHTML=state.payouts.map((p,i)=>({...p,_idx:i})).reverse().map(p=>{
    const gwLabel=typeof p.gw==='number'?`GW${p.gw}`:p.gw;
    return `<div class="gw-item" style="align-items:center">
      <span class="gw-num">${gwLabel}</span>
      <span class="gw-detail" style="flex:1">${p.player} — <strong style="color:var(--accent)">₦${p.amount.toLocaleString()}</strong> paid out</span>
      <button onclick="reversePayout(${p._idx})" style="padding:3px 10px;font-size:.75rem;min-height:30px;background:none;border:1px solid #fca5a5;color:var(--red);border-radius:6px;cursor:pointer;flex-shrink:0;white-space:nowrap">↩ Reverse</button>
    </div>`;
  }).join('');
}

function reversePayout(idx){
  const p=state.payouts[idx]; if(!p) return;
  if(!confirm(`Reverse ₦${p.amount.toLocaleString()} payout to ${p.player}?`)) return;
  const player=state.players.find(pl=>pl.name===p.player);
  if(player) player.paidOut=Math.max(0,player.paidOut-p.amount);
  state.payouts.splice(idx,1);
  save(); renderPayoutLog(); updatePayoutInfo(); renderStandings();
}

function renderCycleOwingTable(cycleIdx){
  const el=document.getElementById('cycle-owing-table'); if(!el) return;
  const c=CYCLES[cycleIdx];
  const cp=state.cyclePayments[cycleIdx]||{};
  const label=`Cycle ${cycleIdx+1} fee`;
  const rows=c.players.map(i=>{
    const p=state.players[i];
    const type=cp[i];
    const isCash=type===true||type==='cash';
    const isWin=type==='winnings';
    const isPartial=type==='partial';
    const isSettled=type==='settled';
    const isCo=typeof type==='object'&&type?.type==='co-offset';
    const offset=isWin?c.fee:(isPartial||isSettled)?(state.payouts.findLast(x=>x.player===p.name&&x.gw===label)?.amount||0):isCo?type.own:0;
    const cashOwed=isCash||isWin||isCo||isSettled?0:c.fee-offset;
    const benefactorName=isCo?state.players[type.by]?.name:'';
    const isPaid=isCash||isWin||isCo||isSettled;
    const breakdown=isWin?`₦${c.fee.toLocaleString()} from winnings`
      :isCash?`₦${c.fee.toLocaleString()} cash`
      :isSettled?`₦${offset.toLocaleString()} from winnings + ₦${(c.fee-offset).toLocaleString()} cash`
      :isCo?`₦${offset.toLocaleString()} from winnings + ₦${(c.fee-offset).toLocaleString()} covered by ${benefactorName}`
      :isPartial?`₦${offset.toLocaleString()} from winnings · ₦${cashOwed.toLocaleString()} cash pending`
      :'—';
    return {name:p.name,fee:c.fee,offset,cashOwed,breakdown,isPaid};
  }).sort((a,b)=>b.cashOwed-a.cashOwed);
  const anyOwed=rows.some(r=>r.cashOwed>0);
  el.innerHTML=`<div class="card">
    <div class="card-title">Cycle ${cycleIdx+1} — Payment status</div>
    ${!anyOwed?'<div style="font-size:13px;color:var(--green);font-weight:500;margin-bottom:.75rem">All players settled for this cycle.</div>':''}
    <div class="tbl-wrap"><table>
      <thead><tr>
        <th>Player</th>
        <th>Fee</th>
        <th class="hide-mobile">Breakdown</th>
        <th>Cash owed</th>
        <th>Status</th>
      </tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td style="font-weight:500">${r.name}</td>
        <td class="mono">₦${r.fee.toLocaleString()}</td>
        <td class="hide-mobile" style="font-size:13px;color:var(--muted)">${r.breakdown}</td>
        <td class="mono" style="color:${r.cashOwed>0?'var(--red)':'var(--dim)'};font-weight:${r.cashOwed>0?700:400}">${r.cashOwed?'₦'+r.cashOwed.toLocaleString():'—'}</td>
        <td><span style="font-size:11px;font-weight:700;color:${r.isPaid?'var(--green)':'var(--red)'}">${r.isPaid?'Paid':'Unpaid'}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderPayments(){
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:1;
  const curCycle=Math.min(Math.floor((lastGW-1)/5),CYCLES.length-1);
  const curData=CYCLES[curCycle];
  const curCP=state.cyclePayments[curCycle]||{};
  const curPaid=curData.players.filter(i=>curCP[i]).length;
  document.getElementById('m-cycle').textContent=curCycle+1;
  document.getElementById('m-cycle-paid').textContent=curPaid+'/'+curData.players.length;
  renderDebtTracker();
  renderCycleOwingTable(curCycle);
  document.getElementById('cycle-grid').innerHTML=CYCLES.map((c,i)=>{
    const cp=state.cyclePayments[i]||{};
    const paid=c.players.filter(j=>cp[j]).length;
    const pct=Math.round((paid/c.players.length)*100);
    const isCur=i===curCycle;
    return `<div class="cycle-card" style="${isCur?'border-color:var(--accent);border-width:2px':''}">
      <div style="font-size:11px;font-weight:700;color:${isCur?'var(--accent)':'var(--muted)'};margin-bottom:3px">${isCur?'▶ ':''}Cycle ${i+1}</div>
      <div style="font-size:11px;color:var(--dim);font-family:'Space Grotesk',system-ui,sans-serif;margin-bottom:3px">GW${c.gw[0]}–${c.gw[1]}</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:6px">₦${c.fee.toLocaleString()}</div>
      <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:18px;font-weight:600;color:var(--text)">${paid}<span style="color:var(--dim);font-size:13px">/${c.players.length}</span></div>
      <div class="cycle-bar"><div class="cycle-bar-fill" style="width:${pct}%"></div></div>
      <button class="btn btn-ghost" style="padding:6px 10px;font-size:.8rem;width:100%;margin-top:4px;min-height:36px" onclick="openCycleModal(${i})">Manage</button>
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
    const bal=p.accumulated+(p.carryOver||0)-p.paidOut;
    const type=cp[i];
    const isCash=type===true||type==='cash';
    const isWin=type==='winnings';
    const isPartial=type==='partial';
    const isSettled=type==='settled';
    const isCo=typeof type==='object'&&type?.type==='co-offset';
    const canWin=!isCash&&!isWin&&!isPartial&&!isSettled&&!isCo&&bal>=c.fee;
    const canPartial=!isCash&&!isWin&&!isPartial&&!isSettled&&!isCo&&bal>0&&bal<c.fee;
    const ownOffset=isCo?type.own:(isPartial||isSettled)?(state.payouts.findLast(x=>x.player===p.name&&x.gw===`Cycle ${idx+1} fee`)?.amount||bal):bal;
    const cashOwed=c.fee-ownOffset;
    const benefactorName=isCo?state.players[type.by]?.name:'';
    const shortfall=cashOwed;
    const coverOptions=c.players.filter(j=>j!==i).map(j=>{
      const q=state.players[j]; const qbal=q.accumulated+(q.carryOver||0)-q.paidOut;
      return `<option value="${j}" ${isCo&&type.by===j?'selected':''} ${qbal<shortfall?'disabled':''}>${q.name} (₦${qbal.toLocaleString()})</option>`;
    }).join('');
    const statusTag=isWin?'✓ winnings':isCash?'✓ cash':isPartial?`⚡ partial (₦${cashOwed.toLocaleString()} cash)`:isSettled?`✓ settled (₦${ownOffset.toLocaleString()} winnings + ₦${cashOwed.toLocaleString()} cash)`:isCo?`✓ ₦${ownOffset.toLocaleString()} own + ₦${cashOwed.toLocaleString()} by ${benefactorName}`:'—';
    const statusClass=(isCash||isWin||isCo||isSettled)?'paid-tag':isPartial?'paid-tag':'unpaid-tag';
    const statusStyle=isPartial?'color:var(--caution)':isSettled||isCo?'color:var(--green)':'';
    return `<div class="check-item" style="flex-wrap:wrap">
      <input type="checkbox" id="cp${i}" ${isCash?'checked':''} onchange="if(this.checked){['cpw${i}','cppw${i}'].forEach(id=>{var el=document.getElementById(id);if(el)el.checked=false;})}">
      <label for="cp${i}" style="flex:1">${p.name}</label>
      <span style="font-size:11px;font-family:'Space Grotesk',system-ui,sans-serif;color:var(--dim);margin-right:4px">₦${bal.toLocaleString()}</span>
      <span class="${statusClass}" style="${statusStyle}">${statusTag}</span>
      ${canWin||isWin?`<div style="width:100%;padding:4px 0 0 23px;display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="cpw${i}" ${isWin?'checked':''} onchange="if(this.checked)document.getElementById('cp${i}').checked=false">
        <label for="cpw${i}" style="font-size:12px;color:var(--accent);cursor:pointer">pay ₦${c.fee.toLocaleString()} from winnings</label>
      </div>`:''}
      ${canPartial||isPartial||isSettled||isCo?`<div style="width:100%;padding:4px 0 0 23px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <input type="checkbox" id="cppw${i}" ${isPartial||isSettled||isCo?'checked':''} onchange="if(this.checked)document.getElementById('cp${i}').checked=false">
          <label for="cppw${i}" style="font-size:12px;color:var(--caution);cursor:pointer">offset ₦${ownOffset.toLocaleString()} from own winnings (₦${cashOwed.toLocaleString()} shortfall)</label>
        </div>
        <div style="padding-left:21px;display:flex;flex-direction:column;gap:5px">
          <div style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="cpsr${i}" ${isSettled?'checked':''} onchange="if(this.checked){var co=document.getElementById('cpco${i}');if(co)co.value='';}">
            <label for="cpsr${i}" style="font-size:12px;color:var(--green);cursor:pointer">Cash received for ₦${cashOwed.toLocaleString()} shortfall</label>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <label style="font-size:11px;color:var(--muted);white-space:nowrap">Or covered by:</label>
            <select id="cpco${i}" style="height:28px;font-size:12px;padding:2px 6px;flex:1" onchange="if(this.value){var sr=document.getElementById('cpsr${i}');if(sr)sr.checked=false;}">
              <option value="">— (select player)</option>
              ${coverOptions}
            </select>
          </div>
        </div>
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
    const partialEl=document.getElementById('cppw'+i);
    const cashEl=document.getElementById('cp'+i);
    const coEl=document.getElementById('cpco'+i);
    const srEl=document.getElementById('cpsr'+i);
    if(winEl?.checked) newCP[i]='winnings';
    else if(partialEl?.checked){
      const byIdx=coEl&&coEl.value!==''?parseInt(coEl.value):null;
      if(byIdx!==null&&!isNaN(byIdx)) newCP[i]={type:'co-offset',own:state.players[i].accumulated+(state.players[i].carryOver||0)-state.players[i].paidOut,by:byIdx};
      else if(srEl?.checked) newCP[i]='settled';
      else newCP[i]='partial';
    } else if(cashEl?.checked) newCP[i]='cash';
  });
  c.players.forEach(i=>{
    const prev=prevCP[i];
    const next=newCP[i];
    const prevIsCo=typeof prev==='object'&&prev?.type==='co-offset';
    const nextIsCo=typeof next==='object'&&next?.type==='co-offset';
    if(JSON.stringify(prev)===JSON.stringify(next)) return;
    const p=state.players[i];
    const label=`Cycle ${activeCycleIdx+1} fee`;
    const removePayout=(playerName,amt)=>{ const j=state.payouts.findLastIndex(x=>x.player===playerName&&x.gw===label&&(amt===undefined||x.amount===amt)); if(j!==-1) state.payouts.splice(j,1); };
    // Undo previous state
    if(prev==='winnings'){ p.paidOut-=c.fee; removePayout(p.name,c.fee); }
    else if(prev==='partial'||prev==='settled'){
      const rec=state.payouts.findLast(x=>x.player===p.name&&x.gw===label);
      if(rec){ p.paidOut-=rec.amount; removePayout(p.name,rec.amount); }
    }
    else if(prevIsCo){
      const ben=state.players[prev.by];
      p.paidOut-=prev.own; removePayout(p.name,prev.own);
      if(ben){ ben.paidOut-=(c.fee-prev.own); removePayout(ben.name,c.fee-prev.own); }
    }
    // Apply new state
    if(next==='winnings'){ p.paidOut+=c.fee; state.payouts.push({player:p.name,amount:c.fee,gw:label}); }
    else if(next==='partial'||next==='settled'){
      // 'settled' = partial offset already applied + cash received; paidOut change is same as partial
      const off=p.accumulated+(p.carryOver||0)-p.paidOut; if(off>0){ p.paidOut+=off; state.payouts.push({player:p.name,amount:off,gw:label}); }
    }
    else if(nextIsCo){
      // Compute own contribution from actual balance AFTER undo (fixes 0-value bug when transitioning from partial)
      const actualOwn=p.accumulated+(p.carryOver||0)-p.paidOut;
      const shortfall=c.fee-actualOwn; const ben=state.players[next.by];
      if(actualOwn>0){ p.paidOut+=actualOwn; state.payouts.push({player:p.name,amount:actualOwn,gw:label}); }
      if(ben&&shortfall>0){ ben.paidOut+=shortfall; state.payouts.push({player:ben.name,amount:shortfall,gw:`${label} (on behalf of ${p.name})`}); }
      newCP[i]={type:'co-offset',own:actualOwn,by:next.by}; // update with correct own value
    }
  });
  state.cyclePayments[activeCycleIdx]=newCP;
  save(); closeModal(); renderPayments(); renderStandings();
}
function closeModal(){ document.getElementById('cycle-overlay').classList.remove('open'); }
document.getElementById('cycle-overlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeModal(); });

function toInputDatetime(iso){
  if(!iso) return '';
  const d=new Date(iso);
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
}

function setNextSeasonDate(val){
  state.nextSeasonDate=val?new Date(val).toISOString():null;
  save(); renderStandings();
}

function setNextGWDate(val){
  state.nextGWDate=val?new Date(val).toISOString():null;
  save(); updateGWCountdown();
}

function gwCountdownText(){
  const d=state.nextGWDate||GW1_DEADLINE;
  if(!d) return '—';
  const ms=new Date(d)-new Date();
  if(ms<=0) return 'LIVE';
  const days=Math.floor(ms/86400000);
  const hrs=Math.floor((ms%86400000)/3600000);
  const mins=Math.floor((ms%3600000)/60000);
  const secs=Math.floor((ms%60000)/1000);
  if(days>0) return days+'d '+hrs+'h '+mins+'m';
  if(hrs>0) return hrs+'h '+mins+'m '+secs+'s';
  return mins+'m '+secs+'s';
}

function updateGWCountdown(){
  const el=document.getElementById('m-nextgw'); if(!el) return;
  const t=gwCountdownText();
  el.textContent=t;
  el.style.color=t==='LIVE'?'var(--green)':t==='—'?'var(--dim)':'var(--fpl-dark)';
}

function renderAdminPlayers(){
  const el=document.getElementById('admin-player-list'); if(!el) return;
  el.innerHTML=state.players.map((p,i)=>`
    <div class="player-row">
      <div class="init">${p.name.slice(0,2).toUpperCase()}</div>
      <span style="flex:1;font-size:.9rem;font-weight:500;min-width:70px">${p.name}</span>
      <input type="text" value="${p.teamName||''}" placeholder="Team name" onblur="setTeamName(${i},this.value)" style="font-size:.8rem;padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text);width:110px;max-width:25vw;height:36px">
      <input type="number" value="${p.entryId||''}" placeholder="Entry ID" onblur="setEntryId(${i},this.value)" style="font-size:.8rem;padding:4px 8px;background:var(--surface);border:1px solid ${p.entryId?'var(--green)':'var(--border)'};border-radius:4px;color:var(--text);width:90px;max-width:22vw;height:36px" title="FPL Challenge entry ID">
      <div style="text-align:right;line-height:1.3">
        <div class="mono" style="font-size:.75rem;color:var(--text);font-weight:600">₦${fullBal(p).toLocaleString()}</div>
        ${(p.carryOver||0)>0?`<div style="font-size:.65rem;color:var(--caution)">+₦${(p.carryOver||0).toLocaleString()} carry</div>`:''}
      </div>
      <button class="btn btn-ghost" style="padding:4px 10px;font-size:.8rem;color:var(--red);border-color:#fca5a5;min-height:36px;flex-shrink:0" onclick="removePlayer(${i})">Remove</button>
    </div>`).join('');
}

function setTeamName(idx,val){
  state.players[idx].teamName=val.trim();
  save(); renderStandings();
}

function setEntryId(idx,val){
  const id=val.trim()?Number(val.trim()):undefined;
  if(id&&isNaN(id)){ alert('Entry ID must be a number'); return; }
  // Check for duplicates
  const conflict=id&&state.players.findIndex((p,i)=>i!==idx&&p.entryId===id);
  if(conflict!==-1&&conflict!==false){ alert(`Entry ID ${id} is already assigned to ${state.players[conflict].name}`); return; }
  state.players[idx].entryId=id||undefined;
  save(); renderAdminPlayers();
}

function addPlayer(){
  const name=document.getElementById('new-player-name').value.trim();
  if(!name){ alert('Enter a player name'); return; }
  if(state.players.find(p=>p.name.toLowerCase()===name.toLowerCase())){ alert('Player already exists'); return; }
  state.players.push({name,teamName:'',accumulated:0,paidOut:0,carryOver:0,w1:0,w2:0,w3:0});
  save(); document.getElementById('new-player-name').value='';
  renderAdminPlayers(); populateSelects(); renderStandings();
}

function removePlayer(idx){
  if(!confirm(`Remove ${state.players[idx].name}? This cannot be undone.`)) return;
  state.players.splice(idx,1);
  save(); renderAdminPlayers(); populateSelects(); renderStandings();
}

function renderDeleteGWInfo(){
  const el=document.getElementById('delete-gw-info');
  if(!el) return;
  if(!state.gameweeks.length){ el.textContent='No manually entered GWs to delete.'; return; }
  const last=state.gameweeks[state.gameweeks.length-1];
  const winners=Object.entries(last.awards).map(([i,a])=>`${state.players[parseInt(i)]?.name} ₦${a.toLocaleString()}`).join(' · ');
  el.textContent=`GW${last.gw}: ${winners}`;
}
function confirmDeleteLastGW(){
  if(!state.gameweeks.length){ alert('No manually entered GWs to delete.'); return; }
  const last=state.gameweeks[state.gameweeks.length-1];
  if(!confirm(`Delete GW${last.gw} entry? This will reverse all prize and podium changes.`)) return;
  // Reverse accumulated prizes
  Object.entries(last.awards).forEach(([idx,prize])=>{
    const p=state.players[parseInt(idx)];
    if(p) p.accumulated-=prize;
  });
  // Reverse podium counts
  (last.pos[1]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w1=Math.max(0,state.players[i].w1-1); });
  (last.pos[2]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w2=Math.max(0,state.players[i].w2-1); });
  (last.pos[3]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w3=Math.max(0,state.players[i].w3-1); });
  state.gameweeks.pop();
  save(); renderStandings(); renderAdminPlayers(); renderHistory(); renderDeleteGWInfo();
  alert(`GW${last.gw} deleted. You can now re-enter it with the correct data.`);
}

function confirmReset(){
  if(!confirm('Reset all data for a new season? Player names are kept but all results, prizes and payments will be cleared.')) return;
  state.players=state.players.map(p=>({name:p.name,teamName:p.teamName||'',accumulated:0,paidOut:0,carryOver:p.carryOver||0,w1:0,w2:0,w3:0}));
  state.gameweeks=[]; state.payouts=[]; state.cyclePayments={};
  save(); renderStandings(); renderAdminPlayers(); renderHistory();
  alert('Season reset. Ready for a new season!');
}

const TAB_COLORS={standings:'#6b21a8',achievements:'#f59e0b',history:'#0d9488',gameweek:'#d97706',payout:'#16a34a',payment:'#0ea5e9',cycles:'#2563eb',admin:'#e11d48'};
function seasonPotTotal(){
  let total=0;
  CYCLES.forEach((c,idx)=>{
    const cp=state.cyclePayments[idx]||{};
    const gwCount=(c.gw[1]-c.gw[0])+1;
    const paid=c.players.filter(i=>{const t=cp[i];return t===true||t==='cash'||t==='winnings'||t==='settled'||(typeof t==='object'&&t?.type==='co-offset');}).length;
    total+=paid*gwCount*1000; // ₦1k per player per GW
  });
  return total;
}

const FPL_LEAGUE_ID=318;

async function fetchFPLLeague(){
  const el=document.getElementById('fpl-league-body');
  const btn=document.getElementById('fpl-league-refresh');
  if(btn) btn.disabled=true;
  el.innerHTML='<div class="empty">Loading…</div>';
  try{
    const res=await fetch(`/api/fpl-league?league=${FPL_LEAGUE_ID}`).then(r=>r.ok?r.json():Promise.reject(r.status));
    const rows=res.standings?.results||[];
    if(!rows.length){ el.innerHTML='<div class="empty">No standings yet</div>'; return; }
    el.innerHTML=`<div class="tbl-wrap"><table>
      <thead><tr><th>#</th><th>Player</th><th>Team</th><th>GW</th><th>Total</th></tr></thead>
      <tbody>${rows.map((r,i)=>`<tr>
        <td><span class="${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-n'}">${i+1}</span></td>
        <td style="font-weight:500">${r.player_name}</td>
        <td style="font-size:12px;color:var(--muted)">${r.entry_name}</td>
        <td style="font-family:'Space Grotesk',system-ui,sans-serif">${r.event_total}</td>
        <td style="font-family:'Space Grotesk',system-ui,sans-serif;font-weight:600">${r.total}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }catch(e){
    el.innerHTML=`<div class="empty">Could not load — ${e}</div>`;
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; }
  }
}

function renderSeasonTab(){
  const fmt=n=>'₦'+n.toLocaleString();
  const pot=seasonPotTotal();
  document.getElementById('m-season-pot').textContent=fmt(pot);
  document.getElementById('m-season-paid').textContent=fmt(0);
  document.getElementById('m-season-remaining').textContent=fmt(pot);

  const isPaid=t=>t===true||t==='cash'||t==='winnings'||t==='settled'||(typeof t==='object'&&t?.type==='co-offset');

  const rows=CYCLES.map((c,idx)=>{
    const cp=state.cyclePayments[idx]||{};
    const gwCount=(c.gw[1]-c.gw[0])+1;
    const paidPlayers=c.players.filter(i=>isPaid(cp[i]));
    if(!paidPlayers.length) return null;
    const contribution=paidPlayers.length*gwCount*1000;
    const names=paidPlayers.map(i=>state.players[i]?.name||'?').join(', ');
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);gap:8px;flex-wrap:wrap">
      <div>
        <div style="font-size:12px;font-weight:700;color:var(--text)">Cycle ${idx+1} · GW${c.gw[0]}–${c.gw[1]}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${names}</div>
      </div>
      <span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;color:var(--green);white-space:nowrap">${fmt(contribution)}</span>
    </div>`;
  }).filter(Boolean);

  const totalRow=`<div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:4px;border-top:2px solid var(--border)"><span style="font-size:12px;font-weight:700;color:var(--muted)">Total</span><span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;font-weight:700;color:var(--text)">${fmt(pot)}</span></div>`;
  document.getElementById('season-pot-body').innerHTML=rows.length
    ? rows.join('')+totalRow
    : '<div class="empty">No cycle payments recorded yet</div>';
}

function renderFinanceTab(){
  const el=document.getElementById('finance-content'); if(!el) return;
  const fmt=n=>'₦'+n.toLocaleString();
  const pot=seasonPotTotal();
  const prizeReceived=pot*2;
  const potReceived=pot;
  const totalCollected=pot*3;
  const gwAwarded=state.players.reduce((s,p)=>s+p.accumulated,0);
  const seasonWithdrawn=state.players.reduce((s,p)=>s+Math.max(0,p.paidOut-(p.carryOver||0)),0);

  const tile=(label,val,color='var(--fpl-dark)')=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid ${color};border-radius:8px;padding:1rem;text-align:center">
      <div style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">${label}</div>
      <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:18px;font-weight:700;color:${color}">${fmt(val)}</div>
    </div>`;

  const row=(label,val,sub='',color='var(--text)')=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div><div style="font-size:13px;font-weight:500">${label}</div>${sub?`<div style="font-size:11px;color:var(--muted);margin-top:1px">${sub}</div>`:''}</div>
      <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;color:${color}">${fmt(val)}</div>
    </div>`;

  // Per-GW prize history
  const gwRows=[...state.gameweeks].reverse().map(g=>{
    const winners=Object.entries(g.awards).filter(([,a])=>a>0)
      .map(([i,a])=>`${state.players[parseInt(i)]?.name||'?'} ₦${a.toLocaleString()}`).join(' · ');
    const total=Object.values(g.awards).reduce((s,a)=>s+a,0);
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);gap:8px;flex-wrap:wrap">
      <div><div style="font-size:12px;font-weight:700;color:var(--accent)">GW ${g.gw}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${winners||'—'}</div></div>
      <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;flex-shrink:0">${fmt(total)}</div>
    </div>`;
  }).join('');

  el.innerHTML=`
    <div class="card" style="margin-bottom:1rem">
      <div style="font-size:12px;font-weight:700;color:var(--fpl-dark);letter-spacing:.06em;text-transform:uppercase;border-left:3px solid var(--fpl-green);padding-left:8px;margin-bottom:1rem">Season Overview</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${tile('Total Collected',totalCollected,'var(--fpl-dark)')}
        ${tile('GW Prizes Awarded',gwAwarded,'var(--green)')}
        ${tile('Player Withdrawals',seasonWithdrawn,'var(--blue)')}
      </div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <div style="font-size:12px;font-weight:700;color:var(--fpl-dark);letter-spacing:.06em;text-transform:uppercase;border-left:3px solid var(--accent);padding-left:8px;margin-bottom:.5rem">Weekly Prize Pot <span style="font-size:11px;font-weight:400;color:var(--muted);text-transform:none;letter-spacing:0">(₦2k/player/GW)</span></div>
      ${row('Collected from cycle payments',prizeReceived,'₦2k × paid players × GWs covered','var(--fpl-dark)')}
      ${row('Distributed as GW prizes',gwAwarded,'sum of 1st/2nd/3rd place awards','var(--green)')}
      ${row('Still in the pot',prizeReceived-gwAwarded,'awaiting distribution','var(--caution)')}
    </div>

    <div class="card" style="margin-bottom:1rem">
      <div style="font-size:12px;font-weight:700;color:var(--fpl-dark);letter-spacing:.06em;text-transform:uppercase;border-left:3px solid #f59e0b;padding-left:8px;margin-bottom:.5rem">Season Pot <span style="font-size:11px;font-weight:400;color:var(--muted);text-transform:none;letter-spacing:0">(₦1k/player/GW)</span></div>
      ${row('Accumulated',potReceived,'₦1k × paid players × GWs covered','var(--fpl-dark)')}
      ${row('Paid out',0,'distributed at end of season','var(--muted)')}
      ${row('Remaining',potReceived,'locked until season end','var(--caution)')}
    </div>

    <div class="card">
      <div style="font-size:12px;font-weight:700;color:var(--fpl-dark);letter-spacing:.06em;text-transform:uppercase;border-left:3px solid var(--green);padding-left:8px;margin-bottom:.25rem">GW Prize History</div>
      ${gwRows||'<div class="empty">No gameweeks recorded yet</div>'}
    </div>`;
}

function computeBadges(playerIdx){
  const p=state.players[playerIdx];
  const badges=[];
  const total=p.w1+p.w2+p.w3;
  if(state.players.every(q=>q.accumulated<=p.accumulated)&&p.accumulated>0)
    badges.push({icon:'💰',label:'Top Earner',desc:'Highest total prize earnings'});
  if(p.w1>=1&&state.players.every(q=>q.w1<=p.w1))
    badges.push({icon:'👑',label:'Champion',desc:`Most 1st place finishes (${p.w1})`});
  if(p.w1>=3) badges.push({icon:'🎯',label:'Hat-trick',desc:`${p.w1} gameweek wins`});
  if(total>=7) badges.push({icon:'🏅',label:'Podium Regular',desc:`${total} podium finishes`});
  let streak=0,max=0;
  state.gameweeks.forEach(g=>{ if((g.awards[playerIdx]||0)>0){streak++;max=Math.max(max,streak);}else streak=0; });
  if(max>=3) badges.push({icon:'🔥',label:'On Fire',desc:`${max} podiums in a row`});
  else if(max>=2) badges.push({icon:'⚡',label:'Back-to-back',desc:'2 consecutive podiums'});
  if(state.gameweeks.length>5&&total/state.gameweeks.length>=0.25)
    badges.push({icon:'⭐',label:'Consistent',desc:'Podium in 25%+ of gameweeks'});
  if(p.w2>=3&&state.players.every(q=>q.w2<=p.w2))
    badges.push({icon:'🥈',label:'Silver Specialist',desc:`${p.w2} second-place finishes`});
  return badges;
}

function renderAchievements(){
  const el=document.getElementById('achievements-content'); if(!el) return;
  const rows=state.players.map((p,i)=>({p,i,badges:computeBadges(i)}))
    .sort((a,b)=>b.badges.length-a.badges.length);
  const topEarner=[...state.players].sort((a,b)=>b.accumulated-a.accumulated)[0];
  const topWinner=[...state.players].sort((a,b)=>b.w1-a.w1)[0];
  const topPodium=[...state.players].sort((a,b)=>(b.w1+b.w2+b.w3)-(a.w1+a.w2+a.w3))[0];
  const BADGE_LEGEND=[
    {icon:'👑',label:'Champion',desc:'Has the most 1st place GW wins'},
    {icon:'🎯',label:'Hat-trick',desc:'Won 3 or more gameweeks outright'},
    {icon:'💰',label:'Top Earner',desc:'Highest total accumulated prize money'},
    {icon:'🏅',label:'Podium Regular',desc:'Finished in the top 3 at least 7 times'},
    {icon:'🔥',label:'On Fire',desc:'3+ consecutive GWs on the podium'},
    {icon:'⚡',label:'Back-to-back',desc:'2 consecutive GWs on the podium'},
    {icon:'⭐',label:'Consistent',desc:'On the podium in 25%+ of all gameweeks'},
    {icon:'🥈',label:'Silver Specialist',desc:'Most 2nd place finishes (minimum 3)'},
  ];
  el.innerHTML=`
    <div class="card" style="margin-bottom:1.25rem;background:linear-gradient(135deg,#37003c,#6b21a8);border:none">
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:.05em;text-transform:uppercase;margin-bottom:1rem">Season Highlights</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:20px;margin-bottom:4px">💰</div><div style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:2px">Top Earner</div><div style="font-size:13px;font-weight:700;color:#fff">${topEarner?.name||'—'}</div></div>
        <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:20px;margin-bottom:4px">👑</div><div style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:2px">Most Wins</div><div style="font-size:13px;font-weight:700;color:#fff">${topWinner?.name||'—'}</div></div>
        <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:20px;margin-bottom:4px">🏅</div><div style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:2px">Most Podiums</div><div style="font-size:13px;font-weight:700;color:#fff">${topPodium?.name||'—'}</div></div>
      </div>
    </div>
    <div class="card" style="margin-bottom:1.25rem">
      <div style="font-size:12px;font-weight:700;color:var(--fpl-dark);letter-spacing:.04em;text-transform:uppercase;border-left:3px solid #f59e0b;padding-left:8px;margin-bottom:.75rem">Badge Legend</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${BADGE_LEGEND.map(b=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:8px;background:var(--surface2);border-radius:8px"><span style="font-size:20px;flex-shrink:0">${b.icon}</span><div><div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px">${b.label}</div><div style="font-size:11px;color:var(--muted);line-height:1.4">${b.desc}</div></div></div>`).join('')}
      </div>
    </div>
    ${rows.map(({p,i,badges})=>`
      <div class="card" style="margin-bottom:.75rem;cursor:pointer" onclick="openProfile(${i})">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${badges.length?'.75rem':'0'}">
          <div class="init" style="width:36px;height:36px;font-size:11px;flex-shrink:0">${p.name.slice(0,2).toUpperCase()}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:14px">${p.name}</div>${p.teamName?`<div style="font-size:11px;color:var(--muted)">${p.teamName}</div>`:''}</div>
          <div style="font-size:12px;color:var(--dim);font-family:'Space Grotesk',system-ui,sans-serif">${badges.length} badge${badges.length!==1?'s':''}</div>
        </div>
        ${badges.length?`<div style="display:flex;flex-wrap:wrap;gap:6px">${badges.map(b=>`<div title="${b.desc}" style="display:flex;align-items:center;gap:5px;background:#fef3c7;border:1px solid #fcd34d;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;color:#92400e">${b.icon} ${b.label}</div>`).join('')}</div>`:'<div style="font-size:12px;color:var(--dim)">No achievements yet — check back after GW1</div>'}
      </div>`).join('')}`;
}

function showTab(t){
  if((t==='admin'||t==='payout'||t==='cycles'||t==='gameweek')&&!isAdmin){ requireAdmin(t); return; }
  if(t==='season'){ renderSeasonTab(); }
  if(t==='finance'){ renderFinanceTab(); }
  if(t==='fpl'){ fetchFPLLeague(); }
  if(t==='achievements'){ renderAchievements(); }
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelector(`[onclick="showTab('${t}')"]`).classList.add('active');
  document.getElementById('sec-'+t).classList.add('active');
  if(t==='standings') renderStandings();
  if(t==='payout'){ populateSelects(); renderPayoutLog(); }
  if(t==='cycles') renderPayments();
  if(t==='gameweek') populateSelects();
  if(t==='admin'){ renderAdminPlayers(); renderDeleteGWInfo(); const nd=document.getElementById('next-season-date'); if(nd) nd.value=toInputDatetime(state.nextSeasonDate); const gd=document.getElementById('next-gw-date'); if(gd) gd.value=toInputDatetime(state.nextGWDate); }
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

function applyMigrations(){
  state.players.forEach(p=>{ if(p.carryOver===undefined) p.carryOver=0; });
  INIT_PLAYERS.forEach((name,i)=>{
    if(!state.players[i]) state.players.push({name,teamName:TEAM_NAMES[i]||'',accumulated:0,paidOut:0,carryOver:OPENING[i]||0,w1:0,w2:0,w3:0});
  });
  // Seed entryId from ENTRY_MAP for existing players
  Object.entries(ENTRY_MAP).forEach(([entryId,idx])=>{
    if(state.players[idx]&&!state.players[idx].entryId) state.players[idx].entryId=Number(entryId);
  });
  syncCyclePlayers();
}

// Load from cloud and re-render if newer data is available
(async()=>{
  const cloud=await loadFromCloud();
  if(cloud){
    state=cloud;
    applyMigrations();
    try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
    populateSelects(); renderStandings();
  } else {
    syncToCloud(state); // seed cloud on first run
  }
})();

// ── Season summary ────────────────────────────────────────────────────────────
function renderSeasonRecap(){
  const el=document.getElementById('season-recap-card'); if(!el) return;
  if(!state.gameweeks.length){ el.style.display='none'; return; }
  el.style.display='';
  const totalPaidOut=state.players.reduce((s,p)=>s+p.paidOut,0);
  const totalAccumulated=state.players.reduce((s,p)=>s+p.accumulated,0);
  const totalFees=CYCLES.reduce((s,c,idx)=>{ const cp=state.cyclePayments[idx]||{}; return s+c.players.filter(i=>cp[i]).length*c.fee; },0);
  const surplus=totalFees-totalAccumulated;
  const totalPrizes=totalPaidOut+Math.max(0,surplus);
  let bigWin={player:'',amount:0,gw:0};
  state.gameweeks.forEach(g=>{ Object.entries(g.awards).forEach(([idx,amt])=>{ if(amt>bigWin.amount) bigWin={player:state.players[parseInt(idx)]?.name||'?',amount:amt,gw:g.gw}; }); });
  const topPodium=[...state.players].sort((a,b)=>(b.w1+b.w2+b.w3)-(a.w1+a.w2+a.w3))[0];
  const topEarner=[...state.players].sort((a,b)=>b.accumulated-a.accumulated)[0];
  const topWins=[...state.players].sort((a,b)=>b.w1-a.w1)[0];
  el.innerHTML=`
    <div style="margin:-1.25rem -1.25rem 1rem;padding:.6rem 1.25rem;background:linear-gradient(90deg,#6b21a8 0%,#00c875 100%);border-radius:7px 7px 0 0">
      <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:.04em">SEASON AT A GLANCE</span>
    </div>
    ${(()=>{ const mib=totalFees-totalPrizes; return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:1rem">
      <div style="background:#f3e8ff;border-top:3px solid var(--accent);border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Prize Pot</div>
        <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:clamp(11px,3vw,14px);font-weight:700;color:var(--accent)">₦${totalFees.toLocaleString()}</div>
      </div>
      <div style="background:#dcfce7;border-top:3px solid var(--green);border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;font-weight:700;color:var(--green);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Paid Out</div>
        <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:clamp(11px,3vw,14px);font-weight:700;color:var(--green)">₦${totalPrizes.toLocaleString()}</div>
      </div>
      <div style="background:#dbeafe;border-top:3px solid var(--blue);border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;font-weight:700;color:var(--blue);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">In Bank</div>
        <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:clamp(11px,3vw,14px);font-weight:700;color:var(--blue)">₦${mib.toLocaleString()}</div>
      </div>
    </div>`; })()}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">
      <div style="padding:.75rem;border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Top earner</div>
        <div style="font-weight:700;font-size:14px;color:var(--accent)">${topEarner.name}</div>
        <div style="font-size:11px;color:var(--dim)">₦${topEarner.accumulated.toLocaleString()}</div>
      </div>
      <div style="padding:.75rem;border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Most wins</div>
        <div style="font-weight:700;font-size:14px;color:var(--accent)">${topWins.name}</div>
        <div style="font-size:11px;color:var(--dim)">${topWins.w1} gameweeks</div>
      </div>
      <div style="padding:.75rem;border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Most podiums</div>
        <div style="font-weight:700;font-size:14px;color:var(--accent)">${topPodium.name}</div>
        <div style="font-size:11px;color:var(--dim)">${topPodium.w1+topPodium.w2+topPodium.w3} finishes</div>
      </div>
      <div style="padding:.75rem;border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Biggest win</div>
        <div style="font-weight:700;font-size:14px;color:var(--accent)">${bigWin.player}</div>
        <div style="font-size:11px;color:var(--dim)">₦${bigWin.amount.toLocaleString()} · GW${bigWin.gw}</div>
      </div>
    </div>`;
}

function renderCountdown(){
  const el=document.getElementById('countdown-card'); if(!el) return;
  const d=state.nextSeasonDate;
  if(!d){ el.style.display='none'; return; }
  const target=new Date(d.includes('T')?d:d+'T00:00');
  const ms=target-new Date();
  if(ms<=0){ el.style.display='none'; return; }
  const days=Math.floor(ms/86400000);
  const hrs=Math.floor((ms%86400000)/3600000);
  const mins=Math.floor((ms%3600000)/60000);
  const secs=Math.floor((ms%60000)/1000);
  const dateStr=target.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeStr=target.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  el.style.display='';
  el.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div><div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Next season starts</div>
    <div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:22px;font-weight:800;color:var(--fpl-dark)">${days}<span style="font-size:13px;font-weight:500;color:var(--muted)"> days</span> ${hrs}<span style="font-size:13px;font-weight:500;color:var(--muted)"> hrs</span> ${mins}<span style="font-size:13px;font-weight:500;color:var(--muted)"> mins</span> ${secs}<span style="font-size:13px;font-weight:500;color:var(--muted)"> secs</span></div>
    <div style="font-size:12px;color:var(--muted);margin-top:2px">${dateStr} · ${timeStr}</div></div>
    <div style="font-size:28px">⏳</div>
  </div>`;
}


function renderEarningsChart(){
  const el=document.getElementById('earnings-chart');
  if(!el) return;
  const players=[...state.players].map((p,i)=>({...p,i})).filter(p=>p.accumulated>0).sort((a,b)=>b.accumulated-a.accumulated);
  if(!players.length){ el.innerHTML='<div class="empty">No data yet</div>'; return; }
  const max=players[0].accumulated;
  el.innerHTML=players.map(p=>`
    <div style="display:grid;grid-template-columns:clamp(60px,25%,100px) 1fr clamp(44px,12%,64px);gap:6px;align-items:center;margin-bottom:9px">
      <span style="font-size:12px;font-weight:500;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;color:#6b21a8" onclick="openProfile(${p.i})">${p.name}</span>
      <div style="background:rgba(0,0,0,.07);border-radius:4px;height:10px;overflow:hidden"><div style="background:linear-gradient(90deg,#7c3aed 0%,#00c875 100%);height:100%;width:${Math.round((p.accumulated/max)*100)}%;border-radius:4px"></div></div>
      <span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;color:#374151">₦${Math.round(p.accumulated/1000)}k</span>
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
  const ptsMap=gwRecord.points||null;
  renderWeeklyTable(gwNum,gwRecord,ptsMap);
}

function renderWeeklyTable(gwNum,gwRecord,ptsMap=null){
  const hasPoints=ptsMap!==null;
  const entries=state.players.map((p,i)=>({
    idx:i, name:p.name, teamName:p.teamName,
    prize:gwRecord.awards[i]||0,
    pos:gwRecord.pos[1]?.includes(i)?1:gwRecord.pos[2]?.includes(i)?2:gwRecord.pos[3]?.includes(i)?3:null,
    pts:hasPoints?(ptsMap[i]??null):null
  })).sort((a,b)=>hasPoints?((b.pts??-1)-(a.pts??-1))||b.prize-a.prize:b.prize-a.prize);
  const rC=r=>r===1?'rank-1':r===2?'rank-2':r===3?'rank-3':'rank-n';
  const rL=r=>r===1?'1st':r===2?'2nd':r===3?'3rd':'—';
  let rank=0,prevPts=null;
  document.getElementById('weekly-content').innerHTML=`<div class="card">
    <div style="margin:-1.25rem -1.25rem 1rem;padding:.6rem 1.25rem;background:linear-gradient(90deg,#6b21a8 0%,#00c875 100%);border-radius:7px 7px 0 0;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:.04em">GW ${gwNum} — RESULTS</span>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>${hasPoints?'Rank':'Pos'}</th><th>Player</th>${hasPoints?'<th>GW Pts</th>':''}<th>Prize</th></tr></thead>
      <tbody>${entries.map(e=>{
        if(hasPoints){ if(e.pts!==prevPts){rank++;prevPts=e.pts;} }
        const displayRank=hasPoints?rank:null;
        const podiumCls=hasPoints?(rank<=3?`podium-${rank}`:''):(e.pos?`podium-${e.pos}`:'');
        return `<tr${podiumCls?' class="'+podiumCls+'"':''} onclick="openProfile(${e.idx})" style="cursor:pointer">
          <td><span class="${hasPoints?rC(displayRank):rC(e.pos)}">${hasPoints?rL(displayRank):rL(e.pos)}</span></td>
          <td><div style="display:flex;align-items:center;gap:10px"><div class="init">${e.name.slice(0,2).toUpperCase()}</div><div><div class="player-name" style="font-weight:500">${e.name}</div>${e.teamName?`<div style="font-size:11px;color:var(--muted);margin-top:1px">${e.teamName}</div>`:''}</div></div></td>
          ${hasPoints?`<td><span style="font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;color:var(--fpl-dark)">${e.pts??'—'}</span></td>`:''}
          <td>${e.prize>0?`<span class="bal-pos">₦${e.prize.toLocaleString()}</span>`:'<span style="color:var(--dim)">—</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>`;
}

// ── Live FPL Challenge points ─────────────────────────────────────────────────
async function fetchLivePoints(){
  const gwNum=parseInt(document.getElementById('weekly-gw-sel').value);
  if(!gwNum){ alert('Select a gameweek first.'); return; }
  const gwRecord=state.gameweeks.find(g=>g.gw===gwNum);
  if(!gwRecord){ alert(`GW${gwNum} has no recorded prize data yet.`); return; }
  const status=document.getElementById('fpl-points-status');
  if(status) status.textContent=`Loading points…`;
  try{
    const results=await Promise.all(
      Object.entries(ENTRY_MAP).map(([entryId,playerIdx])=>
        fetch(`${PROXY}${FPL_BASE}/entry/${entryId}/history/`)
          .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
          .then(d=>{
            if(parseInt(playerIdx)===0) console.log('FPL history response sample:',JSON.stringify(d).slice(0,300));
            const history=d.current||d.history||d.gameweeks||d.events||[];
            const gw=history.find(g=>(g.event||g.gameweek||g.round)===gwNum);
            const pts=gw?.points??gw?.total??gw?.score??null;
            return {playerIdx:parseInt(playerIdx),pts};
          })
          .catch(()=>({playerIdx:parseInt(playerIdx),pts:null}))
      )
    );
    const valid=results.filter(r=>r.pts!==null);
    if(!valid.length){ if(status) status.textContent='No points data found'; return; }
    const ptsMap=Object.fromEntries(results.map(r=>[r.playerIdx,r.pts]));
    renderWeeklyTable(gwNum,gwRecord,ptsMap);
  }catch(err){
    if(status) status.textContent=`Failed: ${err.message}`;
  }
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
    return `<tr><td style="font-size:12px;color:var(--muted);padding:8px 4px;border-bottom:1px solid var(--border)">${label}</td>${rv.map(v=>`<td style="text-align:center;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;padding:8px 4px;border-bottom:1px solid var(--border);${hi(rv,v)}">${fmt(v)}</td>`).join('')}</tr>`;
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
  const bal=pubBal(p);
  const withdrawn=Math.max(0,p.paidOut-(p.carryOver||0));
  const initials=p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('profile-avatar').textContent=initials;
  document.getElementById('profile-name').textContent=p.name;
  document.getElementById('profile-team').textContent=p.teamName||'';
  document.getElementById('profile-content').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1.25rem">
      <div style="background:#f3e8ff;border-top:3px solid var(--accent);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">GW Earnings</div><div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;color:var(--accent)">₦${p.accumulated.toLocaleString()}</div></div>
      <div style="background:#f5f5f5;border-top:3px solid var(--dim);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Withdrawn</div><div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;color:var(--muted)">₦${withdrawn.toLocaleString()}</div></div>
      <div style="background:${bal>0?'#dcfce7':'#f5f5f5'};border-top:3px solid ${bal>0?'var(--green)':'var(--dim)'};border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:10px;font-weight:700;color:${bal>0?'var(--green)':'var(--muted)'};margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Balance</div><div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;color:${bal>0?'var(--green)':'var(--dim)'}">₦${bal.toLocaleString()}</div></div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:1.25rem">
      <span class="w1">${p.w1} 🥇</span>
      <span class="w2">${p.w2} 🥈</span>
      <span class="w3">${p.w3} 🥉</span>
    </div>
    ${(()=>{const b=computeBadges(idx);return b.length?`<div style="margin-bottom:1.25rem"><div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px;letter-spacing:.05em;text-transform:uppercase;border-left:3px solid #f59e0b;padding-left:8px">Achievements</div><div style="display:flex;flex-wrap:wrap;gap:6px">${b.map(b=>`<div title="${b.desc}" style="display:flex;align-items:center;gap:5px;background:#fef3c7;border:1px solid #fcd34d;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;color:#92400e">${b.icon} ${b.label}</div>`).join('')}</div></div>`:''})()}
    <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px;letter-spacing:.05em;text-transform:uppercase;border-left:3px solid var(--accent);padding-left:8px">Prize History</div>
    ${history.length?history.map(g=>`<div class="gw-item" style="border-bottom:1px solid var(--border)">
      <span class="gw-num">GW${g.gw}</span>
      <span class="gw-detail" style="flex:1">Prize awarded</span>
      <span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;color:var(--accent)">₦${g.amount.toLocaleString()}</span>
    </div>`).join(''):'<div class="empty">No prizes yet</div>'}`;
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

function shareGWWhatsApp(gwNum){
  const g=state.gameweeks.find(x=>x.gw===gwNum); if(!g) return;
  const nm=i=>state.players[i]?.name||'?';
  const lines=[`🏆 Challenge Arena – GW${gwNum} Results`,``];
  [[1,'🥇'],[2,'🥈'],[3,'🥉']].forEach(([pos,medal])=>{
    const arr=g.pos[pos]||[]; if(!arr.length) return;
    const amt=g.awards[arr[0]]||0;
    lines.push(`${medal} ${arr.map(nm).join(' & ')} — ₦${amt.toLocaleString()}${arr.length>1?' each':''}`);
  });
  lines.push(``,`📊 challenge-arena-two.vercel.app`);
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`,'_blank');
}

function shareDebtReminder(cycleIdx){
  const c=CYCLES[cycleIdx];
  const cp=state.cyclePayments[cycleIdx]||{};
  const label=`Cycle ${cycleIdx+1} fee`;
  const debtors=c.players.filter(i=>{
    const t=cp[i];
    return !(t===true||t==='cash'||t==='winnings'||t==='settled'||(typeof t==='object'&&t?.type==='co-offset'));
  }).map(i=>{
    const p=state.players[i]; const t=cp[i];
    const offset=t==='partial'?(state.payouts.findLast(x=>x.player===p.name&&x.gw===label)?.amount||0):0;
    return `• ${p.name}: ₦${(c.fee-offset).toLocaleString()}`;
  });
  if(!debtors.length){ alert('All players are settled for this cycle!'); return; }
  const lines=[`📢 Challenge Arena – Cycle ${cycleIdx+1} Payment Reminder`,`GW${c.gw[0]}–${c.gw[1]} · ₦${c.fee.toLocaleString()}/player`,``,`Outstanding:`, ...debtors,``,`Please settle asap 🙏`];
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`,'_blank');
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
  el.innerHTML=`<div class="card"><div class="card-title">Outstanding fees</div>${debtors.map(d=>`<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;margin-bottom:4px"><span style="font-size:13px;font-weight:700">Cycle ${d.cycle} · ${d.gw}</span><span style="font-size:11px;font-family:'Space Grotesk',system-ui,sans-serif;color:var(--muted);white-space:nowrap">₦${d.fee.toLocaleString()}/player</span></div><div style="font-size:12px;color:var(--red)">${d.unpaid.join(', ')}</div></div>`).join('')}</div>`;
}

// ── Sync from FPL — auto-adds new players, updates names, marks cycle paid ────
async function syncFromFPL(){
  const btn=document.getElementById('sync-fpl-btn');
  const status=document.getElementById('sync-fpl-status');
  btn.disabled=true; status.textContent='Fetching from FPL…';
  try{
    const data=await fetch(`/api/fpl-league?league=${FPL_LEAGUE_ID}`).then(r=>r.ok?r.json():Promise.reject(r.status));
    const rows=data.standings?.results||[];
    const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:0;
    const curCycleIdx=Math.max(0,Math.min(Math.floor(lastGW/5),CYCLES.length-1));
    if(!state.cyclePayments[curCycleIdx]) state.cyclePayments[curCycleIdx]={};
    const cycle=CYCLES[curCycleIdx];
    const label=`Cycle ${curCycleIdx+1} fee`;
    let added=0, updated=0;
    rows.forEach(r=>{
      // Match by entryId (set via applyMigrations or previous sync)
      let playerIdx=state.players.findIndex(p=>p.entryId===r.entry);
      if(playerIdx===-1){
        // New player — add them automatically
        state.players.push({name:r.player_name,teamName:r.entry_name||'',entryId:r.entry,accumulated:0,paidOut:0,carryOver:0,w1:0,w2:0,w3:0});
        playerIdx=state.players.length-1;
        added++;
      } else {
        // Update name and team from FPL
        state.players[playerIdx].name=r.player_name;
        if(r.entry_name) state.players[playerIdx].teamName=r.entry_name;
        updated++;
      }
      syncCyclePlayers(); // expand cycle.players to include new player
      // Being in the league = confirmed paid for current cycle
      const cp=state.cyclePayments[curCycleIdx];
      const p=state.players[playerIdx];
      const alreadyCash=cp[playerIdx]==='cash'||cp[playerIdx]===true;
      const bal=p.accumulated+(p.carryOver||0)-p.paidOut;
      if(!cp[playerIdx]){
        if(bal>=cycle.fee){ cp[playerIdx]='winnings'; p.paidOut+=cycle.fee; state.payouts.push({player:p.name,amount:cycle.fee,gw:label}); }
        else { cp[playerIdx]='cash'; }
      } else if(alreadyCash){
        const freshBal=p.accumulated+(p.carryOver||0)-p.paidOut;
        if(freshBal>=cycle.fee){ cp[playerIdx]='winnings'; p.paidOut+=cycle.fee; state.payouts.push({player:p.name,amount:cycle.fee,gw:label}); }
      }
    });
    syncCyclePlayers();
    save();
    renderAdminPlayers(); populateSelects(); renderStandings(); renderPayments();
    const msg=[];
    if(added) msg.push(`${added} new player${added>1?'s':''} added`);
    msg.push(`${updated} updated — cycle ${curCycleIdx+1} marked paid`);
    status.textContent=msg.join(', ');
  } catch(err){
    status.textContent=`Failed: ${err}`;
  }
  btn.disabled=false;
}

// ── Export / Import state ─────────────────────────────────────────────────────
function exportState(){
  const a=document.createElement('a');
  a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(state,null,2));
  a.download=`challenge-arena-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importState(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const imported=JSON.parse(e.target.result);
      if(!imported.players||!imported.gameweeks) throw new Error('Invalid file — not a Challenge Arena backup');
      if(!confirm(`Import ${file.name}?\n\nThis will overwrite all current data on this device.`)){input.value='';return;}
      state=imported;
      save();
      populateSelects(); renderStandings(); renderAdminPlayers();
      renderPayments(); renderPayoutLog();
      const st=document.getElementById('import-status');
      st.textContent='✓ Imported successfully'; st.style.color='var(--green)';
      setTimeout(()=>{st.textContent='';},3000);
    }catch(err){ alert('Import failed: '+err.message); }
    input.value='';
  };
  reader.readAsText(file);
}

// ── GW countdown ticker ───────────────────────────────────────────────────────
setInterval(()=>{ updateGWCountdown(); renderCountdown(); }, 1000);

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
