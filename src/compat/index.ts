import {PACKAGE_VERSION} from 'resource:///org/gnome/shell/misc/config.js';
import {createGnome46Cursor} from './gnome46.js';
import {createGnome49Cursor} from './gnome49.js';
import {createGnome51Cursor} from './gnome51.js';
import {adapterVersion} from './version.js';

export function createCursorForShell() {
    switch (adapterVersion(PACKAGE_VERSION)) {
    case 46: return createGnome46Cursor();
    case 49: return createGnome49Cursor();
    case 51: return createGnome51Cursor();
    }
}
