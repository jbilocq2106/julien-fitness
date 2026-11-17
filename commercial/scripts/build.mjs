import {cp,mkdir,rm,writeFile,readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(root+'artifacts',{recursive:true});
const files=await readdir(root+'src');
const fingerprint=createHash('sha256');for(const f of files.sort())fingerprint.update(await readFile(root+'src/'+f));
const version=fingerprint.digest('hex').slice(0,12);
for(const edition of ['free','pro']){
 const dir=root+'dist/'+edition;await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
 for(const name of files)await cp(root+'src/'+name,dir+'/'+name);
 await writeFile(dir+'/config.js',`export const EDITION = '${edition}';\n`);
 const sw=await readFile(dir+'/sw.js','utf8');await writeFile(dir+'/sw.js',sw.replace('mytraining-pro-source-v1',`mytraining-pro-${edition}-${version}`));
 await cp(root+'docs/INSTALLATION.md',dir+'/INSTALLATION.md');await cp(root+'LICENSE.txt',dir+'/LICENSE.txt');
 const zip=root+`artifacts/mytraining-${edition}-0.1.0.zip`;await rm(zip,{force:true});
 execFileSync('python',['-m','zipfile','-c',zip,...(await readdir(dir)).map(f=>dir+'/'+f)]);
 const hash=createHash('sha256').update(await readFile(zip)).digest('hex');await writeFile(zip+'.sha256',hash+'\n');
 console.log(`${edition}: ${zip} SHA-256 ${hash}`);
}
