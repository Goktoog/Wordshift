import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto=webcrypto;
// Minimal DOM stand-in for module loading, state transitions, and local storage.
// This is not a substitute for real browser UI tests.
const els = new Map();
const elem = id => {
  if (!els.has(id)) els.set(id, {id,hidden:false,style:{},dataset:{},value:'',showModal(){this.open=true},close(){this.open=false},innerHTML:'',classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},querySelector(){return this},append(){},setAttribute(){},insertAdjacentHTML(){}});
  return els.get(id);
};
globalThis.confirm=()=>true;globalThis.history={replaceState(){},pushState(){}};globalThis.window={location:{href:'http://localhost/'},setInterval(){return 0},clearInterval(){},addEventListener(){}};
globalThis.document={createElement:elem,getElementById:elem,querySelector:elem,querySelectorAll(){return []},body:{dataset:{}}};
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
await import('../frontend/src/main.js');
elem('guest').onclick();
const state=await import('../frontend/src/core/state.js');
const {go}=await import('../frontend/src/core/router.js');
const {begin}=await import('../frontend/src/features/session.js');
assert.equal(state.user.name,'Misafir');
const set=(await import('../frontend/src/features/starters.js')).starterSets[0];
go('sets'); go('starter',set.id);
begin('cards',set); elem('flip').onclick(); elem('know').onclick();
assert.equal(state.user.stats.correct,1);
assert.equal(storage.has('wordshift-v1'),false);
go('games'); begin('battle',set); go('leaderboard'); go('profile');
console.log('Module and local state smoke tests passed.');
