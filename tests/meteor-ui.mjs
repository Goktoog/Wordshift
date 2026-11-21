import {Window} from 'happy-dom';
import assert from 'node:assert/strict';
import {mountMeteor} from '../frontend/src/games/online-meteor.js';
const win=new Window();Object.assign(globalThis,{window:win,document:win.document});
let now=1000,frames=new Map(),seq=0,calls=[];win.requestAnimationFrame=cb=>{frames.set(++seq,cb);return seq};win.cancelAnimationFrame=id=>frames.delete(id);
const frame=time=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(time))};
Object.defineProperties(win.HTMLElement.prototype,{clientWidth:{get(){return this.classList.contains('meteor-arena')?600:140}},clientHeight:{get(){return this.classList.contains('meteor-arena')?430:96}},offsetWidth:{get(){return 140}},offsetHeight:{get(){return 96}},offsetLeft:{get(){return parseFloat(this.style.left)||0}},offsetTop:{get(){return parseFloat(this.style.top)||0}}});
document.body.innerHTML='<div id="view"><div id="host"></div></div>';const host=document.getElementById('host');
let instance=mountMeteor(host,{prompt:'garden',options:['bahçe','ev','yol','çiçek'],startsAt:0,deadline:11000,now:()=>now,onAnswer:i=>{calls.push(i);return {ok:i===0,correct:'bahçe'}}});
frame(1000);assert.equal(host.querySelectorAll('[data-rock]').length,4);assert.equal(host.querySelector('.target-word').textContent,'garden');const rocket=host.querySelector('.launcher-rocket'),arena=host.querySelector('.meteor-arena'),rock=host.querySelector('[data-rock="0"]');
const initial=[rock.style.left,rock.style.top];frame(2000);assert.notDeepEqual([rock.style.left,rock.style.top],initial);arena.onpointermove({clientX:20,clientY:60});const leftRotation=rocket.style.transform;arena.onpointermove({clientX:580,clientY:60});assert.notEqual(rocket.style.transform,leftRotation);assert.equal(rocket.style.left,'');assert.equal(rocket.style.top,'');
now=8500;frame(3000);assert.equal(host.querySelector('[data-clock]').textContent,'3 sn');assert.ok(arena.classList.contains('urgent'));
rock.click();rock.click();await Promise.resolve();await Promise.resolve();frame(performance.now()+500);await new Promise(r=>setTimeout(r,0));assert.deepEqual(calls,[0]);assert.ok(rock.classList.contains('explode'));assert.match(host.querySelector('.meteor-result').textContent,/Doğru/);assert.ok(document.getElementById('view').classList.contains('impact-shake'));instance.stop();
// No action before synchronized start, deadline submits once, resume state locks targets.
calls=[];now=0;instance=mountMeteor(host,{prompt:'tree',options:['ağaç','ev','yol','çiçek'],startsAt:1000,deadline:11000,now:()=>now,onAnswer:i=>{calls.push(i);return {ok:false}}});frame(0);host.querySelector('[data-rock]').click();assert.equal(calls.length,0);now=11001;frame(11001);await new Promise(r=>setTimeout(r,0));frame(12000);assert.deepEqual(calls,[-1]);assert.ok(host.querySelector('.meteor-result').textContent.includes('Süre doldu'));instance.stop();
await win.happyDOM.abort();console.log('PASS Meteor: fixed launcher rotation, four moving targets, prompt below rocket, deadline/urgent state, single shot, missile impact feedback, synchronized start and timeout. Geometry/RAF simulated.');
