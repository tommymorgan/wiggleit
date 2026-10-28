'use strict';

export default class Cursor {
    constructor() {
        this._tracker = global.backend.get_cursor_tracker();
        this._seat = global.stage.get_context().get_backend().get_default_seat();
        this._hidden = false;
        this._inhibitedUnfocus = false;
    }

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
        if (this._inhibitedUnfocus) {
            this._seat.uninhibit_unfocus();
            this._inhibitedUnfocus = false;
        }
        this._hidden = false;
    }

    hide() {
        if (this._hidden) {
            return;
        }
        if (!this._seat.is_unfocus_inhibited()) {
            this._seat.inhibit_unfocus();
            this._inhibitedUnfocus = true;
        }
        this._tracker.inhibit_cursor_visibility();
        this._hidden = true;
    }
}
