'use strict';

export default class Cursor {
    private readonly _tracker = global.backend.get_cursor_tracker();
    private readonly _seat = global.stage.get_context().get_backend().get_default_seat();
    private _hidden = false;

    get hot() {
        return this._tracker.get_hot();
    }

    get sprite() {
        return this._tracker.get_sprite();
    }

    show() {
        if (!this._hidden) {
            return;
        }
        this._tracker.uninhibit_cursor_visibility();
        this._seat.uninhibit_unfocus();
        this._hidden = false;
    }

    hide() {
        if (this._hidden) {
            return;
        }
        // Own a reference even when Mutter already holds one for the visible pointer.
        // Hiding the native cursor releases Mutter's reference; ours keeps its sprite available.
        this._seat.inhibit_unfocus();
        this._tracker.inhibit_cursor_visibility();
        this._hidden = true;
    }
}
