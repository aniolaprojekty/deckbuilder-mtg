const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(require('path').join(__dirname,'..','www'),q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8767);
const EDH={"Rhystic Study":[.4,.05,35,1,'Enchantment','you may draw a card unless that player pays {1}.'],"Necropotence":[.3,.1,25,1,'Enchantment','Pay 1 life: Exile the top card of your library. draw a card at end'],
"Rooftop Storm":[.6,.5,8,0,'Enchantment','You may pay {0} rather than pay the mana cost for Zombie creature spells you cast.'],"Gravecrawler":[.7,.4,1.5,0,'Creature — Zombie','Gravecrawler can\'t block.'],
"Diregraf Captain":[.6,.3,0.5,0,'Creature — Zombie Soldier','Deathtouch. Other Zombie creatures you control get +1/+1.'],"Arcane Signet":[.8,.01,0.8,0,'Artifact','{T}: Add one mana of any color in your commander\'s color identity.'],
"Fellwar Stone":[.5,.01,0.5,0,'Artifact','{T}: Add one mana of any color'],"Feed the Swarm":[.5,.02,0.3,0,'Sorcery','Destroy target creature or enchantment an opponent controls.'],
"Damnation":[.4,.05,40,0,'Sorcery','Destroy all creatures. They can\'t be regenerated.'],"Watery Grave":[.5,.02,15,0,'Land — Island Swamp','({T}: Add {U} or {B}.)'],
"Thassa's Oracle":[.3,.2,12,1,'Creature — Merfolk Wizard','look at the top X cards'],"Demonic Tutor":[.35,.05,30,1,'Sorcery','Search your library for a card, put that card into your hand']};
function h(s){let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x}
const TX=["Destroy target creature.","Draw two cards.","Search your library for a basic land card, put it onto the battlefield tapped","Flying","Counter target spell.","Whenever you attack, create a token."],TY=["Instant","Sorcery","Sorcery","Creature — Zombie","Instant","Enchantment"];
function fake(n){const E=EDH[n],k=h(n),land=!E&&/Plains|Island|Swamp|Mountain|Forest|Land|Tower|Temple|Path|Grove|Sanctum|Gate|Orchard|Tomb/.test(n);
 return {name:n,type_line:E?E[4]:land?"Land":TY[k%6],oracle_text:E?E[5]:land?"{T}: Add {B}.":TX[k%6],cmc:E?2:k%6,edhrec_rank:2000+k%30000,game_changer:!!(E&&E[3]),color_identity:E?["U","B"]:["U","B"],legalities:{commander:"legal"},prices:{eur:E?String(E[2]):String((k%300)/100)}}}
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('https://api.scryfall.com/**',async rt=>{const ids=JSON.parse(rt.request().postData()||'{"identifiers":[]}').identifiers;await rt.fulfill({json:{data:ids.map(i=>fake(i.name)),not_found:[]}})});
 await pg.route('https://backend.commanderspellbook.com/**',rt=>rt.abort());
 let edhUrl='';await pg.route('https://json.edhrec.com/**',rt=>{edhUrl=rt.request().url();rt.fulfill({json:{container:{json_dict:{cardlists:[{tag:'highsynergycards',cardviews:Object.entries(EDH).map(([n,v])=>({name:n,synergy:v[1],num_decks:Math.round(v[0]*1000),potential_decks:1000}))}]}}},headers:{'access-control-allow-origin':'*'}})});
 await pg.goto('http://localhost:8767/');await pg.fill('#imp','1 Arcane Signet');await pg.click('#impBtn');
 await pg.click('nav button[data-t=pre]');await pg.fill('#preSearch','Eternal Might');await pg.click('.deck');await pg.waitForSelector('[data-view=buy]',{timeout:15000});
 await pg.click('[data-view=buy]');await pg.waitForSelector('#cpBuy',{timeout:15000});console.log(await pg.evaluate(()=>{const d=DECKS.find(x=>x.id===state.deck);const p=BUY[d.id];return JSON.stringify({src:p.src,n:p.score.size,cmd:d.commanders.map(card),rh:card('Rhystic Study')})}));console.log('edhrec url:',edhUrl);
 const sum=async l=>{const t=(await pg.textContent('#upBody')).replace(/\s+/g,' ');console.log(l,t.match(/Po zmianach.*?(Pominięto[^K]*)?Kopiuj/)[0].replace('Kopiuj',''));
   console.log('   ',(await pg.$$eval('.sw .in',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim()))).join(' | '))};
 await sum('KEEP:');
 await pg.click('[data-mode="3"]');await pg.waitForSelector('#cpBuy');await sum('B3:');
 await pg.click('[data-mode="4"]');await pg.waitForSelector('#cpBuy');await sum('B4:');
 await pg.fill('#budget','20');await pg.press('#budget','Tab');await pg.waitForTimeout(300);await sum('B4 budżet 20€:');
 await pg.click('.sw [data-bcmp]');console.log('zoom:',(await pg.textContent('#zoomIn')).slice(0,60));await pg.click('#zoom');
 await pg.screenshot({path:'/tmp/buy.png'});console.log('errors:',errs);await b.close();srv.close()})();
