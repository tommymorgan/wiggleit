import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {access, chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
const uuid = 'wiggle@mechtifs';
const expectedChecks = [
    'virtual-pointer gesture attaches magnifier',
    'cursor ownership is balanced',
    'external inhibition survives cursor show',
    'unmagnify removes actor and restores pointer',
    'disable while magnified cleans resources',
    'disable with pending unmagnify cleans resources',
    're-enable applies live settings',
    'preferences surface is mapped',
    'preferences hide-cursor binding',
    'preferences cursor-size binding',
];

async function run(command, args, env, timeout) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {env, detached: true, stdio: ['ignore', 'pipe', 'pipe']});
        let log = '';
        let timedOut = false;
        const append = chunk => { log = (log + chunk).slice(-24000); };
        child.stdout.on('data', append);
        child.stderr.on('data', append);
        const kill = signal => {
            if (!child.pid) return;
            try { process.kill(-child.pid, signal); } catch (error) {
                if (error.code !== 'ESRCH') throw error;
            }
        };
        const deadline = setTimeout(() => { timedOut = true; kill('SIGKILL'); }, timeout);
        child.once('error', error => {
            clearTimeout(deadline);
            reject(new Error(`Environment prerequisite: cannot execute ${command}: ${error.message}`));
        });
        child.once('close', (code, signal) => {
            clearTimeout(deadline);
            // dbus activation and renderer helpers can outlive their immediate parent.
            kill('SIGKILL');
            resolve({code, signal, log, timedOut});
        });
    });
}

async function prerequisites() {
    const shellLib = '/usr/lib/gnome-shell';
    const directories = [path.join(shellLib, 'girepository-1.0'), shellLib];
    let hasShew = false;
    for (const directory of directories) {
        try {
            hasShew ||= (await readdir(directory)).some(name => /^Shew-.*\.typelib$/.test(name));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    assert.ok(hasShew, 'Environment prerequisite: GNOME Shell client Shew typelib in /usr/lib/gnome-shell/girepository-1.0 or /usr/lib/gnome-shell');
    for (const resource of ['org.gnome.Shell.Extensions.src.gresource', 'gnome-shell-dbus-interfaces.gresource']) {
        await access(`/usr/share/gnome-shell/${resource}`).catch(error => {
            throw new Error(`Environment prerequisite: GNOME Shell preferences resource ${resource}: ${error.message}`);
        });
    }
    return directories.join(':');
}

test('clean packaged extension recognizes gestures, owns cursor lifecycle, and opens bound GNOME preferences', {timeout: 65000}, async () => {
    const typelibPath = await prerequisites();
    const temporary = await mkdtemp(path.join(tmpdir(), 'wiggleit-shell-test-'));
    try {
        const data = path.join(temporary, 'data');
        const extension = path.join(data, 'gnome-shell/extensions', uuid);
        const probe = path.join(data, 'gnome-shell/extensions/shell-test@wiggleit');
        for (const directory of [extension, probe, ...['config', 'cache', 'runtime'].map(name => path.join(temporary, name))]) {
            await mkdir(directory, {recursive: true, mode: 0o700});
        }
        await chmod(path.join(temporary, 'runtime'), 0o700);
        const env = {
            ...process.env,
            XDG_DATA_HOME: data,
            XDG_CONFIG_HOME: path.join(temporary, 'config'),
            XDG_CACHE_HOME: path.join(temporary, 'cache'),
            XDG_RUNTIME_DIR: path.join(temporary, 'runtime'),
            XDG_DATA_DIRS: '/usr/local/share:/usr/share',
            XDG_CONFIG_DIRS: '/etc/xdg',
            XDG_CURRENT_DESKTOP: 'GNOME',
            XDG_SESSION_TYPE: 'wayland',
            GSETTINGS_BACKEND: 'keyfile',
            GDK_BACKEND: 'wayland',
            GTK_A11Y: 'none',
            GSK_RENDERER: 'cairo',
            LIBGL_ALWAYS_SOFTWARE: '1',
            GI_TYPELIB_PATH: typelibPath,
            LD_LIBRARY_PATH: '/usr/lib/gnome-shell',
            WAYLAND_DISPLAY: `wiggleit-test-${process.pid}-${path.basename(temporary)}`,
            WIGGLE_TEST_RESULT: path.join(temporary, 'result.json'),
            WIGGLE_PREFS_RESULT: path.join(temporary, 'preferences.json'),
            WIGGLE_PREFS_FIXTURE: path.join(fixtures, 'preferences.mjs'),
        };
        for (const key of ['DBUS_SESSION_BUS_ADDRESS', 'DBUS_STARTER_ADDRESS', 'DBUS_STARTER_BUS_TYPE', 'DISPLAY', 'GNOME_SETUP_DISPLAY', 'SESSION_MANAGER']) delete env[key];
        const unpack = await run('unzip', ['-q', path.join(root, `${uuid}.shell-extension.zip`), '-d', extension], env, 5000);
        assert.equal(unpack.code, 0, `Archive extraction failed (requires unzip):\n${unpack.log}`);
        const schemas = await run('glib-compile-schemas', [path.join(extension, 'schemas')], env, 5000);
        assert.equal(schemas.code, 0, `Packaged schemas failed to compile:\n${schemas.log}`);
        await copyFile(path.join(fixtures, 'shell-probe.mjs'), path.join(probe, 'extension.js'));
        await writeFile(path.join(probe, 'metadata.json'), JSON.stringify({
            uuid: 'shell-test@wiggleit', name: 'Wiggleit isolated integration probe',
            description: 'Test-only extension in a private headless shell', 'shell-version': ['51'],
        }));
        const execution = await run('dbus-run-session', ['--', process.execPath, path.join(root, 'tests/helpers/shell-session.mjs')], env, 45000);
        const diagnostics = `Private GNOME Shell ${execution.timedOut ? 'timed out' : `exited ${execution.code} (${execution.signal ?? 'no signal'})`}:\n${execution.log}`;
        let result;
        try {
            result = JSON.parse(await readFile(env.WIGGLE_TEST_RESULT, 'utf8'));
        } catch (error) {
            assert.fail(`Environment/startup failure: probe did not produce structured results: ${error.message}\n${diagnostics}`);
        }
        assert.equal(result.ok, true, `Runtime assertion failed: ${JSON.stringify(result)}\n${diagnostics}`);
        assert.equal(execution.timedOut, false, diagnostics);
        assert.equal(execution.code, 0, diagnostics);
        assert.deepEqual(result.checks, expectedChecks, diagnostics);
        const preferences = JSON.parse(await readFile(env.WIGGLE_PREFS_RESULT, 'utf8'));
        assert.equal(preferences.ok, true, JSON.stringify(preferences));
        assert.deepEqual(preferences.checks, expectedChecks.slice(-3));
    } finally {
        await rm(temporary, {recursive: true, force: true});
    }
});
