export function showExpiredSession(){
 let notice=document.getElementById('session-expired');
 if(!notice){notice=document.createElement('div');notice.id='session-expired';notice.className='a-online';notice.setAttribute('role','alert');const text=document.createElement('p');text.textContent='Сессия завершена. Введённые данные остаются на этой странице.';const link=document.createElement('a');link.href='/admin/login';link.target='_blank';link.rel='noopener';link.className='a-button';link.textContent='Войти в новой вкладке';notice.append(text,link);(document.querySelector('.a-main')||document.body).prepend(notice);}
 const offer=document.getElementById('pwa-install');if(offer)offer.hidden=true;
 notice.hidden=false;
}
const csrf=()=>document.querySelector('meta[name="csrf-token"]')?.content||'';
export async function api(url,{method='GET',body,retry=true}={}){
 const headers={'X-CSRF-Token':csrf()};
 if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const res=await fetch(url,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,cache:'no-store'});
 let data;try{data=await res.json();}catch{throw Error('Сервер недоступен. Проверьте подключение и повторите.');}
 if(res.status===401&&url!=='/api/auth/login'){
  showExpiredSession();throw Error('Сессия завершена. Откройте вход в новой вкладке, войдите и повторите сохранение здесь.');
 }
 if(res.status===403&&retry&&url!=='/api/auth/login'){
  const session=await fetch('/api/auth/session',{cache:'no-store'});
  if(session.status===401){showExpiredSession();throw Error('Войдите в новой вкладке и повторите сохранение. Данные остаются на этой странице.');}
  if(session.ok){const fresh=await session.json();if(fresh.csrf&&fresh.csrf!==csrf()){
   document.querySelector('meta[name="csrf-token"]').content=fresh.csrf;
   return api(url,{method,body,retry:false});
  }}
 }
 if(!res.ok)throw Error(data.error||'Не удалось выполнить действие.');
 return data;
}
