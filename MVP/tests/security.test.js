import test from 'node:test';
import assert from 'node:assert/strict';
import {findRoutes,interpret,resolveLandmark} from '../src/engine.js';
import {bookingHandoff} from '../src/providers.js';
import {byId,links} from '../src/data.js';

const payloads=[
 '__proto__','constructor','toString','prototype',
 '<script>alert(1)</script>','<img src=x onerror=alert(1)>',
 'javascript:alert(1)','data:text/html,<script>alert(1)</script>',
 "' OR 1=1 --",'../../.env','%00','\u0000',
 '{"__proto__":{"polluted":true}}','(a+)+$','${7*7}',
];

test('malicious landmark and provider identifiers fail closed',()=>{
 for(const payload of payloads){
  assert.equal(resolveLandmark(payload),undefined);
  assert.deepEqual(findRoutes(payload,'college'),[]);
  assert.deepEqual(findRoutes('station',payload),[]);
  assert.equal(bookingHandoff(payload,byId.station,byId.college),null);
  const intent=interpret(payload);
  assert.ok(Object.hasOwn(byId,intent.from));
  assert.ok(Object.hasOwn(byId,intent.to));
 }
 assert.equal({}.polluted,undefined);
});

test('requests cannot inject graph edges or override provider URLs',()=>{
 const before=JSON.stringify(links);
 for(const payload of payloads){
  const intent=interpret(`station to college, ${payload}`);
  for(const route of findRoutes(intent.from,intent.to,intent.preference)){
   for(const edge of route.edges)assert.ok(links.some(link=>link.id===edge.id));
  }
  const handoff=bookingHandoff('uber',{name:payload},byId.college);
  assert.equal(handoff.url,'https://m.uber.com/');
 }
 assert.equal(JSON.stringify(links),before);
});
