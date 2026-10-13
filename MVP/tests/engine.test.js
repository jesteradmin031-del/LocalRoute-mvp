import test from 'node:test';
import assert from 'node:assert/strict';
import {findRoutes,interpret,resolveLandmark,summarize,recoveryRoutes} from '../src/engine.js';
import {landmarks,links,byId} from '../src/data.js';
test('inherited object keys are not landmark IDs',()=>{
 for(const id of ['constructor','toString','__proto__']){
  assert.equal(byId[id],undefined);
  assert.deepEqual(findRoutes(id,'college'),[]);
 }
});
test('landmark aliases match whole words, not fragments of unknown places',()=>{
 assert.equal(interpret('station to parking').recognized,false);
 assert.equal(interpret('station to exhibition').recognized,false);
 assert.equal(interpret('station to town park').to,'park');
 assert.equal(interpret('Station to FM College, cheapest').to,'college');
});
test('walking preferences do not imply fewer transfers',()=>{
 for(const phrase of ['fewer walking steps','less walking','least walking']){
  assert.equal(interpret(phrase).preference,'walking');
 }
 assert.equal(interpret('fewer transfers').preference,'transfers');
});
test('fixture graph has valid references, nonnegative weights and review metadata',()=>{
 assert.equal(new Set(landmarks.map(l=>l.id)).size,landmarks.length);
 assert.equal(new Set(links.map(l=>l.id)).size,links.length);
 for(const l of links){assert.ok(byId[l.from]&&byId[l.to]);for(const k of ['fare','walk','minutes'])assert.ok(Number.isFinite(l[k])&&l[k]>=0);assert.equal(l.confidence,'demo-reviewed');assert.ok(l.lastConfirmed);}
});
test('all emitted journeys consist solely of connected fixture links',()=>{
 for(const a of landmarks)for(const b of landmarks){
  const rs=findRoutes(a.id,b.id);
  for(const r of rs){assert.equal(r.edges[0].from,a.id);assert.equal(r.edges.at(-1).to,b.id);const seen=new Set([a.id]);for(const [i,e]of r.edges.entries()){assert.ok(links.some(l=>l.id===e.id));if(i)assert.equal(r.edges[i-1].to,e.from);assert.ok(!seen.has(e.to));seen.add(e.to);}assert.equal(r.fare,r.legs.reduce((s,l)=>s+l.fare,0));assert.equal(r.walk,r.legs.reduce((s,l)=>s+l.walk,0));}
 }
});
test('cheapest route keeps bus fare increments and merges same vehicle service',()=>{
 const r=findRoutes('station','college','cheapest')[0];assert.equal(r.fare,18);assert.equal(r.transfers,0);assert.equal(r.legs.length,1);assert.equal(r.legs[0].mode,'bus');assert.equal(r.walk,460);
});
test('fewer changes and minimum walking favor direct auto',()=>{for(const p of ['transfers','walking']){const r=findRoutes('station','college',p)[0];assert.equal(r.fare,40);assert.equal(r.transfers,0);assert.equal(r.walk,80);}});
test('late preference avoids earlier bus service for sample journey',()=>{const r=findRoutes('station','college','late')[0];assert.ok(r.until>=22);assert.ok(r.connected);assert.equal(r.transfers,0);});
test('unknown and identical places produce no invented route',()=>{assert.deepEqual(findRoutes('airport','college'),[]);assert.deepEqual(findRoutes('station','station'),[]);assert.equal(resolveLandmark('Not mapped'),undefined);});
test('mixed language landmarks and preference extraction are deterministic',()=>{const r=interpret('Bhai, station se FM college jaana hai, cheapest way batao.');assert.equal(r.from,'station');assert.equal(r.to,'college');assert.equal(r.preference,'cheapest');assert.equal(interpret('Balasore station ru FM College kemiti jibi?').to,'college');assert.equal(interpret('fewer transfers and less walking late at night').preference,'late');assert.equal(interpret('hello there').recognized,false);});
test('single destination preserves origin and assistance has explicit signal',()=>{assert.equal(interpret('Take me to hospital','station','college').to,'hospital');assert.equal(interpret('I missed my stop').assistance,true);});
test('explicit clauses handle reversed mention order and reject unknown places',()=>{const r=interpret('To FM College from Station, cheapest');assert.equal(r.from,'station');assert.equal(r.to,'college');assert.equal(interpret('Station to airport, cheapest').recognized,false);assert.equal(interpret('from unknown village to FM College').recognized,false);});
test('replanning uses selected known landmark and supports arrival',()=>{assert.equal(recoveryRoutes('hospital','college','cheapest')[0].edges[0].from,'hospital');assert.deepEqual(recoveryRoutes('college','college','balanced'),[]);});
test('walking between rides does not erase a vehicle change',()=>{const r=summarize([{mode:'auto',service:'A',to:'a',fare:10,minutes:5,walk:0,until:22,connected:true},{mode:'walk',service:'Walk',to:'b',fare:0,minutes:2,walk:100,until:24,connected:false},{mode:'bus',service:'B',to:'c',fare:8,minutes:5,walk:0,until:20,connected:true}]);assert.equal(r.transfers,1);assert.equal(r.fare,18);assert.equal(r.until,20);});
