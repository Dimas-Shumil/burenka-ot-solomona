import express from 'express';
import ejs from 'ejs';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {db} from './lib/db.js';
import {root,config} from './lib/config.js';
import {icon} from '../site/js/icons.js';
import {asset,assetVersion} from './lib/assets.js';
import {csrfToken} from './lib/security.js';
import {authenticate} from './middleware/auth.js';
import {imageOf,priceOf} from './services/catalog.js';
import auth from './routes/auth.js';
import admin from './routes/admin.js';
import publicRoutes from './routes/public.js';
export const app=express();
app.disable('x-powered-by');app.set('trust proxy',config.trustProxy);app.engine('html',ejs.renderFile);app.set('view engine','html');app.set('views',root);
const tileOrigin=new URL(config.tileUrl).origin;
app.use(helmet({strictTransportSecurity:config.prod?undefined:false,contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:',tileOrigin],connectSrc:["'self'"],frameSrc:["'none'"],frameAncestors:["'none'"],fontSrc:["'self'"],objectSrc:["'none'"],baseUri:["'self'"],formAction:["'self'"],upgradeInsecureRequests:config.prod?[]:null}},referrerPolicy:{policy:'strict-origin-when-cross-origin'}}));
app.use((req,res,next)=>{req.requestId=randomUUID();res.set('X-Request-ID',req.requestId);next();});
app.get('/health/live',(req,res)=>res.json({status:'ok'}));
app.get('/health/ready',async(req,res)=>{try{await db.$queryRaw`SELECT 1`;await db.siteSettings.count();res.json({status:'ready'});}catch{res.status(503).json({status:'not-ready'});}});
// Статика: явный allow-list. HTML, исходники SCSS и корень никогда не раздаются.
for(const dir of ['css','dist','img','icons','vendor','fonts'])app.use('/site/'+dir,express.static(path.join(root,'site',dir),{index:false,dotfiles:'deny',maxAge:config.prod?'1d':0}));
app.use('/uploads',express.static(path.join(root,'uploads'),{index:false,dotfiles:'deny',maxAge:'7d',setHeaders(res){res.set('X-Content-Type-Options','nosniff');}}));
app.get('/admin/manifest.webmanifest',(req,res)=>res.set({'Cache-Control':'no-cache','X-Robots-Tag':'noindex, nofollow'}).type('application/manifest+json').send({id:'/admin/',name:'Бурёнка — управление',short_name:'Бурёнка',start_url:'/admin/',scope:'/admin/',display:'standalone',background_color:'#faf6ed',theme_color:'#286e2b',icons:[{src:asset('/site/icons/admin-192.png'),sizes:'192x192',type:'image/png',purpose:'any'},{src:asset('/site/icons/admin-512.png'),sizes:'512x512',type:'image/png',purpose:'any'},{src:asset('/site/icons/admin-maskable.png'),sizes:'512x512',type:'image/png',purpose:'maskable'}]}));
app.get('/admin/sw.js',(req,res)=>{res.set({'Cache-Control':'no-cache','Service-Worker-Allowed':'/admin/'});res.type('application/javascript').sendFile(path.join(root,'site/js/admin/sw.js'));});
app.use((req,res,next)=>{res.set({'X-Frame-Options':'DENY','Permissions-Policy':'geolocation=(self), camera=(), microphone=(), payment=()'});next();});
app.use(express.json({limit:'200kb'}),express.urlencoded({extended:false,limit:'200kb'}),cookieParser(),csrfToken,authenticate);
app.locals.assetVersion=assetVersion;app.locals.icon=icon;app.locals.asset=asset;app.locals.imageOf=imageOf;app.locals.priceOf=priceOf;
app.locals.date=v=>v?new Date(v).toLocaleDateString('ru-RU',{timeZone:'Asia/Krasnoyarsk'}):'';
app.locals.json=v=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
app.locals.origin=config.origin;app.locals.year=new Date().getFullYear();app.locals.owner=null;
app.locals.currentPath='/';app.locals.settings={name:'Бурёнка от SOLOMONA',description:'Фермерская молочная продукция'};app.locals.canonical=config.origin;app.locals.indexable=false;app.locals.csrf='';
app.locals.routeFor=s=>s.mapUrl||`https://yandex.ru/maps/?rtext=~${s.latitude},${s.longitude}&rtt=auto`;
app.use(auth,admin,publicRoutes);
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Не найдено'});res.locals.indexable=false;res.status(404).render('public/error.html',{title:'Страница не найдена',description:'Страница не найдена',status:404,message:'Возможно, ссылка устарела. Перейдите в каталог или на главную.'});});
app.use((err,req,res,next)=>{
 console.error(JSON.stringify({requestId:req.requestId,code:err.code||err.name,status:err.status||500}));
 let status=err.status||400,message=err.message;
 if(err.type==='entity.parse.failed'){status=400;message='Некорректный формат JSON.';}
 else if(err.type==='entity.too.large'){status=413;message='Запрос превышает допустимый размер.';}
 if(err.code==='P2002'){status=409;message='Такая запись уже существует. Проверьте постоянный URL.';}
 else if(err.code==='P2003'){status=409;message='Запись связана с продукцией. Сначала перенесите связанные товары.';}
 else if(err.code==='P2025'){status=404;message='Запись не найдена.';}
 else if(err.code==='LIMIT_FILE_SIZE'){status=413;message='Максимальный размер изображения — 8 МБ.';}
 else if(err.name==='PrismaClientValidationError'||(!err.status&&!String(err.code||'').startsWith('LIMIT_')&&err.type!=='entity.parse.failed')){status=500;message='Не удалось выполнить действие. Повторите позднее.';}
 if(req.path.startsWith('/api/'))return res.status(status).json({error:message,requestId:req.requestId});
 res.locals.indexable=false;res.status(status).render('public/error.html',{title:'Ошибка',description:'Не удалось открыть страницу',status,message});
});
