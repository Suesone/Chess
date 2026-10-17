import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const engine = JSON.parse(await readFile('node_modules/stockfish/package.json'));
await mkdir('public/engine', {recursive:true});
for(const name of ['stockfish-19-lite-single.js','stockfish-19-lite-single.wasm']) await copyFile('node_modules/stockfish/bin/'+name,'public/engine/'+name);
await copyFile('node_modules/stockfish/Copying.txt','public/engine/Copying.txt');
await copyFile('node_modules/stockfish/Copying.txt','LICENSE');
await writeFile('public/engine/SOURCE.txt',`Stockfish.js ${engine.version}, unmodified lite single-threaded build.\nExact corresponding source and build instructions: https://github.com/nmrugg/stockfish.js/tree/v${engine.version}\nSource archive: https://github.com/nmrugg/stockfish.js/archive/refs/tags/v${engine.version}.tar.gz\nStockfish: https://stockfishchess.org/\nLicense: GPL-3.0 (Copying.txt).\n`);
