// Collection browser test: node tools/test-collection.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8784);
const C={'Sol Ring':['Artifact','',1,1.2],'Counterspell':['Instant','U',2,0.8],'Swords to Plowshares':['Instant','W',1,2],'Cultivate':['Sorcery','G',3,0.5],
 'Lightning Bolt':['Instant','R',1,1],'Atraxa, Praetors\' Voice':['Legendary Creature — Phyrexian Angel Horror','WUBG',4,15],'Command Tower':['Land','',0,0.3],
 'Rhystic Study':['Enchantment','U',3,35],'Llanowar Elves':['Creature — Elf Druid','G',1,0.3],'Teferi, Hero of Dominaria':['Legendary Planeswalker — Teferi','WU',5,6],'Dark Ritual':['Instant','B',1,0.4]};
const art='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="63" height="88"><rect width="63" height="88" fill="#888"/></svg>');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
await pg.route('https://api.scryfall.com/**',async rt=>{const ids=JSON.parse(rt.request().postData()||'{"identifiers":[]}').identifiers;
  rt.fulfill({json:{data:ids.filter(i=>C[i.name]).map(i=>{const[t,ci,cmc,p]=C[i.name];return {name:i.name,type_line:t,oracle_text:'',cmc,color_identity:ci.split(''),legalities:{commander:'legal'},prices:{eur:String(p)},image_uris:{small:art,normal:art}}}),not_found:[]}})});
await pg.goto('http://localhost:8784/');
await pg.fill('#imp',Object.keys(C).map(n=>'1 '+n).join('\n')+'\n3 Sol Ring');await pg.click('#impBtn');await pg.waitForFunction(()=>!document.querySelector('#colInfo').textContent.includes('bez danych'),null,{timeout:20000});
const names=()=>pg.$$eval('#colList .item .grow > div:first-child',e=>e.map(x=>x.textContent));
console.log('info:',await pg.textContent('#colInfo'));
await pg.click('[data-cc="U"]');console.log('blue:',(await names()).join(', '));
await pg.click('[data-cc="M"]');console.log('blue+multi:',(await names()).join(', '));
await pg.click('[data-cc="U"]');await pg.click('[data-cc="M"]');
await pg.click('[data-cc="C"]');console.log('colorless:',(await names()).join(', '));await pg.click('[data-cc="C"]');
await pg.click('[data-ct="instant"]');console.log('instants:',(await names()).join(', '));
await pg.click('[data-ct="commander"]');console.log('commanders:',(await names()).join(', '));await pg.click('[data-ct="commander"]');
await pg.selectOption('#colSort','price');console.log('by price:',(await names()).slice(0,3).join(', '));
await pg.selectOption('#colSort','color');console.log('by color:',(await names()).join(', '));
await pg.click('#colView [data-v="grid"]');console.log('grid tiles:',(await pg.$$('#colList .cg')).length,'qty badge:',await pg.$eval('.cgq',e=>e.textContent));
await pg.screenshot({path:'/tmp/colgrid.png'});
await pg.click('#colList .cg');console.log('zoom:',await pg.$eval('#zoom',e=>getComputedStyle(e).display));await pg.click('#zoom');
await pg.click('#colView [data-v="list"]');await pg.click('[data-cc="G"]');await pg.screenshot({path:'/tmp/collist.png'});
await pg.reload();console.log('filters persisted:',await pg.$eval('[data-cc="G"]',e=>e.classList.contains('on')),'view list:',await pg.$eval('#colView [data-v="list"]',e=>e.classList.contains('on')));
console.log('errors:',errs);await b.close();srv.close()})();
