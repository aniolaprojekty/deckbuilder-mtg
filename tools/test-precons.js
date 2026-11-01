// Precon overview test: node tools/test-precons.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8782);
const GC=new Set(['Farewell','Seedborn Muse',"Jeska's Will",'Narset, Parter of Veils','Notion Thief','Gamble','Fierce Guardianship','Crop Rotation',"Teferi's Protection",'Cyclonic Rift','Aura Shards']);
function h(s){let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x}
const TX=["Destroy target creature.","Draw two cards.","Search your library for a basic land card, put it onto the battlefield tapped","Whenever this creature attacks, create a 1/1 Zombie creature token.","Put a +1/+1 counter on target creature.","Return target creature card from your graveyard to your hand."];
const TY=["Instant","Sorcery","Sorcery","Creature — Zombie Warrior","Creature — Elf","Enchantment"];
function fake(n){const k=h(n),land=/Plains|Island|Swamp|Mountain|Forest|Land|Tower|Temple|Path|Grove|Sanctum|Gate|Orchard|Tomb|Coast|Field|Ruins|Peaks/.test(n);
 return {name:n,type_line:land?'Land':TY[k%6],oracle_text:land?'{T}: Add {C}.':TX[k%6],cmc:land?0:1+k%6,edhrec_rank:100+k%25000,game_changer:GC.has(n),color_identity:['B'],legalities:{commander:'legal'},prices:{eur:land?'0.10':String((k%2000)/100)},image_uris:{small:'',art_crop:''}}}
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{window.Capacitor={Plugins:{App:{addListener:(ev,cb)=>{window.__back=cb},exitApp:()=>{window.__exit=1}}}}});
let calls=0;await pg.route('https://api.scryfall.com/**',async rt=>{const u=rt.request().url();if(u.includes('/cards/collection')){calls++;const ids=JSON.parse(rt.request().postData()).identifiers;return rt.fulfill({json:{data:ids.map(i=>fake(i.name)),not_found:[]}})}rt.fulfill({status:404,json:{}})});
await pg.route('https://backend.commanderspellbook.com/**',rt=>rt.abort());
await pg.goto('http://localhost:8782/');const back=async()=>{await pg.evaluate(()=>window.__back({}));await pg.waitForTimeout(300)};
await pg.click('nav button[data-t=pre]');console.log('info before:',await pg.textContent('#preInfo'));
const t0=Date.now();await pg.click('#preRefresh');await pg.waitForFunction(()=>document.querySelector('#preRefresh').textContent.startsWith('↻')||document.querySelectorAll('#preList .pill').length>0,null,{timeout:120000});
await pg.waitForSelector('#preList .pill',{timeout:120000});console.log('refresh',((Date.now()-t0)/1000).toFixed(1)+'s, batches:',calls);
console.log('info after:',await pg.textContent('#preInfo'));
await pg.selectOption('#preSort','power');console.log('top power:',(await pg.$$eval('#preList .deck',e=>e.slice(0,3).map(x=>x.innerText.replace(/\s+/g,' ').slice(0,110)))));
await pg.selectOption('#preSort','bracket');console.log('top bracket:',(await pg.$$eval('#preList .deck',e=>e.slice(0,2).map(x=>x.innerText.replace(/\s+/g,' ').slice(0,110)))));
await pg.selectOption('#preSort','value');console.log('top value:',(await pg.$eval('#preList .deck',e=>e.innerText.replace(/\s+/g,' ').slice(0,110))));
await pg.screenshot({path:'/tmp/prelist.png'});
await pg.fill('#preSearch','Deadly Disguise');await pg.click('#preList .deck');await pg.waitForSelector('#dvUp',{timeout:30000});
const txt=(await pg.textContent('#deckView')).replace(/\s+/g,' ');
console.log('detail:',txt.slice(0,260));console.log('guide:',txt.match(/Poradnik strategii.*?Najmocniejsze/)[0].slice(0,500));
console.log('structure:',txt.match(/Struktura talii.*?Zalecenia/)[0]);
await pg.screenshot({path:'/tmp/deck1.png'});await pg.screenshot({path:'/tmp/deck2.png',fullPage:true});
await pg.click('#deckView .item');console.log('zoom open:',await pg.$eval('#zoom',e=>getComputedStyle(e).display));await back();
await back();console.log('back to:',await pg.$eval('section.on',e=>e.id));
await pg.click('#preList .deck');await pg.waitForSelector('#dvUp');await pg.click('#dvUp');await pg.waitForSelector('#upHead b');console.log('upgrade deck:',await pg.textContent('#upHead b'));
console.log('errors:',errs);await b.close();srv.close()})();
