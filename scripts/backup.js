import 'dotenv/config';
import {DatabaseSync} from 'node:sqlite';
import {mkdir,cp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../src/lib/config.js';
const url=process.env.DATABASE_URL||'file:./dev.db';
if(!url.startsWith('file:'))throw Error('Поддерживается только SQLite file:');
const dbPath=path.resolve(root,'prisma',url.slice(5));
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const dest=path.join(root,'backups',stamp);await mkdir(dest,{recursive:true});
const sqlite=new DatabaseSync(dbPath,{readOnly:true});
try{sqlite.prepare('VACUUM INTO ?').run(path.join(dest,'database.db'));}finally{sqlite.close();}
await cp(path.join(root,'uploads'),path.join(dest,'uploads'),{recursive:true});
await writeFile(path.join(dest,'backup.json'),JSON.stringify({createdAt:new Date().toISOString(),database:'database.db',media:'uploads',version:1},null,2));
console.log('Резервная копия: '+dest);
