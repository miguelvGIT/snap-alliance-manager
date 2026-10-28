import {readFileSync,readdirSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));
assert.equal(manifest.lang,'en');assert.equal(manifest.display,'standalone');
for(const size of [192,512]){const data=readFileSync('dist/icon-'+size+'.png');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);}
const html=readFileSync('dist/index.html','utf8');assert(html.includes('lang="en"'));assert(!html.includes('@vite/client'));
const privateKey=existsSync('.dev.vars')?readFileSync('.dev.vars','utf8').match(/^VAPID_PRIVATE_KEY=(.+)$/m)?.[1]:null;
const files=[];const walk=dir=>{for(const item of readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())walk(path);else files.push(path);}};walk('dist');
if(privateKey)for(const file of files.filter(path=>/\.(js|mjs|html|json|webmanifest)$/.test(path)))assert(!readFileSync(file,'utf8').includes(privateKey),'A server secret appeared in the frontend');
assert(existsSync('dist/sw.js'));assert(!readFileSync('dist/sw.js','utf8').includes('precacheAndRoute'));
process.stdout.write(JSON.stringify({manifest:'English standalone PWA',icons:'192/512 valid',serverSecretsInFrontend:false,fullOfflineCache:false,assetFiles:files.length}));
