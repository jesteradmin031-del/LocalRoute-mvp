const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.SECURITY_BASE_URL || 'http://127.0.0.1:5178';

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const results=[];
 async function check(name,run){
  const context=await browser.newContext();
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{await run(page,context);results.push({name,passed:errors.length===0,errors});}
  catch(e){results.push({name,passed:false,error:e.message,errors});}
  finally{await context.close();}
 }
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 const payload='<img src=x onerror="window.__securityXss=1">';
 for(const value of ['__proto__','constructor','toString',payload,"' OR 1=1 --",'javascript:window.__securityXss=1','%00','../.env']){
  await check(`URL input: ${value}`,async page=>{
   await page.goto(`${base}/?from=${encodeURIComponent(value)}&to=${encodeURIComponent(value)}`);
   await page.locator('#origin').waitFor();
   assert(await page.locator('#origin').inputValue()==='Balasore Railway Station','Invalid origin accepted');
   assert(!await page.evaluate(()=>window.__securityXss),'Script executed');
  });
 }
 await check('Reflected XSS in planner and interpreter',async page=>{
  await page.goto(base);
  await page.locator('#origin').fill(payload);
  await page.getByRole('button',{name:'Find my route',exact:true}).click();
  assert(await page.locator('[role=alert]').count()===1,'Malicious place accepted');
  await page.getByLabel('Natural-language route request').fill(payload);
  await page.getByLabel('Find a route from your request').click();
  assert(!await page.evaluate(()=>window.__securityXss),'Script executed');
 });
 await check('Stored XSS in community contribution',async page=>{
  await page.goto(base);
  await page.locator('.sidebar').getByRole('button',{name:'Contribute',exact:true}).click();
  await page.getByRole('button',{name:'Add a landmark',exact:true}).click();
  await page.getByLabel('Landmark name', {exact:true}).fill(payload);
  await page.getByLabel('Location description', {exact:true}).fill('Security test fixture');
  await page.getByLabel('What should a traveller know?',{exact:true}).fill(payload);
  await page.getByRole('button',{name:'Save contribution',exact:true}).click();
  assert(await page.locator('.submission-list strong').textContent()===payload,'Contribution text changed');
  await page.reload();
  await page.locator('.sidebar').getByRole('button',{name:'Contribute',exact:true}).click();
  assert(await page.locator('.submission-list img').count()===0,'Injected HTML rendered');
  assert(!await page.evaluate(()=>window.__securityXss),'Stored script executed');
 });
 for(const [name,key,value,button] of [
  ['Malformed saved entries','saved',[null,{},5,{id:'bad',from:'__proto__',to:'college',fare:1,minutes:1}],'Saved journeys'],
  ['Malformed trusted contact','contact',{toString:null},'SOS'],
  ['Object contribution ID','submissions',[{id:{toString:null},type:'landmark',name:'test'}],'Contribute'],
  ['Malformed contribution entries','submissions',[null,{},5,{id:1,type:'landmark',name:{html:payload}}],'Contribute'],
 ]){
  await check(name,async(page,context)=>{
   await context.addInitScript(({key,value})=>localStorage.setItem(`localroute:${key}`,JSON.stringify(value)),{key,value});
   await page.goto(base);
   await page.locator('.sidebar').getByRole('button',{name:button,exact:true}).click();
   await page.waitForTimeout(150);
   assert(await page.locator('main').count()===1,'App crashed on poisoned storage');
  });
 }
 await check('Provider URL cannot be replaced via query parameters',async page=>{
  await page.goto(`${base}/?provider=javascript:alert(1)&url=https://example.invalid`);
  await page.getByRole('button',{name:'Need a ride instead?'}).click();
  const link=page.getByRole('link',{name:'Open Uber website'});
  assert(await link.getAttribute('href')==='https://m.uber.com/','Untrusted provider accepted');
  assert((await link.getAttribute('rel')).includes('noreferrer'),'External link lacks noreferrer');
 });
 await check('Local file exposure probes',async(page,context)=>{
  const probes=['/.env','/.env.local','/.git/config','/../package.json','/@fs/E:/LocalRoute/package.json'];
  const observations=[];
  for(const probe of probes){
   const response=await context.request.get(base+probe);
   const body=await response.text();
   observations.push({path:probe,status:response.status(),type:response.headers()['content-type']});
   assert(!body.includes('localroute-workspace'),'Workspace file exposed');
   assert(!body.includes('[core]'),'Git configuration exposed');
  }
  results.push({name:'HTTP probe observations',passed:true,observations});
 });
 await browser.close();
 const report={target:base,generatedAt:new Date().toISOString(),passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
 fs.writeFileSync(path.join(__dirname,`security-results-${new URL(base).port}.json`),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 process.exitCode=report.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
