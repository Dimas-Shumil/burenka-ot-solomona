import {updateActiveNavigation} from './shell.js';
export function adminTarget(href,base=location.href){
 const url=new URL(href,base);
 if(url.origin!==new URL(base).origin||!/^\/admin\/(?:$|(?:products|categories|producers|stores|promotions|requests|content|settings)(?:\/[a-zA-Z0-9_-]+)?\/?$)/.test(url.pathname))return null;
 return url;
}
export function setupAdminNavigation({initPage,closeMenu=()=>{},notify=()=>{}}){
 let controller,sequence=0,disposePage=()=>{},index=history.state?.burenkaNav?.index||0,ignorePop=false;
 let shownHref=location.href;
 const ownerId=document.querySelector('.a-layout')?.dataset.ownerId;
 const initialBuild=document.querySelector('meta[name="app-build"]')?.content;
 history.scrollRestoration='manual';
 history.replaceState({...history.state,burenkaNav:{index,scroll:window.scrollY}},'');
 disposePage=initPage(document.getElementById('admin-main'))||disposePage;
 function allowLeave(){if(window.burenkaSaving){notify('Дождитесь завершения сохранения или загрузки.');return false;}return !window.burenkaDirty||confirm('Есть несохранённые изменения. Перейти без сохранения?');}
 function busy(value){document.body.classList.toggle('admin-is-loading',value);const main=document.getElementById('admin-main');if(main){main.inert=value;main.setAttribute('aria-busy',String(value));}const status=document.getElementById('admin-navigation-status');if(status)status.hidden=!value;}
 async function go(href,{pop=false,popIndex=0,scroll=0,force=false}={}){
  const target=adminTarget(href);if(!target){return false;}
  if(!force&&!pop&&target.href===shownHref){closeMenu();return true;}
  if(!allowLeave())return false;
  const ticket=++sequence;controller?.abort();controller=new AbortController();const currentController=controller;
  const timeout=setTimeout(()=>currentController.abort(),15000);busy(true);closeMenu();
  try{
   const response=await fetch(target.pathname+target.search,{credentials:'same-origin',cache:'no-store',signal:currentController.signal,headers:{'X-Requested-With':'BurenkaNavigation'}});
   if(ticket!==sequence)return false;
   if(response.redirected&&new URL(response.url,location.href).pathname==='/admin/login'||response.status===401){notify('Сессия завершена. Войдите в новой вкладке; введённые данные остаются на странице.');window.dispatchEvent(new Event('burenka:session-expired'));return false;}
   if(!response.ok)throw Error(response.status===404?'Раздел или запись не найдены.':'Не удалось открыть раздел. Повторите переход.');
   const html=await response.text();if(ticket!==sequence)return false;
   const parsed=new DOMParser().parseFromString(html,'text/html'),nextMain=parsed.getElementById('admin-main');
   if(!nextMain)throw Error('Не удалось загрузить раздел. Обновите страницу.');
   const nextOwner=parsed.querySelector('.a-layout')?.dataset.ownerId;
   const nextBuild=parsed.querySelector('meta[name="app-build"]')?.content;
   if(nextOwner!==ownerId||initialBuild&&nextBuild!==initialBuild){window.burenkaDirty=false;location.assign(target.href);return true;}
   if(!pop){history.replaceState({...history.state,burenkaNav:{index,scroll:window.scrollY}},'');index++;history.pushState({...history.state,burenkaNav:{index,scroll:0}},'',target.pathname+target.search+target.hash);}else index=popIndex;
   const oldMain=document.getElementById('admin-main'),replacement=document.importNode(nextMain,true);
   disposePage();window.burenkaDirty=false;oldMain.replaceWith(replacement);document.title=parsed.title;
   const csrf=parsed.querySelector('meta[name="csrf-token"]');if(csrf)document.querySelector('meta[name="csrf-token"]').content=csrf.content;
   shownHref=location.href;disposePage=initPage(replacement)||(()=>{});updateActiveNavigation(replacement.dataset.section);
   replacement.querySelector('h1')?.setAttribute('tabindex','-1');replacement.querySelector('h1')?.focus({preventScroll:true});window.scrollTo({top:scroll,behavior:'instant'});
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches)replacement.animate?.([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,.7,.3,1)'});
   window.dispatchEvent(new Event('burenka:pagechange'));return true;
  }catch(error){if(ticket===sequence){notify(currentController.signal.aborted?'Загрузка прервана или заняла слишком много времени. Повторите переход.':error.message);}return false;}
  finally{clearTimeout(timeout);if(ticket===sequence)busy(false);}
 }
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href]');if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download'))return;
  const target=adminTarget(link.href);if(!target)return;
  event.preventDefault();void go(target.href);
 });
 document.addEventListener('submit',event=>{
  const form=event.target;if(event.defaultPrevented||form.method.toLowerCase()!=='get'||!adminTarget(form.action))return;
  event.preventDefault();const url=new URL(form.action);url.search=new URLSearchParams(new FormData(form)).toString();void go(url.href);
 });
 window.addEventListener('popstate',async event=>{
  if(ignorePop){ignorePop=false;return;}
  const state=event.state?.burenkaNav;if(!state){location.reload();return;}
  const delta=state.index-index,ticketBefore=sequence;
  if(!await go(location.href,{pop:true,popIndex:state.index,scroll:state.scroll||0})&&sequence<=ticketBefore+1){if(delta){ignorePop=true;history.go(-delta);}else history.replaceState(history.state,'',shownHref);}
 });
 return {go,refresh:()=>go(shownHref,{force:true}),allowLeave};
}
