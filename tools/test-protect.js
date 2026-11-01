// Protect my decks option: node tools/test-protect.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8791);
const P=JSON.parse(fs.readFileSync(path.join(__dirname,'..','src','precons.json')));
const other=P.decks.find(d=>d.n!=='Eternal Might'&&d.l.some(([i])=>P.names[i]==='Counterspell'));
const REAL={'Counterspell':['Instant','Counter target spell.',40],'Swords to Plowshares':['Instant','Exile target creature.',10]};
function h(s){let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x}
const TX=['Destroy target creature.','Draw two cards.','Counter target spell.','Flying'],TY=['Instant','Sorcery','Instant','Creature — Bird'];
const fake=n=>{const R=REAL[n],k=h(n);return {name:n,type_line:R?R[0]:TY[k%4],oracle_text:R?R[1]:TX[k%4],cmc:2,edhrec_rank:R?R[2]:3000+k%20000,color_identity:['U','B'],legalities:{commander:'legal'},prices:{eur:'1'}}};
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route('https://api.scryfall.com/**',async rt=>{const ids=JSON.parse(rt.request().postData()||'{"identifiers":[]}').identifiers;rt.fulfill({json:{data:ids.map(i=>fake(i.name)),not_found:[]}})});
await pg.route('https://backend.commanderspellbook.com/**',r=>r.abort());await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
await pg.addInitScript(id=>{localStorage.setItem('mtg.mine',JSON.stringify([id]))},other.id);
await pg.goto('http://localhost:8791/');
await pg.fill('#imp','1 Counterspell\n1 Swords to Plowshares');await pg.click('#impBtn');
await pg.click('nav button[data-t=pre]');await pg.fill('#preSearch','Eternal Might');await pg.click('#preList .deck');await pg.waitForSelector('#dvUp',{timeout:20000});await pg.click('#dvUp');await pg.waitForSelector('#protect',{timeout:20000});
const ins=()=>pg.$$eval('.sw .in',e=>e.map(x=>x.textContent.replace(/\s+/g,' ').trim().split(' #')[0]));
console.log('protected decks:',(await pg.textContent('#upHead')).replace(/\s+/g,' ').match(/🔒.{0,120}/)[0]);
console.log('ON, 1 copy:',await ins(),'|',(await pg.textContent('#upBody')).match(/🔒.*/)?.[0]);
await pg.uncheck('#protect');await pg.waitForTimeout(200);console.log('OFF:',await ins());
await pg.check('#protect');await pg.click('nav button[data-t=col]');await pg.fill('#imp','1 Counterspell');await pg.click('#impBtn');
await pg.click('nav button[data-t=up]');await pg.waitForSelector('#protect');await pg.waitForTimeout(300);console.log('ON, 2 copies:',await ins());
console.log('errors:',errs);await b.close();srv.close()})();
