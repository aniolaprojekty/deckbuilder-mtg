// Deck picker test: node tools/test-pick.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8781);
const art=n=>{let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))>>>0;return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="hsl(${h%360},60%,40%)"/></svg>`)};
const fake=n=>({name:n,type_line:'Legendary Creature',oracle_text:'',cmc:3,color_identity:['U'],legalities:{commander:'legal'},image_uris:{small:art(n),art_crop:art(n)}});
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
let calls=0;
await pg.addInitScript(()=>{window.Capacitor={Plugins:{App:{addListener:(ev,cb)=>{window.__back=cb},exitApp:()=>{window.__exit=1}}}}});
await pg.route('https://api.scryfall.com/**',async rt=>{const u=decodeURIComponent(rt.request().url());
  if(u.includes('/cards/collection')){calls++;const ids=JSON.parse(rt.request().postData()).identifiers;return rt.fulfill({json:{data:ids.map(i=>fake(i.name)),not_found:[]}})}
  if(u.includes('autocomplete'))return rt.fulfill({json:{data:['Atraxa, Praetors\' Voice']}});
  rt.fulfill({status:404,json:{}})});
await pg.goto('http://localhost:8781/');
const back=async()=>{await pg.evaluate(()=>window.__back({}));await pg.waitForTimeout(250)};
// star a precon first
await pg.click('nav button[data-t=pre]');await pg.fill('#preSearch','Scions');await pg.click('[data-star]');
await pg.click('nav button[data-t=game]');await pg.click('#gameSetup [data-n="3"]');
await pg.click('#gameSetup button[data-seat="0"]');await pg.waitForFunction(()=>document.querySelectorAll('#pick .pkimg[style*="background-image"]').length>100,null,{timeout:20000});
console.log('picker items:',(await pg.$$('#pick .pki')).length,'first:',(await pg.textContent('#pick .pki')).replace(/\s+/g,' '),'scryfall batches:',calls);
await pg.screenshot({path:'/tmp/pick.png'});
await pg.click('#pick .pki');await pg.waitForTimeout(300);
console.log('seat0:',(await pg.textContent('#gameSetup .gr .mu')).trim(),'picker open:',await pg.$eval('#pick',e=>e.classList.contains('on')));
await pg.fill('#gameSetup [data-sname="0"]','Jakub');await pg.press('#gameSetup [data-sname="0"]','Tab');
// back closes picker without choosing
await pg.click('#gameSetup button[data-seat="1"]');await back();console.log('after back picker open:',await pg.$eval('#pick',e=>e.classList.contains('on')),'tab:',await pg.$eval('nav button.on',e=>e.dataset.t));
await pg.click('#gStart');
console.log('panel0 label:',await pg.textContent('#game .gc[data-p="0"] .gname'),'bg:',(await pg.$eval('#game .gc[data-p="0"] .gbg',e=>e.style.backgroundImage)).slice(0,30));
// in game: player 2 picks custom commander
await pg.click('#game [data-menu="2"]');await pg.click('#gSheet [data-pick]');await pg.fill('#pkC','atrax');await pg.waitForSelector('#pkS .sg');await pg.click('#pkS .sg');await pg.waitForTimeout(400);
console.log('sheet still open:',await pg.$eval('#gSheet',e=>e.classList.contains('on')),'cmdr in sheet:',(await pg.textContent('#gSheet .gr:nth-child(3) .lbl')).trim());
await back();console.log('panel2 label:',await pg.textContent('#game .gc[data-p="2"] .gname'),'game open:',await pg.$eval('#game',e=>e.classList.contains('on')));
await pg.screenshot({path:'/tmp/gpick.png'});
await back();
// next game keeps seats
await pg.click('#gStart');console.log('new game keeps:',await pg.$$eval('#game .gname',e=>e.map(x=>x.textContent)));
console.log('errors:',errs);await b.close();srv.close()})();
