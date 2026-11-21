import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {shipCells,canPlace} from '../frontend/src/games/fleet-layout.js';
assert.deepEqual(shipCells(0,3,true),[0,5,10]);
assert.equal(shipCells(4,3,false),null);
assert.equal(shipCells(20,2,true),null);
assert.ok(canPlace([{cells:[0,1,2]},{cells:[8,9]}],0,[0,5,10]));
assert.equal(canPlace([{cells:[0,5,10]},{cells:[1,2]}],0,[0,1,2]),false);
const code=readFileSync(new URL('../frontend/src/games/runner.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function runner','function runner');
function game(){
 let now=0,callback,answer,records=[];
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id)){const classes=new Set();nodes.set(id,{clientWidth:700,style:{},hidden:true,textContent:'',innerHTML:'',classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x)}})}return nodes.get(id)};
 const ctx={session:{lives:3,i:0,pool:[{front:'a',back:'b'},{front:'c',back:'d'}],action:'jump',distance:0,score:0,difficulty:'normal'},page:'play',timer:null,$:node,escape:s=>s,performance:{now:()=>now},countdownBeep:()=>{},record:(x,ok)=>records.push(ok),finish:()=>{},topStudy:()=>'',exitBind:()=>{},answerMarkup:()=>'',bindAnswer:(x,fn)=>answer=fn,equal:(a,b)=>a===b,setInterval:fn=>{callback=fn;return 1},clearInterval:()=>{},setTimer:id=>ctx.timer=id};
 vm.createContext(ctx);vm.runInContext(code+';runner()',ctx);
 return {ctx,node,records,step:ms=>{now+=ms;callback()},answer:v=>answer(v)};
}
let g=game();g.step(2399);assert.equal(g.node('runQuestion').hidden,true);g.step(1);assert.equal(g.node('runQuestion').hidden,false);assert.equal(g.node('gateTime').textContent,'10 sn');
const stop=g.node('runObstacle').style.left;g.step(9000);assert.equal(g.node('runObstacle').style.left,stop);g.answer('b');assert.deepEqual(g.records,[true]);assert.equal(g.ctx.session.distance,100);assert.ok(g.node('runner').classList.contains('jump'));g.answer('b');assert.equal(g.records.length,1);
g=game();g.step(2400);g.step(10000);assert.deepEqual(g.records,[false]);assert.equal(g.ctx.session.lives,2);g.step(250);assert.ok(g.node('runner').classList.contains('crash'));g.step(500);assert.ok(g.node('runner').classList.contains('respawning'));
g=game();g.ctx.page='home';g.step(20000);assert.equal(g.records.length,0);
console.log('PASS: fleet bounds/rotation/overlap; approach before question; paused obstacle; 10-second timeout; jump success; duplicate-answer guard; crash/respawn; exit guard.');
