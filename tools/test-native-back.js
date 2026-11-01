// Simulates Capacitor App 'backButton' events (Android hardware/gesture back)
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8769);
function fake(n){return {name:n,type_line:'Instant',oracle_text:'Draw two cards.',cmc:2,edhrec_rank:5000,color_identity:['W','B'],legalities:{commander:'legal'},prices:{eur:'1'}}}
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{window.__exit=0;window.Capacitor={Plugins:{App:{addListener:(ev,cb)=>{if(ev==='backButton')window.__back=cb},exitApp:()=>{window.__exit++}}}}});
await pg.route('https://api.scryfall.com/**',async rt=>{const ids=JSON.parse(rt.request().postData()||'{"identifiers":[]}').identifiers;await rt.fulfill({json:{data:ids.map(i=>fake(i.name)),not_found:[]}})});
await pg.route('https://backend.commanderspellbook.com/**',rt=>rt.abort());await pg.route('https://json.edhrec.com/**',rt=>rt.abort());
await pg.goto('http://localhost:8769/');
const where=async()=>({tab:await pg.$eval('section.on',e=>e.id.slice(2)),zoom:await pg.$eval('#zoom',e=>getComputedStyle(e).display),view:await pg.evaluate(()=>state.view),exit:await pg.evaluate(()=>window.__exit)});
await pg.click('nav button[data-t=pre]');await pg.click('.deck');await pg.waitForSelector('#dvUp',{timeout:20000});await pg.click('#dvUp');await pg.waitForSelector('[data-view=deck]',{timeout:15000});
await pg.click('[data-view=deck]');await pg.click('.dc');console.log('start',await where());
for(let i=0;i<6;i++){await pg.evaluate(()=>window.__back({canGoBack:true}));await pg.waitForTimeout(400);console.log('back',i+1,await where())}
console.log(errs);await b.close();srv.close()})();
