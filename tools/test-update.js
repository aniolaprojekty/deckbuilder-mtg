// Update-check test: GITHUB_SHA=1111111aaaaaaa python3 tools/build.py && node tools/test-update.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(require('path').join(__dirname,'..','www'),q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8785);
(async()=>{const b=await chromium.launch();
for(const [label,sha] of [['newer','2222222bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],['same','1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']]){
 const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{addListener(){}}}}});
 let calls=0;await pg.route('https://api.github.com/**',rt=>{calls++;rt.fulfill({json:{name:'MTG Anioła (build 25)',body:'Automatyczny build z commita '+sha},headers:{'access-control-allow-origin':'*'}})});
 await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
 await pg.goto('http://localhost:8785/');await pg.waitForTimeout(2200);
 const ban=await pg.$('#upd');console.log(label,'banner:',ban?(await ban.innerText()).replace(/\s+/g,' '):'none','calls:',calls);
 if(ban){await pg.screenshot({path:'/tmp/upd.png'});await pg.click('#updX');await pg.reload();await pg.waitForTimeout(2000);console.log(' after dismiss+reload banner:',!!(await pg.$('#upd')),'calls (throttled):',calls);
   await pg.click('#ver');await pg.waitForTimeout(600);console.log(' manual check banner:',!!(await pg.$('#upd')),'calls:',calls)}
 else{await pg.click('#ver');await pg.waitForTimeout(600);console.log(' manual toast:',await pg.textContent('#toast'))}
 console.log(' errors',errs);await pg.close()}
await b.close();srv.close()})();
