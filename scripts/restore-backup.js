import 'dotenv/config';
import {DatabaseSync} from 'node:sqlite';
import {cp,readFile,access,rm} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../src/lib/config.js';
const source=process.argv[2];
if(!source||!process.argv.includes('--confirm-offline'))throw Error('Остановите приложение. Запуск: node scripts/restore-backup.js ПУТЬ --confirm-offline');
const dir=path.resolve(source),manifest=JSON.parse(await readFile(path.join(dir,'backup.json'),'utf8'));
if(manifest.version!==1)throw Error('Неизвестный формат резервной копии');
const database=path.join(dir,'database.db');await access(database);
const sqlite=new DatabaseSync(database,{readOnly:true});try{if(sqlite.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Резервная база повреждена');}finally{sqlite.close();}
const target=path.resolve(root,'prisma',(process.env.DATABASE_URL||'file:./dev.db').slice(5));
for(const suffix of ['-wal','-shm','-journal'])await rm(target+suffix,{force:true});
await cp(database,target);const restored=new DatabaseSync(target);try{if(restored.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Session'").get())restored.exec('DELETE FROM Session');}finally{restored.close();}
await cp(path.join(dir,'uploads'),path.join(root,'uploads'),{recursive:true});
console.log('База и медиа восстановлены. Перед запуском примените миграции.');
