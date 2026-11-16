import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('Настройки запрещают некорректный порт и внешний bind в production',()=>{
 const env={...process.env,NODE_ENV:'production',APP_ORIGIN:'https://example.com',HOST:'127.0.0.1',PORT:'3108',SESSION_SECRET:'test-config-secret-'.repeat(4),MAP_TILE_URL:'https://tile.openstreetmap.org/{z}/{x}/{y}.png'};
 for(const extra of [{PORT:'0'},{PORT:'70000'},{PORT:'80.5'},{HOST:'0.0.0.0'},{APP_ORIGIN:'http://example.com'},{MAP_TILE_URL:'http://example.com/{z}/{x}/{y}.png'}]){const result=spawnSync(process.execPath,['--input-type=module','-e',"await import('./src/lib/config.js')"],{env:{...env,...extra},encoding:'utf8'});assert.notEqual(result.status,0,JSON.stringify(extra));}
 const valid=spawnSync(process.execPath,['--input-type=module','-e',"await import('./src/lib/config.js')"],{env,encoding:'utf8'});assert.equal(valid.status,0,valid.stderr);
});
