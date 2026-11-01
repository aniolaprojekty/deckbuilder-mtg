// E2E test with mocked Scryfall: node tools/test-e2e.js (after python3 tools/build.py)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8765);
const REAL={"Rhystic Study":{t:"Enchantment",o:"Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",gc:1,r:4,cmc:3},
 "Smothering Tithe":{t:"Enchantment",o:"Whenever an opponent draws a card, that player may pay {2}. If they don't, you create a Treasure token. add one mana",gc:1,r:6,cmc:4},
 "Demonic Tutor":{t:"Sorcery",o:"Search your library for a card, put that card into your hand, then shuffle.",gc:1,r:20,cmc:2},
 "Vampiric Tutor":{t:"Instant",o:"Search your library for a card, then shuffle and put that card on top.",gc:1,r:25,cmc:1},
 "Armageddon":{t:"Sorcery",o:"Destroy all lands.",r:900,cmc:4},
 "Thassa's Oracle":{t:"Creature — Merfolk Wizard",o:"When Thassa's Oracle enters, look at the top X cards...",r:300,cmc:2,gc:1},
 "Demonic Consultation":{t:"Instant",o:"Choose a card name. Exile the top six cards of your library...",r:400,cmc:1},
 "Swords to Plowshares":{t:"Instant",o:"Exile target creature. Its controller gains life equal to its power.",r:10,cmc:1},
 "Cultivate":{t:"Sorcery",o:"Search your library for up to two basic land cards, put one onto the battlefield tapped",r:30,cmc:3},
 "Counterspell":{t:"Instant",o:"Counter target spell.",r:40,cmc:2}};
function h(s){let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x}
const TX=["Destroy target creature.","Draw two cards.","Search your library for a basic land card, put it onto the battlefield tapped","Flying","Counter target spell.","Whenever you attack, create a token."],TY=["Instant","Sorcery","Sorcery","Creature — Elf","Instant","Enchantment"];
function fake(n){const R=REAL[n],k=h(n),land=!R&&/Plains|Island|Swamp|Mountain|Forest|Land|Tower|Temple|Path|Grove|Sanctum|Gate|Orchard/.test(n);
 return {name:n,type_line:R?R.t:land?"Land":TY[k%6],oracle_text:R?R.o:land?"{T}: Add {G}.":TX[k%6],cmc:R?R.cmc:k%6,edhrec_rank:R?R.r:2000+k%30000,game_changer:!!(R&&R.gc),color_identity:["W","U","B","R","G"],legalities:{commander:"legal"}}}
const T=s=>s.replace(/\s+/g,' ').trim();
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('https://api.scryfall.com/**',async rt=>{const u=rt.request().url();if(u.includes('/cards/collection')){const ids=JSON.parse(rt.request().postData()).identifiers;await rt.fulfill({json:{data:ids.map(i=>fake(i.name)),not_found:[]}})}else await rt.fulfill({status:404,json:{}})});
 await pg.route('https://backend.commanderspellbook.com/**',rt=>rt.abort());
 await pg.goto('http://localhost:8765/');
 await pg.fill('#imp',Object.keys(REAL).map(n=>'1 '+n).join('\n'));await pg.click('#impBtn');
 await pg.click('nav button[data-t=pre]');await pg.fill('#preSearch','Eternal Might');await pg.click('.deck');await pg.waitForSelector('#dvUp',{timeout:20000});await pg.click('#dvUp');await pg.waitForSelector('#autoAcc',{timeout:15000});
 const head=async()=>T(await pg.textContent('#upHead')).match(/po zmianach: Bracket \S+ \(\d+ zamian\)/)[0];
 console.log('KEEP list:',T(await pg.textContent('#upBody h3')),'|',T(await pg.textContent('#upBody .mu')).slice(-40));
 await pg.click('#autoAcc');console.log('KEEP auto:',await head());
 await pg.click('[data-mode="3"]');await pg.click('#autoAcc');console.log('B3 auto:',await head());
 await pg.click('[data-mode="4"]');await pg.click('#autoAcc');console.log('B4 auto:',await head());
 await pg.click('[data-mode="keep"]');console.log('back to keep:',await head());
 await pg.click('[data-mode="4"]');await pg.click('#autoAcc');
 await pg.click('.sw [data-cmp]');console.log('zoom cmp:',T(await pg.textContent('#zoomIn')).slice(0,120));await pg.screenshot({path:'/tmp/zoom.png'});await pg.click('#zoom');
 await pg.click('[data-view=deck]');console.log('deck view:',(await pg.$$('.dc')).length,'cards,',(await pg.$$('.dc.in')).length,'in,',(await pg.$$('.dc.out')).length,'out');
 await pg.screenshot({path:'/tmp/deck.png'});
 await pg.click('.dc');console.log('zoom one:',T(await pg.textContent('#zoomIn')).slice(0,60));
 await pg.click('#zoom');await pg.click('[data-view=sug]');await pg.screenshot({path:'/tmp/sug.png'});
 console.log('errors:',errs);await b.close();srv.close()})();
