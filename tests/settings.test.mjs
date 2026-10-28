import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const fixture = fileURLToPath(new URL('./fixtures/settings.mjs', import.meta.url));
const extensionDirectory = fileURLToPath(new URL('../dist/', import.meta.url));

async function isolatedSettings(t, scenarios) {
    const temporary = await mkdtemp(join(tmpdir(), 'wiggleit-settings-'));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const runtime = join(temporary, 'runtime');
    const data = join(temporary, 'data');
    const systemData = join(temporary, 'system-data');
    const systemConfig = join(temporary, 'system-config');
    await Promise.all([
        mkdir(runtime, { mode: 0o700 }),
        mkdir(data),
        mkdir(systemData),
        mkdir(systemConfig),
    ]);
    const env = {
        ...process.env,
        HOME: temporary,
        XDG_CONFIG_HOME: join(temporary, 'config'),
        XDG_CACHE_HOME: join(temporary, 'cache'),
        XDG_DATA_HOME: data,
        XDG_DATA_DIRS: systemData,
        XDG_CONFIG_DIRS: systemConfig,
        XDG_RUNTIME_DIR: runtime,
        GSETTINGS_BACKEND: 'keyfile',
        GSETTINGS_SCHEMA_DIR: join(extensionDirectory, 'schemas'),
    };
    delete env.DBUS_SESSION_BUS_ADDRESS;
    delete env.DCONF_PROFILE;
    delete env.DCONF_DBUS_RUN_SESSION;
    for (const scenario of scenarios) {
        try {
            const { stdout } = await run('dbus-run-session', [
                '--', 'gjs', '-m', fixture, scenario, extensionDirectory,
            ], { env, timeout: 10_000, maxBuffer: 1024 * 1024 });
            assert.equal(stdout.trim(), `PASS ${scenario}`);
        } catch (error) {
            throw new Error(`Settings scenario ${scenario} failed\n${error.stdout ?? ''}\n${error.stderr ?? ''}`, { cause: error });
        }
    }
}

for (const [name, scenario] of [
    ['Saved legacy integer, boolean, and string values migrate without changing legacy settings', 'saved'],
    ['Explicit new choices win per key, including choices equal to schema defaults', 'explicit'],
    ['Unsaved legacy defaults remain defaults without creating new user values', 'defaults'],
    ['First use succeeds without an installed legacy extension or globally registered legacy schema', 'clean'],
    ['Completed migration does not reimport after resetting a new key or changing legacy settings', 'repeat'],
]) {
    test(name, { timeout: 20_000 }, t => isolatedSettings(t, [scenario]));
}

test('Migration completion and imported values survive a process restart without reimporting', { timeout: 30_000 },
    t => isolatedSettings(t, ['restart-seed', 'restart-verify']));
