import {randomUUID} from 'node:crypto';
import {mkdir,unlink,access} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {db} from '../lib/db.js';
import {root} from '../lib/config.js';
export async function saveImage(file){
 if(!file){const e=new Error('Выберите изображение JPG, PNG или WebP.');e.status=422;throw e;}
 let metadata;try{metadata=await sharp(file.buffer,{limitInputPixels:40000000,animated:false}).metadata();}catch{const e=new Error('Файл не является допустимым изображением.');e.status=422;throw e;}
 if(!['jpeg','png','webp'].includes(metadata.format)||metadata.pages>1){const e=new Error('Разрешены статичные JPG, PNG и WebP.');e.status=422;throw e;}
 const name=randomUUID()+'.webp',dest=path.join(root,'uploads',name);
 await mkdir(path.dirname(dest),{recursive:true});
 const out=await sharp(file.buffer,{limitInputPixels:40000000}).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toFile(dest);
 try{return await db.media.create({data:{url:'/uploads/'+name,size:out.size,width:out.width,height:out.height}});}catch(e){await unlink(dest).catch(()=>{});throw e;}
}
export async function removeUnusedMedia({dryRun=true,ageMs=86400000}={}){
 const [products,stores,categories,promotions,content,media]=await Promise.all([db.productImage.findMany(),db.storeImage.findMany(),db.category.findMany(),db.promotion.findMany(),db.siteContent.findMany(),db.media.findMany({where:{createdAt:{lt:new Date(Date.now()-ageMs)}}})]);
 const used=new Set([...products,...stores].map(x=>x.url).concat([...categories,...promotions,...content].map(x=>x.image)));
 const unused=media.filter(m=>!used.has(m.url));
 if(!dryRun)for(const m of unused){if(!/^\/uploads\/[a-f0-9-]+\.webp$/.test(m.url))continue;try{await unlink(path.join(root,m.url));}catch(e){if(e.code!=='ENOENT')throw e;}await db.media.delete({where:{id:m.id}});}
 return unused.map(x=>x.url);
}

export async function validateMediaReferences(values){
 const urls=[values.image,...(values.images||[]).map(i=>i.url)].filter(Boolean);
 for(const url of new Set(urls)){
  if(url.startsWith('/uploads/')&&!await db.media.findUnique({where:{url}})){
   const e=new Error('Фотография больше недоступна. Загрузите её повторно.');e.status=422;throw e;
  }
  try{await access(path.join(root,url));}catch{const e=new Error('Изображение не найдено. Загрузите его повторно.');e.status=422;throw e;}
 }
}
