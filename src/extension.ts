'use strict';

import GLib from 'gi://GLib';
import type Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { Field } from './const.js';
import Effect from './effect.js';
import History from './history.js';
import {createCursorForShell} from './compat/index.js';
import {migrateSettings} from './settings.js';

type SettingBinding =
    | [string, 'b', (value: boolean) => void]
    | [string, 'i', (value: number) => void]
    | [string, 's', (value: string) => void];

const initSettings = (settings: Gio.Settings, entries: SettingBinding[]) => {
    return entries.map(entry => {
        const apply = () => {
            switch (entry[1]) {
            case 'b': entry[2](settings.get_boolean(entry[0])); break;
            case 'i': entry[2](settings.get_int(entry[0])); break;
            case 's': entry[2](settings.get_string(entry[0])); break;
            }
        };
        apply();
        return settings.connect(`changed::${entry[0]}`, apply);
    });
};

export default class WiggleitExtension extends Extension {
    private _history: History | null = null;
    private _effect: Effect | null = null;
    private _settings: Gio.Settings | null = null;
    private _settingsSignals: number[] = [];
    private _checkTimeoutId = 0;
    private _drawIntervalWatch = 0;
    private _drawInterval = 8;
    private _isHiddenByProgram = false;
    private _lastX: number | null = null;
    private _lastY: number | null = null;

    private _onCheckIntervalChange(interval: number) {
        if (this._checkTimeoutId) {
            GLib.Source.remove(this._checkTimeoutId);
        }
        this._checkTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            const history = this._history;
            const effect = this._effect;
            if (!history || !effect) {
                return GLib.SOURCE_REMOVE;
            }
            if (this._checkCursorHiddenByProgram()) {
                return GLib.SOURCE_CONTINUE;
            }
            if (history.check()) {
                const last = history.lastCoords;
                if (!effect.isWiggling && last) {
                    effect.move(last.x, last.y);
                    effect.magnify();
                }
            } else if (effect.isWiggling) {
                effect.unmagnify();
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    private _checkCursorHiddenByProgram() {
        // different program might take other methods to hide the cursor, so this check should contain more conditions
        if (!this._effect?.cursor.sprite) {
            if (!this._isHiddenByProgram) {
                this._togglePointerWatcher(false);
                this._isHiddenByProgram = true;
            }
            return true;
        } else if (this._isHiddenByProgram) {
            this._togglePointerWatcher(true);
            this._isHiddenByProgram = false;
        }
        return false;
    }

    private _onDrawIntervalChange(interval: number) {
        this._drawInterval = interval;
        if (this._drawIntervalWatch) {
            GLib.Source.remove(this._drawIntervalWatch);
        }
        this._drawIntervalWatch = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            const history = this._history;
            const effect = this._effect;
            if (!history || !effect) {
                return GLib.SOURCE_REMOVE;
            }
            const [x, y] = global.get_pointer();
            if (x === this._lastX && y === this._lastY) {
                return GLib.SOURCE_CONTINUE;
            }
            this._lastX = x;
            this._lastY = y;
            history.push(x, y);
            if (effect.isWiggling) {
                effect.move(x, y);
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    private _togglePointerWatcher(state: boolean) {
        if (state) {
            if (!this._drawIntervalWatch) {
                this._onDrawIntervalChange(this._drawInterval);
            }
        } else {
            if (this._effect?.isWiggling) {
                this._effect.unmagnify();
            }
            if (this._drawIntervalWatch) {
                GLib.Source.remove(this._drawIntervalWatch);
                this._drawIntervalWatch = 0;
                this._history?.clear();
            }
        }
    }

    override enable() {
        this._lastX = null;
        this._lastY = null;
        this._settings = this.getSettings();
        migrateSettings(this._settings, this.path);
        const history = this._history = new History();
        const effect = this._effect = new Effect(createCursorForShell());
        this._settingsSignals = initSettings(this._settings, [
            [Field.HIDE, 'b', (r: boolean) => {effect.isHidden = r}],
            [Field.SIZE, 'i', (r: number) => {effect.cursorSize = r}],
            [Field.PATH, 's', (r: string) => {effect.cursorPath = r}],
            [Field.MAGN, 'i', (r: number) => {effect.magnifyDuration = r}],
            [Field.UMGN, 'i', (r: number) => {effect.unmagnifyDuration = r}],
            [Field.DLAY, 'i', (r: number) => {effect.unmagnifyDelay = r}],

            [Field.SAMP, 'i', (r: number) => {history.sampleSize = r}],
            [Field.RADI, 'i', (r: number) => {history.radiansThreshold = r}],
            [Field.DIST, 'i', (r: number) => {history.distanceThreshold = r}],
            [Field.CHCK, 'i', (r: number) => this._onCheckIntervalChange(r)],
            [Field.DRAW, 'i', (r: number) => this._onDrawIntervalChange(r)],
        ]);
    }

    override disable() {
        for (const id of this._settingsSignals) {
            this._settings?.disconnect(id);
        }
        this._settingsSignals = [];
        if (this._checkTimeoutId) {
            GLib.Source.remove(this._checkTimeoutId);
            this._checkTimeoutId = 0;
        }
        this._togglePointerWatcher(false);
        this._effect?.destroy();
        this._effect = null;
        this._history = null;
        this._isHiddenByProgram = false;
        this._settings = null;
    }
}
