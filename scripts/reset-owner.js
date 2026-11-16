import 'dotenv/config';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {db} from '../src/lib/db.js';
import {normalizeLogin} from '../src/lib/login.js';
import {hashPassword} from '../src/lib/security.js';
let silent=false;
const output=new Writable({write(chunk,encoding,callback){if(!silent)process.stdout.write(chunk,encoding);callback();}});
const rl=createInterface({input:process.stdin,output,terminal:!!process.stdin.isTTY});
async function secret(label){process.stdout.write(label);silent=true;try{return await rl.question('');}finally{silent=false;process.stdout.write('\n');}}
try{const login=normalizeLogin(await rl.question('Email или логин собственника: '));const user=await db.user.findUnique({where:{login}});if(!user)throw Error('Собственник не найден');const a=await secret('Новый пароль (12–256 символов): '),b=await secret('Повторите пароль: ');if(a.length<12||a.length>256||a!==b)throw Error('Проверьте длину и совпадение паролей');const passwordHash=await hashPassword(a);await db.$transaction([db.user.update({where:{id:user.id},data:{passwordHash}}),db.session.deleteMany({where:{userId:user.id}})]);console.log('Пароль изменён. Все сессии отозваны.');}catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();await db.$disconnect();}
