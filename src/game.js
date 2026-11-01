/* ---------- game mode: life counter & table tools ---------- */
(function(){
"use strict";
const COLORS=['#7a2a2a','#2a4f7a','#2f5a3c','#6b4a1d','#5a2f6b','#2a6b6b'];
const CNT=[ // per-player counters shown on panel when non-zero
  ['poison','☠️','Trucizna'],['energy','⚡','Energia'],['exp','✨','Doświadczenie'],
  ['treasure','💰','Treasure'],['rad','☢️','Rad'],['tax','🏛️','Podatek dowódcy']];
const DEF_OPTS={n:4,life:40,cmdLoss:true,autoKO:true,timer:false,plane:false,awake:true};
let S=LS.get('mtg.game',null);              // running game
let opts={...DEF_OPTS,...LS.get('mtg.gameOpts',{})};
opts.n=Math.min(4,Math.max(2,opts.n||4));opts.life=40;opts.cmdLoss=true; // Commander only
let names=LS.get('mtg.gameNames',[]);
let SEATS=LS.get('mtg.gameSeats',[]);           // per seat: {deck,cmdr,img}
const saveSeats=()=>LS.set('mtg.gameSeats',SEATS);
const shortCmdr=c=>(c||'').split(' / ').map(x=>x.split(',')[0].split(' // ')[0]).join(' & ');
const save=()=>LS.set('mtg.game',S);
const saveOpts=()=>LS.set('mtg.gameOpts',opts);

function newGame(){
  const prev=S;
  S={start:Date.now(),turn:1,active:0,turnStart:Date.now(),monarch:-1,initiative:-1,day:'',log:[],
     players:Array.from({length:opts.n},(_,i)=>{
       const old=prev&&prev.players[i];
       return {name:names[i]||('Gracz '+(i+1)),life:opts.life,poison:0,energy:0,exp:0,treasure:0,rad:0,tax:0,cmd:{},
               ko:false,color:COLORS[i%COLORS.length],img:(SEATS[i]||{}).img||'',cmdr:(SEATS[i]||{}).cmdr||'',deck:(SEATS[i]||{}).deck||''}})};
  save();
}
/* ---------- layout: seats around the phone ---------- */
function seats(n){ // returns [{r,c,span,rot}] per player index (clockwise from bottom/left)
  const out=[];
  if(n===2)return {rows:2,cols:1,s:[{r:2,c:1,rot:0},{r:1,c:1,rot:180}]};
  if(n%2===0){const k=n/2;for(let i=0;i<k;i++)out.push({r:k-i,c:1,rot:90});for(let i=0;i<k;i++)out.push({r:i+1,c:2,rot:270});return {rows:k,cols:2,s:out}}
  const k=(n-1)/2;out.push({r:k+1,c:1,span:2,rot:0});
  for(let i=0;i<k;i++)out.push({r:k-i,c:1,rot:90});for(let i=0;i<k;i++)out.push({r:i+1,c:2,rot:270});
  return {rows:k+1,cols:2,s:out};
}
/* ---------- rendering ---------- */
const $g=s=>document.querySelector('#game '+s);
function isKO(p,i){
  if(p.ko)return true;
  if(!opts.autoKO)return false;
  return p.life<=0||p.poison>=10||Object.values(p.cmd).some(v=>v>=21);
}
function build(){
  const L=seats(S.players.length);
  const g=$g('#gGrid');
  g.style.gridTemplateColumns=`repeat(${L.cols},1fr)`;g.style.gridTemplateRows=`repeat(${L.rows},1fr)`;
  $g('#gBar').style.top=(Math.round(L.rows/2)/L.rows*100)+'%';
  g.innerHTML=S.players.map((p,i)=>{const s=L.s[i];
    return `<div class="gc r${s.rot}" data-p="${i}" style="grid-row:${s.r};grid-column:${s.span?'1 / 3':s.c}">
      <div class="gi"><div class="gbg"></div><div class="glife"></div><div class="gname"></div><div class="gbadges"></div>
      <div class="gtap m" data-d="-1">−</div><div class="gtap p" data-d="1">+</div>
      <div class="gdelta"></div><div class="gcnt"></div><button class="gmenu" data-menu="${i}">⋯</button></div></div>`}).join('');
  paint();
}
function paint(){
  S.players.forEach((p,i)=>{
    const c=document.querySelector(`#game .gc[data-p="${i}"]`);if(!c)return;
    c.classList.toggle('ko',isKO(p,i));c.classList.toggle('active',S.active===i);
    const bg=c.querySelector('.gbg');
    bg.style.backgroundColor=p.color;bg.style.backgroundImage=p.img?`url("${p.img}")`:'';
    c.querySelector('.glife').textContent=p.life;
    c.querySelector('.gname').innerHTML=esc(p.name)+(p.cmdr?`<span style="font-weight:400;opacity:.8"> · ${esc(shortCmdr(p.cmdr))}</span>`:'');
    c.querySelector('.gbadges').textContent=(S.monarch===i?'👑':'')+(S.initiative===i?'🏰':'');
    const cmdT=Object.entries(p.cmd).filter(([,v])=>v>0).map(([k,v])=>`⚔️${v}←${(S.players[k]||{}).name||'?'}`);
    c.querySelector('.gcnt').innerHTML=[...CNT.filter(([k])=>p[k]).map(([k,ic])=>`${ic}${p[k]}`),...cmdT].map(x=>`<span>${esc(x)}</span>`).join('');
  });
  const b=$g('#gTurn');if(b)b.innerHTML=`T${S.turn}${opts.timer?' '+fmtT(Date.now()-S.turnStart):''}`;
  const dn=$g('#gDay');if(dn)dn.textContent=S.day==='day'?'☀️':S.day==='night'?'🌙':'◐';
  save();
}
const fmtT=ms=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
/* ---------- life changes with grouped delta + history ---------- */
const pend={}; // player -> {d, timer}
function log(e){
  const now=Date.now();
  const last=S.log.slice(-6).reverse().find(x=>x.k===e.k&&x.p===e.p&&x.from===e.from);
  if(last&&last.k===e.k&&last.p===e.p&&last.from===e.from&&last.turn===S.turn&&now-last.t<4000&&['cmd','poison','energy','exp','treasure','rad','tax'].includes(e.k)){
    last.d+=e.d;last.v=e.v;last.t=now;if(!last.d)S.log.splice(S.log.indexOf(last),1);return}
  S.log.push({...e,turn:S.turn,act:S.active,t:now});if(S.log.length>2000)S.log.shift()}
function changeLife(i,d,src){
  const p=S.players[i];p.life+=d;
  const P=pend[i]||(pend[i]={d:0});P.d+=d;clearTimeout(P.t);
  if(src!=null){P.d-=d;paint();return} // shown & logged as commander damage
  const el=document.querySelector(`#game .gc[data-p="${i}"] .gdelta`);
  if(el){el.textContent=(P.d>0?'+':'')+P.d;el.className='gdelta '+(P.d<0?'neg':'pos');el.style.display=P.d?'block':'none'}
  P.flush=()=>{clearTimeout(P.t);if(P.d)log({p:i,k:'life',d:P.d,v:p.life});P.d=0;if(el)el.style.display='none';save()};
  P.t=setTimeout(P.flush,1800);
  paint();
}
function changeCnt(i,k,d){const p=S.players[i];p[k]=Math.max(0,p[k]+d);log({p:i,k,d,v:p[k]});paint()}
function changeCmd(i,from,d){
  const p=S.players[i];const cur=p.cmd[from]||0;const nv=Math.max(0,cur+d);const real=nv-cur;if(!real)return;
  p.cmd[from]=nv;log({p:i,k:'cmd',from,d:real,v:nv});
  if(opts.cmdLoss)changeLife(i,-real,from);else paint();
}
/* ---------- input: tap ±1, hold ±10 (repeats) ---------- */
let hold=null;
function onDown(e){
  const t=e.target.closest('.gtap');if(!t)return;
  const i=+t.closest('.gc').dataset.p,d=+t.dataset.d;
  e.preventDefault();
  hold={i,d,fired:false,t:setTimeout(function rep(){hold.fired=true;changeLife(i,d*10);if(navigator.vibrate)navigator.vibrate(15);hold.t=setTimeout(rep,550)},450)};
}
function onUp(e){if(!hold)return;clearTimeout(hold.t);if(!hold.fired)changeLife(hold.i,hold.d);hold=null}
function onCancel(){if(hold){clearTimeout(hold.t);hold=null}}
/* ---------- sheets ---------- */
function sheet(html,onOpen){
  const sh=$g('#gSheet');sh.innerHTML=`<div class="gs">${html}</div>`;sh.classList.add('on');
  if(!sheet.open){sheet.open=true;nav({t:'game',v:state.view,sheet:1,game:1})}
  sh.querySelectorAll('.x').forEach(b=>b.onclick=()=>history.back());
  onOpen&&onOpen(sh);
}
function closeSheet(){$g('#gSheet').classList.remove('on');sheet.open=false;paint()}
const pmRow=(lbl,val,k)=>`<div class="gr"><span class="lbl">${lbl}</span><button class="pm" data-k="${k}" data-d="-1">−</button><span class="val">${val}</span><button class="pm" data-k="${k}" data-d="1">+</button></div>`;
function playerSheet(i){
  const p=S.players[i];
  sheet(`<h3>${esc(p.name)}<button class="x">✕</button></h3>
    <div class="gr"><input id="gpName" value="${esc(p.name)}" placeholder="Imię"></div>
    <div class="gr"><div class="seatimg" style="${p.img?`background-image:url('${esc(p.img)}')`:`background:${p.color}`}"></div><span class="lbl">${p.cmdr?esc(p.cmdr):'<span class="mu">Bez dowódcy</span>'}</span><button class="btn sec" data-pick="1">🃏 Talia</button></div>
    <div class="gr chips">${COLORS.map(c=>`<button data-col="${c}" style="background:${c};width:34px;height:34px;padding:0;${p.color===c?'outline:3px solid #fff':''}"></button>`).join('')}${p.img?'<button data-noimg="1">Usuń grafikę</button>':''}</div>
    ${pmRow('❤️ Życie',p.life,'life')}
    ${CNT.map(([k,ic,l])=>pmRow(`${ic} ${l}`,p[k],k)).join('')}
    <h3 style="margin-top:12px">⚔️ Obrażenia od dowódcy</h3>
    ${S.players.map((o,j)=>j===i?'':pmRow(`od: ${esc(o.name)}${(p.cmd[j]||0)>=21?' 💀':''}`,p.cmd[j]||0,'cmd'+j)).join('')}
    <div class="gr chips" style="margin-top:8px"><button data-tog="monarch" class="${S.monarch===i?'on':''}">👑 Monarcha</button><button data-tog="initiative" class="${S.initiative===i?'on':''}">🏰 Inicjatywa</button><button data-tog="active" class="${S.active===i?'on':''}">▶ Jego tura</button></div>
    <div class="gr chips"><button data-ko="1" class="${p.ko?'on':''}">💀 ${p.ko?'Wyeliminowany (cofnij)':'Wyeliminuj ręcznie'}</button></div>`,
  sh=>{
    sh.querySelector('#gpName').onchange=e=>{p.name=e.target.value||p.name;names[i]=p.name;LS.set('mtg.gameNames',names);paint()};
    sh.onclick=e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.k){const k=b.dataset.k,d=+b.dataset.d;
        if(k==='life')changeLife(i,d);else if(k.startsWith('cmd'))changeCmd(i,+k.slice(3),d);else changeCnt(i,k,k==='tax'?d*2:d);
        playerSheetRefresh(i);return}
      if(b.dataset.pick){openPicker(p.name,sel=>{Object.assign(p,sel);SEATS[i]={...sel};saveSeats();paint();playerSheetRefresh(i)});return}
      if(b.dataset.col){p.color=b.dataset.col;paint();playerSheetRefresh(i);return}
      if(b.dataset.noimg){p.img='';p.cmdr='';p.deck='';SEATS[i]={};saveSeats();paint();playerSheetRefresh(i);return}
      if(b.dataset.tog==='active'){S.active=i;S.turnStart=Date.now();paint();playerSheetRefresh(i);return}
      if(b.dataset.tog){const k=b.dataset.tog;S[k]=S[k]===i?-1:i;log({p:i,k,d:S[k]===i?1:-1,v:S[k]===i?1:0});paint();playerSheetRefresh(i);return}
      if(b.dataset.ko){p.ko=!p.ko;if(!p.ko&&opts.autoKO&&isKO({...p,ko:false})){p.life=Math.max(p.life,1);p.poison=Math.min(p.poison,9);for(const k in p.cmd)p.cmd[k]=Math.min(p.cmd[k],20)}
        log({p:i,k:'ko',d:p.ko?1:-1,v:p.ko?1:0});paint();playerSheetRefresh(i);return}
      const sg=e.target.closest('[data-cn]');
    };
  });
}
function playerSheetRefresh(i){const y=$g('#gSheet').scrollTop;sheet.open=true;playerSheet(i);$g('#gSheet').scrollTop=y}
function nextTurn(){
  Object.values(pend).forEach(P=>P.flush&&P.flush()); // close pending life changes in the old turn
  const n=S.players.length;let a=S.active;
  for(let k=0;k<n;k++){a=(a+1)%n;if(a===0)S.turn++;if(!isKO(S.players[a],a))break}
  log({p:a,k:'turn',d:0,v:S.turn});S.active=a;S.turnStart=Date.now();S.planeRolls=0;paint();
}
function historySheet(){
  const name=i=>esc((S.players[i]||{}).name||'?');
  const KL={life:'❤️',cmd:'⚔️',poison:'☠️',energy:'⚡',exp:'✨',treasure:'💰',rad:'☢️',tax:'🏛️',monarch:'👑',initiative:'🏰',ko:'💀'};
  const rows=[`<div class="hturn">Tura ${S.turn} — ${name(S.active)} (bieżąca)</div>`];let skipCur=true;
  for(const e of [...S.log].reverse()){
    if(e.k==='turn'){if(skipCur&&e.v===S.turn&&e.p===S.active){skipCur=false;continue}skipCur=false;rows.push(`<div class="hturn">Tura ${e.v} — ${name(e.p)}</div>`);continue}
    if(e.k==='plane'||e.k==='day')continue;
    const who=e.k==='cmd'?`${name(e.from)} → ${name(e.p)}`:name(e.p);
    const flag=e.k==='monarch'||e.k==='initiative'||e.k==='ko';
    rows.push(`<div class="hrow"><span>${who}</span><span>${KL[e.k]||e.k} <b style="color:${(e.k==='cmd'||e.k==='poison'?-e.d:e.d)<0?'var(--bad)':'var(--ok)'}">${flag?(e.d>0?'tak':'nie'):(e.d>0?'+':'')+e.d}</b>${flag?'':' → '+e.v}</span></div>`);
  }
  sheet(`<h3>Historia gry<button class="x">✕</button></h3><div class="mu">Gra od ${new Date(S.start).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})} · ${S.players.length} graczy · tura ${S.turn}</div>${rows.join('')||'<div class="mu" style="margin-top:8px">Jeszcze nic się nie wydarzyło.</div>'}`);
}
function diceSheet(){
  sheet(`<h3>Kości i losowanie<button class="x">✕</button></h3><div class="dres" id="gDres">🎲</div>
    <div class="dice"><button data-dd="coin">Moneta</button>${[4,6,8,10,12,20].map(n=>`<button data-dd="${n}">k${n}</button>`).join('')}
    <button data-dd="custom">Własna</button><button data-dd="player">Losuj gracza</button></div>
    <div class="gr"><span class="lbl">Własna kość: ścian</span><input id="gCust" type="number" min="2" value="${LS.get('mtg.custDie',100)}" style="width:90px"></div>
    <div class="mu">„Losuj gracza” ustawia też, kto zaczyna (jego tura).</div>`,sh=>{
    sh.onclick=e=>{const b=e.target.closest('[data-dd]');if(!b)return;const k=b.dataset.dd,out=sh.querySelector('#gDres');
      const r=n=>1+Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*n);
      let res;
      if(k==='coin')res=r(2)===1?'Orzeł':'Reszka';
      else if(k==='player'){const alive=S.players.map((p,i)=>i).filter(i=>!isKO(S.players[i],i));const w=alive[r(alive.length)-1];S.active=w;S.turnStart=Date.now();paint();res=S.players[w].name}
      else if(k==='custom'){const n=Math.max(2,+sh.querySelector('#gCust').value||100);LS.set('mtg.custDie',n);res=r(n)+` <span class="mu">/k${n}</span>`}
      else res=r(+k)+` <span class="mu">/k${k}</span>`;
      out.innerHTML='…';setTimeout(()=>out.innerHTML=res,180);if(navigator.vibrate)navigator.vibrate(30)};
  });
}
function manaSheet(){
  const M=S.mana||(S.mana={W:0,U:0,B:0,R:0,G:0,C:0,storm:0});
  const L={W:'⚪ Biała',U:'🔵 Niebieska',B:'⚫ Czarna',R:'🔴 Czerwona',G:'🟢 Zielona',C:'◇ Bezbarwna',storm:'⚡ Storm (czary w turze)'};
  sheet(`<h3>Licznik many<button class="x">✕</button></h3>${Object.keys(L).map(k=>pmRow(L[k],M[k],k)).join('')}
    <div class="row" style="margin-top:10px"><button class="btn sec" id="gManaClr">Wyzeruj</button></div>`,sh=>{
    sh.onclick=e=>{const b=e.target.closest('button');if(!b)return;
      if(b.id==='gManaClr'){for(const k in M)M[k]=0}else if(b.dataset.k){M[b.dataset.k]=Math.max(0,M[b.dataset.k]+ +b.dataset.d)}else return;
      save();const y=$g('#gSheet').scrollTop;manaSheet();$g('#gSheet').scrollTop=y};
  });
}
/* ---------- Planechase (planes & phenomena from Scryfall) ---------- */
let PLANES=LS.get('mtg.planes',null);
async function loadPlanes(){
  if(PLANES&&PLANES.length)return PLANES;
  const out=[];let url=SCRY+'/cards/search?unique=cards&q='+encodeURIComponent('(t:plane or t:phenomenon) -is:digital');
  while(url){const r=await wfetch(url);if(!r.ok)break;const j=await r.json();
    for(const c of j.data||[]){const iu=c.image_uris||{};out.push({n:c.name,t:c.type_line,o:c.oracle_text||'',img:iu.large||iu.normal||''})}
    url=j.has_more?j.next_page:null;await sleep(110)}
  PLANES=out;LS.set('mtg.planes',out);return out;
}
async function planeSheet(walk){
  sheet(`<h3>Planechase<button class="x">✕</button></h3><div class="mu">Wczytuję plany…</div>`);
  try{await loadPlanes()}catch(e){}
  if(!PLANES||!PLANES.length){sheet(`<h3>Planechase<button class="x">✕</button></h3><div class="warn">Nie udało się pobrać planów (potrzebny internet).</div>`);return}
  if(walk||S.plane==null){S.plane=Math.floor(Math.random()*PLANES.length);S.planeRolls=S.planeRolls||0;log({p:S.active,k:'plane',d:0,v:0});save()}
  const pl=PLANES[S.plane];
  sheet(`<h3>${esc(pl.n)}<button class="x">✕</button></h3><div class="mu">${esc(pl.t)}</div>
    <div class="plane" style="margin:8px 0">${pl.img?`<img src="${esc(pl.img)}" alt="">`:''}</div><div class="ot">${symHTML(pl.o)}</div>
    <div class="dres" id="gPdie" style="font-size:30px">⬡</div>
    <div class="row"><button class="btn" id="gRoll">Rzuć kością planarną${S.planeRolls?` (koszt {${S.planeRolls}})`:''}</button><button class="btn sec" id="gWalk">Planeswalk ➜</button></div>
    <div class="mu" style="margin-top:6px">Kość: 1/6 Planeswalk, 1/6 Chaos, 4/6 pusto. Każdy kolejny rzut w tej samej turze kosztuje o {1} więcej.</div>`,sh=>{
    sh.querySelector('#gWalk').onclick=()=>{planeSheetRefresh(true)};
    sh.querySelector('#gRoll').onclick=()=>{const r=1+Math.floor(Math.random()*6);S.planeRolls=(S.planeRolls||0)+1;save();
      const out=sh.querySelector('#gPdie');
      const res=r===1?'⟿ PLANESWALK':r===6?'✺ CHAOS':'— pusto —';
      out.textContent='…';setTimeout(()=>{out.textContent=res;sh.querySelector('#gRoll').textContent=`Rzuć kością planarną (koszt {${S.planeRolls}})`},200);
      if(r===1)setTimeout(()=>planeSheetRefresh(true),1300)};
  });
}
function planeSheetRefresh(walk){sheet.open=true;planeSheet(walk)}
/* ---------- deck / commander picker (photo grid) ---------- */
const pk=()=>document.getElementById('pick');
let pickCb=null;
async function openPicker(who,cb){
  pickCb=cb;const el=pk();
  if(!G.pickOpen){G.pickOpen=true;nav({t:curTab,v:state.view,game:G.open?1:undefined,sheet:sheet.open?1:undefined,pick:1})}
  el.classList.add('on');
  el.innerHTML=`<div class="gs"><h3>Talia — ${esc(who)}<button class="x" id="pkX">✕</button></h3>
    <input id="pkQ" placeholder="Szukaj talii lub dowódcy…" autocomplete="off">
    <div class="mu" style="margin:6px 0">★ = Twoje precony (oznaczone w zakładce Precony). Albo wpisz dowolnego dowódcę:</div>
    <input id="pkC" placeholder="Własny dowódca (nazwa karty)…" autocomplete="off"><div id="pkS"></div>
    <div class="prog"><i id="pkP"></i></div><div id="pkG" class="pkg"></div>
    <div class="row" style="margin-top:10px"><button class="btn sec" id="pkNone">Bez talii (sam kolor)</button></div></div>`;
  el.querySelector('#pkX').onclick=()=>history.back();
  el.querySelector('#pkNone').onclick=()=>choose({deck:'',cmdr:'',img:''});
  el.querySelector('#pkQ').oninput=drawPick;
  let acT;const c=el.querySelector('#pkC');
  c.oninput=()=>{clearTimeout(acT);const v=c.value.trim();if(v.length<3){el.querySelector('#pkS').innerHTML='';return}
    acT=setTimeout(async()=>{try{const r=await wfetch(SCRY+'/cards/autocomplete?q='+encodeURIComponent(v));const j=await r.json();
      el.querySelector('#pkS').innerHTML=(j.data||[]).slice(0,6).map(n=>`<div class="sg" data-cn="${esc(n)}">${esc(n)}</div>`).join('')}catch(e){}},250)};
  el.querySelector('#pkS').onclick=async e=>{const n=e.target.closest('[data-cn]');if(!n)return;
    try{await fetchCards([n.dataset.cn],null,false,true);const cd=card(n.dataset.cn);choose({deck:'',cmdr:cd.n,img:cd.art||cd.img})}catch(err){toast('Nie udało się pobrać karty')}};
  el.querySelector('#pkG').onclick=e=>{const it=e.target.closest('[data-deck]');if(!it)return;
    const d=DECKS.find(x=>x.id===it.dataset.deck);const c0=card(d.commanders[0])||{};
    choose({deck:d.id,cmdr:d.commanders.join(' / '),img:c0.art||c0.img||''})};
  drawPick();
  // load commander art for all precons (cached after first time)
  const all=[...new Set(DECKS.flatMap(d=>d.commanders.slice(0,1)))];
  const missing=all.filter(n=>{const x=card(n);return !x||x.art===undefined});
  if(missing.length){try{await fetchCards(all,p=>{const b=document.getElementById('pkP');if(b)b.style.width=(p*100)+'%'},false,true)}catch(e){toast('Brak połączenia — zdjęcia pojawią się później')}
    const b=document.getElementById('pkP');if(b)b.style.width=0;if(G.pickOpen)drawPick()}
}
function drawPick(){
  const el=pk();const q=(el.querySelector('#pkQ').value||'').toLowerCase();
  const list=DECKS.filter(d=>!q||(d.name+' '+d.commanders.join(' ')+' '+d.set).toLowerCase().includes(q))
    .sort((a,b)=>(mine.has(b.id)-mine.has(a.id))||b.date.localeCompare(a.date));
  el.querySelector('#pkG').innerHTML=list.map(d=>{const c=card(d.commanders[0])||{};const im=c.art||c.img;
    return `<div class="pki" data-deck="${esc(d.id)}"><div class="pkimg" style="${im?`background-image:url('${esc(im)}')`:''}">${mine.has(d.id)?'<span class="pkstar">★</span>':''}</div>
      <b>${esc(shortCmdr(d.commanders.join(' / '))||d.name)}</b><span class="mu">${esc(d.name)}</span></div>`}).join('')||'<div class="mu">Brak wyników.</div>';
}
function choose(sel){const cb=pickCb;pickCb=null;history.back();setTimeout(()=>cb&&cb(sel),60)}
function closePicker(){pk().classList.remove('on');G.pickOpen=false}
/* ---------- settings ---------- */
function settingsHTML(inGame){
  const tog=(k,l,d)=>`<div class="gr"><span class="lbl">${l}${d?`<div class="mu">${d}</div>`:''}</span><button class="sw2 ${opts[k]?'on':''}" data-opt="${k}"></button></div>`;
  return `<div class="gr"><span class="lbl">Gracze</span><div class="chips">${[2,3,4].map(n=>`<button data-n="${n}" class="${opts.n===n?'on':''}">${n}</button>`).join('')}</div></div>
    ${tog('autoKO','Auto-KO','Życie ≤ 0, 10 trucizny lub 21 od jednego dowódcy')}
    ${tog('timer','Czas tury','Licznik czasu na pasku')}
    ${tog('plane','Planechase','Przycisk planów na pasku (potrzebny internet)')}
    ${tog('awake','Nie wygaszaj ekranu')}
    ${inGame?'<div class="mu" style="margin-top:6px">Liczba graczy działa od nowej gry.</div>':'<div class="mu" style="margin-top:6px">Commander: 40 życia, obrażenia od dowódcy odejmują życie.</div>'}`;
}
function bindSettings(root,onChange){
  root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.n){opts.n=+b.dataset.n}else if(b.dataset.life){opts.life=+b.dataset.life}else if(b.dataset.opt){opts[b.dataset.opt]=!opts[b.dataset.opt]}else return;
    saveOpts();onChange&&onChange()});
}
function settingsSheet(){
  sheet(`<h3>Ustawienia gry<button class="x">✕</button></h3>${settingsHTML(true)}
    <div class="row" style="margin-top:12px"><button class="btn" id="gNew">Nowa gra</button><button class="btn sec" id="gExit">Wyjdź z gry</button></div>`,sh=>{
    bindSettings(sh,()=>{const y=$g('#gSheet').scrollTop;sheet.open=true;settingsSheet();$g('#gSheet').scrollTop=y;bar();wake()});
    sh.querySelector('#gNew').onclick=()=>{if(sh.querySelector('#gNew').dataset.c){newGame();history.back();setTimeout(build,50)}else{sh.querySelector('#gNew').dataset.c=1;sh.querySelector('#gNew').textContent='Na pewno? Dotknij ponownie'}};
    sh.querySelector('#gExit').onclick=()=>{history.go(-2)};
  });
}
/* ---------- toolbar ---------- */
function bar(){
  $g('#gBar').innerHTML=`<button data-b="set">⚙️</button><button data-b="turn" class="turn" id="gTurn"></button><button data-b="dice">🎲</button>
    <button data-b="mana">💧</button><button data-b="day" id="gDay">◐</button>${opts.plane?'<button data-b="plane">🌀</button>':''}<button data-b="hist">📜</button>`;
  paint();
}
let tick=null,lock=null;
async function wake(){
  try{if(opts.awake&&navigator.wakeLock&&document.visibilityState==='visible'&&!lock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>lock=null)}
      if(!opts.awake&&lock){lock.release();lock=null}}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(G.open)wake()});
