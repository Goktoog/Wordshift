import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
function walk(p){return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)])}
for(const f of [...walk('frontend/src'),'backend/dev-server.js'].filter(f=>f.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',f],{stdio:'inherit'});if(r.status!==0)process.exit(1)}
console.log('JavaScript syntax checks passed.');
