import { copyFileSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

for (const file of ['metadata.json', 'LICENSE.txt']) {
    copyFileSync(file, `dist/${file}`);
}
for (const directory of ['icons', 'schemas']) {
    cpSync(directory, `dist/${directory}`, { recursive: true });
}
execFileSync('glib-compile-schemas', ['--strict', 'dist/schemas'], { stdio: 'inherit' });
