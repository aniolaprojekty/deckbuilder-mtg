// Add/remove precon to collection + clear collection with confirmation: node tools/test-addprecon.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8787);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{window.Capacitor={Plugins:{App:{addListener:(ev,cb)=>{if(ev==='backButton')window.__back=cb}}}}});
await pg.route('https://api.scryfall.com/**',async rt=>{const ids=JSON.parse(rt.request().postData()||'{"identifiers":[]}').identifiers;rt.fulfill({json:{data:ids.map(i=>({name:i.name,type_line:'Instant',oracle_text:'',cmc:1,color_identity:['G'],legalities:{commander:'legal'},prices:{eur:'1'}})),not_found:[]}})});
await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
await pg.goto('http://localhost:8787/');
const cnt=()=>pg.textContent('#colCount');
await pg.click('nav button[data-t=pre]');await pg.fill('#preSearch','Deadly Disguise');await pg.click('#preList .deck');await pg.waitForSelector('#dvAdd',{timeout:20000});
await pg.click('#dvAdd');await pg.waitForSelector('#dvRem');
console.log('after add:',(await pg.textContent('#dvColRow')).replace(/\s+/g,' '),'| build:',(await pg.textContent('#dvBuild')).replace(/\s+/g,' ').slice(15,60),'| star:',await pg.$eval('#dvStar',e=>e.textContent));
await pg.click('#dvAdd');await pg.waitForSelector('#cfYes');console.log('re-add dialog:',await pg.textContent('#zoomIn h3'));await pg.click('#cfYes');await pg.waitForTimeout(400);
console.log('after 2nd add:',(await pg.textContent('#dvColRow')).replace(/\s+/g,' '));
await pg.click('#dvRem');await pg.waitForSelector('#cfYes');await pg.evaluate(()=>window.__back({}));await pg.waitForTimeout(300);
console.log('back cancels remove:',(await pg.textContent('#dvColRow')).replace(/\s+/g,' '),'dialog open:',await pg.$eval('#zoom',e=>getComputedStyle(e).display));
await pg.click('#dvRem');await pg.waitForSelector('#cfYes');await pg.click('#cfYes');await pg.waitForTimeout(400);
console.log('after remove:',(await pg.textContent('#dvColRow')).replace(/\s+/g,' '));
await pg.click('nav button[data-t=col]');console.log('collection:',await cnt());
await pg.click('#clrBtn');await pg.waitForSelector('#cfNo');console.log('clear dialog:',(await pg.textContent('#zoomIn')).replace(/\s+/g,' ').slice(0,110));
await pg.screenshot({path:'/tmp/clr.png'});
await pg.click('#cfBackup');const clip=await pg.evaluate(()=>navigator.clipboard.readText());console.log('backup lines:',clip.trim().split('\n').length);
await pg.click('#cfNo');await pg.waitForTimeout(300);console.log('after cancel:',await cnt());
await pg.click('#clrBtn');await pg.waitForSelector('#cfYes');await pg.click('#cfYes');await pg.waitForTimeout(300);console.log('after confirm:',await cnt());
await pg.click('#clrBtn');console.log('empty toast:',await pg.textContent('#toast'));
// card zoom still closes on tap
await pg.fill('#imp','1 Sol Ring');await pg.click('#impBtn');await pg.waitForTimeout(500);await pg.click('#colList [data-zoom]');await pg.click('#zoomIn');await pg.waitForTimeout(300);console.log('card zoom closes on tap:',await pg.$eval('#zoom',e=>getComputedStyle(e).display));
console.log('errors:',errs);await b.close();srv.close()})();
