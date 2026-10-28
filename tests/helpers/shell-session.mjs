import {spawn, spawnSync} from 'node:child_process';

// This process runs inside the test's private dbus-run-session, never the desktop bus.
// Shell rebases later extensions when one is disabled; the supervisor must be first.
for (const [key, value] of [
    ['enabled-extensions', "['shell-test@wiggleit']"],
    ['disable-user-extensions', 'false'],
]) {
    const result = spawnSync('gsettings', ['set', 'org.gnome.shell', key, value], {
        env: process.env, encoding: 'utf8', timeout: 5000,
    });
    if (result.error || result.status !== 0) {
        console.error(`Environment prerequisite: isolated gsettings ${key}: ${result.error ?? result.stderr}`);
        process.exit(1);
    }
}
const shell = spawn('gnome-shell', [
    '--headless', '--wayland', `--wayland-display=${process.env.WAYLAND_DISPLAY}`,
    '--virtual-monitor=1280x720', '--no-x11',
], {stdio: 'inherit', env: process.env});
shell.on('error', error => {
    console.error(`Environment prerequisite: starting GNOME Shell: ${error.message}`);
    process.exitCode = 1;
});
shell.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
});
