import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../site/js/admin/api.js';
const original={fetch:globalThis.fetch,document:globalThis.document,window:globalThis.window};
afterEach(()=>{for(const [key,value] of Object.entries(original)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function page(){
 const workspace={children:[],prepend(node){this.children.unshift(node);}};
 const meta={content:'old-csrf'};
 globalThis.document={body:workspace,getElementById:id=>workspace.children.find(node=>node.id===id),querySelector:selector=>selector==='.a-main'?workspace:selector.includes('csrf-token')?meta:null,createElement:tag=>({tag,children:[],setAttribute(){},append(...nodes){this.children.push(...nodes);}})};
 globalThis.window={burenkaDirty:true};
 return {workspace,meta};
}
test('Истёкшая сессия не уводит редактор со страницы и оставляет данные в памяти',async()=>{
 const {workspace}=page();globalThis.fetch=async()=>response(401,{error:'Нужен вход'});
 await assert.rejects(()=>api('/api/admin/products/p1',{method:'PUT',body:{name:'Несохранённое название'}}),/Сессия завершена/);
 assert.equal(window.burenkaDirty,true);assert.equal(workspace.children[0].id,'session-expired');
 assert(workspace.children[0].children.some(node=>node.href==='/admin/login'&&node.target==='_blank'));
});
test('Обновление CSRF после повторного входа сохраняет исходное тело запроса',async()=>{
 const {meta}=page(),calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,...options});if(calls.length===1)return response(403,{error:'Обновите страницу'});if(calls.length===2)return response(200,{csrf:'new-csrf'});return response(200,{ok:true,id:'p1'});};
 const result=await api('/api/admin/products/p1',{method:'PUT',body:{name:'Несохранённое название'}});
 assert.equal(result.ok,true);assert.equal(meta.content,'new-csrf');assert.equal(calls.length,3);
 assert.equal(calls[1].url,'/api/auth/session');assert.equal(calls[0].body,calls[2].body);assert.equal(calls[2].headers['X-CSRF-Token'],'new-csrf');
});
test('CSRF-ошибка не приводит к бесконечным повторам сохранения',async()=>{
 page();let calls=0;globalThis.fetch=async url=>{calls++;return url==='/api/auth/session'?response(200,{csrf:'new-csrf'}):response(403,{error:'Доступ запрещён'});};
 await assert.rejects(()=>api('/api/admin/products/p1',{method:'PUT',body:{name:'Название'}}),/Доступ запрещён/);assert.equal(calls,3);
});
