import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else if(/\.png$/i.test(p)){await sharp(p).resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(p.replace(/\.png$/i,'.webp'));await fs.unlink(p);}}}
await walk('site/img');console.log('Изображения оптимизированы в WebP.');
