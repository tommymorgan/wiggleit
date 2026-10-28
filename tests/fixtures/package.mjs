import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const path = ARGV[0];
const [, contents] = GLib.file_get_contents(`${path}/metadata.json`);
const metadata = JSON.parse(new TextDecoder().decode(contents));
if (metadata.uuid !== 'wiggleit@tommymorgan' ||
    metadata['settings-schema'] !== 'org.gnome.shell.extensions.wiggleit' ||
    metadata['gettext-domain'] !== 'gnome-shell-extension-wiggleit') {
    throw Error('The installed extension does not have an independent Wiggleit identity');
}
const source = Gio.SettingsSchemaSource.new_from_directory(`${path}/schemas`, Gio.SettingsSchemaSource.get_default(), false);
const schema = source.lookup(metadata['settings-schema'], false);
if (!schema) throw Error('The installed extension schema cannot be loaded');
const settings = new Gio.Settings({ settings_schema: schema });
if (source.lookup('org.gnome.shell.extensions.wiggle', false)) {
    throw Error('The active schema directory must not expose the legacy Wiggle schema');
}
const legacySource = Gio.SettingsSchemaSource.new_from_directory(
    `${path}/migration-schemas`, Gio.SettingsSchemaSource.get_default(), false);
const legacySchema = legacySource.lookup('org.gnome.shell.extensions.wiggle', false);
if (!legacySchema) throw Error('The installed private legacy schema cannot be loaded');
const legacy = new Gio.Settings({settings_schema: legacySchema});
if (!legacy.set_int('cursor-size', 144) || !legacy.set_boolean('hide-cursor', false)) {
    throw Error('Legacy profile setup failed');
}
const {migrateSettings} = await import(GLib.filename_to_uri(`${path}/settings.js`, null));
migrateSettings(settings, path);
const inheritedSize = settings.get_int('cursor-size');
const inheritedHidden = settings.get_boolean('hide-cursor');
const imported = settings.get_boolean('wiggle-settings-imported');
if (!settings.set_int('cursor-size', 128) || !settings.set_boolean('hide-cursor', false)) {
    throw Error('The installed extension settings are not writable');
}
print(JSON.stringify({
    inheritedSize,
    inheritedHidden,
    imported,
    legacySize: legacy.get_int('cursor-size'),
    legacyHidden: legacy.get_boolean('hide-cursor'),
    size: settings.get_int('cursor-size'),
    hidden: settings.get_boolean('hide-cursor'),
}));
