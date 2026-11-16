export function updateActiveNavigation(section){
 const nav=document.getElementById('admin-navigation');
 for(const container of [nav,document.querySelector('.a-bottom-nav'),document.querySelector('#admin-more nav')]){
  if(!container)continue;
  for(const link of container.querySelectorAll('a[href]')){const path=new URL(link.href,location.href).pathname;const active=section==='dashboard'?path==='/admin/':path.split('/')[2]===section;if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
 }
 const more=document.getElementById('admin-more-open');more?.classList.toggle('is-current',!['dashboard','products','stores','requests'].includes(section));
 const selected=nav?.querySelector('a[aria-current]'),indicator=nav?.querySelector('.a-nav-indicator');
 if(selected&&indicator){indicator.hidden=false;indicator.style.height=selected.offsetHeight+'px';indicator.style.transform=`translateY(${selected.offsetTop}px)`;}
}
export function setupAdminShell(){
 const dialog=document.getElementById('admin-more'),open=document.getElementById('admin-more-open'),close=document.getElementById('admin-more-close');
 function hide(){if(dialog?.open)dialog.close();open?.setAttribute('aria-expanded','false');document.documentElement.classList.remove('admin-menu-open');}
 open?.addEventListener('click',()=>{if(dialog.open){hide();return;}dialog.showModal();open.setAttribute('aria-expanded','true');document.documentElement.classList.add('admin-menu-open');close.focus();});
 close?.addEventListener('click',hide);dialog?.addEventListener('cancel',event=>{event.preventDefault();hide();});
 dialog?.addEventListener('click',event=>{if(event.target===dialog){hide();return;}if(event.target.closest('a[href]'))hide();});
 window.addEventListener('resize',()=>{if(window.innerWidth>800)hide();updateActiveNavigation(document.getElementById('admin-main')?.dataset.section||'dashboard');});
 document.fonts?.ready.then(()=>updateActiveNavigation(document.getElementById('admin-main')?.dataset.section||'dashboard'));
 updateActiveNavigation(document.getElementById('admin-main')?.dataset.section||'dashboard');
 const online=()=>{const node=document.getElementById('offline-status');if(node)node.hidden=navigator.onLine;};window.addEventListener('online',online);window.addEventListener('offline',online);online();
 window.addEventListener('beforeunload',event=>{if(window.burenkaDirty||window.burenkaSaving){event.preventDefault();event.returnValue='';}});
 return {closeMenu:hide};
}
