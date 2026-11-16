import {db} from '../lib/db.js';
export const productInclude={category:true,producer:true,images:{orderBy:{position:'asc'}}};
export const visible={published:true,category:{published:true}};
export const normalize=v=>String(v||'').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё','е').replace(/йогурт[а-я]*/g,'йогурт').replace(/\s+/g,' ').trim();
export async function findProducts({q='',category='',sort='default',page=1,limit=12}={}){
 const allowed=['default','name','price-asc','price-desc'];if(!allowed.includes(sort))sort='default';
 const all=await db.product.findMany({where:{...visible,...(category?{category:{published:true,slug:category}}:{})},include:productInclude,orderBy:[{position:'asc'},{name:'asc'}]});
 const words=normalize(q).slice(0,200).split(' ').filter(Boolean);
 let filtered=all.filter(p=>words.every(w=>normalize([p.name,p.description,p.composition,p.region,p.category.name,p.producer?.name,p.producer?.region].join(' ')).includes(w)));
 if(sort==='name')filtered.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 if(sort.startsWith('price-'))filtered.sort((a,b)=>{const ap=a.showPrice&&a.price!=null?a.price:null,bp=b.showPrice&&b.price!=null?b.price:null;if(ap===null)return bp===null?0:1;if(bp===null)return -1;return sort==='price-asc'?ap-bp:bp-ap;});
 const pages=Math.max(1,Math.ceil(filtered.length/limit));page=Math.max(1,Math.min(Number.isSafeInteger(Number(page))?Number(page):1,pages));
 return {items:filtered.slice((page-1)*limit,page*limit),total:filtered.length,page,pages,sort,q:String(q).slice(0,200),category};
}
export const activePromotions=()=>({published:true,AND:[{OR:[{startsAt:null},{startsAt:{lte:new Date()}}]},{OR:[{endsAt:null},{endsAt:{gte:new Date()}}]}]});
export const imageOf=p=>p.images?.[0]?.url||'/site/img/logo.webp';
export const priceOf=p=>p.showPrice&&p.price!=null?new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(p.price/100):'';
