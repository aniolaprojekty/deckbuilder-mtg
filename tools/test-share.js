// Share-target test (simulated native plugin + web ?share): node tools/test-share.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'||q.url.startsWith('/?')?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8789);
const CSV='Binder Name,Binder Type,Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency\n'+
 'Main,binder,Sol Ring,CMM,Commander Masters,410,normal,uncommon,2,1,abc,1.0,false,false,near_mint,en,EUR\n'+
 'Main,binder,"Atraxa, Praetors\' Voice",2X2,Double Masters 2022,190,foil,mythic,1,2,def,20,false,false,near_mint,en,EUR\n'+
 'Main,binder,Roaming Throne,MAR,Marvel Universe,99,normal,mythic,1,3,ghi,37,false,false,near_mint,en,EUR\n';
(async()=>{const b=await chromium.launch();
const run=async(label,init,url)=>{const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.route('https://**',r=>r.abort());await pg.addInitScript(init.fn,init.arg);await pg.goto(url||'http://localhost:8789/');return {pg,errs}};
// 1) cold start with ManaBox CSV, existing collection → replace
let {pg,errs}=await run('csv',{fn:([csv])=>{localStorage.setItem('mtg.collection',JSON.stringify({'Island':10,'Sol Ring':1}));
  window.Capacitor={Plugins:{App:{addListener(){}},ShareIn:{addListener:(e,cb)=>{window.__share=cb},getShared:async()=>({text:csv})}}}},arg:[CSV]});
await pg.waitForSelector('#shAdd',{timeout:5000});console.log('csv dialog:',(await pg.textContent('#zoomIn')).replace(/\s+/g,' ').slice(0,120));
await pg.click('#shRep');await pg.waitForTimeout(300);console.log('after replace:',await pg.evaluate(()=>localStorage.getItem('mtg.collection')));
// 2) later share of plain text while running → add
await pg.evaluate(()=>window.__share({text:'1 Counterspell (DMR) 45\n2x Cultivate'}));await pg.waitForSelector('#shAdd');
console.log('text dialog:',(await pg.textContent('#zoomIn h3')),'|',(await pg.textContent('#zoomIn .mu')).replace(/\s+/g,' ').slice(0,60));
await pg.click('#shAdd');await pg.waitForTimeout(300);console.log('after add:',await pg.evaluate(()=>localStorage.getItem('mtg.collection')));
await pg.evaluate(()=>window.__share({text:'hello there'}));await pg.waitForTimeout(200);
console.log('no-cards text →',await pg.$eval('#zoom',e=>getComputedStyle(e).display),'toast:',await pg.textContent('#toast'));
console.log('errors:',errs);await pg.close();
// 3) web share target
({pg,errs}=await run('web',{fn:()=>{},arg:null},'http://localhost:8789/?share=1&title=Lista&text='+encodeURIComponent('3 Sol Ring\n1 Arcane Signet')));
await pg.waitForSelector('#shAdd',{timeout:5000});console.log('web dialog:',(await pg.textContent('#zoomIn .mu')).replace(/\s+/g,' ').slice(0,60),'| url:',pg.url());
await pg.click('#shAdd');await pg.waitForTimeout(300);console.log('web after add:',await pg.evaluate(()=>localStorage.getItem('mtg.collection')));
console.log('errors:',errs);await b.close();srv.close()})();
