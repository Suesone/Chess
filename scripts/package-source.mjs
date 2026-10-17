import { copyFile, lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { zipSync } from 'fflate';

// Explicit roots keep dependencies, credentials, caches and generated archives out.
const sourceRoots = [
  'src', 'scripts', 'tests', 'public/engine', 'public/pieces',
  'public/favicon.svg', 'public/THIRD_PARTY_NOTICES.txt', 'public/licenses',
  'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
  'wrangler.jsonc', 'playwright.config.ts', 'index.html', 'README.md',
  'VERIFICATION.md', 'LICENSE', '.gitignore', '启动初着.command',
];
const entries = Object.create(null);

async function collect(path) {
  try {
    const metadata = await lstat(path);
    if (metadata.isDirectory()) {
      for (const name of (await readdir(path)).sort()) await collect(`${path}/${name}`);
    } else if (metadata.isFile()) {
      entries[path] = [await readFile(path), {
        os: 3,
        attrs: ((metadata.mode & 0xffff) << 16) >>> 0,
        mtime: metadata.mtime,
      }];
    } else {
      throw new Error('Unsupported source entry type');
    }
  } catch (cause) {
    throw new Error(`Cannot package source entry: ${path}`, { cause });
  }
}

for (const path of sourceRoots) await collect(path);
const archive = zipSync(entries, { level: 6 });
await writeFile('public/source.zip', archive);
await copyFile('public/source.zip', 'dist/source.zip');
console.log(`Packaged ${Object.keys(entries).length} source files using JavaScript (${archive.length} bytes).`);
