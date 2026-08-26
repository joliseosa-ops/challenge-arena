const KEY='challenge_arena_v21';
const WEEKLY_PRIZE_RATE=2000; // ₦2k per player per GW goes to weekly prizes
// prizes() computes dynamically from actual player count — updates when players are added
function prizes(){ const pot=state.players.length*WEEKLY_PRIZE_RATE; return {p1:Math.round(pot*(26/44)),p2:Math.round(pot*(12/44)),p3:Math.round(pot*(6/44))}; }

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
  return {players,gameweeks:[],payouts:[],payoutRequests:[],cyclePayments:{},cycleCredited:{},nextGWDate:null,nextSeasonDate:null,bankAccount:{name:'Osahon Jude Osagie',number:'1494859631',bank:'Access Bank'}};
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

function toggleTheme(){
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  localStorage.setItem('ca_theme',next);
  const btn=document.getElementById('theme-toggle');
  if(btn) btn.textContent=next==='dark'?'☀️':'🌙';
}
function initThemeToggle(){
  const t=document.documentElement.dataset.theme||'light';
  const btn=document.getElementById('theme-toggle');
  if(btn) btn.textContent=t==='dark'?'☀️':'🌙';
}

const ADMIN_PIN='0697'; // change this to your preferred PIN
let isAdmin=!!sessionStorage.getItem('ca_admin');
let pendingTab=null;

let state=load();
applyMigrations();
let activeCycleIdx=null;
let currentSort='earnings';

