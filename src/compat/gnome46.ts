import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import {createOwnedCursor} from './cursor.js';
import type {Tracker} from './cursor.js';

interface LegacyTracker extends Tracker {
    set_pointer_visible(visible: boolean): void;
}

function isLegacyTracker(tracker: Tracker): tracker is LegacyTracker {
    return 'set_pointer_visible' in tracker && typeof tracker.set_pointer_visible === 'function';
}

interface DisplayTracker {
    get_for_display(display: Meta.Display): Tracker;
}

function hasDisplayTracker(klass: object): klass is DisplayTracker {
    return 'get_for_display' in klass && typeof klass.get_for_display === 'function';
}

export function createGnome46Cursor() {
    // The backend getter replaced this display-based API in GNOME 48.
    const trackerClass: object = Meta.CursorTracker;
    const tracker = hasDisplayTracker(trackerClass)
        ? trackerClass.get_for_display(global.display)
        : global.backend.get_cursor_tracker();
    if (!isLegacyTracker(tracker)) {
        throw new Error('GNOME 46–48 cursor visibility setter is unavailable');
    }
    const seat = Clutter.get_default_backend().get_default_seat();
    let restoreVisible = false;
    let signal = 0;
    const keepHidden = () => {
        if (tracker.get_pointer_visible()) tracker.set_pointer_visible(false);
    };
    return createOwnedCursor(tracker, seat, {
        hide() {
            restoreVisible = tracker.get_pointer_visible();
            // Legacy Mutter has no inhibitor token: enforce hidden state until our release.
            signal = tracker.connect('visibility-changed', keepHidden);
            tracker.set_pointer_visible(false);
        },
        show() {
            tracker.disconnect(signal);
            signal = 0;
            if (restoreVisible) tracker.set_pointer_visible(true);
        },
    });
}
