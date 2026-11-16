import {z} from 'zod';
import {safeLink} from '../lib/security.js';
const text=(max=5000)=>z.string().trim().max(max).default('');
const name=z.string().trim().min(2,'Минимум 2 символа').max(180);
const slug=z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Slug: латиница, цифры и дефисы');
const bool=z.preprocess(v=>v===true||v==='true'||v==='on',z.boolean());
const integer=z.coerce.number().int().min(0).max(1000000).default(0);
const nullableNumber=(min,max)=>z.preprocess(v=>v===''||v==null?null:Number(v),z.number().finite().min(min).max(max).nullable());
const link=text(1000).refine(safeLink,'Укажите путь /catalog или HTTPS-ссылку');
const image=text(500).refine(v=>!v||/^\/(?:uploads\/[a-f0-9-]+\.webp|site\/img\/[a-zA-Z0-9_./-]+\.(?:png|webp|jpg|jpeg))$/.test(v)&&!v.includes('..'),'Используйте загруженное изображение');
const seo={seoTitle:text(180),seoDescription:text(350)};
const common={name,position:integer,published:bool,...seo};
const images=z.array(z.object({url:image.refine(v=>!!v),alt:text(180)})).max(20).default([]);
const optionalId=z.preprocess(v=>v===''?null:v,z.string().max(80).nullable().optional());
export const schemas={
 categories:z.object({...common,slug,description:text(),image}),
 producers:z.object({name,region:text(250),description:text()}),
 products:z.object({...common,slug,description:text(20000),composition:text(),region:text(250),weight:text(100),nutrition:text(),storage:text(),shelfLife:text(250),characteristics:text(),price:nullableNumber(0,10000000).refine(v=>v===null||Number.isInteger(v),'Цена в копейках'),showPrice:bool,featured:bool,categoryId:z.string().min(1).max(80),producerId:optionalId,images}),
 stores:z.object({...common,slug,description:text(20000),address:name,hours:text(500),phone:text(50),latitude:nullableNumber(-90,90),longitude:nullableNumber(-180,180),mapUrl:link,extra:text(),images}).refine(v=>(v.latitude===null)===(v.longitude===null),{message:'Укажите обе координаты или оставьте обе пустыми',path:['latitude']}),
 promotions:z.object({name,description:text(20000),image,startsAt:z.preprocess(v=>v?new Date(v):null,z.date().nullable()),endsAt:z.preprocess(v=>v?new Date(v):null,z.date().nullable()),link,published:bool,position:integer}).refine(v=>!v.startsAt||!v.endsAt||v.startsAt<=v.endsAt,{message:'Конец акции раньше начала',path:['endsAt']}),
 content:z.object({title:name,subtitle:text(500),body:text(30000),image,...seo}),
 settings:z.object({name,phone:text(50),email:z.union([z.literal(''),z.email()]).default(''),address:text(1000),telegram:link,vk:link,requisites:text(),description:text(350),seoTitle:text(180),legalOperator:text(2000),privacyText:text(30000),consentText:text(15000)}),
 requests:z.object({status:z.enum(['NEW','IN_PROGRESS','CLOSED']),note:text(10000)})
};
// Поля определяют интерфейс, а Zod выше — независимую серверную проверку.
const field=(key,label,type='text',extra={})=>({key,label,type,...extra});
const visibility=[field('published','Опубликовано','checkbox'),field('position','Порядок (меньше — выше)','number')];
const seoFields=[field('seoTitle','SEO-заголовок'),field('seoDescription','SEO-описание','textarea')];
const base=[field('name','Название'),field('slug','Постоянный URL: латиница и дефисы')];
export const resources={
 products:{model:'product',title:'Продукция',fields:[...base,field('categoryId','Категория','category'),field('producerId','Производитель','producer'),field('description','Описание','textarea'),field('composition','Состав','textarea'),field('region','Регион происхождения'),field('weight','Вес / объём'),field('nutrition','Пищевая ценность','textarea'),field('storage','Условия хранения','textarea'),field('shelfLife','Срок годности'),field('characteristics','Характеристики','textarea'),field('price','Цена, в копейках','number'),field('showPrice','Показывать цену','checkbox'),field('featured','На главной','checkbox'),field('images','Фотографии (первая — обложка)','images'),...visibility,...seoFields]},
 categories:{model:'category',title:'Категории',fields:[...base,field('description','Описание','textarea'),field('image','Изображение','image'),...visibility,...seoFields]},
 producers:{model:'producer',title:'Производители',fields:[field('name','Название'),field('region','Регион'),field('description','Описание','textarea')]},
 stores:{model:'store',title:'Торговые точки',fields:[...base,field('description','Описание','textarea'),field('address','Адрес'),field('hours','График работы'),field('phone','Телефон'),field('latitude','Широта','number'),field('longitude','Долгота','number'),field('mapUrl','Ссылка на карту / маршрут'),field('extra','Дополнительная информация','textarea'),field('images','Фотографии (первая — обложка)','images'),...visibility,...seoFields]},
 promotions:{model:'promotion',title:'Акции',fields:[field('name','Название'),field('description','Описание','textarea'),field('image','Изображение','image'),field('startsAt','Начало действия','datetime-local'),field('endsAt','Окончание действия','datetime-local'),field('link','Ссылка на товар или категорию'),...visibility]},
 content:{model:'siteContent',title:'Контент сайта',fields:[field('title','Заголовок'),field('subtitle','Подзаголовок','textarea'),field('body','Основной текст','textarea'),field('image','Изображение','image'),...seoFields]},
 settings:{model:'siteSettings',title:'Настройки',fields:[field('name','Название компании'),field('phone','Телефон'),field('email','Email'),field('address','Общий адрес'),field('telegram','Telegram, HTTPS-ссылка'),field('vk','ВКонтакте, HTTPS-ссылка'),field('requisites','Реквизиты','textarea'),field('description','Описание сайта','textarea'),field('seoTitle','Основной SEO-заголовок'),field('legalOperator','Оператор персональных данных: полное наименование и адрес','textarea'),field('privacyText','Политика конфиденциальности: утверждённый текст','textarea'),field('consentText','Согласие на обработку: утверждённый текст','textarea')]},
 requests:{model:'partnershipRequest',title:'Заявки',fields:[field('status','Статус','status'),field('note','Внутренняя заметка','textarea')]}
};
export const requestSchema=z.object({organization:name,contact:name,phone:z.string().trim().min(10).max(40).refine(v=>v.replace(/\D/g,'').length>=10,'Проверьте номер телефона'),email:z.union([z.literal(''),z.email()]).default(''),direction:text(250),comment:text(5000),consent:z.literal(true),website:z.literal('').optional()});
export function parse(schema,body){const r=schema.safeParse(body);if(!r.success){const e=new Error(r.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));e.status=422;throw e;}return r.data;}
