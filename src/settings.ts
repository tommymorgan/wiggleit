import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const IMPORTED = 'wiggle-settings-imported';

/** Read saved Wiggle values without registering its schema as Wiggleit's identity. */
export function migrateSettings(settings: Gio.Settings, extensionDirectory: string): void {
    if (settings.get_boolean(IMPORTED)) return;

    const source = Gio.SettingsSchemaSource.new_from_directory(
        GLib.build_filenamev([extensionDirectory, 'migration-schemas']), null, false);
    const schema = source.lookup('org.gnome.shell.extensions.wiggle', false);
    if (!schema) throw new Error('Bundled Wiggle migration schema is missing');

    const legacy = Gio.Settings.new_full(schema, settings.backend, null);
    // A separate delayed instance keeps the caller's future writes immediate.
    // Values and completion are committed together; an interrupted import can retry.
    const pending = Gio.Settings.new_full(settings.settings_schema, settings.backend, settings.path);
    pending.delay();
    for (const key of schema.list_keys()) {
        const value = legacy.get_user_value(key);
        if (value !== null && settings.get_user_value(key) === null) {
            if (!pending.set_value(key, value)) {
                throw new Error(`Cannot import Wiggle setting: ${key}`);
            }
        }
    }
    if (!pending.set_boolean(IMPORTED, true)) {
        throw new Error('Cannot mark Wiggle settings import complete');
    }
    pending.apply();
}
