// Alternate printed names (e.g. "Doom Variant" = Roaming Throne): node tools/test-altname.js
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'..','www',q.url==='/'?'index.html':q.url.split('?')[0]),(e,d)=>{if(e){r.writeHead(404);r.end()}else r.end(d)})).listen(8788);
const NM=process.env.OCR_NM||'/tmp/ocr/node_modules';
const RT={object:'card',name:'Roaming Throne',flavor_name:'Doom Variant',mana_cost:'{4}',type_line:'Artifact Creature — Golem',oracle_text:'Ward {2}\nAs this creature enters, choose a creature type.',keywords:['Ward'],cmc:4,power:'4',toughness:'4',edhrec_rank:150,color_identity:[],legalities:{commander:'legal'},prices:{eur:'37.01'},set_name:'Marvel Universe',rulings_uri:'https://api.scryfall.com/r',scryfall_uri:'#',image_uris:{small:'',normal:''}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
await ctx.route('https://cdn.jsdelivr.net/**',rt=>{const u=rt.request().url();let f;
  if(u.includes('tesseract.min.js'))f=NM+'/tesseract.js/dist/tesseract.min.js';else if(u.includes('worker.min.js'))f=NM+'/tesseract.js/dist/worker.min.js';
  else if(u.includes('traineddata'))f=NM+'/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';else{const m=u.match(/tesseract\.js-core@[^/]+\/(.+)$/);f=m&&NM+'/tesseract.js-core/'+m[1]}
  if(f&&fs.existsSync(f))rt.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.wasm')?'application/wasm':f.endsWith('.gz')?'application/octet-stream':'application/javascript',headers:{'access-control-allow-origin':'*'}});else rt.abort()});
await ctx.route('https://tessdata.projectnaptha.com/**',rt=>rt.fulfill({body:fs.readFileSync(NM+'/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),headers:{'access-control-allow-origin':'*'}}));
const seen=[];
await ctx.route('https://api.scryfall.com/**',rt=>{const u=decodeURIComponent(rt.request().url());seen.push(u.replace('https://api.scryfall.com',''));
  if(u.includes('/cards/collection')){const ids=JSON.parse(rt.request().postData()).identifiers;return rt.fulfill({json:{data:ids.filter(i=>i.name==='Sol Ring').map(()=>({...RT,name:'Sol Ring',flavor_name:undefined})),not_found:ids.filter(i=>i.name!=='Sol Ring')}})}
  if(u.includes('fuzzy='))return rt.fulfill({status:404,json:{object:'error'}});
  if(u.includes('autocomplete'))return rt.fulfill({json:{data:[]}});
  if(u.includes('/cards/search'))return /doom\s*var/i.test(u)?rt.fulfill({json:{data:[RT],has_more:false}}):rt.fulfill({status:404,json:{}});
  if(u.endsWith('/r'))return rt.fulfill({json:{data:[]}});rt.fulfill({status:404,json:{}})});
await ctx.route('https://backend.commanderspellbook.com/**',r=>r.abort());
await pg.goto('http://localhost:8788/');
// 1) typed name
await pg.click('nav button[data-t=card]');await pg.fill('#cardQ','Doom Variant');await pg.press('#cardQ','Enter');await pg.waitForSelector('#cardOut h3',{timeout:15000});
console.log('typed:',(await pg.textContent('#cardOut h3')).trim(),'|',(await pg.textContent('#cardOut .pill')));
// 2) suggestions
await pg.fill('#cardQ','Doom Var');await pg.waitForSelector('#cardSugg .sg',{timeout:10000});console.log('suggest:',(await pg.textContent('#cardSugg')).replace(/\s+/g,' '));
// 3) photo
const mk=await ctx.newPage();await mk.setViewportSize({width:630,height:880});
await mk.setContent(`<body style="margin:0;background:#222"><div style="margin:20px;width:590px;height:840px;background:#cfc8b8;border:14px solid #111;border-radius:22px;box-sizing:border-box;font-family:Georgia,serif"><div style="margin:18px;padding:8px 14px;background:#f2ead6;border:2px solid #555;border-radius:10px;font-size:34px;font-weight:bold">Doom Variant</div><div style="margin:0 30px;font-size:16px">Roaming Throne</div><div style="margin:18px;height:360px;background:#556"></div></div></body>`);
await mk.screenshot({path:'/tmp/doom.png'});await mk.close();
await pg.fill('#cardQ','');await pg.setInputFiles('#cardPhoto','/tmp/doom.png');await pg.waitForFunction(()=>/Rozpoznano|Nie rozpozna/.test(document.querySelector('#cardMsg').textContent),null,{timeout:90000});
console.log('photo:',await pg.textContent('#cardMsg'),'→',(await pg.textContent('#cardOut h3')).trim());
// 4) import
await pg.click('nav button[data-t=col]');await pg.fill('#imp','1 Doom Variant\n1 Sol Ring');await pg.click('#impBtn');
await pg.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('mtg.collection')||'{}')).includes('Roaming Throne'),null,{timeout:30000});
console.log('collection keys:',await pg.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('mtg.collection')))));
console.log('errors:',errs);await b.close();srv.close()})();
