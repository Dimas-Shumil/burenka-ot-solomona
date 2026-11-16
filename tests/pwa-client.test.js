import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../site/js/admin/pwa.js',import.meta.url),'utf8');
function target(extra={}){const listeners=new Map();return {...extra,addEventListener(name,fn){listeners.set(name,fn);},emit(name,event={}){return listeners.get(name)?.(event);}};}
async function setup({controlled=false,waiting=false}={}){
 const elements=new Map(['pwa-install','pwa-install-button','pwa-later','pwa-update','pwa-update-button'].map(id=>[id,target({hidden:true,disabled:false,querySelector:()=>({textContent:''})})]));
 const messages=[],timers=[],store=new Map();let reloads=0,allow=true;
 const registration=target({waiting:waiting?{postMessage:message=>messages.push(message)}:null,installing:null,update:async()=>{}});
 const sw=target({controller:controlled?{}:null,register:async(url,options)=>{assert.equal(url,'/admin/sw.js');assert.equal(options.scope,'/admin/');return registration;}});
 const window=target({burenkaDirty:false});
 const document=target({visibilityState:'visible',getElementById:id=>elements.get(id)});
 vm.runInNewContext(source,{window,document,navigator:{serviceWorker:sw,userAgent:'Test',maxTouchPoints:0},matchMedia:()=>({matches:false}),localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},Date,confirm:()=>allow,location:{reload:()=>reloads++},setTimeout:fn=>timers.push(fn)});
 await Promise.resolve();await Promise.resolve();
 return {elements,registration,sw,window,timers,messages,store,reloads:()=>reloads,allow:value=>{allow=value;}};
}
test('Первая установка PWA не перезагружает открытый редактор',async()=>{
 const env=await setup();env.window.burenkaDirty=true;env.sw.emit('controllerchange');assert.equal(env.reloads(),0);assert.equal(env.window.burenkaDirty,true);
});
test('Обновление ожидает подтверждения и перезагружает только один раз',async()=>{
 const env=await setup({controlled:true,waiting:true});assert.equal(env.elements.get('pwa-update').hidden,false);
 env.window.burenkaDirty=true;env.allow(false);env.elements.get('pwa-update-button').emit('click');assert.equal(env.messages.length,0);assert.equal(env.reloads(),0);
 env.allow(true);env.elements.get('pwa-update-button').emit('click');assert.equal(env.messages[0].type,'ACTIVATE');assert.equal(env.reloads(),0);
 env.sw.emit('controllerchange');env.sw.emit('controllerchange');assert.equal(env.reloads(),1);
});
test('Обновление из другой вкладки сохраняет несохранённую форму',async()=>{
 const env=await setup({controlled:true});env.window.burenkaDirty=true;env.sw.emit('controllerchange');assert.equal(env.reloads(),0);assert.equal(env.elements.get('pwa-update').hidden,false);
 env.allow(false);env.elements.get('pwa-update-button').emit('click');assert.equal(env.reloads(),0);
 env.allow(true);env.elements.get('pwa-update-button').emit('click');assert.equal(env.reloads(),1);
});
test('Плашка появляется при каждом открытии админки, отказ действует только на текущую страницу',async()=>{
 const first=await setup();first.timers.pop()();assert.equal(first.elements.get('pwa-install').hidden,false);
 first.elements.get('pwa-later').emit('click');assert.equal(first.elements.get('pwa-install').hidden,true);
 first.window.emit('beforeinstallprompt',{preventDefault(){}});assert.equal(first.elements.get('pwa-install').hidden,true);
 const nextVisit=await setup();nextVisit.timers.pop()();assert.equal(nextVisit.elements.get('pwa-install').hidden,false);assert.equal(nextVisit.store.size,0);
});
