import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as sass from 'sass';
import {build} from 'esbuild';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function walk(dir){let out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
for(const src of await walk(path.join(root,'site/scss'))){if(!src.endsWith('.scss')||path.basename(src).startsWith('_'))continue;const relative=path.relative(path.join(root,'site/scss'),src).replace(/\.scss$/,'.css');const dest=path.join(root,'site/css',relative);await fs.mkdir(path.dirname(dest),{recursive:true});const result=sass.compile(src,{style:'compressed',silenceDeprecations:['legacy-js-api']});await fs.writeFile(dest,result.css);}
await build({entryPoints:['site/js/main.js','site/js/stores.js','site/js/admin/main.js','site/js/admin/pwa.js'],outdir:'site/dist',outbase:'site/js',bundle:true,minify:true,target:['es2020'],absWorkingDir:root,logLevel:'warning'});
const vendor=path.join(root,'site/vendor/leaflet');await fs.mkdir(vendor,{recursive:true});for(const name of ['leaflet.js','leaflet.css','images'])await fs.cp(path.join(root,'node_modules/leaflet/dist',name),path.join(vendor,name),{recursive:true});await fs.copyFile(path.join(root,'node_modules/leaflet/LICENSE'),path.join(vendor,'LICENSE'));
const logo=path.join(root,'site/img/logo.webp');
for(const size of [192,512])await sharp(logo).resize(size,size,{fit:'contain',background:'#faf6ed'}).png().toFile(path.join(root,`site/icons/admin-${size}.png`));
await sharp(logo).resize(330,330,{fit:'contain',background:'#286e2b'}).extend({top:91,bottom:91,left:91,right:91,background:'#286e2b'}).png().toFile(path.join(root,'site/icons/admin-maskable.png'));
const sw=path.join(root,'site/js/admin/sw.js');const content=await fs.readFile(sw,'utf8');const hash=createHash('sha256');for(const f of (await walk(path.join(root,'site/dist'))).concat(await walk(path.join(root,'site/css')),await walk(path.join(root,'public')),await walk(path.join(root,'admin-pages')),await walk(path.join(root,'views')),await walk(path.join(root,'site/fonts')),await walk(path.join(root,'site/icons'))).sort())hash.update(await fs.readFile(f));const version=hash.digest('hex').slice(0,12);await fs.writeFile(path.join(root,'site/build-version.json'),JSON.stringify({version})+'\n');await fs.writeFile(sw,content.replace(/const VERSION='[^']+'/,`const VERSION='burenka-${version}'`));
console.log('CSS, JS, Leaflet и иконки собраны.');
