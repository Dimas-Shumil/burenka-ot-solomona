import {setupMobileMenu} from './mobile-menu.js';
import './header.js';
const csrf=()=>document.querySelector('meta[name="csrf-token"]')?.content||'';
setupMobileMenu();
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('#search-suggestions')?.setAttribute('hidden','');});
const search=document.querySelector('#global-search'),suggestions=document.querySelector('#search-suggestions');
let timer,controller;
search?.addEventListener('input',()=>{clearTimeout(timer);controller?.abort();if(search.value.trim().length<2){suggestions.hidden=true;return;}timer=setTimeout(async()=>{controller=new AbortController();try{const result=await fetch('/api/catalog/suggest?q='+encodeURIComponent(search.value),{signal:controller.signal});if(!result.ok)return;const items=await result.json();suggestions.replaceChildren(...items.map(item=>{const li=document.createElement('li'),a=document.createElement('a');a.textContent=item.name;a.href=item.url;li.append(a);return li;}));suggestions.hidden=!items.length;}catch{}},220);});
document.addEventListener('click',e=>{if(!e.target.closest('.header-search')&&suggestions)suggestions.hidden=true;});
const gallery=document.querySelector('[data-gallery-main]');
document.querySelectorAll('[data-gallery-url]').forEach(button=>button.addEventListener('click',()=>{gallery.src=button.dataset.galleryUrl;gallery.alt=button.dataset.galleryAlt;document.querySelectorAll('[data-gallery-url]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
const tabs=[...document.querySelectorAll('[role="tab"]')];
function selectTab(tab){tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!selected;});}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();selectTab(tabs[next]);tabs[next].focus();}});});
document.querySelectorAll('[data-request-form]').forEach(form=>form.addEventListener('submit',async e=>{
 e.preventDefault();const button=form.querySelector('[type=submit]'),message=form.querySelector('[data-form-message]');
 const data=Object.fromEntries(new FormData(form));data.consent=form.elements.consent.checked;button.disabled=true;message.textContent='Отправляем заявку…';
 try{const response=await fetch('/api/partnership-requests',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf()},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error||'Не удалось отправить заявку');message.textContent=result.message;form.reset();}catch(error){message.textContent=error.message==='Failed to fetch'?'Нет соединения. Проверьте интернет и повторите отправку.':error.message;}finally{button.disabled=false;}
}));
