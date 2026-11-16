import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import fs from 'node:fs/promises';
const db=new PrismaClient();
try{
 const data=JSON.parse(await fs.readFile(new URL('./demo-products.json',import.meta.url),'utf8'));
 const categorySlugs={'Сыры':'cheese','Молоко':'milk','Творог':'curd','Сметана':'sour-cream','Йогурты':'yogurt','Масло':'butter','Кефир':'kefir'};
 await db.$transaction(async tx=>{
 await tx.siteSettings.upsert({where:{id:1},update:{},create:{id:1,name:'Бурёнка от SOLOMONA',address:'Абакан, Республика Хакасия',description:'Дистрибуция фермерской молочной продукции. Сотрудничество с производителями и организациями.'}});
 for(const [i,[id,title,subtitle,body,image]] of [
 ['home','Фермерская\nмолочная продукция','Из хозяйств Хакасии и соседних регионов — для вашей семьи и вашего бизнеса.','Мы объединяем фермерские хозяйства и торговые точки. В каталоге — молочная продукция с информацией о составе и происхождении. Обсудим поставки и подберём ассортимент для вашей организации.','/site/img/hero-v2.webp'],
 ['about','О компании','Бурёнка от SOLOMONA — дистрибьютор и торговая сеть фермерской молочной продукции.','Мы работаем с производителями натуральной продукции и развиваем сеть торговых точек. Наша цель — сделать качественные продукты доступными, а сотрудничество с хозяйствами и организациями — удобным и понятным.','/site/img/about/about-hero.webp'],
 ['partners','Партнёрам','Надёжное сотрудничество с производителями, фермерскими хозяйствами и организациями.','Предлагаем обсудить ассортимент и условия сотрудничества для кафе, ресторанов, магазинов и других организаций. Производителей приглашаем представить свою продукцию для нашей торговой сети. Условия, объёмы и графики согласовываем индивидуально.','/site/img/partner/partner-hero.webp'],
 ['contacts','Контакты','Свяжитесь с нами по вопросам продукции и делового сотрудничества.','','']
 ].entries())await tx.siteContent.upsert({where:{id},update:{},create:{id,title,subtitle,body,image}});
 let pos=0;const categories={};for(const [name,slug] of Object.entries(categorySlugs))categories[name]=await tx.category.upsert({where:{slug},update:{},create:{name,slug,position:pos++,published:true,image:'/site/img/catalog/categories/'+slug+'.webp',description:'Ассортимент: '+name.toLowerCase()}});
 const producers={};for(const p of data)if(!producers[p.brand]){const existing=await tx.producer.findFirst({where:{name:p.brand}});producers[p.brand]=existing||await tx.producer.create({data:{name:p.brand,region:p.region}});}
 for(const [position,p] of data.entries())await tx.product.upsert({where:{slug:p.id},update:{},create:{name:p.title,slug:p.id,description:p.description,categoryId:categories[p.category].id,producerId:producers[p.brand].id,region:p.region,weight:p.weight,price:Math.round(p.price*100),showPrice:false,featured:position<8,published:true,position,composition:p.composition,storage:p.storage,shelfLife:p.shelfLife,nutrition:p.nutrition.map(x=>x.join(': ')).join('\n'),images:{create:{url:p.image,alt:p.title,position:0}}}});
 for(const [position,address,img] of [[0,'г. Абакан, ул. Пушкина, 105','store-1'],[1,'г. Абакан, ул. Торосова, 9','store-2'],[2,'г. Абакан, ул. Крылова, 85','store-3']])await tx.store.upsert({where:{slug:'store-'+(position+1)},update:{},create:{name:'Бурёнка — точка '+(position+1),slug:'store-'+(position+1),address,hours:'Ежедневно 9:00–21:00',description:'Демонстрационная торговая точка. Перед публикацией подтвердите адрес, график и координаты.',published:true,position,images:{create:{url:'/site/img/'+img+'.webp'}}}});
 if(!await tx.promotion.count())await tx.promotion.create({data:{name:'Знакомство с фермерской продукцией',description:'Откройте ассортимент сыров, молока, творога и йогуртов. Условия сотрудничества обсуждаем индивидуально.',image:'/site/img/promotions/cheese-week.webp',link:'/catalog',published:true}});
 });
 console.log('Демонстрационные данные добавлены. Существующие записи не перезаписаны. Контакты, документы, адреса и координаты нужно подтвердить в админке.');
}finally{await db.$disconnect();}
