// Версия меняется при сборке. Ни HTML админки, ни API, ни персональные данные не кешируются.
const VERSION='burenka-a7d9df3d2250';
self.addEventListener('install',()=>{});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.mode!=='navigate'||url.origin!==self.location.origin||!url.pathname.startsWith('/admin/'))return;
 event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Нет подключения — Бурёнка</title><body><h1>Нет подключения к интернету</h1><p>Для безопасной работы с административной панелью подключитесь к сети.</p><a href="/admin/">Повторить</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}})));
});
