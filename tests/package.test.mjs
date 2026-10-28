import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));

test('the distributed ZIP installs independently and inherits saved Wiggle settings', { timeout: 20_000 }, async t => {
    const temporary = await mkdtemp(join(tmpdir(), 'wiggleit-install-'));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const data = join(temporary, 'data');
    const runtime = join(temporary, 'runtime');
    await mkdir(runtime, { mode: 0o700 });
    const env = {
        ...process.env,
        XDG_DATA_HOME: data,
        XDG_CONFIG_HOME: join(temporary, 'config'),
        XDG_CACHE_HOME: join(temporary, 'cache'),
        XDG_RUNTIME_DIR: runtime,
        GSETTINGS_BACKEND: 'keyfile',
    };
    await run('dbus-run-session', ['--', 'gnome-extensions', 'install', join(root, 'wiggleit@tommymorgan.shell-extension.zip')], {
        env, timeout: 10_000,
    });
    const { stdout } = await run('gjs', [
        '-m', join(root, 'tests/fixtures/package.mjs'),
        join(data, 'gnome-shell/extensions/wiggleit@tommymorgan'),
    ], { env, timeout: 5_000 });
    assert.deepEqual(JSON.parse(stdout), {
        inheritedSize: 144,
        inheritedHidden: false,
        imported: true,
        legacySize: 144,
        legacyHidden: false,
        size: 128,
        hidden: false,
    }, 'the installed migration module and private legacy schema must inherit settings without modifying Wiggle');
});
