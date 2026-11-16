import {app} from './src/app.js';
import {config} from './src/lib/config.js';
import {db} from './src/lib/db.js';
const server=app.listen(config.port,config.host,()=>console.log(`Бурёнка: ${config.origin}`));
server.requestTimeout=120000;server.headersTimeout=15000;server.keepAliveTimeout=5000;server.maxRequestsPerSocket=100;
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Порт ${config.port} уже занят. Остановите второй экземпляр приложения или измените PORT в .env.`:'Не удалось запустить сервер: '+error.code);process.exitCode=1;});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(async()=>{await db.$disconnect();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
