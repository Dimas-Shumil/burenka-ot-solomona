const path = require('node:path');
module.exports={apps:[{name:'burenka',script:'server.js',cwd:path.resolve(__dirname,'..'),instances:1,exec_mode:'fork',watch:false,autorestart:true,max_memory_restart:'400M',time:true,env:{NODE_ENV:'production'}}]};
