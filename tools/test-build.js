// Build-from-collection + TXT export test: node tools/test-build.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8783);
const P=JSON.parse(fs.readFileSync(path.join(__dirname,'..','src','precons.json')));
const dd=P.decks.find(d=>d.n==='Deadly Disguise');const names=dd.l.map(([i,q])=>[P.names[i],q]);
const fake=n=>({name:n,type_line:'Instant',oracle_text:'Draw two cards.',cmc:2,edhrec_rank:500,color_identity:['G'],legalities:{commander:'legal'},prices:{eur:'1.50'},image_uris:{small:''}});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
for(const native of [false,true]){
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 if(native)await pg.addInitScript(()=>{window.__shared=null;window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{addListener(){}},
   Filesystem:{writeFile:async o=>{window.__file=o;return {uri:'file:///cache/'+o.path}}},Share:{share:async o=>{window.__shared=o}}}}});
 await pg.route('https://api.scryfall.com/**',async rt=>{const ids=JSON.parse(rt.request().postData()||'{"identifiers":[]}').identifiers;rt.fulfill({json:{data:ids.map(i=>fake(i.name)),not_found:[]}})});
 await pg.goto('http://localhost:8783/');
 // own the first 60 non-basic cards of Deadly Disguise
 const own=names.filter(([n])=>!/^(Plains|Island|Swamp|Mountain|Forest)$/.test(n)).slice(0,60);
 await pg.fill('#imp',own.map(([n,q])=>q+' '+n).join('\n'));await pg.click('#impBtn');
 await pg.click('nav button[data-t=pre]');await pg.selectOption('#preSort','owned');
 console.log(native?'[native]':'[web]','top owned:',(await pg.$eval('#preList .deck',e=>e.innerText.replace(/\s+/g,' '))).slice(0,90));
 await pg.click('#preList .deck');await pg.waitForSelector('#dvTxt',{timeout:20000});
 console.log('build box:',(await pg.textContent('#dvBuild')).replace(/\s+/g,' ').slice(0,140));
 if(!native){const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#dvTxt')]);const p=await dl.path();const t=fs.readFileSync(p,'utf8');
   console.log('download:',dl.suggestedFilename(),'lines:',t.trim().split('\n').length,'first:',t.split('\n')[0]);await pg.screenshot({path:'/tmp/build.png'})}
 else{await pg.click('#dvTxt');await pg.waitForTimeout(300);const f=await pg.evaluate(()=>({file:window.__file&&{path:window.__file.path,dir:window.__file.directory,lines:window.__file.data.trim().split('\n').length},share:window.__shared}));console.log('native share:',JSON.stringify(f))}
 await pg.uncheck('#dvSkip');console.log('with basics:',(await pg.textContent('#dvBuild')).replace(/\s+/g,' ').slice(0,60));
 console.log('errors:',errs);await pg.close();
}
await b.close();srv.close()})();
// Cardmarket order dialog
(async()=>{const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8793);
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route('https://api.scryfall.com/**',async rt=>{const ids=JSON.parse(rt.request().postData()||'{"identifiers":[]}').identifiers;rt.fulfill({json:{data:ids.map(i=>({name:i.name,type_line:'Instant',oracle_text:'',cmc:1,color_identity:['G'],legalities:{commander:'legal'},prices:{eur:'1'}})),not_found:[]}})});
await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
await pg.goto('http://localhost:8793/');await pg.fill('#imp','1 Sol Ring');await pg.click('#impBtn');
await pg.click('nav button[data-t=pre]');await pg.fill('#preSearch','Deadly Disguise');await pg.click('#preList .deck');await pg.waitForSelector('#dvCm',{timeout:20000});
await pg.click('#dvCm');await pg.waitForSelector('#cmCopy');
const clip=await pg.evaluate(()=>navigator.clipboard.readText());
console.log('[cardmarket] dialog:',(await pg.textContent('#zoomIn')).replace(/\s+/g,' ').slice(0,80),'| clipboard lines:',clip.trim().split('\n').length,'| link:',await pg.$eval('#zoomIn a',a=>a.href));
await pg.screenshot({path:'/tmp/cm.png'});console.log('[cardmarket] errors:',errs);await b.close();srv.close()})();
