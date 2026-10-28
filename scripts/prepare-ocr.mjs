import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mkdir, readdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const tess = dirname(require.resolve('tesseract.js/package.json'));
const core = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tess] }));
const lang = dirname(require.resolve('@tesseract.js-data/eng/package.json'));
const target = new URL('../public/ocr/', import.meta.url);
await mkdir(new URL('core/', target), { recursive: true });
await mkdir(new URL('lang/', target), { recursive: true });
await copyFile(join(tess, 'dist/worker.min.js'), new URL('worker.min.js', target));
for (const file of await readdir(core))
  if (/^tesseract-core.*\.(js|wasm)$/.test(file))
    await copyFile(join(core, file), new URL('core/' + file, target));
await copyFile(join(lang, '4.0.0/eng.traineddata.gz'), new URL('lang/eng.traineddata.gz', target));
await writeFile(new URL('LICENSE.txt', target), await readFile(join(tess, 'LICENSE.md')));
console.log('Prepared same-origin OCR worker, engine and English model.');
