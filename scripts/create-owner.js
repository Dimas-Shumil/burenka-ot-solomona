import 'dotenv/config';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {db} from '../src/lib/db.js';
import {normalizeLogin,isValidLogin} from '../src/lib/login.js';
import {hashPassword} from '../src/lib/security.js';
let silent=false;
const output=new Writable({write(chunk,encoding,callback){if(!silent)process.stdout.write(chunk,encoding);callback();}});
const rl=createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
async function question(text,{secret=false}={}){if(!secret)return rl.question(text);process.stdout.write(text);silent=true;try{return await rl.question('');}finally{silent=false;process.stdout.write('\n');}}
try{
 const name=(await question('Имя собственника: ')).trim();
 const login=normalizeLogin(await question('Email или логин: '));
 if(name.length<2||name.length>180)throw Error('Имя должно содержать от 2 до 180 символов. Кириллица разрешена.');
 if(!isValidLogin(login))throw Error('Введите корректную почту (до 254 символов) или логин из 3–60 символов: латиница, цифры, точка, дефис, подчёркивание.');
 const password=await question('Пароль (от 12 символов): ',{secret:true});const confirm=await question('Повторите пароль: ',{secret:true});
 if(password.length<12||password.length>256)throw Error('Пароль должен содержать от 12 до 256 символов.');
 if(password!==confirm)throw Error('Пароли не совпадают.');
 if(await db.user.findUnique({where:{login}}))throw Error('Этот логин уже существует. Скрипт не перезаписывает учётные записи.');
 if(await db.user.count())throw Error('Собственник уже создан. Для смены пароля используйте npm run owner:reset.');
 await db.user.create({data:{name,login,passwordHash:await hashPassword(password),role:'OWNER'}});
 console.log('Собственник создан. Вход: /admin');
}catch(e){console.error(e.code==='P2002'?'Такой логин уже существует.':e.message);process.exitCode=1;}finally{rl.close();await db.$disconnect();}
