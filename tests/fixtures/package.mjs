import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const path = ARGV[0];
const [, contents] = GLib.file_get_contents(`${path}/metadata.json`);
const metadata = JSON.parse(new TextDecoder().decode(contents));
const source = Gio.SettingsSchemaSource.new_from_directory(`${path}/schemas`, Gio.SettingsSchemaSource.get_default(), false);
const schema = source.lookup(metadata['settings-schema'], false);
if (!schema) throw Error('The installed extension schema cannot be loaded');
const settings = new Gio.Settings({ settings_schema: schema });
if (!settings.set_int('cursor-size', 128) || !settings.set_boolean('hide-cursor', false)) {
    throw Error('The installed extension settings are not writable');
}
print(JSON.stringify({ size: settings.get_int('cursor-size'), hidden: settings.get_boolean('hide-cursor') }));
