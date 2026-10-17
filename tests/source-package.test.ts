import {it,expect} from 'vitest';
import {cp,mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {unzipSync,strFromU8} from 'fflate';

const project=process.cwd(),script=resolve(project,'scripts/package-source.mjs');
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'chess-source-'));
 for(const path of ['src','scripts','tests','public','package.json','package-lock.json','tsconfig.json','vite.config.ts','wrangler.jsonc','playwright.config.ts','index.html','README.md','VERIFICATION.md','LICENSE','.gitignore','启动初着.command'])await cp(resolve(project,path),join(root,path),{recursive:true});
 await mkdir(join(root,'dist'));await mkdir(join(root,'node_modules'));
 await writeFile(join(root,'node_modules','excluded.txt'),'not part of the source archive');
 return root;
}
function run(root:string){return spawnSync(process.execPath,[script],{cwd:root,env:{...process.env,PATH:''},encoding:'utf8'});}

it('源码打包无需系统命令，Unicode、二进制文件和两份下载包保持完整',async()=>{
 const root=await fixture();
 try{
  const result=run(root);expect(result.status,result.stderr).toBe(0);
  const archive=await readFile(join(root,'public/source.zip'));
  expect(await readFile(join(root,'dist/source.zip'))).toEqual(archive);
  const entries=unzipSync(archive);
  expect(strFromU8(entries['启动初着.command'])).toContain('#!/bin/zsh');
  expect(Buffer.from(entries['public/engine/stockfish-19-lite-single.wasm'])).toEqual(await readFile(join(root,'public/engine/stockfish-19-lite-single.wasm')));
  expect(entries['wrangler.jsonc']).toBeDefined();
  expect(Object.keys(entries).some(p=>p.startsWith('node_modules/')||p.startsWith('dist/')||p==='public/source.zip'||p.startsWith('/')||p.includes('../'))).toBe(false);
 }finally{await rm(root,{recursive:true,force:true});}
});

it('源码文件缺失时失败并明确指出路径，保留此前的备份',async()=>{
 const root=await fixture();
 try{
  await writeFile(join(root,'public/source.zip'),'existing archive');await rm(join(root,'LICENSE'));
  const result=run(root);expect(result.status).not.toBe(0);expect(result.stderr).toContain('Cannot package source entry: LICENSE');
  expect(await readFile(join(root,'public/source.zip'),'utf8')).toBe('existing archive');
 }finally{await rm(root,{recursive:true,force:true});}
});
