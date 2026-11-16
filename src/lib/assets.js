import {readFileSync} from 'node:fs';
import path from 'node:path';
import {root} from './config.js';
let version='dev';
try {version=JSON.parse(readFileSync(path.join(root,'site/build-version.json'),'utf8')).version;} catch {}
export const asset=url=>url+(url.includes('?')?'&':'?')+'v='+encodeURIComponent(version);

export const assetVersion=version;
