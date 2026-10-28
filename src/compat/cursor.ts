import type Clutter from 'gi://Clutter';
import type Meta from 'gi://Meta';

export type Tracker = Pick<Meta.CursorTracker, 'get_hot' | 'get_sprite' | 'get_pointer_visible' | 'connect' | 'disconnect'>;

export interface Cursor {
    readonly hot: ReturnType<Tracker['get_hot']>;
    readonly sprite: ReturnType<Tracker['get_sprite']>;
    hide(): void;
    show(): void;
}

export interface Visibility {
    hide(): void;
    show(): void;
}

export function createOwnedCursor(tracker: Tracker, seat: Clutter.Seat, visibility: Visibility): Cursor {
    let hidden = false;
    return {
        get hot() { return tracker.get_hot(); },
        get sprite() { return tracker.get_sprite(); },
        hide() {
            if (hidden) return;
            // Native hiding drops Mutter's seat reference; keep our own for sprite access.
            seat.inhibit_unfocus();
            visibility.hide();
            hidden = true;
        },
        show() {
            if (!hidden) return;
            visibility.show();
            seat.uninhibit_unfocus();
            hidden = false;
        },
    };
}
