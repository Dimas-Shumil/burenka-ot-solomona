import {api,showExpiredSession} from './api.js';
import {setupPasswordVisibility} from './password.js';
import {setupAdminShell} from './shell.js';
import {setupAdminNavigation} from './navigation.js';
import {icon} from '../icons.js';
setupPasswordVisibility();
function message(form,text,error=false){const node=form.querySelector('[data-form-message]');if(node){node.textContent=text;node.className=error?'a-error':'a-success';}}
function toast(text){const node=document.getElementById('admin-toast');if(node){node.textContent=text;node.hidden=false;setTimeout(()=>node.hidden=true,6000);}}
const login=document.getElementById('login-form');
login?.addEventListener('submit',async event=>{event.preventDefault();const button=login.querySelector('[type=submit]');button.disabled=true;message(login,'Проверяем данные…');try{const result=await api('/api/auth/login',{method:'POST',body:Object.fromEntries(new FormData(login))});location.href=result.redirect;}catch(error){message(login,error.message,true);button.disabled=false;}});
export let navigation;
async function upload(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Разрешены JPG, PNG и WebP.');if(file.size>8*1024*1024)throw Error('Изображение превышает 8 МБ.');const body=new FormData();body.append('image',file);return api('/api/admin/media/upload',{method:'POST',body});}
function imageItem(url){const item=document.createElement('div');item.className='a-image-item';item.dataset.url=url;const image=document.createElement('img');image.src=url;image.alt='';image.width=120;image.height=100;const label=document.createElement('label');label.textContent='Описание фото';const input=document.createElement('input');input.dataset.alt='';input.maxLength=180;label.append(input);const controls=document.createElement('div');for(const [key,symbol,title] of [['imageUp','arrow-up','Выше'],['imageDown','arrow-down','Ниже'],['imageRemove','close','Удалить фото']]){const button=document.createElement('button');button.type='button';button.dataset[key]='';button.innerHTML=icon(symbol);button.setAttribute('aria-label',title);controls.append(button);}item.append(image,label,controls);return item;}
export function initAdminPage(root){
 const lifecycle=new AbortController(),options={signal:lifecycle.signal};const form=root.querySelector('#resource-form');let uploads=0;
 window.burenkaSaving=false;
 const dirty=()=>{window.burenkaDirty=true;};form?.addEventListener('input',dirty,options);form?.addEventListener('change',dirty,options);
 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  const item=button.closest('.a-image-item');
  if(item){if(button.hasAttribute('data-image-remove'))item.remove();if(button.hasAttribute('data-image-up')&&item.previousElementSibling)item.previousElementSibling.before(item);if(button.hasAttribute('data-image-down')&&item.nextElementSibling)item.nextElementSibling.after(item);dirty();return;}
  if(button.hasAttribute('data-clear-image')){const field=button.closest('.a-single-image');field.querySelector('input[name]').value='';field.querySelector('img').src='/site/img/logo.webp';dirty();return;}
  if(button.hasAttribute('data-delete')){
   if(window.burenkaSaving||!confirm('Удалить запись? Это действие нельзя отменить.'))return;button.disabled=true;window.burenkaSaving=true;
   try{await api('/api/admin/'+button.dataset.section+'/'+button.dataset.delete,{method:'DELETE',body:{}});window.burenkaSaving=false;await navigation.refresh();}catch(error){toast(error.message);button.disabled=false;}finally{window.burenkaSaving=false;}
  }
 },options);
 for(const input of root.querySelectorAll('[data-upload-images],[data-upload-single]'))input.addEventListener('change',async()=>{
  const field=input.closest('.a-field'),status=field.querySelector('[data-upload-status]'),list=field.querySelector('.a-image-list'),files=[...input.files];
  if(list&&list.children.length+files.length>20){status.textContent='Максимум 20 фотографий на запись.';input.value='';return;}
  uploads++;window.burenkaSaving=true;input.disabled=true;form.querySelector('[type=submit]').disabled=true;
  try{for(const [i,file] of files.entries()){status.textContent=`Загрузка ${i+1} из ${files.length}…`;const result=await upload(file);if(list)list.append(imageItem(result.url));else{field.querySelector('input[name]').value=result.url;field.querySelector('img').src=result.url;}dirty();}status.textContent='Загружено. Сохраните запись, чтобы применить фотографии.';}catch(error){status.textContent=error.message;}finally{uploads--;window.burenkaSaving=uploads>0;input.disabled=false;input.value='';form.querySelector('[type=submit]').disabled=uploads>0;}
 },options);
 form?.addEventListener('submit',async event=>{
  event.preventDefault();if(uploads||window.burenkaSaving)return;
  const body=Object.fromEntries(new FormData(form));form.querySelectorAll('input[type=checkbox][name]').forEach(input=>body[input.name]=input.checked);
  form.querySelectorAll('[data-images-field]').forEach(field=>body[field.dataset.imagesField]=[...field.querySelectorAll('.a-image-item')].map(item=>({url:item.dataset.url,alt:item.querySelector('[data-alt]').value})));
  for(const input of form.querySelectorAll('input[type=datetime-local]'))body[input.name]=input.value?new Date(input.value).toISOString():'';
  const controls=[...form.querySelectorAll('input,select,textarea,button')].map(control=>({control,disabled:control.disabled}));controls.forEach(({control})=>control.disabled=true);window.burenkaSaving=true;form.setAttribute('aria-busy','true');message(form,'Сохраняем…');
  try{const section=form.dataset.section,id=form.dataset.id,result=await api('/api/admin/'+section+(id?'/'+id:''),{method:id?'PUT':'POST',body});window.burenkaDirty=false;window.burenkaSaving=false;if(!id)await navigation.go('/admin/'+section+'/'+result.id);else{message(form,'Сохранено');const notice=document.getElementById('session-expired');if(notice)notice.hidden=true;}}
  catch(error){message(form,error.message,true);}finally{window.burenkaSaving=false;form.setAttribute('aria-busy','false');controls.forEach(({control,disabled})=>control.disabled=disabled);}
 },options);
 for(const input of root.querySelectorAll('input[type=datetime-local][data-date-value]'))if(input.dataset.dateValue){const date=new Date(input.dataset.dateValue);input.value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 return ()=>lifecycle.abort();
}
if(document.querySelector('.a-layout')){
 const shell=setupAdminShell();navigation=setupAdminNavigation({initPage:initAdminPage,closeMenu:shell.closeMenu,notify:toast});
 window.addEventListener('burenka:session-expired',showExpiredSession);
 document.addEventListener('click',async event=>{if(!event.target.closest('[data-logout]'))return;if(!navigation.allowLeave())return;try{await api('/api/auth/logout',{method:'POST',body:{}});window.burenkaDirty=false;location.href='/admin/login';}catch(error){toast(error.message);}});
}
