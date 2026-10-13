const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.FEATURE_BASE_URL || 'http://127.0.0.1:5178';

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const results=[];
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 async function check(name,run){
  const context=await browser.newContext();
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base);await page.locator('.route-card').first().waitFor();
   await run(page,context);
   assert(errors.length===0,errors.join('; '));
   results.push({name,status:'passed'});
  }catch(e){results.push({name,status:'failed',error:e.message,errors});}
  finally{await context.close();}
 }
 const close=page=>page.getByLabel('Close dialog').click();
 const contribute=page=>page.locator('.sidebar').getByRole('button',{name:'Contribute',exact:true}).click();
 const toolkit=page=>page.locator('.sidebar').getByRole('button',{name:'SOS',exact:true}).click();
 await check('Search by aliases, swap endpoints, reject invalid and identical places',async page=>{
  await page.locator('#origin').fill('station');await page.locator('#destination').fill('hospital');
  await page.getByRole('button',{name:'Find my route',exact:true}).click();
  assert((await page.locator('.results-heading').textContent()).includes('District Hospital'),'Search failed');
  await page.getByLabel('Swap origin and destination').click();
  await page.getByRole('button',{name:'Find my route',exact:true}).click();
  assert((await page.locator('.results-heading p').textContent()).startsWith('District Hospital'),'Swap failed');
  await page.locator('#destination').fill('unknown');await page.getByRole('button',{name:'Find my route',exact:true}).click();
  assert(await page.getByRole('alert').count()===1,'Unknown place accepted');
  await page.locator('#destination').fill('hospital');await page.getByRole('button',{name:'Find my route',exact:true}).click();
  assert((await page.getByRole('alert').textContent()).includes('already there'),'Identical endpoints accepted');
 });
 await check('All five route preferences and estimates',async page=>{
  for(const [label,fare] of [['Best match',null],['Cheapest','₹18'],['Fewer changes','₹40'],['Less walking','₹40'],['Late travel','₹40']]){
   const button=page.getByRole('button',{name:label,exact:true});await button.click();
   assert(await button.getAttribute('aria-pressed')==='true','Preference not selected');
   assert(await page.locator('.route-card').count()>0,'No routes');
   if(fare)assert((await page.locator('.route-card .route-stats strong').first().textContent()).startsWith(fare),'Unexpected fare');
  }
  assert(await page.locator('.late-notice').count()===1,'Late notice missing');
 });
 await check('Journey details, route selection, map highlight and zoom',async page=>{
  const card=page.locator('.route-card').nth(1);await card.locator('.route-select').click();
  assert((await card.getAttribute('class')).includes('selected'),'Selection failed');
  const button=card.getByRole('button',{name:'View steps'});await button.click();
  assert(await card.locator('.steps li').count()>1,'Steps missing');
  await card.getByRole('button',{name:'Hide steps'}).click();
  const map=page.locator('.town-map > g');const before=await map.getAttribute('transform');
  await page.getByLabel('Zoom in').click();assert(await map.getAttribute('transform')!==before,'Zoom failed');
  await page.getByLabel('Zoom out').click();assert(await map.getAttribute('transform')===before,'Zoom out failed');
 });
 await check('Typed intent, mixed-language aliases, unknown request and assistance',async page=>{
  for(const request of ['Station to FM College, cheapest','Balasore station ru FM College kemiti jibi?']){
   await page.getByLabel('Natural-language route request').fill(request);
   await page.getByLabel('Find a route from your request').click();
   assert((await page.locator('.assistant-result').textContent()).includes('FM College'),'Intent failed');
  }
  await page.getByLabel('Natural-language route request').fill('hello there');await page.getByLabel('Find a route from your request').click();
  assert((await page.locator('.assistant-result').textContent()).includes('couldn’t'),'Unknown request not handled');
  await page.getByLabel('Natural-language route request').fill('I missed my stop');await page.getByLabel('Find a route from your request').click();
  assert(await page.getByRole('dialog').count()===1,'Assistance did not open trip');
 });
 await check('Save, persist, reopen and remove a journey',async page=>{
  await page.getByRole('button',{name:'Cheapest',exact:true}).click();
  await page.getByLabel('Save route',{exact:true}).first().click();
  await page.reload();await page.locator('.sidebar').getByRole('button',{name:/Saved journeys/}).click();
  assert(await page.locator('.saved-card').count()===1,'Saved journey missing after reload');
  await page.getByRole('button',{name:'Open',exact:true}).click();
  assert((await page.locator('.route-card.selected .route-stats strong').textContent()).startsWith('₹18'),'Saved selection not restored');
  await page.locator('.sidebar').getByRole('button',{name:/Saved journeys/}).click();
  await page.getByLabel('Remove saved journey').click();assert(await page.locator('.saved-card').count()===0,'Removal failed');
 });
 await check('Manual guidance and arrival',async page=>{
  await page.getByRole('button',{name:'Let’s go'}).first().click();
  let steps=0;
  while(await page.getByRole('button',{name:/^I reached/}).count()){
   assert(++steps<=6,'Trip did not finish');await page.getByRole('button',{name:/^I reached/}).click();
  }
  assert(await page.locator('.arrival').count()===1,'Arrival missing');await page.getByRole('button',{name:'Finish trip'}).click();
  assert(await page.getByRole('dialog').count()===0,'Finish did not close trip');
 });
 await check('Missed-stop recovery and destination arrival recovery',async page=>{
  await page.getByRole('button',{name:'Let’s go'}).first().click();await page.getByRole('button',{name:'Missed my stop'}).click();
  await page.getByLabel('Where are you now?').selectOption('hospital');await page.getByRole('button',{name:'Find onward routes'}).click();
  assert((await page.locator('.recovery').textContent()).includes('Suggested route'),'No onward route');
  await page.getByRole('button',{name:'Continue with this route'}).click();
  assert((await page.locator('.current-step').textContent()).includes('District Hospital'),'New starting point missing');
  await page.getByRole('button',{name:'Missed my stop'}).click();await page.getByLabel('Where are you now?').selectOption('college');
  await page.getByRole('button',{name:'Find onward routes'}).click();await page.getByRole('button',{name:'Continue with this route'}).click();
  assert(await page.locator('.arrival').count()===1,'Recovery arrival missing');
 });
 await check('Route and landmark contributions persist and can be removed',async page=>{
  await contribute(page);const dialog=page.getByRole('dialog');
  await dialog.getByLabel('From',{exact:true}).fill('Test pickup');await dialog.getByLabel('To',{exact:true}).fill('Test dropoff');
  await dialog.getByLabel('Approx. fare (₹)').fill('20');await dialog.getByLabel('What should a traveller know?').fill('Test route');
  await dialog.getByRole('button',{name:'Save contribution'}).click();
  await dialog.getByRole('button',{name:'Add a landmark',exact:true}).click();
  await dialog.getByLabel('Landmark name').fill('Test landmark');await dialog.getByLabel('Location description').fill('Test location');
  await dialog.getByLabel('What should a traveller know?').fill('Test notes');await dialog.getByRole('button',{name:'Save contribution'}).click();
  await page.reload();await contribute(page);assert(await page.locator('.submission-list strong').count()===2,'Contributions missing');
  const statuses=await page.evaluate(()=>JSON.parse(localStorage.getItem('localroute:submissions')).map(s=>s.status));
  assert(statuses.every(s=>s==='Pending review'),'Incorrect status');
  await page.getByLabel(/Remove contribution/).first().click();assert(await page.locator('.submission-list strong').count()===1,'Remove failed');
 });
 await check('Trusted contact persistence and dialer link',async page=>{
  await toolkit(page);await page.getByLabel('Trusted contact phone number').fill('+91 0000000000');
  await page.getByRole('button',{name:'Save contact',exact:true}).click();await page.reload();await toolkit(page);
  assert(await page.getByLabel('Trusted contact phone number').inputValue()==='+91 0000000000','Contact not persisted');
  assert(await page.getByRole('link',{name:/Call your trusted contact/}).getAttribute('href')==='tel:+910000000000','Dialer URL wrong');
 });
 await check('Share text fallback',async page=>{
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}});
  });
  await page.getByLabel('Share trip plan').click();
  assert((await page.getByLabel('Trip plan to copy').inputValue()).includes('FM College'),'Share fallback missing');
 });
 await check('Clipboard adapter and provider handoff',async page=>{
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
  });
  await page.getByLabel('Share trip plan').click();assert((await page.evaluate(()=>window.__copied)).includes('?from=station&to=college'),'Share URL missing');
  await page.getByRole('button',{name:'Need a ride instead?'}).click();await page.getByRole('button',{name:'Copy pickup & destination'}).click();
  assert((await page.evaluate(()=>window.__copied)).includes('Balasore Railway Station'),'Pickup copy failed');
  assert(await page.getByRole('link',{name:'Open Uber website'}).getAttribute('href')==='https://m.uber.com/','Provider link wrong');
 });
 await check('Shared-link endpoint restoration',async page=>{
  await page.goto(base+'/?from=hospital&to=park');
  assert(await page.locator('#origin').inputValue()==='District Hospital','Origin not restored');
  assert(await page.locator('#destination').inputValue()==='Town Park','Destination not restored');
 });
 await check('Voice unsupported and permission-denied fallback handling',async page=>{
  await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
  await page.getByLabel('Speak a route request').click();assert((await page.locator('.toast').textContent()).includes('isn’t available'),'Unsupported fallback missing');
  await page.evaluate(()=>{window.SpeechRecognition=class{start(){this.onerror({error:'not-allowed'});}};});
  await page.getByLabel('Speak a route request').click();assert((await page.locator('.toast').textContent()).includes('denied'),'Permission fallback missing');
 });
 await check('Speech guidance adapter',async page=>{
  await page.evaluate(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(u){window.__spoken=u.text;}}});});
  await page.getByRole('button',{name:'Let’s go'}).first().click();await page.getByRole('button',{name:'Read aloud'}).click();
  assert((await page.evaluate(()=>window.__spoken)).includes('Balasore Railway Station'),'Speech instructions missing');
 });
 await check('Mobile layout and navigation',async page=>{
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
  const nav=page.getByRole('navigation',{name:'Mobile navigation'});
  await nav.getByRole('button',{name:'Saved',exact:true}).click();assert(await page.locator('.saved-section').count()===1,'Mobile saved failed');
  await nav.getByRole('button',{name:'Contribute',exact:true}).click();assert(await page.getByRole('dialog').count()===1,'Mobile contribution failed');
  await close(page);await nav.getByRole('button',{name:'SOS',exact:true}).click();assert(await page.locator('.safety-hero').count()===1,'Mobile safety failed');
  await close(page);await nav.getByRole('button',{name:'Explore',exact:true}).click();assert(await page.locator('.planner').count()===1,'Mobile explore failed');
 });
 await check('Dialog focus, Escape and backdrop dismissal',async page=>{
  await contribute(page);assert(await page.evaluate(()=>document.activeElement.getAttribute('role'))==='dialog','Dialog not focused');
  await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement.getAttribute('aria-label'))==='Close dialog','Tab focus wrong');
  await page.keyboard.press('Escape');assert(await page.getByRole('dialog').count()===0,'Escape failed');
  await contribute(page);await page.locator('.overlay').click({position:{x:3,y:3}});assert(await page.getByRole('dialog').count()===0,'Backdrop failed');
 });
 await browser.close();
 const report={target:base,generatedAt:new Date().toISOString(),passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results,
 limitations:['Microphone transcription, audible speech, native share targets, OS dialer and actual Uber booking were not exercised. Browser API adapters used mocks where identified.','Transport results use demo fixtures.','VS Code debugger launch was not exercised.']};
 fs.writeFileSync(path.join(__dirname,'feature-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
