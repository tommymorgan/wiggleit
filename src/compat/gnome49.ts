import Clutter from 'gi://Clutter';
import {createOwnedCursor} from './cursor.js';

export function createGnome49Cursor(seat = Clutter.get_default_backend().get_default_seat()) {
    const tracker = global.backend.get_cursor_tracker();
    return createOwnedCursor(tracker, seat, {
        hide() { tracker.inhibit_cursor_visibility(); },
        show() { tracker.uninhibit_cursor_visibility(); },
    });
}
