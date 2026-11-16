import {removeUnusedMedia} from '../src/services/media.js';
import {db} from '../src/lib/db.js';
try{const dryRun=!process.argv.includes('--apply');const files=await removeUnusedMedia({dryRun});console.log(dryRun?'Предпросмотр. Для удаления: npm run media:cleanup -- --apply':'Удалены неиспользуемые изображения старше 24 часов.');console.log(files.join('\n')||'Неиспользуемых изображений нет.');}finally{await db.$disconnect();}
