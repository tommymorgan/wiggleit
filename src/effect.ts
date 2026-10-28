'use strict';

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import type {Cursor} from './compat/cursor.js';

// Shell normalizes snake_case keys to GObject property names for transitions.
type CursorAnimation = Parameters<St.Icon['ease']>[0] & {
    scale_x: number;
    scale_y: number;
    pivot_point: Graphene.Point;
};

export default class Effect extends St.Icon {
    isHidden = true;
    magnifyDuration = 250;
    unmagnifyDuration = 150;
    unmagnifyDelay = 0;
    isWiggling = false;
    readonly cursor: Cursor;
    private readonly _hotX: number;
    private readonly _hotY: number;
    private readonly _spriteSize: number;
    private readonly _pivot: Graphene.Point;
    private _ratio = 1;
    private _isInTransition = false;
    private _unmagnifyDelayId = 0;

    static {
        GObject.registerClass(this);
    }

    constructor(cursor: Cursor) {
        super();
        this.cursor = cursor;
        [this._hotX, this._hotY] = this.cursor.hot;
        this._spriteSize = this.cursor.sprite ? this.cursor.sprite.get_width() : 24;

        this._pivot = new Graphene.Point({
            x: this._hotX / this._spriteSize,
            y: this._hotY / this._spriteSize,
        });
    }

    set cursorSize(size: number) {
        this.icon_size = size;
        this._ratio = size / this._spriteSize;
    }

    set cursorPath(path: string) {
        this.gicon = Gio.Icon.new_for_string(path || GLib.path_get_dirname(import.meta.url.slice(7)) + '/icons/cursor.svg');
    }

    move(x: number, y: number) {
        this.set_position(x - this._hotX * this._ratio, y - this._hotY * this._ratio);
    }

    magnify() {
        this.isWiggling = true;
        Main.uiGroup.add_child(this);
        if (this.isHidden) {
            this.cursor.hide();
        }
        this.remove_all_transitions();
        const animation: CursorAnimation = {
            duration: this.magnifyDuration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            scale_x: 1.0,
            scale_y: 1.0,
            pivot_point: this._pivot,
        };
        this.ease(animation);
    }

    unmagnify() {
        if (this._isInTransition) {
            return;
        }
        this._isInTransition = true;
        this._unmagnifyDelayId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.unmagnifyDelay, () => {
            this.remove_all_transitions();
            const animation: CursorAnimation = {
                duration: this.unmagnifyDuration,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                scale_x: 1.0 / this._ratio,
                scale_y: 1.0 / this._ratio,
                pivot_point: this._pivot,
                onComplete: () => {
                    Main.uiGroup.remove_child(this);
                    if (this.isHidden) {
                        this.cursor.show();
                    }
                    this.isWiggling = false;
                    this._isInTransition = false;
                },
            };
            this.ease(animation);
            this._unmagnifyDelayId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    override destroy() {
        if (this._unmagnifyDelayId) {
            GLib.Source.remove(this._unmagnifyDelayId);
            this._unmagnifyDelayId = 0;
        }
        if (this.isWiggling && this.isHidden) {
            this.cursor.show();
        }
        super.destroy();
    }
}
