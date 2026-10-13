import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingHandoff} from '../src/providers.js';
import {byId} from '../src/data.js';
test('booking adapter uses generic HTTPS provider URL with manual destination entry',()=>{const h=bookingHandoff('uber',byId.station,byId.college);assert.equal(h.url,'https://m.uber.com/');assert.equal(h.prefilled,false);assert.match(h.clipboardText,/FM College/);});
test('unknown provider or missing places cannot generate a handoff',()=>{assert.equal(bookingHandoff('invented',byId.station,byId.college),null);assert.equal(bookingHandoff('uber',undefined,byId.college),null);});
