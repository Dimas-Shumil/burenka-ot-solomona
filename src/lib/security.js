import {randomBytes,createHash,createHmac,scrypt as scryptCb,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {config} from './config.js';
const scrypt=promisify(scryptCb);
export const hash=v=>createHash('sha256').update(v).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export const mac=v=>createHmac('sha256',config.secret).update(v).digest('base64url');
export function equal(a,b){return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const h=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `scrypt$${salt}$${h.toString('hex')}`;}
export async function verifyPassword(password,stored){try{const [algo,salt,h]=stored.split('$');if(algo!=='scrypt'||!salt||!h)return false;const v=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return equal(v.toString('hex'),h);}catch{return false;}}
export const cookieOptions={httpOnly:true,secure:config.prod,sameSite:'lax',path:'/'};
export const sessionCookie=config.prod?'__Host-burenka':'burenka_sid';
export const csrfCookie=config.prod?'__Host-burenka-csrf':'burenka_csrf';
export function csrfToken(req,res,next){let nonce=req.cookies?.[csrfCookie];if(typeof nonce!=='string'||!/^[\w-]{43}$/.test(nonce)){nonce=token();res.cookie(csrfCookie,nonce,{...cookieOptions,maxAge:86400000});}req.csrf=mac(`csrf:${nonce}`);res.locals.csrf=req.csrf;next();}
export function csrfCheck(req,res,next){const origin=req.get('origin');if(origin&&origin!==config.origin)return res.status(403).json({error:'Недопустимый источник запроса.'});if(!equal(req.get('x-csrf-token')||req.body?._csrf,req.csrf))return res.status(403).json({error:'Обновите страницу и повторите действие.'});next();}
export function safeLink(value){return !value||(/^\/(?!\/)/.test(value)&&!/[\\\r\n]/.test(value))||/^https:\/\//.test(value);}
