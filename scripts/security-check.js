import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {config} from '../src/lib/config.js';
const loopback=host=>host==='127.0.0.1'||host==='::1'||host==='localhost';
console.log(`Бурёнка: HOST=${config.host}, PORT=${config.port}, режим=${config.prod?'production':'локальный'}`);
console.log(loopback(config.host)?'В настройках указана привязка к loopback. Внешний bind приложения не настроен.':'Приложение настроено на сетевой интерфейс. Проверьте, нужен ли доступ из локальной сети.');
console.log(`Сессии: HttpOnly, SameSite=Lax, Secure=${config.prod}; reverse proxy=${config.trustProxy||'выключен'}.`);
console.log('Секреты, пароли и DATABASE_URL не выводятся.');
let listeners=[];
if(process.platform==='win32'){
 try{const result=execFileSync('netstat',['-ano'],{encoding:'utf8',windowsHide:true,timeout:10000});
  for(const line of result.split(/\r?\n/)){const cols=line.trim().split(/\s+/);if(cols[0]==='TCP'&&cols.includes('LISTENING'))listeners.push({protocol:'TCP',local:cols[1],pid:cols.at(-1)});else if(cols[0]==='UDP')listeners.push({protocol:'UDP',local:cols[1],pid:cols.at(-1)});}
 }catch{console.log('Не удалось прочитать список портов. В CMD выполните: netstat -ano');}
}else{
 for(const [file,v6,protocol] of [['/proc/net/tcp',false,'TCP'],['/proc/net/tcp6',true,'TCP'],['/proc/net/udp',false,'UDP'],['/proc/net/udp6',true,'UDP']])try{
  const text=await readFile(file,'utf8');for(const line of text.trim().split('\n').slice(1)){const cols=line.trim().split(/\s+/);if(protocol==='TCP'&&cols[3]!=='0A')continue;const [addr,hexPort]=cols[1].split(':');let host;
   if(!v6)host=addr.match(/../g).reverse().map(x=>parseInt(x,16)).join('.');
   else{const decoded=addr.match(/.{8}/g).map(word=>word.match(/../g).reverse().join('')).join('');host=/^0{31}1$/.test(decoded)?'::1':/^0+$/.test(decoded)?'::':decoded.match(/.{4}/g).join(':');}
   listeners.push({protocol,local:`${v6?'['+host+']':host}:${parseInt(hexPort,16)}`,pid:'недоступен'});
  }
 }catch{}
}
console.log('Прослушиваемые TCP и привязанные UDP-порты этой машины:');
for(const row of listeners){console.log(`  ${row.protocol} ${row.local} — PID ${row.pid}${/^(?:0\.0\.0\.0:|\[::\]:)/.test(row.local)?' — все интерфейсы':''}`);}
if(!listeners.length)console.log('  Данные не получены либо привязанных портов нет.');
console.log('Это проверка машины, на которой запущена команда. Она не проверяет другие компьютеры, сервер, роутер и внешний firewall.');
