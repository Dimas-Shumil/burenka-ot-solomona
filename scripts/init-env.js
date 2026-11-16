import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parse} from 'dotenv';
let text;
try {text=await readFile('.env','utf8');} catch(e) {if(e.code!=='ENOENT')throw e;text=await readFile('.env.example','utf8');}
const current=parse(text).SESSION_SECRET||'';
if(current.length<40||current.startsWith('CHANGE_ME')) {
 const line=`SESSION_SECRET=${randomBytes(48).toString('hex')}`;
 text=/^SESSION_SECRET=.*$/m.test(text)?text.replace(/^SESSION_SECRET=.*$/m,line):text+'\n'+line+'\n';
 await writeFile('.env',text,{mode:0o600});console.log('.env подготовлен, секрет сгенерирован.');
} else console.log('.env уже настроен; секрет сохранён.');
