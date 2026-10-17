import {spawnSync} from 'node:child_process';
import {copyFile,rm} from 'node:fs/promises';
const files=['src','scripts','tests','public/engine','public/pieces','public/favicon.svg','public/THIRD_PARTY_NOTICES.txt','public/licenses','package.json','package-lock.json','tsconfig.json','vite.config.ts','wrangler.jsonc','playwright.config.ts','index.html','README.md','VERIFICATION.md','LICENSE','.gitignore','启动初着.command'];
await rm('public/source.zip',{force:true});
const result=spawnSync('zip',['-qr','public/source.zip',...files],{stdio:'inherit'});
if(result.status!==0)throw Error('Source packaging failed');
await copyFile('public/source.zip','dist/source.zip');
