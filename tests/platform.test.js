import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {rm,readFile} from 'node:fs/promises';
import request from 'supertest';
import sharp from 'sharp';
process.env.NODE_ENV='test';process.env.DATABASE_URL='file:./integration-test.db';process.env.APP_ORIGIN='http://localhost:3000';process.env.SESSION_SECRET='test-secret-'.repeat(8);
let app,db,security,owner,agent,csrf;
const tokenFrom=html=>html.match(/name="csrf-token" content="([^"]+)"/)[1];
const headers=()=>({'X-CSRF-Token':csrf,Origin:'http://localhost:3000'});
before(async()=>{
 await rm('prisma/integration-test.db',{force:true});
 const init=spawnSync(process.execPath,['scripts/init-db.js'],{encoding:'utf8',env:process.env});assert.equal(init.status,0,init.stderr);
 const setup=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{encoding:'utf8',env:process.env});assert.equal(setup.status,0,setup.stderr);
 const seed=spawnSync(process.execPath,['prisma/seed.js'],{encoding:'utf8',env:process.env});assert.equal(seed.status,0,seed.stderr);
 ({app}=await import('../src/app.js'));({db}=await import('../src/lib/db.js'));security=await import('../src/lib/security.js');
 owner=await db.user.create({data:{name:'Тестовый владелец',login:'test-owner',passwordHash:await security.hashPassword('TestPassword123!')}});
 agent=request.agent(app);csrf=tokenFrom((await agent.get('/admin/login')).text);
});
after(async()=>{await db?.$disconnect();await rm('prisma/integration-test.db',{force:true});});
test('Все публичные страницы SSR, без корзины и шаблонных тегов',async()=>{
 for(const path of ['/','/catalog','/catalog/cheese','/product/adyghe','/sales','/partners','/stores','/stores/store-1','/about','/contacts','/search?q=молоко','/privacy','/consent']){
  const res=await request(app).get(encodeURI(path));assert.equal(res.status,200,path+': '+res.text.slice(0,250));assert.match(res.text,/<h1/);assert(!res.text.includes('<%'));assert(!/data-favorite|data-cart|href="cart.html"/.test(res.text));assert.match(res.text,/rel="canonical"/);
 }
});
test('404, legacy редиректы и запрет доступа к исходникам',async()=>{
 for(const path of ['/absent','/product/absent','/stores/absent','/catalog/absent'])assert.equal((await request(app).get(path)).status,404,path);
 assert.equal((await request(app).get('/public/home.html')).headers.location,'/');
 for(const path of ['/.env','/prisma/dev.db','/admin-pages/dashboard.html','/views/partials/head.html','/site/scss/home.scss','/site/js/admin/main.js']){const r=await request(app).get(path);assert.equal(r.status,404,path);}
});
test('Админка защищена, API не возвращает приватные данные',async()=>{
 assert.equal((await request(app).get('/admin/products')).status,303);
 const res=await request(app).get('/api/admin/products');assert.equal(res.status,401);assert.equal(res.headers['cache-control'],'no-store');
});
test('CSRF, неверный пароль и вход OWNER',async()=>{
 assert.equal((await agent.post('/api/auth/login').send({login:'test-owner',password:'TestPassword123!'})).status,403);
 assert.equal((await agent.post('/api/auth/login').set(headers()).send({login:'test-owner',password:'wrong'})).status,401);
 const res=await agent.post('/api/auth/login').set(headers()).send({login:'test-owner',password:'TestPassword123!'});assert.equal(res.status,200);assert.match(res.headers['set-cookie'].join(';'),/HttpOnly/);
 for(const section of ['','products','categories','producers','stores','promotions','requests','content','settings/1','products/new','stores/new','categories/new','promotions/new','producers/new']){const r=await agent.get('/admin/'+section);assert.equal(r.status,200,section+': '+r.text.slice(0,150));assert.match(r.headers['cache-control'],/no-store/);}
 assert.equal((await agent.get('/admin/constructor')).status,404);
});
test('PWA: вход, меню и старый адрес остаются в административном scope',async()=>{
 const old=await agent.get('/admin?from=test');assert.equal(old.status,308);assert.equal(old.headers.location,'/admin/?from=test');
 const alreadyLogged=await agent.get('/admin/login');assert.equal(alreadyLogged.headers.location,'/admin/');
 const page=await agent.get('/admin/');assert.equal(page.status,200);assert(!/href="\/admin"/.test(page.text));
 const session=await agent.get('/api/auth/session');assert.equal(session.status,200);assert.equal(session.body.csrf,csrf);assert.equal(session.headers['cache-control'],'no-store');
 const assets=[...page.text.matchAll(/(?:href|src)="(\/site\/[^"<>]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
 assert(assets.some(url=>url.includes('/dist/admin/pwa.js?v=')));
 for(const url of assets)assert.equal((await request(app).get(url)).status,200,url);
 const manifest=await request(app).get('/admin/manifest.webmanifest');assert.equal(manifest.headers['cache-control'],'no-cache');
 for(const icon of JSON.parse(manifest.text).icons)assert.equal((await request(app).get(icon.src)).status,200,icon.src);
});
test('Публичные trailing-slash URL перенаправляются с сохранением запроса',async()=>{
 for(const [url,to] of [['/privacy/','/privacy'],['/consent/','/consent'],['/search/?q=milk','/search?q=milk']]){const r=await request(app).get(url);assert.equal(r.status,308);assert.equal(r.headers.location,to);}
 assert.equal((await request(app).get('/constructor')).status,404);
});
test('Редактор не сохраняет ссылки на отсутствующие изображения',async()=>{
 const r=await agent.post('/api/admin/categories').set(headers()).send({name:'Проверка фотографии',slug:'missing-photo',image:'/uploads/00000000-0000-0000-0000-000000000000.webp'});assert.equal(r.status,422);
});
test('Вход OWNER по email без усечения, с пробелами и другим регистром',async()=>{
 const email='owner.'+'x'.repeat(50)+'@'+'d'.repeat(30)+'.example.com';
 const visitor=request.agent(app);const token=tokenFrom((await visitor.get('/admin/login')).text);
 await db.user.update({where:{id:owner.id},data:{login:email}});
 try{
  const result=await visitor.post('/api/auth/login').set({'X-CSRF-Token':token,Origin:'http://localhost:3000'}).send({login:'  '+email.toUpperCase()+'  ',password:'TestPassword123!'});
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal((await visitor.get('/admin/')).status,200);
  assert.equal((await visitor.post('/api/auth/logout').set({'X-CSRF-Token':token,Origin:'http://localhost:3000'}).send({})).status,200);
 }finally{await db.user.update({where:{id:owner.id},data:{login:'test-owner'}});}
});
test('Регистр и ё/е в поиске, фильтры, безопасные цены',async()=>{
 let r=await request(app).get('/search').query({q:'МОЛОКО'});assert.match(r.text,/Молоко пастеризованное/);
 r=await request(app).get('/search').query({q:'топленое'});assert.match(r.text,/Топлёное молоко/);
 r=await request(app).get('/catalog').query({category:'cheese'});assert.match(r.text,/Сыр Адыгейский/);assert(!r.text.includes('Молоко пастеризованное 3,2%'));
 assert(!(await request(app).get('/product/adyghe')).text.includes('320,00'));
});
test('CRUD продукта, валидация, публикация и скрытая категория',async()=>{
 const category=await db.category.findUnique({where:{slug:'cheese'}});
 const body={name:'Тестовый ёж-сыр',slug:'test-product',categoryId:category.id,description:'Проверка поиска',published:false,showPrice:true,price:12345,images:[]};
 let r=await agent.post('/api/admin/products').set(headers()).send({...body,slug:'../../unsafe'});assert.equal(r.status,422);
 r=await agent.post('/api/admin/products').set(headers()).send(body);assert.equal(r.status,201,JSON.stringify(r.body));const id=r.body.id;
 assert.equal((await request(app).get('/product/test-product')).status,404);
 r=await agent.put('/api/admin/products/'+id).set(headers()).send({...body,published:true});assert.equal(r.status,200);
 r=await request(app).get('/product/test-product');assert.equal(r.status,200);assert.match(r.text,/123,45/);
 await db.category.update({where:{id:category.id},data:{published:false}});
 assert.equal((await request(app).get('/product/test-product')).status,404);assert(!(await request(app).get('/sitemap.xml')).text.includes('/product/test-product'));
 await db.category.update({where:{id:category.id},data:{published:true}});
 r=await agent.put('/api/admin/products/'+id).set(headers()).send({...body,slug:'changed-slug'});assert.equal(r.status,422);
 assert.equal((await agent.delete('/api/admin/products/'+id).set(headers()).send({})).status,200);
 assert.equal((await request(app).get('/product/test-product')).status,404);
});
test('XSS экранируется и URL-схемы валидируются',async()=>{
 const c=await db.siteContent.findUnique({where:{id:'contacts'}});
 await db.siteContent.update({where:{id:'contacts'},data:{body:'<script>alert("XSS")</script>'}});
 const r=await request(app).get('/contacts');assert(!r.text.includes('<script>alert("XSS")</script>'));assert.match(r.text,/&lt;script&gt;/);
 await db.siteContent.update({where:{id:'contacts'},data:{body:c.body}});
 assert.equal((await agent.post('/api/admin/promotions').set(headers()).send({name:'Тестовая акция',link:'javascript:alert(1)'})).status,422);
});
test('Декодирование изображения, отказ подделке, порядок и удаление фото',async()=>{
 let r=await agent.post('/api/admin/media/upload').set(headers()).attach('image',Buffer.from('<svg><script/></svg>'),{filename:'fake.jpg',contentType:'image/jpeg'});assert.equal(r.status,422);
 const buffer=await sharp({create:{width:40,height:30,channels:3,background:'#286e2b'}}).png().toBuffer();
 r=await agent.post('/api/admin/media/upload').set(headers()).attach('image',buffer,{filename:'safe.png',contentType:'image/png'});assert.equal(r.status,201,JSON.stringify(r.body));assert.match(r.body.url,/^\/uploads\/[a-f0-9-]+\.webp$/);
 const url=r.body.url,category=await db.category.findFirst();
 r=await agent.post('/api/admin/products').set(headers()).send({name:'Тест фотографий',slug:'photo-test',categoryId:category.id,images:[{url,alt:'Первое'},{url:'/site/img/milk.webp',alt:'Второе'}]});assert.equal(r.status,201);const id=r.body.id;
 r=await agent.put('/api/admin/products/'+id).set(headers()).send({name:'Тест фотографий',slug:'photo-test',categoryId:category.id,images:[{url:'/site/img/milk.webp',alt:'Обложка'}]});assert.equal(r.status,200);
 const product=await db.product.findUnique({where:{id},include:{images:true}});assert.equal(product.images.length,1);assert.equal(product.images[0].alt,'Обложка');assert.equal(product.images[0].position,0);
 await agent.delete('/api/admin/products/'+id).set(headers()).send({});await db.media.deleteMany({where:{url}});await rm('.'+url,{force:true});
});
test('Форма заявки: документы, согласие, CSRF, сохранение и обработка',async()=>{
 const visitor=request.agent(app);const publicCsrf=tokenFrom((await visitor.get('/partners')).text);const h={'X-CSRF-Token':publicCsrf,Origin:'http://localhost:3000'};
 const data={organization:'Тест ООО',contact:'Покупатель',phone:'+79990000000',email:'',direction:'Закупка',comment:'Тестовая заявка',website:'',consent:true};
 assert.equal((await visitor.post('/api/partnership-requests').send(data)).status,403);
 assert.equal((await visitor.post('/api/partnership-requests').set(h).send(data)).status,503);
 await db.siteSettings.update({where:{id:1},data:{legalOperator:'Тестовый оператор',privacyText:'Тестовая политика',consentText:'Тестовое согласие'}});
 assert.equal((await visitor.post('/api/partnership-requests').set(h).send({...data,consent:false})).status,422);
 const r=await visitor.post('/api/partnership-requests').set(h).send(data);assert.equal(r.status,201,JSON.stringify(r.body));
 const lead=await db.partnershipRequest.findUnique({where:{id:r.body.reference}});assert.equal(lead.status,'NEW');assert(lead.consentAt);assert(!('latitude' in lead));
 assert.equal((await agent.put('/api/admin/requests/'+lead.id).set(headers()).send({status:'IN_PROGRESS',note:'Перезвонить'})).status,200);
 assert.equal((await db.partnershipRequest.findUnique({where:{id:lead.id}})).note,'Перезвонить');
 assert.equal((await agent.put('/api/admin/requests/'+lead.id).set(headers()).send({status:'ADMIN',note:''})).status,422);
});
test('SEO, PWA и геометрия расстояния',async()=>{
 const r=await request(app).get('/sitemap.xml');assert.equal(r.status,200);assert.match(r.text,/\/product\/adyghe/);assert(!r.text.includes('/admin'));
 assert.match((await request(app).get('/robots.txt')).text,/Disallow: \//);
 const manifest=(await request(app).get('/admin/manifest.webmanifest')).body; // explicit MIME may not auto-parse
 const raw=await request(app).get('/admin/manifest.webmanifest');const m=JSON.parse(raw.text);assert.equal(m.scope,'/admin/');assert.equal(m.start_url,'/admin/');
 const sw=await request(app).get('/admin/sw.js');assert.equal(sw.status,200);assert(!/caches\.open|cache\.put/.test(sw.text));
 const {distanceKm}=await import('../site/js/stores.js');assert.equal(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:0}),0);assert(Math.abs(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:1})-111.195)<.01);
});
test('Точки и акции: координаты, отдельный URL, публикация и период',async()=>{
 const body={name:'Тестовая точка',slug:'test-store',address:'Тестовый адрес',latitude:53.72,longitude:91.44,published:true,images:[]};
 assert.equal((await agent.post('/api/admin/stores').set(headers()).send({...body,longitude:''})).status,422);
 let r=await agent.post('/api/admin/stores').set(headers()).send(body);assert.equal(r.status,201);const id=r.body.id;
 r=await request(app).get('/stores/test-store');assert.equal(r.status,200);assert.match(r.text,/GroceryStore/);assert.match(r.text,/53.72/);
 assert.equal((await agent.put('/api/admin/stores/'+id).set(headers()).send({...body,published:false})).status,200);
 assert.equal((await request(app).get('/stores/test-store')).status,404);
 assert.equal((await agent.delete('/api/admin/stores/'+id).set(headers()).send({})).status,200);
 assert.equal((await agent.post('/api/admin/promotions').set(headers()).send({name:'Неверный период',startsAt:'2027-01-02',endsAt:'2027-01-01'})).status,422);
 r=await agent.post('/api/admin/promotions').set(headers()).send({name:'Истёкшее предложение тест',published:true,endsAt:'2020-01-01'});assert.equal(r.status,201);const promo=r.body.id;
 assert(!(await request(app).get('/sales')).text.includes('Истёкшее предложение тест'));
 assert.equal((await agent.delete('/api/admin/promotions/'+promo).set(headers()).send({})).status,200);
});
test('Чужой Origin и истёкшая сессия отвергаются',async()=>{
 assert.equal((await agent.post('/api/admin/producers').set({'X-CSRF-Token':csrf,Origin:'https://other.example'}).send({name:'Производитель'})).status,403);
 const raw=security.token();await db.session.create({data:{userId:owner.id,tokenHash:security.hash(raw),expiresAt:new Date(Date.now()+3600000),lastUsedAt:new Date(Date.now()-2*3600000)}});
 const r=await request(app).get('/api/admin/products').set('Cookie',security.sessionCookie+'='+raw);assert.equal(r.status,401);
 assert.equal(await db.session.count({where:{tokenHash:security.hash(raw)}}),0);
});
test('Выход отзывает сессию на сервере',async()=>{
 assert((await db.session.count())>0);
 assert.equal((await agent.post('/api/auth/logout').set(headers()).send({})).status,200);
 assert.equal((await db.session.count()),0);
 assert.equal((await agent.get('/admin')).status,303);
});
