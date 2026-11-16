import {db} from '../lib/db.js';
import {config} from '../lib/config.js';
import {hash,cookieOptions,sessionCookie} from '../lib/security.js';
export async function authenticate(req,res,next){
 const raw=req.cookies?.[sessionCookie];
 if(typeof raw!=='string'||!/^[\w-]{43}$/.test(raw))return next();
 const session=await db.session.findUnique({where:{tokenHash:hash(raw)},include:{user:true}});
 const now=Date.now();
 if(!session||!session.user.active||session.user.role!=='OWNER'||session.expiresAt.getTime()<=now||session.lastUsedAt.getTime()+config.idleMs<=now){
  if(session)await db.session.deleteMany({where:{id:session.id}});res.clearCookie(sessionCookie,cookieOptions);return next();
 }
 req.auth=session;res.locals.owner=session.user;
 if(now-session.lastUsedAt.getTime()>60000)await db.session.updateMany({where:{id:session.id},data:{lastUsedAt:new Date()}});
 next();
}
export function requireOwner(req,res,next){if(req.auth)return next();if(req.originalUrl.startsWith('/api/'))return res.status(401).json({error:'Войдите в административную панель.'});res.redirect(303,'/admin/login');}
export function noStore(req,res,next){res.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});next();}
