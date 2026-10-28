import { copyFileSync, cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

rmSync('dist', { recursive: true, force: true });
execFileSync('tsc', [], { stdio: 'inherit' });

for (const file of ['metadata.json', 'LICENSE.txt']) {
    copyFileSync(file, `dist/${file}`);
}
for (const directory of ['icons', 'schemas', 'migration-schemas']) {
    cpSync(directory, `dist/${directory}`, { recursive: true });
}
execFileSync('glib-compile-schemas', ['--strict', 'dist/schemas'], { stdio: 'inherit' });
execFileSync('glib-compile-schemas', ['--strict', 'dist/migration-schemas'], { stdio: 'inherit' });
