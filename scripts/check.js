import {readdir,readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
async function walk(dir){let files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
for(const dir of ['src','scripts','site/js','tests'])for(const file of await walk(dir)){if(file.endsWith('.js')){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);}}
for(const dir of ['public','admin-pages','views'])for(const file of await walk(dir)){if(!file.endsWith('.html'))continue;const text=await readFile(file,'utf8');for(const match of text.matchAll(/(?:src|href)="(\/site\/[^"<>%]+)"/g)){const ref=match[1];if(!ref.includes('<%'))await access('.'+ref);}if(/data-favorite|data-cart|href="cart\.html"|site\/scripts\//.test(text))throw Error('Осталась старая логика: '+file);}
console.log('Синтаксис JavaScript и статические пути проверены.');
