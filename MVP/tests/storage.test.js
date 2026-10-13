import test from 'node:test';
import assert from 'node:assert/strict';
import {read,write} from '../src/storage.js';

test('storage rejects malformed types and filters invalid saved entries',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const values=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value),
 }});
 try{
  assert.equal(read('contact',''),'');
  write('contact',{number:'1234567'});
  assert.equal(read('contact',''),'');
  write('saved',[null,{}, {id:'route'}]);
  assert.deepEqual(read('saved',[],s=>s&&typeof s.id==='string'),[{id:'route'}]);
  values.set('localroute:saved','invalid JSON');
  assert.deepEqual(read('saved',[]),[]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Unavailable');}});
  assert.equal(read('contact',''),'');
  assert.equal(write('contact','1234567'),false);
 }finally{
  if(previous)Object.defineProperty(globalThis,'localStorage',previous);
  else delete globalThis.localStorage;
 }
});
