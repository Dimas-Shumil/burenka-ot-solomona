import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {rm} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import request from 'supertest';
process.env.NODE_ENV='test';process.env.DATABASE_URL='file:./navigation-test.db';process.env.APP_ORIGIN='http://localhost:3000';process.env.SESSION_SECRET='navigation-test-secret-'.repeat(4);
let db,app,server,dom,win,navigation,authCookie,base,nativeFetch=globalThis.fetch,NativeAbortController=globalThis.AbortController,slowPath='',failPath='';const originals=new Map(),writes=[];
const waitFor=async(check,label)=>{const end=Date.now()+6000;while(Date.now()<end){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Не дождались: '+label);};
before(async()=>{
 await rm('prisma/navigation-test.db',{force:true});for(const args of [['scripts/init-db.js'],['node_modules/prisma/build/index.js','migrate','deploy'],['prisma/seed.js']]){const r=spawnSync(process.execPath,args,{env:process.env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
 ({db}=await import('../src/lib/db.js'));({app}=await import('../src/app.js'));const {hashPassword}=await import('../src/lib/security.js');await db.user.create({data:{name:'Тестовый собственник',login:'navigation-owner',passwordHash:await hashPassword('NavigationTest123!')}});
 const login=await request(app).get('/admin/login'),csrf=login.text.match(/name="csrf-token" content="([^"]+)"/)[1];const cookies=login.headers['set-cookie'].map(c=>c.split(';')[0]);
 const auth=await request(app).post('/api/auth/login').set('Cookie',cookies.join('; ')).set('X-CSRF-Token',csrf).set('Origin','http://localhost:3000').send({login:'navigation-owner',password:'NavigationTest123!'});assert.equal(auth.status,200);authCookie=[...cookies,...auth.headers['set-cookie'].map(c=>c.split(';')[0])].join('; ');
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});assert.equal(server.address().address,'127.0.0.1');base='http://127.0.0.1:'+server.address().port;
 const page=await nativeFetch(base+'/admin/',{headers:{Cookie:authCookie}});dom=new JSDOM(await page.text(),{url:base+'/admin/',pretendToBeVisual:true,runScripts:'outside-only'});win=dom.window;
 win.matchMedia=()=>({matches:false});win.scrollTo=()=>{};win.confirm=()=>true;win.HTMLElement.prototype.animate=()=>({finished:Promise.resolve()});win.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};win.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 const bridge=async(url,options={})=>{const parsed=new URL(url,win.location.href);if(parsed.pathname===failPath)throw Error('Нет соединения');if(parsed.pathname===slowPath)await new Promise(resolve=>setTimeout(resolve,100));if(options.method==='POST'||options.method==='PUT')writes.push(parsed.pathname);const nativeController=new NativeAbortController();if(options.signal?.aborted)nativeController.abort();else options.signal?.addEventListener('abort',()=>nativeController.abort(),{once:true});return nativeFetch(parsed,{...options,signal:nativeController.signal,headers:{...options.headers,Cookie:authCookie,Origin:'http://localhost:3000'}});};
 const globals={window:win,document:win.document,location:win.location,history:win.history,DOMParser:win.DOMParser,FormData:win.FormData,AbortController:win.AbortController,Event:win.Event,confirm:()=>win.confirm(),matchMedia:win.matchMedia,fetch:bridge};
 for(const [key,value] of Object.entries(globals)){originals.set(key,globalThis[key]);globalThis[key]=value;}
 ({navigation}=await import('../site/js/admin/main.js'));
});
after(async()=>{dom?.window.close();for(const [key,value] of originals){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await db?.$disconnect();await rm('prisma/navigation-test.db',{force:true});});
test('Разделы меняются без перезагрузки оболочки, меню и верхней панели',async()=>{
 const sidebar=document.querySelector('.a-sidebar'),topbar=document.querySelector('.a-topbar'),bottom=document.querySelector('.a-bottom-nav');
 for(const path of ['/admin/products','/admin/categories','/admin/producers','/admin/stores','/admin/promotions','/admin/requests','/admin/content','/admin/settings/1','/admin/']){assert.equal(await navigation.go(path),true,path+': '+document.getElementById('admin-toast')?.textContent);assert.equal(document.querySelector('.a-sidebar'),sidebar);assert.equal(document.querySelector('.a-topbar'),topbar);assert.equal(document.querySelector('.a-bottom-nav'),bottom);assert(document.querySelector('#admin-main h1'));}
 assert.equal(document.querySelector('#admin-navigation [aria-current]').pathname,'/admin/');
});
test('Отмена перехода сохраняет форму, URL и введённое название',async()=>{
 await navigation.go('/admin/products/new');const input=document.querySelector('[name=name]');input.value='Не потерять';input.dispatchEvent(new win.Event('input',{bubbles:true}));win.confirm=()=>false;
 assert.equal(await navigation.go('/admin/stores'),false);assert.equal(win.location.pathname,'/admin/products/new');assert.equal(document.querySelector('[name=name]').value,'Не потерять');
 win.confirm=()=>true;assert.equal(await navigation.go('/admin/stores'),true);
});
test('Повторные открытия формы не дублируют submit; сохранение открывает запись плавно',async()=>{
 for(let i=0;i<3;i++){await navigation.go('/admin/producers/new');await navigation.go('/admin/producers');}
 await navigation.go('/admin/producers/new');const form=document.querySelector('#resource-form');form.elements.name.value='Производитель из навигации';form.elements.name.dispatchEvent(new win.Event('input',{bubbles:true}));form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
 await waitFor(()=>win.location.pathname.startsWith('/admin/producers/')&&!win.location.pathname.endsWith('/new')&&!document.body.classList.contains('admin-is-loading'),'создание производителя');
 assert.equal(await db.producer.count({where:{name:'Производитель из навигации'}}),1);assert.equal(writes.filter(p=>p==='/api/admin/producers').length,1);
});
test('Запоздавший ответ не заменяет выбранный позже раздел',async()=>{
 slowPath='/admin/categories';const first=navigation.go('/admin/categories');const second=navigation.go('/admin/stores');await Promise.all([first,second]);slowPath='';assert.equal(win.location.pathname,'/admin/stores');assert.equal(document.querySelector('#admin-main').dataset.section,'stores');
});
test('Ошибка сети сохраняет текущий раздел и снимает блокировку',async()=>{
 failPath='/admin/promotions';assert.equal(await navigation.go('/admin/promotions'),false);failPath='';assert.equal(win.location.pathname,'/admin/stores');assert.equal(document.body.classList.contains('admin-is-loading'),false);assert.equal(document.getElementById('admin-main').inert,false);
});
test('История Назад возвращает предыдущий раздел без замены оболочки',async()=>{
 await navigation.go('/admin/categories');await navigation.go('/admin/products');win.history.back();await waitFor(()=>document.getElementById('admin-main').dataset.section==='categories'&&!document.body.classList.contains('admin-is-loading'),'история назад');
 assert.equal(win.location.pathname,'/admin/categories');
});

test('Отмена Назад с несохранённой формой возвращает URL и сохраняет ввод',async()=>{
 await navigation.go('/admin/stores');await navigation.go('/admin/products/new');const name=document.querySelector('[name=name]');name.value='Сохранить при Назад';name.dispatchEvent(new win.Event('input',{bubbles:true}));win.confirm=()=>false;win.history.back();
 await new Promise(resolve=>setTimeout(resolve,150));assert.equal(win.location.pathname,'/admin/products/new');assert.equal(document.querySelector('[name=name]').value,'Сохранить при Назад');win.confirm=()=>true;
});
