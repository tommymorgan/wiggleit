import {createGnome49Cursor} from './gnome49.js';

export function createGnome51Cursor() {
    // Clutter.get_default_backend() was removed in GNOME 51.
    const seat = global.stage.get_context().get_backend().get_default_seat();
    return createGnome49Cursor(seat);
}
