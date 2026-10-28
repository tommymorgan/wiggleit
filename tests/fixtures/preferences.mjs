import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';
import System from 'system';

const checks = [];
let window;
let deadline;
let completed = false;
let complete;
const done = new Promise(resolve => { complete = resolve; });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const finish = result => {
    if (completed) return;
    completed = true;
    if (deadline) GLib.Source.remove(deadline);
    deadline = 0;
    GLib.file_set_contents(GLib.getenv('WIGGLE_PREFS_RESULT'), JSON.stringify(result));
    window?.close();
    complete(result.ok ? 0 : 1);
};

try {
    Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource'));
    Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-dbus-interfaces.gresource'));
    Adw.init();
    const {extensionManager} = await import('resource:///org/gnome/Shell/Extensions/js/extensionsService.js');
    const {ExtensionPrefsDialog} = await import('resource:///org/gnome/Shell/Extensions/js/extensionPrefsDialog.js');
    const info = Gio.DBus.session.call_sync('org.gnome.Shell', '/org/gnome/Shell',
        'org.gnome.Shell.Extensions', 'GetExtensionInfo', new GLib.Variant('(s)', ['wiggleit@tommymorgan']),
        null, Gio.DBusCallFlags.NONE, 5000, null);
    const [serialized] = info.deep_unpack();
    const extension = extensionManager.createExtensionObject(serialized);
    window = new ExtensionPrefsDialog(extension);
    deadline = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 12, () => {
        deadline = 0;
        finish({ok: false, error: 'GNOME preferences did not load/map before deadline', checks});
        return GLib.SOURCE_REMOVE;
    });
    window.connect('loaded', () => {
        window.present();
        const mapDeadline = GLib.get_monotonic_time() + 5000000;
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            if (completed) return GLib.SOURCE_REMOVE;
            try {
                if (!window.get_mapped() || !window.get_surface()?.get_mapped()) {
                    assert(GLib.get_monotonic_time() < mapDeadline, 'Preferences never mapped a real Wayland surface');
                    return GLib.SOURCE_CONTINUE;
                }
                assert(window.title === 'Wiggleit', `Unexpected preferences title: ${window.title}`);
                checks.push('preferences surface is mapped');
                const pending = [window];
                const toggles = [];
                const sizes = [];
                while (pending.length) {
                    const widget = pending.pop();
                    if (widget instanceof Adw.SwitchRow) toggles.push(widget);
                    if (widget instanceof Adw.SpinRow && widget.title === 'Cursor Size') sizes.push(widget);
                    for (let child = widget.get_first_child(); child; child = child.get_next_sibling()) pending.push(child);
                }
                assert(toggles.length === 1, `Expected one hide-cursor switch, found ${toggles.length}`);
                assert(sizes.length === 1, `Expected one cursor size control, found ${sizes.length}`);
                const settings = extension.stateObj.getSettings();
                const hidden = settings.get_boolean('hide-cursor');
                const size = settings.get_int('cursor-size');
                assert(size === 132 && hidden === false,
                    'Preferences did not preserve the migrated profile and subsequent Shell settings');
                assert(settings.get_boolean('wiggle-settings-imported'), 'Preferences lost the completed migration marker');
                assert(toggles[0].active === hidden, 'Hide cursor control did not load the saved setting');
                assert(sizes[0].value === size, 'Cursor size control did not load the saved setting');
                toggles[0].active = !hidden;
                assert(settings.get_boolean('hide-cursor') === !hidden, 'Hide cursor control did not update Gio.Settings');
                toggles[0].active = hidden;
                assert(settings.get_boolean('hide-cursor') === hidden, 'Hide cursor control failed to toggle back');
                checks.push('preferences hide-cursor binding');
                const newSize = size === 120 ? 144 : 120;
                sizes[0].value = newSize;
                assert(settings.get_int('cursor-size') === newSize, 'Cursor size control did not update Gio.Settings');
                sizes[0].value = size;
                assert(settings.get_int('cursor-size') === size, 'Cursor size control failed to restore its value');
                checks.push('preferences cursor-size binding');
                finish({ok: true, checks});
            } catch (error) {
                finish({ok: false, error: String(error), stack: error.stack, checks});
            }
            return GLib.SOURCE_REMOVE;
        });
    });
} catch (error) {
    finish({ok: false, error: String(error), stack: error.stack, checks});
}
System.exit(await done);
