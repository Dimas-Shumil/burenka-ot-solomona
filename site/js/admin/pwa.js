const banner=document.getElementById('pwa-install'),installButton=document.getElementById('pwa-install-button'),laterButton=document.getElementById('pwa-later'),closeButton=document.getElementById('pwa-close'),updateBanner=document.getElementById('pwa-update'),updateButton=document.getElementById('pwa-update-button'),instructions=document.getElementById('pwa-instructions');
let installPrompt,registration,releaseChanged=false,reloading=false,activationRequested=false,dismissed=false,installed=false;
const alreadyControlled=!!navigator.serviceWorker?.controller;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
function maybeShow(){if(!banner||dismissed||installed||standalone())return;const expired=document.getElementById('session-expired');if(expired&&!expired.hidden)return;if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.querySelector?.('dialog[open]'))return;banner.hidden=false;if(installButton)installButton.textContent=installPrompt?'Установить':'Как установить';}
function dismissInstall(){dismissed=true;if(banner)banner.hidden=true;}
function reloadOnce(){if(reloading)return;reloading=true;window.burenkaDirty=false;location.reload();}
function showUpdate(){if(updateBanner&&(registration?.waiting||releaseChanged))updateBanner.hidden=false;}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;maybeShow();});
installButton?.addEventListener('click',async()=>{
 if(!installPrompt){if(instructions){instructions.hidden=false;instructions.textContent=ios?'В Safari откройте «Поделиться», затем «На экран Домой» и «Добавить».':'Откройте меню браузера и выберите «Установить приложение». Если пункта нет, используйте Chrome или Edge и HTTPS-адрес сайта.';}return;}
 installButton.disabled=true;
 try{await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==='accepted'){installed=true;if(banner)banner.hidden=true;}else dismissInstall();installPrompt=null;}catch{if(instructions){instructions.hidden=false;instructions.textContent='Откройте меню браузера и выберите установку приложения.';}}finally{installButton.disabled=false;}
});
laterButton?.addEventListener('click',dismissInstall);closeButton?.addEventListener('click',dismissInstall);
window.addEventListener('appinstalled',()=>{installed=true;if(banner)banner.hidden=true;installPrompt=null;});
window.addEventListener('burenka:session-expired',dismissInstall);
updateButton?.addEventListener('click',()=>{
 if(window.burenkaSaving){return;}
 if(window.burenkaDirty&&!confirm('Есть несохранённые изменения. Обновить приложение?'))return;
 if(registration?.waiting){activationRequested=true;registration.waiting.postMessage({type:'ACTIVATE'});}else if(releaseChanged)reloadOnce();
});
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(activationRequested){reloadOnce();return;}if(alreadyControlled){releaseChanged=true;showUpdate();}});
 navigator.serviceWorker.register('/admin/sw.js',{scope:'/admin/',updateViaCache:'none'}).then(value=>{
  registration=value;const inspect=()=>{if(registration.waiting&&navigator.serviceWorker.controller)showUpdate();};const watch=worker=>worker?.addEventListener('statechange',inspect);
  watch(registration.installing);inspect();registration.addEventListener('updatefound',()=>watch(registration.installing));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')registration.update().catch(()=>{});});
 }).catch(()=>{});
}
// Отказ действует только до следующего открытия админки. Семидневной паузы нет.
setTimeout(maybeShow,1200);
document.addEventListener('focusout',()=>setTimeout(maybeShow,0));