/* ---------- open / close ---------- */
const G=window.GAME={open:false,pickOpen:false};
G.start=function(fresh){
  if(fresh||!S||S.players.length!==opts.n&&fresh!==false)newGame();
  const el=document.getElementById('game');el.classList.add('on');G.open=true;
  nav({t:'game',v:state.view,game:1});
  build();bar();wake();
  clearInterval(tick);tick=setInterval(()=>{if(opts.timer)paint()},1000);
};
G.back=function(st){ // called from popstate with the state we landed on; true if handled
  let h=false;
  if(G.pickOpen&&!(st&&st.pick)){closePicker();h=true}
  if(sheet.open&&!(st&&st.sheet)){closeSheet();h=true}
  if(G.open&&!(st&&st.game)){document.getElementById('game').classList.remove('on');G.open=false;clearInterval(tick);if(lock){lock.release();lock=null}renderGameTab();h=true}
  return h;
};
function renderGameTab(){
  const el=document.getElementById('gameSetup');if(!el)return;
  const seatRows=Array.from({length:opts.n},(_,i)=>{const st=SEATS[i]||{};
    return `<div class="gr"><div class="seatimg" data-seat="${i}" style="${st.img?`background-image:url('${esc(st.img)}')`:`background:${COLORS[i]}`}"></div>
      <div style="flex:1;min-width:0"><input data-sname="${i}" value="${esc(names[i]||'Gracz '+(i+1))}"><div class="mu" style="font-size:12px;margin-top:2px">${st.cmdr?esc(st.cmdr):'Bez talii'}</div></div>
      <button class="btn sec" data-seat="${i}">🃏</button></div>`}).join('');
  el.innerHTML=`<div class="box"><h3>Gra</h3>${settingsHTML(false)}<h3 style="margin-top:12px">Gracze i talie</h3>${seatRows}
    <div class="row" style="margin-top:12px"><button class="btn" id="gStart">${S?'Nowa gra':'Rozpocznij grę'}</button>${S?`<button class="btn sec" id="gCont">Kontynuuj (tura ${S.turn})</button>`:''}</div></div>
    <div class="box mu">Dotknij lewej/prawej połowy panelu: −1/+1, przytrzymaj: ±10. „⋯” na panelu: imię, talia, liczniki, obrażenia od dowódców, monarcha, inicjatywa. Pasek na środku: ⚙️ ustawienia · T = następna tura · 🎲 kości · 💧 mana · ◐ dzień/noc · 📜 historia.</div>`;
  bindSettings(el,renderGameTab);
  el.querySelectorAll('[data-sname]').forEach(inp=>inp.onchange=()=>{const i=+inp.dataset.sname;names[i]=inp.value.trim()||('Gracz '+(i+1));LS.set('mtg.gameNames',names)});
  el.querySelectorAll('[data-seat]').forEach(b=>b.onclick=()=>{const i=+b.dataset.seat;
    openPicker(names[i]||'Gracz '+(i+1),sel=>{SEATS[i]={...sel};saveSeats();renderGameTab()})});
  el.querySelector('#gStart').onclick=()=>G.start(true);
  const c=el.querySelector('#gCont');if(c)c.onclick=()=>G.start(false);
}
G.renderTab=renderGameTab;
document.addEventListener('DOMContentLoaded',()=>{});
// wire events once DOM exists
const root=document.getElementById('game');
root.innerHTML='<div id="gGrid"></div><div id="gBar"></div><div id="gSheet"></div>';
root.addEventListener('pointerdown',onDown);
root.addEventListener('pointerup',onUp);root.addEventListener('pointercancel',onCancel);root.addEventListener('pointerleave',onCancel);
root.addEventListener('contextmenu',e=>e.preventDefault());
root.addEventListener('click',e=>{
  const m=e.target.closest('[data-menu]');if(m){playerSheet(+m.dataset.menu);return}
  const b=e.target.closest('#gBar [data-b]');if(!b)return;
  const k=b.dataset.b;
  if(k==='turn')nextTurn();else if(k==='hist')historySheet();else if(k==='dice')diceSheet();else if(k==='mana')manaSheet();
  else if(k==='set')settingsSheet();else if(k==='plane')planeSheet(false);
  else if(k==='day'){S.day=S.day===''?'day':S.day==='day'?'night':'';log({p:S.active,k:'day',d:0,v:S.day});paint()}
});
renderGameTab();
})();
