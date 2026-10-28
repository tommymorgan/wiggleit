import {spawnSync} from 'node:child_process';
import {accessSync, constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Build the package separately; this runner never writes into the checkout.
// Usage: node tools/compatibility-runtime.mjs [--build] [40 41 42 43 44]
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const build = args.includes('--build');
const selected = args.filter(argument => argument !== '--build');
const versions = selected.length ? selected : ['40', '41', '42', '43', '44'];
if (versions.some(version => !['40', '41', '42', '43', '44'].includes(version))) {
    throw new Error('Usage: node tools/compatibility-runtime.mjs [--build] [40 41 42 43 44]');
}
accessSync(path.join(root, 'wiggleit@tommymorgan.shell-extension.zip'), constants.R_OK);
let failed = false;
for (const version of versions) {
    const image = `localhost/wiggleit-runtime:fedora${version}`;
    if (build) {
        const result = spawnSync('podman', [
            'build', '--security-opt', 'label=disable', '--build-arg', `FEDORA_VERSION=${version}`,
            '-f', path.join(root, 'tools/compatibility-runtime.Containerfile'), '-t', image,
            path.join(root, 'tools'),
        ], {stdio: 'inherit'});
        if (result.error) throw result.error;
        if (result.status !== 0) {
            failed = true;
            continue;
        }
    }
    console.log(`\n=== Fedora ${version}: installed runtime and ten real-GI scenarios ===`);
    const result = spawnSync('podman', [
        'run', '--rm', '--security-opt', 'label=disable', '--network=none', '--tmpfs', '/run',
        '-v', `${root}:/work:ro`, image, 'sh', '-ec',
        // RPM installs this empty marker even without a running logind. Remove it
        // so Shell uses its native non-systemd login manager, not a fake service.
        'if [ -d /run/systemd/seats ]; then rmdir /run/systemd/seats; fi; ' +
        'mkdir -p /run/dbus; dbus-daemon --system --fork; ' +
        'gnome-shell --version; gjs --version; node --version; ' +
        'exec node --test tests/shell.test.mjs',
    ], {stdio: 'inherit', timeout: 90000});
    if (result.error) throw result.error;
    if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
