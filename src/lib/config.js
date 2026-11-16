import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const prod=process.env.NODE_ENV==='production';
const originUrl=new URL(process.env.APP_ORIGIN||'http://localhost:3000');
if(!['http:','https:'].includes(originUrl.protocol)||originUrl.username||originUrl.password)throw new Error('APP_ORIGIN должен быть HTTP/HTTPS-адресом без пароля.');
const origin=originUrl.origin;
const host=process.env.HOST||'127.0.0.1';
if(prod&&!['127.0.0.1','::1','localhost'].includes(host))throw new Error('В production HOST должен быть loopback: 127.0.0.1 или ::1. Внешний доступ — через nginx.');
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT должен быть целым числом от 1 до 65535.');
const tileUrl=process.env.MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
if(new URL(tileUrl).protocol!=='https:')throw new Error('MAP_TILE_URL должен использовать HTTPS.');
const secret=process.env.SESSION_SECRET||'';
if(secret.length<40||secret.startsWith('CHANGE_ME'))throw new Error('Запустите npm run env:init: SESSION_SECRET должен содержать не менее 40 символов.');
if(prod&&!origin.startsWith('https://'))throw new Error('Production требует HTTPS в APP_ORIGIN');
function positive(v,d){const n=Number(v??d);if(!Number.isFinite(n)||n<=0)throw new Error('Некорректный срок сессии');return n;}
export const config={prod,origin,secret,host,port,
 sessionMs:positive(process.env.SESSION_HOURS,12)*3600000,idleMs:positive(process.env.SESSION_IDLE_MINUTES,60)*60000,
 trustProxy:process.env.TRUST_PROXY==='loopback'?'loopback':false,indexable:process.env.SEO_INDEXABLE==='true',
 tileUrl,attribution:process.env.MAP_ATTRIBUTION||'© OpenStreetMap contributors'};
