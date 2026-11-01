// Game mode test: node tools/test-game.js (after python3 tools/build.py)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8780);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{window.__exit=0;window.Capacitor={Plugins:{App:{addListener:(ev,cb)=>{if(ev==='backButton')window.__back=cb},exitApp:()=>{window.__exit++}}}}});
await pg.route('https://api.scryfall.com/**',async rt=>{const u=rt.request().url();
  if(u.includes('/cards/search'))return rt.fulfill({json:{data:[{name:'Fields of Summer',type_line:'Plane — Moag',oracle_text:'Whenever a player casts a spell, that player may gain 2 life.',image_uris:{large:''}},{name:'Chaotic Aether',type_line:'Phenomenon',oracle_text:'Chaos',image_uris:{large:''}}],has_more:false}});
  rt.fulfill({status:404,json:{}})});
await pg.goto('http://localhost:8780/');
const life=()=>pg.$$eval('#game .glife',e=>e.map(x=>x.textContent));
const back=async()=>{await pg.evaluate(()=>window.__back({}));await pg.waitForTimeout(250)};
await pg.click('nav button[data-t=game]');
await pg.click('#gameSetup [data-n="4"]');await pg.click('#gStart');
console.log('4p life:',await life());
const tap=async(i,side)=>{const el=await pg.$(`#game .gc[data-p="${i}"] .gtap.${side}`);const bb=await el.boundingBox();await pg.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await pg.mouse.down();await pg.mouse.up()};
const holdT=async(i,side,ms)=>{const el=await pg.$(`#game .gc[data-p="${i}"] .gtap.${side}`);const bb=await el.boundingBox();await pg.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await pg.mouse.down();await pg.waitForTimeout(ms);await pg.mouse.up()};
await tap(0,'m');await tap(0,'m');await tap(0,'m');await tap(1,'p');await holdT(2,'m',600);
console.log('after taps/hold:',await life(),'delta p0:',await pg.$eval('#game .gc[data-p="0"] .gdelta',e=>e.textContent));
await pg.screenshot({path:'/tmp/g4.png'});
// commander damage: p1 hits p3 for 21
await pg.click('#game [data-menu="3"]');for(let k=0;k<21;k++)await pg.click('#gSheet [data-k="cmd1"][data-d="1"]');
await pg.click('#gSheet [data-k="poison"][data-d="1"]');await pg.click('#gSheet [data-tog="monarch"]');
await pg.screenshot({path:'/tmp/gsheet.png'});
await back();
console.log('p3 KO:',await pg.$eval('#game .gc[data-p="3"]',e=>e.classList.contains('ko')),'life:',await life(),'badges:',await pg.$eval('#game .gc[data-p="3"] .gbadges',e=>e.textContent),'cnt:',await pg.$eval('#game .gc[data-p="3"] .gcnt',e=>e.textContent));
// turns: 0->1->2->(skip 3)->0 turn 2
for(let k=0;k<3;k++)await pg.click('#gBar [data-b="turn"]');
console.log('turn bar:',await pg.textContent('#gTurn'),'active:',await pg.$eval('#game .gc.active',e=>e.dataset.p));
await pg.waitForTimeout(1900);
await pg.click('#gBar [data-b="hist"]');console.log('history:',(await pg.textContent('#gSheet')).replace(/\s+/g,' ').slice(0,400));await back();
await pg.click('#gBar [data-b="dice"]');await pg.click('[data-dd="20"]');await pg.waitForTimeout(300);console.log('d20:',await pg.textContent('#gDres'));await pg.click('[data-dd="coin"]');await pg.waitForTimeout(300);console.log('coin:',await pg.textContent('#gDres'));await back();
await pg.click('#gBar [data-b="mana"]');await pg.click('#gSheet [data-k="U"][data-d="1"]');await pg.click('#gSheet [data-k="storm"][data-d="1"]');console.log('mana:',(await pg.$$eval('#gSheet .val',e=>e.map(x=>x.textContent))).join(','));await back();
await pg.click('#gBar [data-b="set"]');await pg.click('#gSheet [data-opt="plane"]');await back();
await pg.click('#gBar [data-b="plane"]');await pg.waitForSelector('#gRoll');console.log('plane:',await pg.$eval('#gSheet h3',e=>e.textContent));await pg.click('#gRoll');await pg.waitForTimeout(300);console.log('roll:',await pg.textContent('#gPdie'));
await back();console.log('after back, sheet open:',await pg.$eval('#gSheet',e=>e.classList.contains('on')),'game open:',await pg.$eval('#game',e=>e.classList.contains('on')));
// persistence across reload
await pg.reload();await pg.click('nav button[data-t=game]');console.log('continue btn:',await pg.textContent('#gCont'));await pg.click('#gCont');console.log('restored life:',await life());
await back();console.log('game closed:',!(await pg.$eval('#game',e=>e.classList.contains('on'))),'tab:',await pg.$eval('nav button.on',e=>e.dataset.t));
// layouts
for(const n of [2,3]){await pg.click(`#gameSetup [data-n="${n}"]`);await pg.click('#gStart');await pg.screenshot({path:`/tmp/g${n}.png`});console.log(n+'p cells:',(await pg.$$('#game .gc')).length);await back()}
console.log('errors:',errs);await b.close();srv.close()})();
