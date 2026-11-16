export function setupMobileMenu(root=document){
 const trigger=root.querySelector('.menu-toggle'),dialog=root.getElementById('mobile-menu');
 if(!trigger||!dialog)return;
 let savedScroll=0;
 function open(){savedScroll=window.scrollY;root.documentElement.classList.add('menu-is-open');root.body.style.top=`-${savedScroll}px`;root.querySelector('.header')?.classList.remove('header--hidden');trigger.setAttribute('aria-expanded','true');if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');dialog.querySelector('.mobile-menu__close')?.focus();}
 function close(){if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');root.documentElement.classList.remove('menu-is-open');root.body.style.top='';trigger.setAttribute('aria-expanded','false');window.scrollTo({top:savedScroll,behavior:'instant'});trigger.focus({preventScroll:true});}
 trigger.addEventListener('click',()=>dialog.open?close():open());
 dialog.querySelector('.mobile-menu__close')?.addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(event.target.closest('a[href]'))close();});
 window.addEventListener('resize',()=>{if(window.innerWidth>1000&&dialog.open)close();});
 // Native <dialog> traps focus; fallback keeps the same keyboard behavior.
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('a[href],button:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&root.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&root.activeElement===last){event.preventDefault();first.focus();}});
}
