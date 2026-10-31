const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{let p=path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.end(d)})}).listen(8765);
const REAL={
 "Rhystic Study":{t:"Enchantment",o:"Whenever an opponent casts a spell, you may draw a card unless that player pays {1}.",gc:1,r:4,cmc:3},
 "Smothering Tithe":{t:"Enchantment",o:"Whenever an opponent draws a card, that player may pay {2}. If they don't, you create a Treasure token. Treasure: add {C}... add one mana",gc:1,r:6,cmc:4},
 "Demonic Tutor":{t:"Sorcery",o:"Search your library for a card, put that card into your hand, then shuffle.",gc:1,r:20,cmc:2},
 "Armageddon":{t:"Sorcery",o:"Destroy all lands.",r:900,cmc:4},
 "Thassa's Oracle":{t:"Creature — Merfolk Wizard",o:"When Thassa's Oracle enters, look at the top X cards...",r:300,cmc:2},
 "Demonic Consultation":{t:"Instant",o:"Choose a card name. Exile the top six cards of your library...",r:400,cmc:1},
 "Time Warp":{t:"Sorcery",o:"Target player takes an extra turn after this one.",r:700,cmc:5},
 "Swords to Plowshares":{t:"Instant",o:"Exile target creature. Its controller gains life equal to its power.",r:10,cmc:1},
 "Cultivate":{t:"Sorcery",o:"Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand",r:30,cmc:3},
 "Counterspell":{t:"Instant",o:"Counter target spell.",r:40,cmc:2},
 "Command Tower":{t:"Land",o:"{T}: Add one mana of any color in your commander's color identity.",r:1,cmc:0}};
function h(s){let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x}
const TX=["Destroy target creature.","Draw two cards.","Search your library for a basic land card, put it onto the battlefield tapped","Flying","Counter target spell.","Whenever you attack, create a token."];
const TY=["Instant","Sorcery","Sorcery","Creature — Elf","Instant","Enchantment"];
function fake(n){const R=REAL[n];const k=h(n);const land=/Plains|Island|Swamp|Mountain|Forest|Land|Tower|Temple|Path|Grove|Sanctum|Gate/.test(n)&&!R;
 return {name:n,type_line:R?R.t:land?"Land":TY[k%6],oracle_text:R?R.o:land?"{T}: Add {G}.":TX[k%6],cmc:R?R.cmc:k%6,edhrec_rank:R?R.r:2000+k%30000,game_changer:!!(R&&R.gc),color_identity:["W","U","B","R","G"],legalities:{commander:"legal"},image_uris:{small:""}}}
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('https://api.scryfall.com/**',async rt=>{const u=rt.request().url();if(u.includes('/cards/collection')){const ids=JSON.parse(rt.request().postData()).identifiers;
   const nf=ids.filter(i=>i.name==='Nonexistent Card');await rt.fulfill({json:{data:ids.filter(i=>i.name!=='Nonexistent Card').map(i=>fake(i.name)),not_found:nf}})}else await rt.fulfill({status:404,json:{}})});
 await pg.route('https://backend.commanderspellbook.com/**',rt=>rt.abort());
 await pg.goto('http://localhost:8765/');
 await pg.fill('#imp',Object.keys(REAL).map(n=>'1 '+n).join('\n')+'\n2x Sol Ring (CMR) 472\nNonexistent Card');
 await pg.click('#impBtn');console.log('col:',await pg.textContent('#colCount'));
 await pg.click('nav button[data-t=pre]');await pg.fill('#preSearch','Eternal Might');
 console.log('pre:',await pg.textContent('#preInfo'));
 await pg.click('.deck');await pg.waitForSelector('.sw',{timeout:15000});
 console.log('HEAD:',(await pg.textContent('#upHead')).replace(/\s+/g,' '));
 for(const s of await pg.$$eval('.sw',e=>e.map(x=>x.innerText.replace(/\s+/g,' '))))console.log(' -',s);
 // accept Rhystic + Smothering + Demonic + Thassa + Consultation
 for(const n of ["Rhystic Study","Demonic Tutor","Smothering Tithe","Thassa's Oracle","Demonic Consultation"]){const sel=`input[data-acc="${n}"]`;if(await pg.$(sel)){await pg.click(sel);await pg.waitForTimeout(500);await pg.waitForSelector(".sw")}else console.log("no sugg for",n)}
 await pg.waitForSelector('.sw');console.log('AFTER:',(await pg.textContent('#upHead')).replace(/\s+/g,' '));
 await pg.screenshot({path:'shot.png',fullPage:false});
 console.log('errors:',errs);await b.close();srv.close()})();
