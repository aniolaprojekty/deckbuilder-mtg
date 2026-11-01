/* ---------- precon overview: stats, ranking, prices, strategy guide ---------- */
(function(){
"use strict";
let STATS=LS.get('mtg.precStats',{ts:0,d:{}});
const TARGET={land:[36,38],ramp:[9,12],draw:[9,12],removal:[7,10],wipe:[2,4]};
const THEMES=[
 [/create[^.]*\btokens?\b/,'Tokeny','budujesz szeroką planszę z tokenów i wygrywasz liczbą stworów'],
 [/\+1\/\+1 counters?/,'Żetony +1/+1','rośniesz stworami i dzielisz żetony'],
 [/graveyard/,'Cmentarz','wracasz kartami z cmentarza i z niego czerpiesz przewagę'],
 [/\bsacrifice/,'Poświęcanie','zyskujesz na poświęcaniu własnych permanentów'],
 [/\bartifacts?\b/,'Artefakty','grasz dużo artefaktów i z nich korzystasz'],
 [/\benchantments?\b/,'Zaklęcia (enchantments)','zaklęcia napędzają talię'],
 [/instant or sorcery|noncreature spell/,'Czary','rzucasz dużo instantów i sorcery'],
 [/gains? (\d+ |x )?life|gain life/,'Zysk życia','zyskujesz życie i zamieniasz je w przewagę'],
 [/\benters\b/,'Efekty wejścia (ETB)','wartość z efektów „gdy wchodzi” — blink i kopiowanie'],
 [/\battacks?\b|combat damage/,'Walka','atakujesz i wygrywasz obrażeniami w walce'],
 [/landfall|lands? enters?/,'Ziemie / landfall','każda ziemia daje dodatkowy efekt'],
 [/\bmill/,'Mielenie','mielisz biblioteki — swoją albo przeciwników'],
 [/\bdraws? (a|two|three|x|cards?)/,'Przewaga kart','dużo dobierania kart'],
 [/\bcopy\b/,'Kopiowanie','kopiujesz czary lub stwory'],
 [/\bflying\b/,'Latające stwory','wygrywasz w powietrzu']];

function slimMap(list){const m=new Map();for(const c of list){const s=slim(c);m.set(s.n.toLowerCase(),s);m.set(s.n.split(' // ')[0].toLowerCase(),s)}return m}
function expand(d,get){
  return d.cards.map(x=>({...(get(x.name)||{n:x.name,t:'',o:'',ci:'',cmc:0,r:null,gc:false,p:null}),qty:x.qty,cmd:d.commanders.includes(x.name)}));
}
function stats(d,get){
  const cs=expand(d,get);
  let v=0;const priced=[];
  for(const c of cs)if(c.p!=null){v+=c.p*c.qty;priced.push([c.n,c.p])}
  const roles={};cs.forEach(c=>{if(c.cmd)return;const r=role(c);roles[r]=(roles[r]||0)+c.qty});
  const nl=cs.filter(c=>!c.cmd&&role(c)!=='land');
  const ranks=nl.map(c=>c.r||40000).sort((a,b)=>a-b);
  const k=Math.min(25,ranks.length||1);
  const quality=1-ranks.slice(0,k).reduce((s,r)=>s+Math.log10(Math.max(r,1)),0)/k/Math.log10(40000);
  const struct=(Math.min(roles.ramp||0,10)+Math.min(roles.draw||0,10)+Math.min((roles.removal||0)+(roles.wipe||0)+(roles.counter||0),10))/30;
  const br=bracket(cs);
  const raw=0.65*quality+0.25*struct+0.10*Math.min(br.gc.length,3)/3;
  const cmcs=nl.flatMap(c=>Array(c.qty).fill(c.cmc||0));
  return {v:+v.toFixed(2),raw,b:br.b,gc:br.gc.length,why:br.why,top:priced.sort((a,b)=>b[1]-a[1]).slice(0,5),roles,
          avg:cmcs.length?+(cmcs.reduce((a,b)=>a+b,0)/cmcs.length).toFixed(2):0};
}
function finalize(){ // normalise raw power → 0..100 and rank
  const arr=Object.entries(STATS.d).filter(([,s])=>s.raw!=null);
  const mn=Math.min(...arr.map(([,s])=>s.raw)),mx=Math.max(...arr.map(([,s])=>s.raw));
  arr.forEach(([,s])=>s.score=Math.round(100*(s.raw-mn)/((mx-mn)||1)));
  arr.sort((a,b)=>b[1].raw-a[1].raw).forEach(([,s],i)=>s.rank=i+1);
  STATS.n=arr.length;LS.set('mtg.precStats',STATS);
}
let busyAll=false;
async function refreshAll(){
  if(busyAll)return;busyAll=true;
  const btn=$('#preRefresh'),bar=$('#preProg');
  try{
    const names=[...new Set(DECKS.flatMap(d=>d.cards.map(c=>c.name)))];
    const got=[];
    for(let i=0;i<names.length;i+=75){
      const batch=names.slice(i,i+75);
      const r=await wfetch(SCRY+'/cards/collection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifiers:batch.map(n=>({name:n}))})});
      if(r.ok){const j=await r.json();got.push(...(j.data||[]))}
      bar.style.width=Math.min(100,(i+75)/names.length*100)+'%';btn.textContent=`Pobieram… ${Math.min(names.length,i+75)}/${names.length}`;
      await sleep(110);
    }
    const m=slimMap(got);const get=n=>m.get(n.toLowerCase())||m.get(n.split(' // ')[0].toLowerCase());
    STATS={ts:Date.now(),d:{}};
    for(const d of DECKS)STATS.d[d.id]=stats(d,get);
    finalize();toast('Ranking i ceny zaktualizowane');
  }catch(e){toast('Błąd pobierania: '+(e.message||e))}
  finally{busyAll=false;bar.style.width=0;btn.textContent='↻ Przelicz ranking i ceny';renderPreList()}
}
/* ---------- list ---------- */
const eur=v=>v==null?'—':v.toFixed(2).replace('.',',')+' €';
function renderPreList(){
  const q=$('#preSearch').value.toLowerCase(),onlyMine=$('#preMine').checked,sort=state.preSort||'new';
  const S=STATS.d;
  let f=DECKS.filter(d=>(!onlyMine||mine.has(d.id))&&(!q||(d.name+' '+d.set+' '+d.commanders.join(' ')).toLowerCase().includes(q)));
  const by={new:(a,b)=>b.date.localeCompare(a.date),
    power:(a,b)=>((S[b.id]||{}).raw||-1)-((S[a.id]||{}).raw||-1),
    value:(a,b)=>((S[b.id]||{}).v||-1)-((S[a.id]||{}).v||-1),
    bracket:(a,b)=>((S[b.id]||{}).b||0)-((S[a.id]||{}).b||0)||((S[b.id]||{}).raw||0)-((S[a.id]||{}).raw||0),
    owned:(a,b)=>own(b)-own(a)};
  const hasCol=Object.keys(collection).length>0;const OWN={};
  function own(d){if(OWN[d.id]==null){const m=missingFor(d,true);OWN[d.id]=m.total?m.have/m.total:0;OWN[d.id+'_']=m}return OWN[d.id]}
  if(hasCol)f.forEach(own);
  f.sort((a,b)=>(mine.has(b.id)-mine.has(a.id))*(sort==='new'?1:0)||by[sort](a,b));
  const age=STATS.ts?Math.round((Date.now()-STATS.ts)/86400000):null;
  $('#preInfo').innerHTML=`${f.length} z ${DECKS.length} preconów · moje: ${mine.size} · ${STATS.ts?`ceny z ${new Date(STATS.ts).toLocaleDateString('pl-PL')}${age>7?' <span class="warn">(stare — odśwież)</span>':''}`:'<span class="warn">ranking i ceny nie są jeszcze policzone</span>'}`;
  $('#preList').innerHTML=f.slice(0,100).map(d=>{const s=S[d.id];
    return `<div class="box deck ${state.deck===d.id?'sel':''}" data-id="${esc(d.id)}"><div class="row" style="flex-wrap:nowrap"><div style="flex:1;min-width:0">
      <b>${esc(d.name)}</b> <span class="mu">${d.set} · ${d.date.slice(0,7)}</span><div class="mu">${esc(d.commanders.join(' / ')||'—')}</div>
      ${s||hasCol?`<div style="margin-top:4px">${s?`${bPill(s.b)}<span class="pill">💶 ${eur(s.v)}</span>${s.score!=null?`<span class="pill">💪 ${s.score} · #${s.rank}</span>`:''}`:''}${hasCol?`<span class="pill" title="karty z kolekcji (bez podstawowych lądów)">📦 ${OWN[d.id+'_'].have}/${OWN[d.id+'_'].total}</span>`:''}</div>`:''}</div>
      <button class="btn sec" data-star="${esc(d.id)}" style="font-size:20px;padding:4px 10px;color:${mine.has(d.id)?'var(--ac)':'var(--mu)'}">${mine.has(d.id)?'★':'☆'}</button></div></div>`}).join('');
}
window.renderPreList=renderPreList;
/* ---------- deck detail ---------- */
function themes(cs,cmd){
  const out=[];
  for(const [re,name,desc] of THEMES){let n=0;
    for(const c of cs){if(role(c)==='land')continue;const o=(c.o||'').toLowerCase();if(re.test(o))n+=c.cmd?4:c.qty}
    out.push({name,desc,n});}
  out.sort((a,b)=>b.n-a.n);
  const types={};cs.forEach(c=>{const t=(c.t||'').split(' // ')[0];if(!/Creature/.test(t)||!t.includes('—'))return;
    t.split('—')[1].trim().split(/\s+/).forEach(x=>types[x]=(types[x]||0)+c.qty)});
  const typal=Object.entries(types).sort((a,b)=>b[1]-a[1])[0];
  return {top:out.filter(t=>t.n>=6).slice(0,3),typal:typal&&typal[1]>=10?typal:null};
}
function guideHTML(d,cs,s){
  const cmds=cs.filter(c=>c.cmd);
  const th=themes(cs,cmds);
  const R=s.roles;const tips=[];
  const lands=R.land||0;
  if(lands<36)tips.push(`Tylko ${lands} lądów — przy tej krzywej many rozważ dołożenie 1–2.`);
  if((R.ramp||0)<9)tips.push(`Mało rampy (${R.ramp||0}). Pierwsze ulepszenie: tanie artefakty many i czary szukające lądów.`);
  if((R.draw||0)<9)tips.push(`Mało dobierania (${R.draw||0}). Talia może „zgasnąć” w środku gry — dołóż źródła kart.`);
  if((R.removal||0)+(R.counter||0)<7)tips.push(`Mało punktowego usuwania (${(R.removal||0)+(R.counter||0)}). Trudno będzie odpowiedzieć na groźne permanenty przeciwników.`);
  if(!(R.wipe))tips.push('Brak czyszczenia stołu — jeśli przeciwnik ucieknie z planszą, nie masz resetu.');
  if(s.avg>=3.6)tips.push(`Wysoka średnia koszt many (${String(s.avg).replace('.',',')}) — talia jest wolna, priorytetem jest rampa w pierwszych turach.`);
  const cmdC=Math.max(...cmds.map(c=>c.cmc||0),0);
  if(cmdC>=6)tips.push(`Dowódca kosztuje ${cmdC} — graj na jego szybkie wyrzucenie i chroń go, bo podatek dowódcy szybko rośnie.`);
  if(!tips.length)tips.push('Struktura talii jest zbalansowana — ulepszaj jakość kart, nie proporcje.');
  const roleRow=(k,l)=>{const n=R[k]||0,t=TARGET[k];const ok=!t||(n>=t[0]);return `<div class="hrow"><span>${l}</span><span>${n}${t?` <span class="mu">/ ${t[0]}–${t[1]}</span> ${ok?'✅':'⚠️'}`:''}</span></div>`};
  const best=cs.filter(c=>!c.cmd&&role(c)!=='land'&&c.r).sort((a,b)=>a.r-b.r).slice(0,5);
  const plan=th.top.length?th.top.map(t=>t.desc).join('; ')+'.':'talia ma mieszane motywy — gra wartością dowódcy.';
  const keep=s.avg>=3.6?'3–4 lądami i co najmniej jednym źródłem rampy':s.avg<=2.8?'2–3 lądami i tanimi zagraniami na pierwsze tury':'3–4 lądami oraz rampą albo dobieraniem';
  return `<div class="box"><h3>Poradnik strategii</h3>
    <div><b>Plan gry:</b> ${esc(plan)}</div>
    ${th.typal?`<div style="margin-top:4px"><b>Typal:</b> talia skupiona na typie <b>${esc(th.typal[0])}</b> (${th.typal[1]} stworów) — liczy się każdy stwór tego typu.</div>`:''}
    ${th.top.length?`<div style="margin-top:6px">${th.top.map(t=>`<span class="pill">${esc(t.name)}</span>`).join('')}</div>`:''}
    <div style="margin-top:8px"><b>Mulligan:</b> zatrzymaj rękę z ${keep}. Bez dowódcy na stole talia traci tempo — rozgrywaj go, gdy tylko będzie bezpiecznie.</div>
    <div style="margin-top:8px"><b>Na co uważać:</b></div>${tips.map(t=>`<div class="kw">• ${esc(t)}</div>`).join('')}
    <div style="margin-top:8px"><b>Najmocniejsze karty</b> <span class="mu">(najczęściej grane w Commanderze)</span>:</div>
    <div>${best.map(c=>`<span class="pill" data-zoom="${esc(c.n)}" style="cursor:pointer">${esc(c.n)}</span>`).join('')}</div></div>
  <div class="box"><h3>Struktura talii</h3>${roleRow('land','Lądy')}${roleRow('ramp','Rampa')}${roleRow('draw','Dobór kart')}${roleRow('removal','Usuwanie')}${roleRow('wipe','Czyszczenie stołu')}${roleRow('counter','Kontry')}${roleRow('tutor','Tutory')}${roleRow('creature','Stwory (inne)')}${roleRow('other','Pozostałe')}
    <div class="mu" style="margin-top:6px">Średni koszt many (bez lądów): ${String(s.avg).replace('.',',')}. Zalecenia to typowe proporcje talii Commander.</div></div>`;
}

function drawBuild(d){
  const el=$('#dvBuild');if(!el)return;
  const skip=state.skipBasics!==false;
  const m=missingFor(d,skip);
  const cost=m.miss.reduce((t,x)=>{const c=card(x.name);return t+(c&&c.p!=null?c.p*x.qty:0)},0);
  const noPrice=m.miss.filter(x=>{const c=card(x.name);return !c||c.p==null}).length;
  const pct=m.total?Math.round(m.have/m.total*100):0;
  const txt=m.miss.map(x=>x.qty+' '+x.name).join('\n');
  el.innerHTML=`<h3>Złóż z kolekcji</h3>
    ${Object.keys(collection).length?'':'<div class="warn">Kolekcja jest pusta — dodaj karty (import lub skaner), a tu zobaczysz, czego brakuje.</div>'}
    <div>Masz <b>${m.have}/${m.total}</b> kart (${pct}%) · brakuje <b>${m.miss.reduce((a,x)=>a+x.qty,0)}</b> · koszt ok. <b>${eur(cost)}</b>${noPrice?` <span class="mu">(${noPrice} bez ceny)</span>`:''}</div>
    <div class="prog" style="height:8px"><i style="width:${pct}%;background:var(--ok)"></i></div>
    <label class="mu" style="display:flex;gap:6px;align-items:center;margin:6px 0"><input type="checkbox" id="dvSkip" style="width:auto" ${skip?'checked':''}> Pomiń podstawowe lądy</label>
    <div class="row"><button class="btn" id="dvTxt" ${m.miss.length?'':'disabled'}>📄 Lista brakujących (TXT)</button><button class="btn sec" id="dvCopy" ${m.miss.length?'':'disabled'}>Kopiuj</button></div>
    <div class="mu" style="margin-top:4px">Format „1 Nazwa karty” — wklej w Cardmarket (Wants → Import), Moxfield lub ManaBox i zamów wszystko naraz.</div>
    ${m.miss.length?`<details style="margin-top:8px"><summary class="mu">Pokaż brakujące (${m.miss.length})</summary>${m.miss.map(x=>{const c=card(x.name);return `<div class="hrow" data-zoom="${esc(x.name)}" style="cursor:pointer"><span>${x.qty>1?x.qty+'× ':''}${esc(x.name)}</span><span class="mu">${c&&c.p!=null?eur(c.p*x.qty):'—'}</span></div>`}).join('')}</details>`:'<div style="margin-top:8px">✅ Masz wszystkie karty tej talii!</div>'}`;
  $('#dvSkip').onchange=e=>{state.skipBasics=e.target.checked;saveState();drawBuild(d)};
  $('#dvTxt').onclick=()=>exportTxt('brakujace-'+fileSafe(d.name)+'.txt',txt+'\n');
  $('#dvCopy').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('Skopiowano listę brakujących')}catch(e){toast('Kopiowanie zablokowane')}};
}
let curDeck=null;
async function renderDeck(){
  const d=DECKS.find(x=>x.id===curDeck);const el=$('#deckView');if(!d){el.innerHTML='';return}
  el.innerHTML=`<div class="box"><b>${esc(d.name)}</b><div class="mu">Wczytuję karty ze Scryfall…</div><div class="prog"><i id="dvProg"></i></div></div>`;
  try{await fetchCards(d.cards.map(c=>c.name),p=>{const b=$('#dvProg');if(b)b.style.width=(p*100)+'%'},true,true)}
  catch(e){el.innerHTML=`<div class="box warn">${esc(e.message||e)} — sprawdź internet.</div>`;return}
  const cs=expand(d,card);const s=stats(d,card);
  const g=STATS.d[d.id];if(g){s.score=g.score;s.rank=g.rank}
  const cmds=cs.filter(c=>c.cmd);
  const order=['creature','ramp','draw','removal','wipe','counter','tutor','protect','other','land'];
  const groups={};cs.filter(c=>!c.cmd).forEach(c=>{const r=role(c);(groups[r]=groups[r]||[]).push(c)});
  el.innerHTML=`<div class="box">
    ${cmds.map(c=>c.art?`<div style="height:150px;border-radius:10px;background:url('${esc(c.art)}') center/cover;margin-bottom:8px" data-zoom="${esc(c.n)}"></div>`:'').join('')}
    <div class="row" style="flex-wrap:nowrap"><div style="flex:1"><b style="font-size:17px">${esc(d.name)}</b><div class="mu">${d.set} · ${d.date}</div></div>
      <button class="btn sec" id="dvStar" style="font-size:20px;padding:4px 10px;color:${mine.has(d.id)?'var(--ac)':'var(--mu)'}">${mine.has(d.id)?'★':'☆'}</button></div>
    <div style="margin-top:8px">${bPill(s.b)}<span class="pill">💶 ${eur(s.v)}</span>${s.score!=null&&s.rank?`<span class="pill">💪 siła ${s.score}/100 · #${s.rank} z ${STATS.n}</span>`:''}</div>
    ${s.why.length?`<div class="mu" style="margin-top:4px">${s.why.map(esc).join('<br>')}</div>`:'<div class="mu" style="margin-top:4px">Brak Game Changerów, MLD, dodatkowych tur i combo 2-kartowych.</div>'}
    ${cmds.map(c=>`<div class="ot" style="margin-top:8px"><b>${esc(c.n)}</b> <span class="mu">${esc(c.t)}</span><br>${symHTML(c.o||'')}</div>`).join('')}
    <div class="row" style="margin-top:10px"><button class="btn" id="dvUp">⬆️ Ulepsz tę talię</button>
      <a class="btn sec" style="text-decoration:none" href="https://www.cardmarket.com/pl/Magic/Products/Search?searchString=${encodeURIComponent(d.name.replace(/\s*\(.*\)$/,''))}" target="_blank" rel="noopener">Pudełko na Cardmarket ↗</a></div>
    <div class="mu" style="margin-top:6px">Wartość = suma aktualnych cen pojedynczych kart (Cardmarket przez Scryfall), nie cena zamkniętego pudełka.</div></div>
  <div class="box" id="dvBuild"></div>
  ${s.top.length?`<div class="box"><h3>Najdroższe karty</h3>${s.top.map(([n,p])=>`<div class="hrow" data-zoom="${esc(n)}" style="cursor:pointer"><span>${esc(n)}</span><b>${eur(p)}</b></div>`).join('')}</div>`:''}
  ${guideHTML(d,cs,s)}
  <div class="box"><h3>Lista kart (${cs.reduce((a,c)=>a+c.qty,0)})</h3>${order.filter(r=>groups[r]).map(r=>{const gg=groups[r].sort((a,b)=>(a.cmc-b.cmc)||a.n.localeCompare(b.n));
    return `<div class="hturn">${ROLE_PL[r]} (${gg.reduce((a,c)=>a+c.qty,0)})</div>${gg.map(c=>`<div class="item" data-zoom="${esc(c.n)}" style="cursor:pointer">${c.img?`<img src="${esc(c.img)}" alt="" loading="lazy">`:'<div class="noimg">🔍</div>'}
      <div class="grow"><div>${c.qty>1?c.qty+'× ':''}${esc(c.n)}${c.gc?' <span class="pill b3">GC</span>':''}</div><div class="mu">${esc((c.t||'').split(' — ')[0])} · CMC ${c.cmc}</div></div><span class="mu">${eur(c.p)}</span></div>`).join('')}`}).join('')}</div>`;
  drawBuild(d);
  $('#dvUp').onclick=()=>{state.deck=d.id;state.accepted=[];state.mode='keep';state.view='sug';saveState();show('up')};
  $('#dvStar').onclick=()=>{mine.has(d.id)?mine.delete(d.id):mine.add(d.id);LS.set('mtg.mine',[...mine]);renderDeck()};
  if(!STATS.d[d.id]||!STATS.d[d.id].raw){STATS.d[d.id]={...s,score:STATS.d[d.id]&&STATS.d[d.id].score,rank:STATS.d[d.id]&&STATS.d[d.id].rank};LS.set('mtg.precStats',STATS)}
}
window.openDeck=id=>{curDeck=id;state.deck=id;saveState();show('deck')};
window.renderDeck=renderDeck;
document.getElementById('deckView').onclick=e=>{const z=e.target.closest('[data-zoom]');if(z)zoom([card(z.dataset.zoom)||{n:z.dataset.zoom}])};
document.getElementById('preRefresh').onclick=refreshAll;
document.getElementById('preSort').onchange=e=>{state.preSort=e.target.value;saveState();renderPreList()};
document.getElementById('preSort').value=state.preSort||'new';
})();
