import {Router} from 'express';
import {rateLimit} from 'express-rate-limit';
import {normalizeLogin,isValidLogin} from '../lib/login.js';
import {db} from '../lib/db.js';
import {config} from '../lib/config.js';
import {token,hash,verifyPassword,cookieOptions,sessionCookie,csrfCheck} from '../lib/security.js';
import {requireOwner,noStore} from '../middleware/auth.js';
const router=Router();
const limiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,skipSuccessfulRequests:true,message:{error:'Слишком много попыток. Повторите через 15 минут.'}});
router.get('/admin/login',noStore,(req,res)=>req.auth?res.redirect('/admin/'):res.render('admin-pages/login.html',{title:'Вход в панель'}));
router.post('/api/auth/login',noStore,limiter,csrfCheck,async(req,res)=>{
 const login=normalizeLogin(req.body?.login);
 const password=typeof req.body?.password==='string'?req.body?.password:'';
 if(!isValidLogin(login)||password.length>256)return res.status(422).json({error:'Некорректные данные.'});
 const user=await db.user.findUnique({where:{login}});
 // Вычисление scrypt выполняется и для неизвестного логина.
 const dummy='scrypt$00000000000000000000000000000000$'+'0'.repeat(128);
 const valid=await verifyPassword(password,user?.passwordHash||dummy);
 if(!valid||!user?.active||user.role!=='OWNER')return res.status(401).json({error:'Неверный логин или пароль.'});
 const raw=token(),now=new Date();
 await db.$transaction(async tx=>{
  await tx.session.deleteMany({where:{OR:[{expiresAt:{lte:now}},{lastUsedAt:{lt:new Date(Date.now()-config.idleMs)}}]}});
  if(req.auth)await tx.session.deleteMany({where:{id:req.auth.id}});
  const old=await tx.session.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'},skip:4});
  if(old.length)await tx.session.deleteMany({where:{id:{in:old.map(x=>x.id)}}});
  await tx.session.create({data:{tokenHash:hash(raw),userId:user.id,expiresAt:new Date(Date.now()+config.sessionMs)}});
 });
 res.cookie(sessionCookie,raw,{...cookieOptions,maxAge:config.sessionMs});res.json({ok:true,redirect:'/admin/'});
});
router.get('/api/auth/session',noStore,requireOwner,(req,res)=>res.json({csrf:req.csrf}));
router.post('/api/auth/logout',noStore,requireOwner,csrfCheck,async(req,res)=>{await db.session.deleteMany({where:{id:req.auth.id}});res.clearCookie(sessionCookie,cookieOptions);res.json({ok:true});});
export default router;
