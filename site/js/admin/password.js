export function setupPasswordVisibility(root=document){
 for(const button of root.querySelectorAll('[data-toggle-password]')){
  const input=root.getElementById(button.getAttribute('aria-controls'));
  if(!input)continue;
  button.addEventListener('click',()=>{
   const visible=input.type==='password';
   input.type=visible?'text':'password';
   button.setAttribute('aria-pressed',String(visible));
   button.setAttribute('aria-label',visible?'Скрыть пароль':'Показать пароль');
   button.textContent=visible?'Скрыть':'Показать';
  });
 }
}
