import {Router} from 'express';
import {rateLimit} from 'express-rate-limit';
import {db} from '../lib/db.js';
import {config} from '../lib/config.js';
import {csrfCheck} from '../lib/security.js';
import {requestSchema,parse} from '../validation/resources.js';
import {findProducts,productInclude,visible,activePromotions} from '../services/catalog.js';
const router=Router();
router.use((req,res,next)=>{
 if(['GET','HEAD'].includes(req.method)&&req.path.length>1&&req.path.endsWith('/')&&!/^\/(?:admin|api)(?:\/|$)/.test(req.path)){
  const query=req.originalUrl.includes('?')?req.originalUrl.slice(req.originalUrl.indexOf('?')):'';
  return res.redirect(308,req.path.replace(/\/+$/,'')+query);
 }
 next();
});
const ordered={orderBy:[{position:'asc'},{name:'asc'}]};
router.use(async(req,res,next)=>{
 if(req.path.startsWith('/admin')||req.path.startsWith('/api/admin')||req.path.startsWith('/api/auth'))return next();
 const [settings,categories,storeCount]=await Promise.all([db.siteSettings.findUnique({where:{id:1}}),db.category.findMany({where:{published:true},...ordered}),db.store.count({where:{published:true}})]);
 res.set('Cache-Control','no-cache');
 res.locals.settings=settings||{name:'Бурёнка от SOLOMONA',description:'Фермерская молочная продукция'};res.locals.categories=categories;res.locals.storeCount=storeCount;
 res.locals.currentPath=req.path;res.locals.canonical=config.origin+req.path;res.locals.indexable=config.indexable&&!req.path.startsWith('/search');
 res.locals.mapConfig={tileUrl:config.tileUrl,attribution:config.attribution};
 next();
});
async function content(id){return await db.siteContent.findUnique({where:{id}})||{title:'Бурёнка от SOLOMONA',subtitle:'',body:'',image:'',seoTitle:'',seoDescription:''};}
function metadata(c){return {title:c.seoTitle||c.title,description:c.seoDescription||c.subtitle||c.body.slice(0,170)};}
router.get('/',async(req,res)=>{
 const [c,products,stores,promotions]=await Promise.all([content('home'),db.product.findMany({where:{...visible,featured:true},include:productInclude,...ordered,take:8}),db.store.findMany({where:{published:true},include:{images:{orderBy:{position:'asc'}}},...ordered,take:3}),db.promotion.findMany({where:activePromotions(),...ordered,take:3})]);
 res.render('public/home.html',{...metadata(c),title:c.seoTitle||res.locals.settings.seoTitle||c.title,content:c,products,stores,promotions});
});
async function catalog(req,res,next){
 const category=req.params.category?await db.category.findFirst({where:{slug:req.params.category,published:true}}):null;
 if(req.params.category&&!category)return next();
 const results=await findProducts({q:typeof req.query.q==='string'?req.query.q:'',category:category?.slug||(typeof req.query.category==='string'?req.query.category:''),sort:req.query.sort,page:req.query.page});
 const searching=req.path==='/search';if(searching)res.set('X-Robots-Tag','noindex, follow');
 res.render('public/catalog.html',{title:category?.seoTitle||category?.name||(searching?'Поиск продукции':'Каталог продукции'),description:category?.seoDescription||category?.description||'Ассортимент фермерской молочной продукции',category,results,searching});
}
router.get(['/catalog','/search','/catalog/:category'],catalog);
router.get('/product/:slug',async(req,res,next)=>{
 const product=await db.product.findFirst({where:{...visible,slug:req.params.slug},include:productInclude});if(!product)return next();
 const related=await db.product.findMany({where:{...visible,categoryId:product.categoryId,id:{not:product.id}},include:productInclude,...ordered,take:4});
 res.render('public/product.html',{title:product.seoTitle||product.name,description:product.seoDescription||product.description.slice(0,180),product,related});
});
router.get('/sales',async(req,res)=>{const promotions=await db.promotion.findMany({where:activePromotions(),...ordered});res.render('public/sales.html',{title:'Акции и новинки',description:'Действующие предложения Бурёнки от SOLOMONA',promotions});});
router.get('/stores',async(req,res)=>{const stores=await db.store.findMany({where:{published:true},include:{images:{orderBy:{position:'asc'}}},...ordered});res.render('public/stores.html',{title:'Торговые точки',description:'Адреса, графики работы и ближайшие магазины',stores});});
router.get('/stores/:slug',async(req,res,next)=>{const store=await db.store.findFirst({where:{slug:req.params.slug,published:true},include:{images:{orderBy:{position:'asc'}}}});if(!store)return next();res.render('public/store.html',{title:store.seoTitle||store.name,description:store.seoDescription||store.address,store});});
for(const [url,id] of [['/about','about'],['/partners','partners'],['/contacts','contacts']])router.get(url,async(req,res)=>{const c=await content(id);res.render(`public/${id}.html`,{...metadata(c),content:c});});
router.get(['/privacy','/consent'],(req,res)=>res.render('public/legal.html',{title:req.path==='/privacy'?'Политика конфиденциальности':'Согласие на обработку персональных данных',description:'Документы по обработке персональных данных',kind:req.path==='/privacy'?'privacy':'consent'}));
const requestsLimiter=rateLimit({windowMs:3600000,limit:6,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Слишком много заявок. Попробуйте позднее или свяжитесь по телефону.'}});
router.post('/api/partnership-requests',requestsLimiter,csrfCheck,async(req,res)=>{
 const data=parse(requestSchema,req.body),s=res.locals.settings;
 if(!s.legalOperator||!s.privacyText||!s.consentText)return res.status(503).json({error:'Онлайн-форма пока недоступна. Свяжитесь с компанией по указанным контактам.'});
 const {consent,website,...values}=data;
 const item=await db.partnershipRequest.create({data:{...values,consentAt:new Date()}});
 res.status(201).json({ok:true,message:'Заявка принята. Мы свяжемся с вами.',reference:item.id});
});
router.get('/api/catalog/suggest',async(req,res)=>{const result=await findProducts({q:typeof req.query.q==='string'?req.query.q:'',limit:5});res.json(result.items.map(p=>({name:p.name,url:'/product/'+p.slug})));});
router.get('/robots.txt',(req,res)=>res.type('text/plain').send(config.indexable?`User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /search\nSitemap: ${config.origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n'));
const xml=v=>String(v).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
router.get('/sitemap.xml',async(req,res)=>{
 const [products,categories,stores]=await Promise.all([db.product.findMany({where:visible,select:{slug:true,updatedAt:true}}),db.category.findMany({where:{published:true},select:{slug:true}}),db.store.findMany({where:{published:true},select:{slug:true}})]);
 const urls=['/','/catalog','/sales','/partners','/stores','/about','/contacts','/privacy','/consent'].map(path=>({path}));
 urls.push(...products.map(p=>({path:'/product/'+p.slug,date:p.updatedAt})),...categories.map(c=>({path:'/catalog/'+c.slug})),...stores.map(s=>({path:'/stores/'+s.slug})));
 res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(u=>`<url><loc>${xml(config.origin+u.path)}</loc>${u.date?`<lastmod>${u.date.toISOString()}</lastmod>`:''}</url>`).join('')+'</urlset>');
});
const old={'home.html':'/','catalog.html':'/catalog','product.html':'/catalog','sales.html':'/sales','partner.html':'/partners','about.html':'/about','cart.html':'/catalog'};
router.get(['/:legacy','/public/:legacy'],(req,res,next)=>{const dest=Object.hasOwn(old,req.params.legacy)?old[req.params.legacy]:null;if(dest)return res.redirect(301,req.params.legacy==='product.html'&&typeof req.query.id==='string'&&/^[a-z0-9-]+$/.test(req.query.id)?'/product/'+req.query.id:dest);next();});
export default router;
