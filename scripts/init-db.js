import 'dotenv/config';
import {DatabaseSync} from 'node:sqlite';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const url=process.env.DATABASE_URL||'file:./dev.db';
if(!url.startsWith('file:'))throw Error('DATABASE_URL должен использовать file: для SQLite');
const file=path.resolve('prisma',url.slice(5));await mkdir(path.dirname(file),{recursive:true});
const sqlite=new DatabaseSync(file);sqlite.exec('PRAGMA journal_mode = DELETE;');sqlite.close();
console.log('SQLite подготовлена. Данные не изменены.');
