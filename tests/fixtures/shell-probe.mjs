import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const uuid = 'wiggle@mechtifs';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export default class ShellProbe extends Extension {
    enable() {
        this._sources = new Set();
        this._finished = false;
        this._checks = [];
        this._deadline = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 35, () => {
            this._sources.delete(this._deadline);
            this._finish({ok: false, error: 'Runtime scenario deadline exceeded', checks: this._checks});
            return GLib.SOURCE_REMOVE;
        });
        this._sources.add(this._deadline);
        this._run().then(() => this._finish({ok: true, checks: this._checks}))
            .catch(error => this._finish({ok: false, error: String(error), stack: error.stack, checks: this._checks}));
    }

    _sleep(milliseconds) {
        return new Promise(resolve => {
            const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => {
                this._sources.delete(id);
                resolve();
                return GLib.SOURCE_REMOVE;
            });
            this._sources.add(id);
        });
    }

    async _until(predicate, message, timeout = 5000) {
        const deadline = GLib.get_monotonic_time() + timeout * 1000;
        while (!predicate()) {
            assert(GLib.get_monotonic_time() < deadline, message);
            await this._sleep(25);
        }
    }

    _finish(result) {
        if (this._finished) return;
        this._finished = true;
        this.disable();
        GLib.file_set_contents(GLib.getenv('WIGGLE_TEST_RESULT'), JSON.stringify(result));
        global.context.terminate();
    }

    disable() {
        for (const id of this._sources ?? []) GLib.Source.remove(id);
        this._sources?.clear();
        this._preferences?.force_exit();
        this._preferences = null;
    }

    async _run() {
        const manager = Main.extensionManager;
        await this._until(() => manager.lookup(uuid),
            'Environment/startup failure: packaged extension was not discovered', 10000);
        // Enable the target after this supervisor, avoiding Shell's extension rebase.
        await manager.enableExtension(uuid);
        await this._until(() => manager.lookup(uuid)?.stateObj?._effect,
            'Environment/startup failure: packaged Wiggleit extension did not enable', 10000);
        await this._until(() => !Main.layoutManager._startingUp,
            'Environment/startup failure: Shell startup did not complete', 10000);
        Main.overview.hide();
        await this._until(() => !Main.overview.visible, 'Shell overview did not close');
        const extension = manager.lookup(uuid);
        const state = extension.stateObj;
        const settings = state.getSettings();
        const seat = global.stage.get_context().get_backend().get_default_seat();
        const tracker = global.backend.get_cursor_tracker();
        // This characterized stimulus tests change-only sampling; it makes no claim
        // about the sensitivity of the shipped defaults.
        for (const [key, value] of Object.entries({
            'sample-size': 1000, 'radians-threshold': 15, 'distance-threshold': 180,
            'check-interval': 20, 'draw-interval': 8,
            'magnify-duration': 1, 'unmagnify-duration': 1, 'unmagnify-delay': 0,
        })) settings.set_int(key, value);
        settings.set_boolean('hide-cursor', true);
        await this._sleep(100);
        const pointer = seat.create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
        let triggered = false;
        for (let movement = 0; movement < 40; movement++) {
            pointer.notify_absolute_motion(GLib.get_monotonic_time(), movement % 2 ? 300 : 600, 300);
            await this._sleep(16);
            triggered ||= state._effect.isWiggling && state._effect.get_parent() === Main.uiGroup;
        }
        assert(triggered, 'Real 300px virtual-pointer reversals did not attach a magnifier actor');
        this._checks.push('virtual-pointer gesture attaches magnifier');

        // Use manager lifecycle and Gio.Settings, not synthetic extension facades.
        // _effect and timer IDs are observed only because these resources have no
        // external introspection API; effect/cursor methods are their actual API.
        settings.set_int('check-interval', 100000);
        await manager.disableExtension(uuid);
        await this._until(() => !state._effect, 'Manager did not disable the extension');
        await manager.enableExtension(uuid);
        await this._until(() => state._effect, 'Manager did not re-enable the extension');
        let effect = state._effect;
        const cursor = effect.cursor;
        const unfocusBefore = seat.is_unfocus_inhibited();
        assert(cursor.sprite !== null, 'Visible pointer has no cursor sprite');
        const visibleBefore = tracker.get_pointer_visible();
        cursor.hide();
        cursor.hide();
        assert(seat.is_unfocus_inhibited(), 'Cursor hide did not acquire seat inhibition');
        assert(cursor.sprite !== null, 'Hiding the native pointer lost the magnifier sprite');
        cursor.show();
        cursor.show();
        assert(seat.is_unfocus_inhibited() === unfocusBefore, 'Repeated cursor show/hide leaked owned seat inhibition');
        assert(tracker.get_pointer_visible() === visibleBefore, 'Repeated show/hide did not restore pointer visibility');
        this._checks.push('cursor ownership is balanced');

        seat.inhibit_unfocus();
        tracker.inhibit_cursor_visibility();
        try {
            cursor.hide();
            cursor.hide();
            cursor.show();
            cursor.show();
            assert(seat.is_unfocus_inhibited(), 'Cursor show removed an external seat inhibition');
            assert(!tracker.get_pointer_visible(), 'Cursor show removed an external visibility inhibition');
        } finally {
            tracker.uninhibit_cursor_visibility();
            seat.uninhibit_unfocus();
        }
        assert(tracker.get_pointer_visible() === visibleBefore, 'External visibility inhibition was leaked');
        this._checks.push('external inhibition survives cursor show');

        effect.move(400, 300);
        effect.magnify();
        assert(effect.get_parent() === Main.uiGroup, 'Magnify did not attach its actor');
        assert(seat.is_unfocus_inhibited(), 'Magnify did not hide the real cursor');
        effect.unmagnify();
        await this._until(() => !effect.isWiggling && !effect.get_parent(), 'Unmagnify did not detach its actor');
        assert(seat.is_unfocus_inhibited() === unfocusBefore, 'Unmagnify left owned seat inhibition');
        assert(tracker.get_pointer_visible() === visibleBefore, 'Unmagnify did not restore pointer visibility');
        this._checks.push('unmagnify removes actor and restores pointer');

        const disableAndAssertClean = async (pending) => {
            effect = state._effect;
            const timers = [state._checkTimeoutId, state._drawIntervalWatch];
            let destroyed = false;
            effect.connect('destroy', () => { destroyed = true; });
            effect.magnify();
            assert(effect.get_parent() === Main.uiGroup, 'Lifecycle setup did not magnify');
            if (pending) {
                effect.unmagnify();
                assert(effect._unmagnifyDelayId > 0, 'Lifecycle setup did not schedule an unmagnify delay');
                timers.push(effect._unmagnifyDelayId);
            }
            await manager.disableExtension(uuid);
            await this._until(() => !state._effect, 'Manager disable did not release effect');
            assert(destroyed && !Main.uiGroup.get_children().includes(effect), 'Disable left magnifier actor attached');
            assert(seat.is_unfocus_inhibited() === unfocusBefore, 'Disable left owned seat inhibition');
            assert(tracker.get_pointer_visible() === visibleBefore, 'Disable did not restore pointer visibility');
            for (const id of timers) {
                assert(id > 0 && !GLib.MainContext.default().find_source_by_id(id), `Disable left timer ${id} alive`);
            }
            await this._sleep(pending ? 350 : 50);
            assert(seat.is_unfocus_inhibited() === unfocusBefore, 'A stale callback changed cursor inhibition after disable');
            await manager.enableExtension(uuid);
            await this._until(() => state._effect, 'Manager re-enable did not recreate effect');
        };
        await disableAndAssertClean(false);
        this._checks.push('disable while magnified cleans resources');
        settings.set_int('unmagnify-delay', 250);
        await this._sleep(50);
        await disableAndAssertClean(true);
        this._checks.push('disable with pending unmagnify cleans resources');

        settings.set_int('cursor-size', 132);
        settings.set_boolean('hide-cursor', false);
        await this._until(() => state._effect.icon_size === 132 && !state._effect.isHidden,
            'Settings changes after re-enable did not reach the new effect');
        effect = state._effect;
        effect.magnify();
        assert(effect.get_parent() === Main.uiGroup && effect.icon_size === 132, 'Re-enabled magnifier ignored size setting');
        assert(seat.is_unfocus_inhibited() === unfocusBefore && tracker.get_pointer_visible() === visibleBefore,
            'Re-enabled magnifier ignored hide-cursor=false');
        await manager.disableExtension(uuid);
        await this._until(() => !state._effect, 'Final disable did not clean effect');
        this._checks.push('re-enable applies live settings');

        Main.overview.hide();
        this._preferences = Gio.Subprocess.new(['gjs', '-m', GLib.getenv('WIGGLE_PREFS_FIXTURE')],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
        const process = this._preferences;
        const [stdout, stderr] = await new Promise((resolve, reject) => {
            process.communicate_utf8_async(null, null, (child, result) => {
                try {
                    const [, output, errors] = child.communicate_utf8_finish(result);
                    resolve([output, errors]);
                } catch (error) { reject(error); }
            });
        });
        this._preferences = null;
        const [exists, contents] = GLib.file_get_contents(GLib.getenv('WIGGLE_PREFS_RESULT'));
        assert(exists, `Preferences did not write structured results:\n${stdout}\n${stderr}`);
        const preferences = JSON.parse(new TextDecoder().decode(contents));
        assert(process.get_successful() && preferences.ok,
            `Preferences assertions failed: ${JSON.stringify(preferences)}\n${stdout}\n${stderr}`);
        this._checks.push(...preferences.checks);
    }
}
