import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupMobileMenu} from '../site/js/mobile-menu.js';
test('Полноэкранное меню блокирует фон, закрывается по Escape и возвращает фокус',()=>{
 const dom=new JSDOM('<html><body><header class="header header--hidden"><button class="menu-toggle" aria-expanded="false"></button></header><dialog id="mobile-menu"><button class="mobile-menu__close">Закрыть</button><a href="/catalog">Каталог</a></dialog></body></html>',{url:'http://localhost:3000'}),win=dom.window,old=globalThis.window;globalThis.window=win;win.scrollTo=()=>{};
 const dialog=win.document.querySelector('dialog');dialog.showModal=function(){this.setAttribute('open','');};dialog.close=function(){this.removeAttribute('open');};
 try{setupMobileMenu(win.document);const trigger=win.document.querySelector('.menu-toggle');trigger.click();assert(dialog.open);assert(win.document.documentElement.classList.contains('menu-is-open'));assert.equal(trigger.getAttribute('aria-expanded'),'true');dialog.dispatchEvent(new win.Event('cancel',{cancelable:true}));assert(!dialog.open);assert(!win.document.documentElement.classList.contains('menu-is-open'));assert.equal(win.document.activeElement,trigger);}finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;win.close();}
});
