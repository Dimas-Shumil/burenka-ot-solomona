import {Router} from 'express';
import multer from 'multer';
import {rateLimit} from 'express-rate-limit';
import {db} from '../lib/db.js';
import {requireOwner,noStore} from '../middleware/auth.js';
import {csrfCheck} from '../lib/security.js';
import {schemas,resources,parse} from '../validation/resources.js';
import {activePromotions} from '../services/catalog.js';
import {saveImage,validateMediaReferences} from '../services/media.js';
const router=Router();
router.use(['/admin','/api/admin'],noStore,requireOwner);
const sections=Object.entries(resources);
const modelFor=key=>Object.hasOwn(resources,key)&&db[resources[key].model];
const includeFor=key=>['products','stores'].includes(key)?{images:{orderBy:{position:'asc'}}}:undefined;
router.get('/admin',async(req,res)=>{
 if(req.path==='/admin'){const query=req.originalUrl.includes('?')?req.originalUrl.slice(req.originalUrl.indexOf('?')):'';return res.redirect(308,'/admin/'+query);}
 const counts=await Promise.all([db.product.count({where:{published:true,category:{published:true}}}),db.category.count(),db.store.count({where:{published:true}}),db.promotion.count({where:activePromotions()}),db.partnershipRequest.count({where:{status:'NEW'}})]);
 res.render('admin-pages/dashboard.html',{title:'Обзор',sections,active:'dashboard',counts});
});
router.get('/admin/:section',async(req,res,next)=>{
 const key=req.params.section,resource=resources[key];if(!Object.hasOwn(resources,key))return next();
 if(key==='settings')return res.redirect('/admin/settings/1');
 const status=['NEW','IN_PROGRESS','CLOSED'].includes(req.query.status)?req.query.status:undefined;
 const page=Math.max(1,Math.min(100000,parseInt(req.query.page)||1)),take=30;
 const where=key==='requests'&&status?{status}:{};
 const orderBy=key==='requests'?{createdAt:'desc'}:key==='content'?{id:'asc'}:key==='producers'?{name:'asc'}:[{position:'asc'},{name:'asc'}];
 const [items,total]=await Promise.all([modelFor(key).findMany({where,orderBy,skip:(page-1)*take,take}),modelFor(key).count({where})]);
 res.render('admin-pages/list.html',{title:resource.title,sections,active:key,resource,items,page,pages:Math.ceil(total/take),status:status||''});
});
router.get('/admin/:section/:id',async(req,res,next)=>{
 const key=req.params.section,resource=resources[key];if(!Object.hasOwn(resources,key))return next();
 if(req.params.id==='new'&&['content','settings','requests'].includes(key))return next();
 const id=key==='settings'?1:req.params.id;
 const item=id==='new'?{}:await modelFor(key).findUnique({where:{id},include:includeFor(key)});
 if(!item)return next();
 const [categories,producers]=await Promise.all([db.category.findMany({orderBy:{name:'asc'}}),db.producer.findMany({orderBy:{name:'asc'}})]);
 res.render('admin-pages/edit.html',{title:id==='new'?'Создание: '+resource.title:'Редактирование: '+resource.title,sections,active:key,resource,item,categories,producers,isNew:id==='new'});
});
router.post('/api/admin/:section',csrfCheck,async(req,res,next)=>{
 const key=req.params.section;if(!Object.hasOwn(resources,key)||['content','settings','requests'].includes(key))return next();
 const values=parse(schemas[key],req.body),{images,...data}=values;
 await validateMediaReferences(values);
 const item=await modelFor(key).create({data:{...data,...(images?{images:{create:images.map((i,position)=>({...i,position}))}}:{})}});
 res.status(201).json({ok:true,id:item.id});
});
router.put('/api/admin/:section/:id',csrfCheck,async(req,res,next)=>{
 const key=req.params.section;if(!Object.hasOwn(resources,key))return next();
 const id=key==='settings'?1:req.params.id;
 const values=parse(schemas[key],req.body),{images,...data}=values;
 await validateMediaReferences(values);
 if(['products','stores','categories'].includes(key)){
  const old=await modelFor(key).findUnique({where:{id}});
  if(old&&old.slug!==data.slug){const e=new Error('Постоянный URL существующей записи менять нельзя. Это защищает ссылки и SEO.');e.status=422;throw e;}
 }
 const item=await db.$transaction(async tx=>{
  if(images)await tx[key==='products'?'productImage':'storeImage'].deleteMany({where:{[key==='products'?'productId':'storeId']:id}});
  return tx[resources[key].model].update({where:{id},data:{...data,...(images?{images:{create:images.map((i,position)=>({...i,position}))}}:{})}});
 });
 res.json({ok:true,id:item.id});
});
router.delete('/api/admin/:section/:id',csrfCheck,async(req,res,next)=>{
 const key=req.params.section;if(!Object.hasOwn(resources,key)||['settings','content','requests'].includes(key))return next();
 await modelFor(key).delete({where:{id:req.params.id}});res.json({ok:true});
});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:0,parts:1},fileFilter(req,file,cb){cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype));}});
const uploadLimit=rateLimit({windowMs:60000,limit:60,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Слишком много загрузок. Подождите минуту и повторите.'}});
router.post('/api/admin/media/upload',csrfCheck,uploadLimit,upload.single('image'),async(req,res)=>{const media=await saveImage(req.file);res.status(201).json({url:media.url,width:media.width,height:media.height});});
export default router;