function populateSelects(){
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c','p4a','p4b','po-player','h2h-a','h2h-b','h2h-c'].forEach(id=>{
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
      const sh=add(s2,p2+p3);
      lines.push(`Joint 2nd: ${s2.map(nm).join(' & ')} → ₦${sh.toLocaleString()} each (2nd+3rd split)`);
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
    const data=await fetch(`/api/fpl-league?league=${FPL_LEAGUE_ID}`).then(r=>r.ok?r.json():Promise.reject(r.status));
    const rows=data.standings?.results||[];
    if(!rows.length) throw new Error('no standings data');

    const scores={};
    rows.forEach(r=>{
      const playerIdx=state.players.findIndex(p=>Number(p.entryId)===Number(r.entry));
      if(playerIdx===-1) return;
      const pts=r.event_total||r.total||0;
      if(pts>0) scores[playerIdx]=pts;
    });

    if(!Object.keys(scores).length){
      status.textContent=`GW${targetGW} not available yet — enter manually`;
      btn.disabled=false; return;
    }

    const ranking=Object.entries(scores).map(([i,pts])=>[+i,pts]).sort((a,b)=>b[1]-a[1]);
    const topPts=ranking[0][1];
    const first=ranking.filter(([,pts])=>pts===topPts).map(([i])=>i);
    const rest=ranking.filter(([,pts])=>pts<topPts);

    const fill=(prefix,arr)=>['a','b','c'].forEach((s,i)=>{ const el=document.getElementById(prefix+s); if(el) el.value=arr[i]??''; });
    ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c','p4a','p4b'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });

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
  const lastGW=state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:0;
  // collect points
  const points={};
  state.players.forEach((_,i)=>{ const v=document.getElementById('pts-'+i)?.value; if(v!==''&&v!=null) points[i]=parseInt(v)||0; });
  Object.entries(awards).forEach(([idx,prize])=>{ state.players[parseInt(idx)].accumulated+=prize; });
  positions[1].forEach(i=>state.players[i].w1++);
  positions[2].forEach(i=>state.players[i].w2++);
  positions[3].forEach(i=>state.players[i].w3++);
  const fourth=[...new Set(['p4a','p4b'].map(id=>{ const v=document.getElementById(id)?.value; return v!==''&&v!=null?parseInt(v):null; }).filter(v=>v!==null&&!isNaN(v)))];
  fourth.forEach(i=>{ if(state.players[i]) state.players[i].w4=(state.players[i].w4||0)+1; });
  positions[4]=fourth;
  state.gameweeks.push({gw:lastGW+1,awards,pos:positions,note,points:Object.keys(points).length?points:undefined});
  save();
  ['p1a','p1b','p1c','p2a','p2b','p2c','p3a','p3b','p3c','p4a','p4b'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
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
const credited=(idx,i)=>(state.cycleCredited[idx]?.[i])||0;


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
  const mwp=document.getElementById('m-weeklypot'); if(mwp) mwp.textContent='₦'+(state.players.length*WEEKLY_PRIZE_RATE).toLocaleString();
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
  const reqEl=document.getElementById('payout-requests');
  if(reqEl){
    const pending=(state.payoutRequests||[]).filter(r=>r.status==='pending');
    if(!pending.length){
      reqEl.innerHTML='<div class="empty">no pending requests</div>';
    } else {
      reqEl.innerHTML=pending.map(r=>{
        const ts=new Date(r.timestamp);
        const timeStr=ts.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+ts.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
        return `<div style="border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:6px;padding:.75rem 1rem;margin-bottom:.625rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:.5rem">
            <div>
              <span style="font-size:13px;font-weight:700">${r.player}</span>
              <span style="font-size:11px;color:var(--muted);margin-left:8px">${timeStr}</span>
            </div>
            <span style="font-size:15px;font-weight:700;color:var(--accent)">₦${r.amount.toLocaleString()}</span>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:.625rem;line-height:1.6">
            🏦 ${r.bank.bank} &nbsp;·&nbsp; ${r.bank.accountName} &nbsp;·&nbsp; <span style="font-family:monospace;letter-spacing:.05em">${r.bank.accountNumber}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="processPayoutRequest(${r.id})" style="padding:5px 14px;font-size:12px;font-weight:700;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;min-height:32px">✓ Process & Record</button>
            <button onclick="dismissPayoutRequest(${r.id})" style="padding:5px 12px;font-size:12px;background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;cursor:pointer;min-height:32px">Dismiss</button>
          </div>
        </div>`;
      }).join('');
    }
  }
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

function processPayoutRequest(id){
  const req=state.payoutRequests.find(r=>r.id===id); if(!req) return;
  const p=state.players[req.playerIdx];
  if(!p){ alert('Player not found'); return; }
  const bal=Math.max(0,pubBal(p));
  if(req.amount>bal){ alert(`${p.name} only has ₦${bal.toLocaleString()} available now`); return; }
  p.paidOut+=req.amount;
  state.payouts.push({player:p.name,amount:req.amount,gw:state.gameweeks.length?state.gameweeks[state.gameweeks.length-1].gw:'Payout'});
  req.status='processed';
  save(); renderPayoutLog(); updatePayoutInfo(); renderStandings();
}

function dismissPayoutRequest(id){
  const req=state.payoutRequests.find(r=>r.id===id); if(!req) return;
  if(!confirm(`Dismiss payout request for ${req.player}?`)) return;
  req.status='dismissed';
  save(); renderPayoutLog();
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
      <div style="font-size:11px;color:var(--dim);font-family:'Poppins',system-ui,sans-serif;margin-bottom:3px">GW${c.gw[0]}–${c.gw[1]}</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:6px">₦${c.fee.toLocaleString()}</div>
      <div style="font-family:'Poppins',system-ui,sans-serif;font-size:18px;font-weight:600;color:var(--text)">${paid}<span style="color:var(--dim);font-size:13px">/${c.players.length}</span></div>
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
    const credited=state.cycleCredited[idx]?.[i]||0;
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
    const statusTag=isWin?'✓ winnings':isCash?'✓ cash':isPartial?`⚡ partial (₦${cashOwed.toLocaleString()} cash)`:isSettled?`✓ settled (₦${ownOffset.toLocaleString()} winnings + ₦${cashOwed.toLocaleString()} cash)`:isCo?`✓ ₦${ownOffset.toLocaleString()} own + ₦${cashOwed.toLocaleString()} by ${benefactorName}`:credited>0?`⚡ ₦${credited.toLocaleString()} collected — ₦${(c.fee-credited).toLocaleString()} remaining`:'—';
    const statusClass=(isCash||isWin||isCo||isSettled)?'paid-tag':isPartial||credited>0?'paid-tag':'unpaid-tag';
    const statusStyle=isPartial||credited>0?'color:var(--caution)':isSettled||isCo?'color:var(--green)':'';
    return `<div class="check-item" style="flex-wrap:wrap">
      <input type="checkbox" id="cp${i}" ${isCash?'checked':''} onchange="if(this.checked){['cpw${i}','cppw${i}'].forEach(id=>{var el=document.getElementById(id);if(el)el.checked=false;})}">
      <label for="cp${i}" style="flex:1">${p.name}</label>
      <span style="font-size:11px;font-family:'Poppins',system-ui,sans-serif;color:var(--dim);margin-right:4px">₦${bal.toLocaleString()}</span>
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
      ${!isCash&&!isWin&&!isPartial&&!isSettled&&!isCo?`<div style="width:100%;padding:4px 0 0 23px;display:flex;align-items:center;gap:8px">
        <label style="font-size:11px;color:var(--muted);white-space:nowrap">Already collected: ₦</label>
        <input type="number" id="cppc${i}" value="${credited||''}" placeholder="0" min="0" max="${c.fee}" style="width:90px;height:28px;font-size:12px;padding:2px 6px">
        ${credited>0?`<span style="font-size:11px;color:var(--caution)">₦${(c.fee-credited).toLocaleString()} still owed</span>`:''}
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
    const pcEl=document.getElementById('cppc'+i);
    const pcAmt=pcEl?parseFloat(pcEl.value)||0:0;
    if(winEl?.checked) newCP[i]='winnings';
    else if(partialEl?.checked){
      const byIdx=coEl&&coEl.value!==''?parseInt(coEl.value):null;
      if(byIdx!==null&&!isNaN(byIdx)) newCP[i]={type:'co-offset',own:state.players[i].accumulated+(state.players[i].carryOver||0)-state.players[i].paidOut,by:byIdx};
      else if(srEl?.checked) newCP[i]='settled';
      else newCP[i]='partial';
    } else if(cashEl?.checked) newCP[i]='cash';
    // Save partial collection to cycleCredited (isolated from cyclePayments)
    if(!state.cycleCredited[activeCycleIdx]) state.cycleCredited[activeCycleIdx]={};
    if(pcAmt>0&&!newCP[i]) state.cycleCredited[activeCycleIdx][i]=pcAmt;
    else if(newCP[i]) delete state.cycleCredited[activeCycleIdx][i]; // clear credited when fully paid
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
  save(); closeModal(); renderPayments(); renderStandings(); renderFinanceTab();
}
function closeModal(){ document.getElementById('cycle-overlay').classList.remove('open'); }
document.getElementById('cycle-overlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeModal(); });
document.getElementById('payout-req-overlay').addEventListener('click',e=>{ if(e.target===e.currentTarget) closePayoutRequest(); });

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
  el.style.color=t==='LIVE'?'var(--green)':t==='—'?'var(--dim)':'var(--heading)';
}

function renderAdminPlayers(){
  const el=document.getElementById('admin-player-list'); if(!el) return;
  el.innerHTML=state.players.map((p,i)=>`
    <div class="player-row">
      <div class="init">${p.name.slice(0,2).toUpperCase()}</div>
      <span style="flex:1;font-size:.9rem;font-weight:500;min-width:70px">${p.name}</span>
      <input type="text" value="${p.teamName||''}" placeholder="Team name" onblur="setTeamName(${i},this.value)" style="font-size:.8rem;padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:4px;color:var(--text);width:110px;max-width:25vw;height:36px">
      <div style="display:flex;flex-direction:column;gap:3px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Entry ID</div>
        <input type="number" value="${p.entryId||''}" placeholder="—" onblur="setEntryId(${i},this.value)" style="font-size:.8rem;padding:4px 8px;background:var(--surface);border:1px solid ${p.entryId?'var(--green)':'var(--border)'};border-radius:4px;color:var(--text);width:80px;max-width:22vw;height:32px">
      </div>
      <div style="display:flex;flex-direction:column;gap:3px">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">PIN</div>
        <input type="text" value="${p.pin||''}" placeholder="—" onblur="setPlayerPin(${i},this.value)" style="font-size:.8rem;padding:4px 8px;background:var(--surface);border:1px solid ${p.pin?'var(--green)':'var(--border)'};border-radius:4px;color:var(--text);width:54px;max-width:18vw;height:32px;font-family:monospace;letter-spacing:.08em">
      </div>
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

function setPlayerPin(idx,val){
  state.players[idx].pin=val.trim();
  save(); renderAdminPlayers();
}

function addPlayer(){
  const name=document.getElementById('new-player-name').value.trim();
  if(!name){ alert('Enter a player name'); return; }
  if(state.players.find(p=>p.name.toLowerCase()===name.toLowerCase())){ alert('Player already exists'); return; }
  const genPin=()=>String(Math.floor(1000+Math.random()*9000));
  state.players.push({name,teamName:'',accumulated:0,paidOut:0,carryOver:0,w1:0,w2:0,w3:0,pin:genPin()});
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
  (last.pos[4]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w4=Math.max(0,(state.players[i].w4||0)-1); });
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
    // Sync team names from FPL API into state
    let changed=false;
    rows.forEach(r=>{
      const p=state.players.find(p=>p.entryId===r.entry);
      if(p&&p.teamName!==r.entry_name){ p.teamName=r.entry_name; changed=true; }
    });
    if(changed){ save(); renderStandings(); }
    el.innerHTML=`<div class="tbl-wrap"><table>
      <thead><tr><th>#</th><th>Player</th><th>Team</th><th>GW</th><th>Total</th></tr></thead>
      <tbody>${rows.map((r,i)=>`<tr>
        <td><span class="${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-n'}">${i+1}</span></td>
        <td style="font-weight:500">${r.player_name}</td>
        <td style="font-size:12px;color:var(--muted)">${r.entry_name}</td>
        <td style="font-family:'Poppins',system-ui,sans-serif">${r.event_total}</td>
        <td style="font-family:'Poppins',system-ui,sans-serif;font-weight:600">${r.total}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }catch(e){
    el.innerHTML=`<div class="empty">Could not load — ${e}</div>`;
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='↻ Refresh'; }
  }
}


const ADMIN_WA='2348117666657';

function openPayoutRequest(){
  const sel=document.getElementById('pr-player');
  sel.innerHTML='<option value="">— select your name —</option>';
  state.players.forEach((p,i)=>{
    const bal=Math.max(0,pubBal(p));
    sel.innerHTML+=`<option value="${i}">${p.name}${bal>0?' — ₦'+bal.toLocaleString():''}</option>`;
  });
  document.getElementById('pr-amount').value='';
  document.getElementById('pr-balance-row').style.display='none';
  ['pr-bank','pr-account-name','pr-account-number','pr-pin'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const pinRow=document.getElementById('pr-pin-row'); if(pinRow) pinRow.style.display='none';
  document.getElementById('payout-req-overlay').classList.add('open');
}

function onPayoutPlayerChange(){
  const idx=parseInt(document.getElementById('pr-player').value);
  const row=document.getElementById('pr-balance-row');
  const pinRow=document.getElementById('pr-pin-row');
  if(isNaN(idx)){ row.style.display='none'; if(pinRow) pinRow.style.display='none'; return; }
  const p=state.players[idx];
  const bal=Math.max(0,pubBal(p));
  document.getElementById('pr-balance').textContent='₦'+bal.toLocaleString();
  row.style.display='flex';
  document.getElementById('pr-amount').max=bal;
  document.getElementById('pr-amount').value=bal;
  if(pinRow){ pinRow.style.display=p.pin?'block':'none'; }
  const pinInput=document.getElementById('pr-pin'); if(pinInput) pinInput.value='';
}

function sendPayoutRequest(){
  const idx=parseInt(document.getElementById('pr-player').value);
  if(isNaN(idx)){ alert('Please select your name'); return; }
  const amt=parseFloat(document.getElementById('pr-amount').value);
  if(!amt||amt<=0){ alert('Please enter an amount'); return; }
  const p=state.players[idx];
  const bal=Math.max(0,pubBal(p));
  if(amt>bal){ alert(`Amount exceeds your balance of ₦${bal.toLocaleString()}`); return; }
  if(p.pin){
    const entered=(document.getElementById('pr-pin')?.value||'').trim();
    if(entered!==p.pin){ alert('Incorrect PIN'); return; }
  }
  const bankName=(document.getElementById('pr-bank')?.value||'').trim();
  const accountName=(document.getElementById('pr-account-name')?.value||'').trim();
  const accountNumber=(document.getElementById('pr-account-number')?.value||'').trim();
  if(!bankName||!accountName||!accountNumber){ alert('Please fill in your bank details'); return; }
  const req={id:Date.now(),playerIdx:idx,player:p.name,amount:amt,bank:{bank:bankName,accountName,accountNumber},timestamp:new Date().toISOString(),status:'pending'};
  state.payoutRequests.push(req);
  save();
  const msg=[
    `💸 *Payout Request — Challenge Arena*`,
    ``,
    `Player: ${p.name}`,
    `Balance: ₦${bal.toLocaleString()}`,
    `Requested: ₦${amt.toLocaleString()}`,
    ``,
    `Bank: ${bankName}`,
    `Account Name: ${accountName}`,
    `Account Number: ${accountNumber}`,
    ``,
    `Please process when convenient 🙏`
  ].join('\n');
  window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(msg)}`,'_blank');
  closePayoutRequest();
}

function closePayoutRequest(){
  document.getElementById('payout-req-overlay').classList.remove('open');
}

function saveBankAccount(){
  const bank=document.getElementById('ba-bank')?.value.trim()||'';
  const name=document.getElementById('ba-name')?.value.trim()||'';
  const number=document.getElementById('ba-number')?.value.trim()||'';
  state.bankAccount={bank,name,number};
  save();
}

function toggleKobo(){
  const c=document.getElementById('kobo-content');
  const ch=document.getElementById('kobo-chevron');
  if(!c) return;
  const open=c.style.display!=='none';
  c.style.display=open?'none':'';
  if(ch) ch.style.transform=open?'':'rotate(180deg)';
}
function toggleEarnings(){
  const c=document.getElementById('earnings-content');
  const ch=document.getElementById('earnings-chevron');
  if(!c) return;
  const open=c.style.display!=='none';
  c.style.display=open?'none':'';
  if(ch) ch.style.transform=open?'':'rotate(180deg)';
}
function toggleOutstanding(){
  const c=document.getElementById('outstanding-content');
  const ch=document.getElementById('outstanding-chevron');
  if(!c) return;
  const open=c.style.display!=='none';
  c.style.display=open?'none':'';
  if(ch) ch.style.transform=open?'':'rotate(180deg)';
}

function switchBankTab(t){ window._bankSubTab=t; renderFinanceTab(); }

function renderFinanceTab(){
  const el=document.getElementById('finance-content'); if(!el) return;
  const fmt=n=>'₦'+Math.abs(n).toLocaleString();
  const isPaid=t=>t===true||t==='cash'||t==='winnings'||t==='settled'||(typeof t==='object'&&t?.type==='co-offset');
  const activeTab=window._bankSubTab||'weekly';

  // --- Core figures ---
  let totalReceived=0;
  CYCLES.forEach((c,idx)=>{
    const cp=state.cyclePayments[idx]||{};
    totalReceived+=c.players.filter(i=>isPaid(cp[i])).length*c.fee;
  });
  const seasonPot=seasonPotTotal();
  const weeklyReceived=seasonPot*2;
  const weeklyPotPerGW=state.players.length*WEEKLY_PRIZE_RATE;
  const gwAwarded=state.players.reduce((s,p)=>s+p.accumulated,0);
  const weeklyRemaining=Math.max(0,weeklyReceived-gwAwarded);
  const totalWithdrawn=state.players.reduce((s,p)=>s+Math.max(0,p.paidOut-(p.carryOver||0)),0);
  const totalInBank=state.players.reduce((s,p)=>s+Math.max(0,pubBal(p)),0);
  const totalGWs=CYCLES.reduce((s,c)=>s+(c.gw[1]-c.gw[0]+1),0);
  const projectedSeasonPot=state.players.length*1000*totalGWs;

  // --- Outstanding per cycle ---
  const cycleDebtors=CYCLES.map((c,idx)=>{
    const cp=state.cyclePayments[idx]||{};
    const unpaid=c.players.filter(i=>!isPaid(cp[i]));
    return {idx,c,unpaid,cp};
  }).filter(x=>x.unpaid.length>0);
  const totalOutstanding=cycleDebtors.reduce((s,{c,unpaid,idx})=>s+unpaid.reduce((t,i)=>t+Math.max(0,c.fee-credited(idx,i)),0),0);

  // --- Helpers ---
  const tile=(label,val,color,sub='')=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid ${color};border-radius:8px;padding:1rem">
      <div style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">${label}</div>
      <div style="font-size:20px;font-weight:700;color:${color}">${fmt(val)}</div>
      ${sub?`<div style="font-size:11px;color:var(--muted);margin-top:3px">${sub}</div>`:''}
    </div>`;

  const row=(label,val,dot,color='var(--text)')=>`
    <div style="display:flex;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);gap:10px">
      <span style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></span>
      <div style="flex:1;font-size:13px;font-weight:500">${label}</div>
      <div style="font-weight:700;color:${color};white-space:nowrap">${fmt(val)}</div>
    </div>`;

  // --- Sub-tab toggle ---
  const tabBar=`
    <div style="display:flex;gap:6px;background:var(--surface2);padding:4px;border-radius:10px;margin-bottom:1rem">
      <button onclick="switchBankTab('weekly')" style="flex:1;padding:8px 0;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;transition:all 150ms;background:${activeTab==='weekly'?'var(--accent)':'transparent'};color:${activeTab==='weekly'?'#fff':'var(--muted)'}">Weekly Pot</button>
      <button onclick="switchBankTab('season')" style="flex:1;padding:8px 0;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;transition:all 150ms;background:${activeTab==='season'?'#f59e0b':'transparent'};color:${activeTab==='season'?'#fff':'var(--muted)'}">Season Pot</button>
    </div>`;

  if(activeTab==='season'){
    // --- Season pot tab ---

    // Achievement leaders (computed from in-app data)
    const sorted=[...state.players.map((p,i)=>({p,i}))].sort((a,b)=>(b.p.w1+b.p.w2+b.p.w3)-(a.p.w1+a.p.w2+a.p.w3));
    const consistentLeader=sorted[0];
    const consistentTotal=consistentLeader?(consistentLeader.p.w1+consistentLeader.p.w2+consistentLeader.p.w3):0;
    const streaks=state.players.map((p,qi)=>{ let s=0,m=0; state.gameweeks.forEach(g=>{ if((g.awards[qi]||0)>0){s++;m=Math.max(m,s);}else s=0; }); return {name:p.name,streak:m}; });
    const maxStreak=Math.max(...streaks.map(x=>x.streak),0);
    const onFireLeaders=streaks.filter(x=>x.streak>0&&x.streak===maxStreak);
    const maxW4=Math.max(...state.players.map(p=>p.w4||0),0);
    const oopLeaders=state.players.filter(p=>(p.w4||0)>0&&(p.w4||0)===maxW4);

    const prizeRow=(pos,name,prize,sub='',loading=false)=>`
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:18px;width:28px;text-align:center;flex-shrink:0">${pos}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${prize}</div>
          ${sub?`<div style="font-size:11px;color:var(--muted);margin-top:1px">${sub}</div>`:''}
        </div>
        ${loading?`<span style="font-size:11px;color:var(--dim);font-style:italic">Loading…</span>`:name?`<span style="font-size:12px;font-weight:700;color:var(--accent);background:var(--accent-light);padding:3px 9px;border-radius:20px">${name}</span>`:'<span style="font-size:11px;color:var(--dim);font-style:italic">TBD</span>'}
      </div>`;
    const leaderName=arr=>arr.length?arr.map(x=>x.name).join(' & '):'';

    // Render shell immediately with loading state for FPL-based rows
    el.innerHTML=tabBar+`
      <div class="card" style="margin-bottom:1rem">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">
          ${tile('Accumulated so far',seasonPot,'#f59e0b',`after ${state.gameweeks.length} GW${state.gameweeks.length!==1?'s':''}`)}
          ${tile('Projected at GW38',projectedSeasonPot,'var(--heading)',`${state.players.length} × ₦1k × ${totalGWs} GWs`)}
        </div>
      </div>

      <div class="card" style="margin-bottom:1rem" id="sp-midseason-card">
        <div style="margin:-1.25rem -1.25rem .875rem;padding:.6rem 1.25rem;background:linear-gradient(90deg,#6b21a8,#a855f7);border-radius:7px 7px 0 0">
          <div style="font-size:12px;font-weight:700;color:#fff;letter-spacing:.04em">MID-SEASON AWARDS · GW19</div>
          <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">Top 3 by overall standings · ₦200,000 total</div>
        </div>
        <div id="sp-midseason-rows">
          ${prizeRow('🥇','','₦100,000','1st overall',true)}
          ${prizeRow('🥈','','₦60,000','2nd overall',true)}
          ${prizeRow('🥉','','₦40,000','3rd overall',true)}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:.75rem;text-align:center">Live FPL standings · updates when refreshed</div>
      </div>

      <div class="card" style="margin-bottom:1rem" id="sp-endseason-card">
        <div style="margin:-1.25rem -1.25rem .875rem;padding:.6rem 1.25rem;background:linear-gradient(90deg,#b45309,#f59e0b);border-radius:7px 7px 0 0">
          <div style="font-size:12px;font-weight:700;color:#fff;letter-spacing:.04em">END OF SEASON AWARDS · GW38</div>
          <div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:2px">Top 5 by overall standings · ₦550,000</div>
        </div>
        <div id="sp-endseason-rows">
          ${prizeRow('🥇','','₦200,000','1st overall',true)}
          ${prizeRow('🥈','','₦140,000','2nd overall',true)}
          ${prizeRow('🥉','','₦95,000','3rd overall',true)}
          ${prizeRow('4️⃣','','₦65,000','4th overall',true)}
          ${prizeRow('5️⃣','','₦50,000','5th overall',true)}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:.75rem;text-align:center">Live FPL standings · updates when refreshed</div>
      </div>

      <div class="card" style="margin-bottom:1rem">
        <div style="margin:-1.25rem -1.25rem .875rem;padding:.6rem 1.25rem;background:linear-gradient(90deg,#0f766e,#14b8a6);border-radius:7px 7px 0 0">
          <div style="font-size:12px;font-weight:700;color:#fff;letter-spacing:.04em">ACHIEVEMENT AWARDS · GW38</div>
          <div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:2px">₦85,000 total</div>
        </div>
        ${prizeRow('⭐',consistentTotal>0?consistentLeader.p.name:'','₦40,000','Consistent — most podium finishes')}
        ${prizeRow('🔥',leaderName(onFireLeaders),'₦30,000','On Fire — longest podium streak')}
        ${prizeRow('😤',leaderName(oopLeaders.map(p=>({name:p.name}))),'₦15,000','Out of Podium Expert — most 4th places')}
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0">
          <span style="font-size:18px;width:28px;text-align:center;flex-shrink:0">🛠</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:700">₦1,000</div><div style="font-size:11px;color:var(--muted);margin-top:1px">Admin charges / support</div></div>
        </div>
      </div>`;

    // Fetch live FPL standings and populate top rows
    (async()=>{
      try{
        const data=await fetch(`/api/fpl-league?league=${FPL_LEAGUE_ID}`).then(r=>r.ok?r.json():Promise.reject(r.status));
        const rows=(data.standings?.results||[]).sort((a,b)=>b.total-a.total);
        // Map entry IDs to player names
        const getName=r=>{ const p=state.players.find(p=>Number(p.entryId)===Number(r.entry)); return p?p.name:(r.player_name||r.entry_name||'?'); };
        const ranked=rows.map((r,i)=>({pos:i+1,name:getName(r),pts:r.total}));
        const midEl=document.getElementById('sp-midseason-rows');
        const endEl=document.getElementById('sp-endseason-rows');
        if(midEl) midEl.innerHTML=[
          prizeRow('🥇',ranked[0]?.name||'','₦100,000',`1st · ${ranked[0]?.pts||0} pts`),
          prizeRow('🥈',ranked[1]?.name||'','₦60,000',`2nd · ${ranked[1]?.pts||0} pts`),
          prizeRow('🥉',ranked[2]?.name||'','₦40,000',`3rd · ${ranked[2]?.pts||0} pts`),
        ].join('');
        if(endEl) endEl.innerHTML=[
          prizeRow('🥇',ranked[0]?.name||'','₦200,000',`1st · ${ranked[0]?.pts||0} pts`),
          prizeRow('🥈',ranked[1]?.name||'','₦140,000',`2nd · ${ranked[1]?.pts||0} pts`),
          prizeRow('🥉',ranked[2]?.name||'','₦95,000',`3rd · ${ranked[2]?.pts||0} pts`),
          prizeRow('4️⃣',ranked[3]?.name||'','₦65,000',`4th · ${ranked[3]?.pts||0} pts`),
          prizeRow('5️⃣',ranked[4]?.name||'','₦50,000',`5th · ${ranked[4]?.pts||0} pts`),
        ].join('');
      }catch(e){
        const midEl=document.getElementById('sp-midseason-rows');
        const endEl=document.getElementById('sp-endseason-rows');
        const errMsg='<div style="font-size:12px;color:var(--muted);padding:.5rem 0">Could not load standings — check FPL League tab</div>';
        if(midEl) midEl.innerHTML=errMsg;
        if(endEl) endEl.innerHTML=errMsg;
      }
    })();
    return;
  }

  // --- Weekly pot tab ---

  // --- Cycle collection status ---
  const cycleStatusRows=CYCLES.map((c,idx)=>{
    const cp=state.cyclePayments[idx]||{};
    const paidCount=c.players.filter(i=>isPaid(cp[i])).length;
    const total=c.players.length;
    const pct=total?Math.round(paidCount/total*100):0;
    const collected=paidCount*c.fee;
    const allPaid=paidCount===total;
    return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div>
          <span style="font-size:13px;font-weight:600">Cycle ${idx+1}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:6px">GW${c.gw[0]}–${c.gw[1]}</span>
        </div>
        <div style="text-align:right">
          <span style="font-size:13px;font-weight:700;color:${allPaid?'var(--green)':'var(--text)'}">${fmt(collected)}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:4px">${paidCount}/${total} paid</span>
        </div>
      </div>
      <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${allPaid?'var(--green)':'var(--accent)'};border-radius:3px;transition:width .3s"></div>
      </div>
    </div>`;
  }).join('');

  // --- Outstanding / who hasn't paid ---
  const outstandingHtml=cycleDebtors.length===0
    ? `<div style="display:flex;align-items:center;gap:8px;padding:.75rem 1rem;background:var(--green-bg);border-radius:8px;color:var(--green);font-weight:600;font-size:13px">✓ All cycle payments received — no outstanding fees</div>`
    : cycleDebtors.map(({idx,c,unpaid})=>{
        const debtorInfo=unpaid.map(i=>{
          const p=state.players[i];
          const alreadyPaid=credited(idx,i);
          const inBank=Math.max(0,pubBal(p));
          const net=Math.max(0,c.fee-alreadyPaid-inBank);
          return {name:p?.name||'?',alreadyPaid,inBank,net};
        });
        const totalNet=debtorInfo.reduce((s,d)=>s+d.net,0);
        return `
        <div style="margin-bottom:.75rem;border:1px solid var(--red-bg);border-left:3px solid var(--red);border-radius:6px;padding:.75rem 1rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:700">Cycle ${idx+1} · GW${c.gw[0]}–${c.gw[1]}</span>
            <span style="font-size:12px;font-weight:700;color:var(--red)">${fmt(totalNet)} to collect</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${debtorInfo.map(d=>{
              const notes=[];
              if(d.alreadyPaid>0) notes.push(`₦${d.alreadyPaid.toLocaleString()} paid`);
              if(d.inBank>0) notes.push(`₦${d.inBank.toLocaleString()} in bank`);
              const badge=`${d.name} · ${fmt(d.net)}${notes.length?`<span style="font-size:10px;opacity:.75"> (${notes.join(', ')})</span>`:''}`;
              return `<span style="font-size:12px;font-weight:600;background:var(--red-bg);color:var(--red);padding:3px 10px;border-radius:20px">${badge}</span>`;
            }).join('')}
          </div>
        </div>`;
      }).join('');

  // --- Per-player summary ---
  const playerRows=[...state.players.map((p,i)=>({p,i}))]
    .sort((a,b)=>b.p.accumulated-a.p.accumulated)
    .map(({p})=>{
      const earned=p.accumulated;
      const withdrawn=Math.max(0,p.paidOut-(p.carryOver||0));
      const inBank=pubBal(p);
      return `<tr>
        <td style="font-weight:600">${p.name}</td>
        <td style="font-weight:700;color:var(--green)">${earned>0?fmt(earned):'—'}</td>
        <td style="color:var(--blue)">${withdrawn>0?fmt(withdrawn):'—'}</td>
        <td style="font-weight:700;color:${inBank>0?'var(--heading)':inBank<0?'var(--red)':'var(--dim)'}">${inBank!==0?fmt(inBank):'—'}</td>
      </tr>`;
    }).join('');

  // --- GW history ---
  const gwRows=[...state.gameweeks].reverse().map(g=>{
    const winners=Object.entries(g.awards).filter(([,a])=>a>0)
      .map(([i,a])=>`${state.players[parseInt(i)]?.name||'?'} ₦${a.toLocaleString()}`).join(' · ');
    const total=Object.values(g.awards).reduce((s,a)=>s+a,0);
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);gap:8px;flex-wrap:wrap">
      <div><div style="font-size:12px;font-weight:700;color:var(--accent)">GW ${g.gw}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${winners||'—'}</div></div>
      <div style="font-size:13px;font-weight:700;flex-shrink:0">${fmt(total)}</div>
    </div>`;
  }).join('');

  el.innerHTML=tabBar+`
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">Money In</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">
        ${tile('Weekly Pot / GW',weeklyPotPerGW,'var(--accent)',`₦${WEEKLY_PRIZE_RATE.toLocaleString()} × ${state.players.length} players`)}
        ${tile('Weekly Total',weeklyReceived,'var(--accent)','all weekly fees received')}
        ${tile('Season Pot',seasonPot,'#f59e0b','accumulated so far')}
        ${tile('Grand Total',totalReceived,'var(--heading)','weekly + season combined')}
      </div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <div onclick="toggleKobo()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer">
        <span class="card-title" style="margin-bottom:0;pointer-events:none">Where Every Kobo Is</span>
        <span id="kobo-chevron" style="font-size:12px;color:var(--muted);display:inline-block;transition:transform 200ms ease">▾</span>
      </div>
      <div id="kobo-content" style="display:none;margin-top:.875rem">
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;padding:8px 0 4px">Weekly Prize Pool — ${fmt(weeklyReceived)} received</div>
        ${row('Distributed as GW prizes',gwAwarded,'var(--green)','var(--green)')}
        ${row('Remaining in pot',weeklyRemaining,'var(--caution)','var(--caution)')}
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;padding:14px 0 4px">Season Pot — ${fmt(seasonPot)} accumulated</div>
        ${row('Accumulated this season',seasonPot,'#f59e0b','#b45309')}
        ${row('Paid out',0,'var(--border)','var(--dim)')}
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;padding:14px 0 4px">GW Prize Winnings — ${fmt(gwAwarded)} earned</div>
        ${row('Withdrawn by players',totalWithdrawn,'var(--blue)','var(--blue)')}
        ${row('Still in player accounts',totalInBank,'var(--heading)','var(--heading)')}
      </div>
    </div>

    ${state.bankAccount?.number?`<div class="card" style="margin-bottom:1rem;border-left:3px solid var(--accent)">
      <div class="card-title" style="margin-bottom:.75rem">Payment Details</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:6px">
          <span style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">Bank</span>
          <span style="font-size:13px;font-weight:600">${state.bankAccount.bank}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:6px">
          <span style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">Account Name</span>
          <span style="font-size:13px;font-weight:600">${state.bankAccount.name}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--accent-light);border:1px solid var(--accent);border-radius:6px">
          <span style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">Account Number</span>
          <span style="font-size:18px;font-weight:800;color:var(--accent);letter-spacing:.08em">${state.bankAccount.number}</span>
        </div>
      </div>
    </div>`:''}

    <div class="card" style="margin-bottom:1rem">
      <div onclick="toggleOutstanding()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer">
        <span class="card-title" style="margin-bottom:0;pointer-events:none">Outstanding Cycle Fees</span>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${totalOutstanding>0?`<span style="font-size:12px;font-weight:700;color:var(--red);background:var(--red-bg);padding:3px 10px;border-radius:20px">${fmt(totalOutstanding)} owed</span>`:`<span style="font-size:12px;font-weight:600;color:var(--green)">✓ all paid</span>`}
          <span id="outstanding-chevron" style="font-size:12px;color:var(--muted);display:inline-block;transition:transform 200ms ease">▾</span>
        </div>
      </div>
      <div id="outstanding-content" style="display:none;margin-top:.875rem">${outstandingHtml}</div>
    </div>

    <details class="card" style="margin-bottom:1rem">
      <summary style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;list-style:none;padding:0">
        <span class="card-title" style="margin-bottom:0;pointer-events:none">Cycle Collection Status</span>
        <span class="outstanding-chevron" style="font-size:12px;color:var(--muted)">▾</span>
      </summary>
      <div style="margin-top:.875rem">${cycleStatusRows}</div>
    </details>

    <div class="card" style="margin-bottom:1rem">
      <div onclick="toggleEarnings()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer">
        <span class="card-title" style="margin-bottom:0;pointer-events:none">Player Earnings Summary</span>
        <span id="earnings-chevron" style="font-size:12px;color:var(--muted);display:inline-block;transition:transform 200ms ease">▾</span>
      </div>
      <div id="earnings-content" style="display:none;margin-top:.875rem">
        <div class="tbl-wrap"><table>
          <thead><tr><th>Player</th><th>GW Earned</th><th>Withdrawn</th><th>In Account</th></tr></thead>
          <tbody>${playerRows||'<tr><td colspan="4" class="empty">No data yet</td></tr>'}</tbody>
        </table></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">GW Prize History</div>
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
  if(total>=1) badges.push({icon:'🏅',label:'Podium Regular',desc:`${total} podium finishes`});
  let streak=0,max=0;
  state.gameweeks.forEach(g=>{ if((g.awards[playerIdx]||0)>0){streak++;max=Math.max(max,streak);}else streak=0; });
  const globalMaxStreak=state.players.reduce((gm,_,qi)=>{ let s=0,m=0; state.gameweeks.forEach(g=>{ if((g.awards[qi]||0)>0){s++;m=Math.max(m,s);}else s=0; }); return Math.max(gm,m); },0);
  if(max>0&&max===globalMaxStreak) badges.push({icon:'🔥',label:'On Fire',desc:`Longest podium streak (${max} GWs) — went on an absolute tear`});
  else if(max>=2) badges.push({icon:'⚡',label:'Back-to-back',desc:`${max} consecutive podiums`});
  if(total>=1&&state.players.every(q=>(q.w1+q.w2+q.w3)<=total))
    badges.push({icon:'⭐',label:'Consistent',desc:`Most podium finishes (${total}) — a permanent fixture at the top`});
  if(p.w2>=1&&state.players.every(q=>q.w2<=p.w2))
    badges.push({icon:'🥈',label:'Silver Specialist',desc:`${p.w2} second-place finishes`});
  if(p.w3>=1&&state.players.every(q=>q.w3<=p.w3))
    badges.push({icon:'🥉',label:'Bronze Specialist',desc:`${p.w3} third-place finishes`});
  if((p.w4||0)>=1&&state.players.every(q=>(q.w4||0)<=(p.w4||0)))
    badges.push({icon:'😤',label:'Out of Podium Expert',desc:`Most 4th place finishes (${p.w4}) — always just outside`});
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
    {icon:'🏅',label:'Podium Regular',desc:'Has at least one top-3 finish'},
    {icon:'🔥',label:'On Fire',desc:'Longest consecutive podium streak — went on an absolute tear'},
    {icon:'⚡',label:'Back-to-back',desc:'2+ consecutive GWs on the podium'},
    {icon:'⭐',label:'Consistent',desc:'Most podium finishes — a permanent fixture at the top'},
    {icon:'🥈',label:'Silver Specialist',desc:'Most 2nd place finishes'},
    {icon:'🥉',label:'Bronze Specialist',desc:'Most 3rd place finishes'},
    {icon:'😤',label:'Out of Podium Expert',desc:'Most 4th place finishes — always just outside'},
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
      <div style="font-size:12px;font-weight:700;color:var(--heading);letter-spacing:.04em;text-transform:uppercase;border-left:3px solid #f59e0b;padding-left:8px;margin-bottom:.75rem">Badge Legend</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${BADGE_LEGEND.map(b=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:8px;background:var(--surface2);border-radius:8px"><span style="font-size:20px;flex-shrink:0">${b.icon}</span><div><div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px">${b.label}</div><div style="font-size:11px;color:var(--muted);line-height:1.4">${b.desc}</div></div></div>`).join('')}
      </div>
    </div>
    ${rows.map(({p,i,badges})=>`
      <div class="card" style="margin-bottom:.75rem;cursor:pointer" onclick="openProfile(${i})">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${badges.length?'.75rem':'0'}">
          <div class="init" style="width:36px;height:36px;font-size:11px;flex-shrink:0">${p.name.slice(0,2).toUpperCase()}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:14px">${p.name}</div>${p.teamName?`<div style="font-size:11px;color:var(--muted)">${p.teamName}</div>`:''}</div>
          <div style="font-size:12px;color:var(--dim);font-family:'Poppins',system-ui,sans-serif">${badges.length} badge${badges.length!==1?'s':''}</div>
        </div>
        ${badges.length?`<div style="display:flex;flex-wrap:wrap;gap:6px">${badges.map(b=>`<div title="${b.desc}" style="display:flex;align-items:center;gap:5px;background:#fef3c7;border:1px solid #fcd34d;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;color:#92400e">${b.icon} ${b.label}</div>`).join('')}</div>`:'<div style="font-size:12px;color:var(--dim)">No achievements yet — check back after GW1</div>'}
      </div>`).join('')}`;
}

function showTab(t){
  if(t==='admin'&&!isAdmin){ requireAdmin(t); return; }
  if(t==='finance'){ renderFinanceTab(); }
  if(t==='fpl'){ fetchFPLLeague(); }
  if(t==='achievements'){ renderAchievements(); }
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelector(`[onclick="showTab('${t}')"]`).classList.add('active');
  document.getElementById('sec-'+t).classList.add('active');
  if(t==='standings') renderStandings();
  if(t==='admin'){ renderAdminPlayers(); renderDeleteGWInfo(); showAdminSection('settings'); const nd=document.getElementById('next-season-date'); if(nd) nd.value=toInputDatetime(state.nextSeasonDate); const gd=document.getElementById('next-gw-date'); if(gd) gd.value=toInputDatetime(state.nextGWDate); const ba=state.bankAccount||{}; ['bank','name','number'].forEach(k=>{ const el=document.getElementById('ba-'+k); if(el) el.value=ba[k]||''; }); }
}

function showAdminSection(s){
  document.querySelectorAll('.admin-sub').forEach(el=>el.style.display='none');
  document.querySelectorAll('.admin-sub-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('admin-sub-'+s).style.display='';
  document.querySelector(`.admin-sub-btn[onclick="showAdminSection('${s}')"]`).classList.add('active');
  if(s==='payout'){ populateSelects(); renderPayoutLog(); }
  if(s==='cycles') renderPayments();
  if(s==='gameweek'){ const {p1,p2,p3}=prizes(); const l1=document.getElementById('prize-label-1'); const l2=document.getElementById('prize-label-2'); const l3=document.getElementById('prize-label-3'); if(l1) l1.textContent=`1st place — ₦${p1.toLocaleString()}`; if(l2) l2.textContent=`2nd place — ₦${p2.toLocaleString()}`; if(l3) l3.textContent=`3rd place — ₦${p3.toLocaleString()}`; }
  if(s==='gameweek') populateSelects();
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
initThemeToggle();

function applyMigrations(){
  state.players.forEach(p=>{ if(p.carryOver===undefined) p.carryOver=0; });
  INIT_PLAYERS.forEach((name,i)=>{
    if(!state.players[i]) state.players.push({name,teamName:TEAM_NAMES[i]||'',accumulated:0,paidOut:0,carryOver:OPENING[i]||0,w1:0,w2:0,w3:0});
  });
  if(!state.cycleCredited) state.cycleCredited={};
  if(!state.bankAccount) state.bankAccount={name:'Osahon Jude Osagie',number:'1494859631',bank:'Access Bank'};
  if(!state.payoutRequests) state.payoutRequests=[];
  const genPin=()=>String(Math.floor(1000+Math.random()*9000));
  state.players.forEach(p=>{ if(!p.pin) p.pin=genPin(); if(p.w4===undefined) p.w4=0; });
  // Seed entryId from ENTRY_MAP for existing players
  Object.entries(ENTRY_MAP).forEach(([entryId,idx])=>{
    if(state.players[idx]&&!state.players[idx].entryId) state.players[idx].entryId=Number(entryId);
  });
  // Recompute w1/w2/w3/w4 from recorded gameweeks to fix any stale carry-over from previous seasons
  state.players.forEach(p=>{ p.w1=0; p.w2=0; p.w3=0; p.w4=0; });
  state.gameweeks.forEach(g=>{
    (g.pos?.[1]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w1++; });
    (g.pos?.[2]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w2++; });
    (g.pos?.[3]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w3++; });
    (g.pos?.[4]||[]).forEach(i=>{ if(state.players[i]) state.players[i].w4++; });
  });
  syncCyclePlayers();
}

// Load from cloud and re-render if newer data is available
(async()=>{
  const cloud=await loadFromCloud();
  if(cloud){
    const localPins=state.players.map(p=>p.pin||'');
    state=cloud;
    state.players.forEach((p,i)=>{ if(!p.pin&&localPins[i]) p.pin=localPins[i]; });
    applyMigrations();
    try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
    syncToCloud(state);
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
  const totalAccumulated=state.players.reduce((s,p)=>s+p.accumulated,0);
  const totalFees=CYCLES.reduce((s,c,idx)=>{ const cp=state.cyclePayments[idx]||{}; return s+c.players.filter(i=>cp[i]).length*c.fee; },0);
  const totalPrizes=totalAccumulated;
  const surplus=totalFees-totalAccumulated;
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
        <div style="font-family:'Poppins',system-ui,sans-serif;font-size:clamp(11px,3vw,14px);font-weight:700;color:var(--accent)">₦${totalFees.toLocaleString()}</div>
      </div>
      <div style="background:#dcfce7;border-top:3px solid var(--green);border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;font-weight:700;color:var(--green);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Paid Out</div>
        <div style="font-family:'Poppins',system-ui,sans-serif;font-size:clamp(11px,3vw,14px);font-weight:700;color:var(--green)">₦${totalPrizes.toLocaleString()}</div>
      </div>
      <div style="background:#dbeafe;border-top:3px solid var(--blue);border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;font-weight:700;color:var(--blue);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">In Bank</div>
        <div style="font-family:'Poppins',system-ui,sans-serif;font-size:clamp(11px,3vw,14px);font-weight:700;color:var(--blue)">₦${mib.toLocaleString()}</div>
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
    <div style="font-family:'Poppins',system-ui,sans-serif;font-size:22px;font-weight:800;color:var(--fpl-dark)">${days}<span style="font-size:13px;font-weight:500;color:var(--muted)"> days</span> ${hrs}<span style="font-size:13px;font-weight:500;color:var(--muted)"> hrs</span> ${mins}<span style="font-size:13px;font-weight:500;color:var(--muted)"> mins</span> ${secs}<span style="font-size:13px;font-weight:500;color:var(--muted)"> secs</span></div>
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
      <span style="font-family:'Poppins',system-ui,sans-serif;font-size:11px;color:#374151">₦${Math.round(p.accumulated/1000)}k</span>
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
          ${hasPoints?`<td><span style="font-family:'Poppins',system-ui,sans-serif;font-weight:700;color:var(--fpl-dark)">${e.pts??'—'}</span></td>`:''}
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
    return `<tr><td style="font-size:12px;color:var(--muted);padding:8px 4px;border-bottom:1px solid var(--border)">${label}</td>${rv.map(v=>`<td style="text-align:center;font-family:'Poppins',system-ui,sans-serif;font-size:13px;padding:8px 4px;border-bottom:1px solid var(--border);${hi(rv,v)}">${fmt(v)}</td>`).join('')}</tr>`;
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
      <div style="background:#f3e8ff;border-top:3px solid var(--accent);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">GW Earnings</div><div style="font-family:'Poppins',system-ui,sans-serif;font-size:13px;font-weight:700;color:var(--accent)">₦${p.accumulated.toLocaleString()}</div></div>
      <div style="background:#f5f5f5;border-top:3px solid var(--dim);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:10px;font-weight:700;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Withdrawn</div><div style="font-family:'Poppins',system-ui,sans-serif;font-size:13px;font-weight:700;color:var(--muted)">₦${withdrawn.toLocaleString()}</div></div>
      <div style="background:${bal>0?'#dcfce7':'#f5f5f5'};border-top:3px solid ${bal>0?'var(--green)':'var(--dim)'};border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:10px;font-weight:700;color:${bal>0?'var(--green)':'var(--muted)'};margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Balance</div><div style="font-family:'Poppins',system-ui,sans-serif;font-size:13px;font-weight:700;color:${bal>0?'var(--green)':'var(--dim)'}">₦${bal.toLocaleString()}</div></div>
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
      <span style="font-family:'Poppins',system-ui,sans-serif;font-size:13px;font-weight:700;color:var(--accent)">₦${g.amount.toLocaleString()}</span>
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
  const waIcon=`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.132.559 4.13 1.535 5.863L.057 23.5l5.803-1.524A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.882 9.882 0 0 1-5.032-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.86 9.86 0 0 1 2.118 12C2.118 6.978 6.978 2.118 12 2.118S21.882 6.978 21.882 12 17.022 21.882 12 21.882z"/></svg>`;
  const _isPaid=t=>t===true||t==='cash'||t==='winnings'||t==='settled'||(typeof t==='object'&&t?.type==='co-offset');
  const _fmt=n=>'₦'+Math.abs(n).toLocaleString();
  const debtors=CYCLES.map((c,ci)=>{
    const cp=state.cyclePayments[ci]||{};
    const unpaid=c.players.filter(i=>!_isPaid(cp[i]));
    return unpaid.length?{idx:ci,c,unpaid}:null;
  }).filter(Boolean);
  if(!debtors.length){ el.innerHTML=`<div class="card"><div class="card-title">Outstanding fees</div><div style="font-size:13px;color:var(--green);font-weight:500">All cycle fees accounted for.</div></div>`; return; }
  const rows=debtors.map(({idx,c,unpaid})=>{
    const debtorInfo=unpaid.map(i=>{
      const p=state.players[i];
      const alreadyPaid=credited(idx,i);
      const inBank=Math.max(0,pubBal(p));
      const net=Math.max(0,c.fee-alreadyPaid-inBank);
      return {name:p?.name||'?',alreadyPaid,inBank,net};
    });
    const totalNet=debtorInfo.reduce((s,d)=>s+d.net,0);
    const waLines=[
      `💰 *Challenge Arena – Cycle ${idx+1} Payment Reminder*`,
      `GW${c.gw[0]}–${c.gw[1]} · ₦${c.fee.toLocaleString()}/player`,
      ``,
      `Still outstanding:`,
      ...debtorInfo.map(d=>{
        const notes=[];
        if(d.alreadyPaid>0) notes.push(`₦${d.alreadyPaid.toLocaleString()} already received`);
        if(d.inBank>0) notes.push(`₦${d.inBank.toLocaleString()} from winnings`);
        return `  • ${d.name} — ₦${d.net.toLocaleString()} to pay${notes.length?` (${notes.join(', ')})`:''}`;}),
      ``,
      `Total to collect: ₦${totalNet.toLocaleString()}`,
      `Please settle asap 🙏`
    ];
    const waUrl=`https://wa.me/${ADMIN_WA}?text=`+encodeURIComponent(waLines.join('\n'));
    return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700">Cycle ${idx+1} · GW${c.gw[0]}–${c.gw[1]}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;font-weight:700;color:var(--red)">${_fmt(totalNet)} to collect</span>
          <a href="${waUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:#25d366;color:#fff;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none">${waIcon} Remind</a>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">
        ${debtorInfo.map(d=>{
          const notes=[];
          if(d.alreadyPaid>0) notes.push(`₦${d.alreadyPaid.toLocaleString()} paid`);
          if(d.inBank>0) notes.push(`₦${d.inBank.toLocaleString()} in bank`);
          return `<span style="font-size:12px;font-weight:600;background:var(--red-bg);color:var(--red);padding:3px 10px;border-radius:20px">${d.name} · ${_fmt(d.net)}${notes.length?`<span style="font-size:10px;opacity:.75"> (${notes.join(', ')})</span>`:''}</span>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="card"><div class="card-title">Outstanding fees</div>${rows}</div>`;
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
