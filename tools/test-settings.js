// Game settings toggles: node tools/test-settings.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8786);
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route('https://**',r=>r.abort());
await pg.goto('http://localhost:8786/');
const st=k=>pg.$eval(`#gameSetup [data-opt="${k}"]`,e=>e.classList.contains('on'));
// visit the tab several times and click around to provoke re-renders
for(let i=0;i<3;i++){await pg.click('nav button[data-t=col]');await pg.click('nav button[data-t=game]')}
await pg.click('#gameSetup [data-n="3"]');await pg.click('#gameSetup [data-n="4"]');
const res=[];
for(const k of ['timer','plane','autoKO','awake']){const a=await st(k);await pg.click(`#gameSetup [data-opt="${k}"]`);const b1=await st(k);await pg.click(`#gameSetup [data-opt="${k}"]`);const c=await st(k);res.push(`${k}: ${a}→${b1}→${c}`)}
console.log(res.join(' | '));
// in-game settings sheet
await pg.click('#gStart');await pg.click('#gBar [data-b="set"]');
const s2=k=>pg.$eval(`#gSheet [data-opt="${k}"]`,e=>e.classList.contains('on'));
for(let i=0;i<3;i++){await pg.click('#gSheet [data-opt="timer"]')}
console.log('in-game timer after 3 taps:',await s2('timer'),'bar shows time:',/\d:\d\d/.test(await pg.textContent('#gTurn')));
console.log('errors:',errs);await b.close();srv.close()})();
