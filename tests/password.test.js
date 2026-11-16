import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupPasswordVisibility} from '../site/js/admin/password.js';
test('Кнопка показывает и скрывает введённый пароль, сохраняя значение',()=>{
 const input={type:'password',value:'TestValue-NotARealPassword'};
 const attrs={'aria-controls':'login-password','aria-pressed':'false'};let click;
 const button={textContent:'Показать',getAttribute:key=>attrs[key],setAttribute:(key,value)=>attrs[key]=value,addEventListener:(name,handler)=>{assert.equal(name,'click');click=handler;}};
 setupPasswordVisibility({querySelectorAll:()=>[button],getElementById:id=>id==='login-password'?input:null});
 click();assert.equal(input.type,'text');assert.equal(button.textContent,'Скрыть');assert.equal(attrs['aria-pressed'],'true');
 click();assert.equal(input.type,'password');assert.equal(button.textContent,'Показать');assert.equal(attrs['aria-pressed'],'false');assert.equal(input.value,'TestValue-NotARealPassword');
});
