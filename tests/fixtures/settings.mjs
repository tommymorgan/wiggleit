import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const [scenario, extensionDirectory] = ARGV;
const activeId = 'org.gnome.shell.extensions.wiggleit';
const legacyId = 'org.gnome.shell.extensions.wiggle';
const marker = 'wiggle-settings-imported';
const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};
const equal = (actual, expected, message) => {
    assert(JSON.stringify(actual) === JSON.stringify(expected),
        `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
};
const source = Gio.SettingsSchemaSource.new_from_directory(
    GLib.build_filenamev([extensionDirectory, 'schemas']), null, false);
const activeSchema = source.lookup(activeId, false);
assert(activeSchema !== null, 'Compiled active schema is available');
assert(source.lookup(legacyId, false) === null, 'Active schemas must not register the legacy identity');
const settings = new Gio.Settings({ settings_schema: activeSchema });
const keys = activeSchema.list_keys().filter(key => key !== marker);
const user = (object, key) => object.get_user_value(key)?.deep_unpack() ?? null;
const value = (object, key) => object.get_value(key).deep_unpack();
const snapshot = object => Object.fromEntries(keys.map(key => [key, user(object, key)]));
const defaults = () => {
    for (const key of keys) {
        equal(value(settings, key), settings.get_default_value(key).deep_unpack(), `${key} retains its default`);
        equal(user(settings, key), null, `${key} has no saved user value`);
    }
};
const completed = () => {
    equal(settings.get_boolean(marker), true, 'Migration is marked complete');
    equal(user(settings, marker), true, 'Completion is saved, not just a schema default');
};
const migrate = (await import(Gio.File.new_for_path(
    GLib.build_filenamev([extensionDirectory, 'settings.js'])).get_uri())).migrateSettings;
const applyMigration = () => {
    migrate(settings, extensionDirectory);
    Gio.Settings.sync();
    completed();
};
const legacySettings = () => {
    const privateSource = Gio.SettingsSchemaSource.new_from_directory(
        GLib.build_filenamev([extensionDirectory, 'migration-schemas']), null, false);
    const schema = privateSource.lookup(legacyId, false);
    assert(schema !== null, 'Private compiled legacy read schema is available');
    equal(schema.get_path(), '/org/gnome/shell/extensions/wiggle/', 'Legacy schema reads the original path');
    return new Gio.Settings({ settings_schema: schema });
};
const set = (object, key, expected) => {
    const type = object.get_default_value(key).get_type_string();
    assert(object.set_value(key, new GLib.Variant(type, expected)), `Saving ${key} succeeds`);
    equal(user(object, key), expected, `${key} is explicitly saved`);
};
const seed = legacy => {
    set(legacy, 'cursor-size', 144);
    set(legacy, 'hide-cursor', false);
    set(legacy, 'cursor-path', '/legacy/cursors/custom.svg');
};
const imported = () => {
    equal(value(settings, 'cursor-size'), 144, 'Saved integer is imported');
    equal(user(settings, 'cursor-size'), 144, 'Imported integer has a user value');
    equal(value(settings, 'hide-cursor'), false, 'Saved boolean is imported');
    equal(user(settings, 'hide-cursor'), false, 'Imported boolean has a user value');
    equal(value(settings, 'cursor-path'), '/legacy/cursors/custom.svg', 'Saved string is imported');
    equal(user(settings, 'cursor-path'), '/legacy/cursors/custom.svg', 'Imported string has a user value');
};

equal(activeSchema.get_path(), '/org/gnome/shell/extensions/wiggleit/', 'Active settings use an independent path');

switch (scenario) {
case 'saved': {
    const legacy = legacySettings();
    seed(legacy);
    // An explicitly saved old default is still a user choice, unlike an unsaved default.
    const savedDefault = legacy.get_default_value('sample-size').deep_unpack();
    set(legacy, 'sample-size', savedDefault);
    Gio.Settings.sync();
    const before = snapshot(legacy);
    applyMigration();
    imported();
    equal(user(settings, 'sample-size'), savedDefault, 'An explicitly saved legacy default is imported');
    equal(snapshot(legacy), before, 'Migration never writes or resets legacy values');
    for (const key of keys.filter(key => before[key] === null)) {
        equal(user(settings, key), null, `Unsaved ${key} is not copied`);
    }
    break;
}
case 'explicit': {
    const legacy = legacySettings();
    seed(legacy);
    set(legacy, 'sample-size', 31);
    set(legacy, 'magnify-duration', 375);
    for (const key of ['cursor-size', 'hide-cursor', 'cursor-path']) {
        set(settings, key, settings.get_default_value(key).deep_unpack());
    }
    set(settings, 'sample-size', 42);
    Gio.Settings.sync();
    const before = snapshot(legacy);
    applyMigration();
    for (const key of ['cursor-size', 'hide-cursor', 'cursor-path']) {
        equal(user(settings, key), settings.get_default_value(key).deep_unpack(), `${key} explicit default wins`);
    }
    equal(user(settings, 'sample-size'), 42, 'Explicit nondefault new choice wins');
    equal(user(settings, 'magnify-duration'), 375, 'An unset key still imports alongside explicit choices');
    equal(snapshot(legacy), before, 'Preserving new choices does not alter legacy settings');
    break;
}
case 'defaults': {
    const legacy = legacySettings();
    equal(Object.values(snapshot(legacy)).every(entry => entry === null), true, 'Legacy has no saved settings');
    defaults();
    applyMigration();
    defaults();
    equal(Object.values(snapshot(legacy)).every(entry => entry === null), true, 'Legacy defaults remain unsaved');
    break;
}
case 'clean': {
    assert(!GLib.file_test(GLib.build_filenamev([
        GLib.getenv('XDG_DATA_HOME'), 'gnome-shell', 'extensions',
    ]), GLib.FileTest.EXISTS), 'No extension is installed in the isolated profile');
    const globalSource = Gio.SettingsSchemaSource.get_default();
    assert(globalSource?.lookup(legacyId, true) == null, 'Legacy schema is not globally installed in this profile');
    defaults();
    applyMigration();
    defaults();
    break;
}
case 'repeat': {
    const legacy = legacySettings();
    seed(legacy);
    applyMigration();
    imported();
    settings.reset('cursor-size');
    set(legacy, 'cursor-size', 192);
    set(legacy, 'hide-cursor', true);
    set(legacy, 'cursor-path', '/legacy/changed.svg');
    Gio.Settings.sync();
    const before = snapshot(legacy);
    applyMigration();
    equal(user(settings, 'cursor-size'), null, 'Reset new integer is not reimported');
    equal(value(settings, 'cursor-size'), settings.get_default_value('cursor-size').deep_unpack(), 'Reset restores the new default');
    equal(user(settings, 'hide-cursor'), false, 'Changed legacy boolean is not reimported');
    equal(user(settings, 'cursor-path'), '/legacy/cursors/custom.svg', 'Changed legacy string is not reimported');
    equal(snapshot(legacy), before, 'Repeated migration leaves legacy settings unchanged');
    break;
}
case 'restart-seed': {
    const legacy = legacySettings();
    seed(legacy);
    set(legacy, 'magnify-duration', 375);
    applyMigration();
    imported();
    settings.reset('cursor-size');
    set(legacy, 'cursor-size', 192);
    set(legacy, 'hide-cursor', true);
    set(legacy, 'cursor-path', '/legacy/after-restart.svg');
    Gio.Settings.sync();
    break;
}
case 'restart-verify': {
    // These assertions precede migration: they prove real cross-process persistence.
    completed();
    equal(user(settings, 'cursor-size'), null, 'Reset persists across processes');
    equal(user(settings, 'magnify-duration'), 375, 'Imported integer persists across processes');
    equal(user(settings, 'hide-cursor'), false, 'Imported boolean persists across processes');
    equal(user(settings, 'cursor-path'), '/legacy/cursors/custom.svg', 'Imported string persists across processes');
    const legacy = legacySettings();
    equal(user(legacy, 'cursor-size'), 192, 'Changed legacy value persists across processes');
    const before = snapshot(legacy);
    applyMigration();
    equal(user(settings, 'cursor-size'), null, 'Restart does not reimport a reset key');
    equal(user(settings, 'magnify-duration'), 375, 'Restart preserves an imported integer');
    equal(user(settings, 'hide-cursor'), false, 'Restart does not replace an imported boolean');
    equal(user(settings, 'cursor-path'), '/legacy/cursors/custom.svg', 'Restart does not replace an imported string');
    equal(snapshot(legacy), before, 'Restart migration never alters legacy values');
    break;
}
default:
    throw new Error(`Unknown settings scenario: ${scenario}`);
}

Gio.Settings.sync();
print(`PASS ${scenario}`);
