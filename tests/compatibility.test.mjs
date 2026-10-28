import assert from 'node:assert/strict';
import test from 'node:test';

import {adapterVersion} from '../dist/compat/version.js';

test('supported interval boundaries select the matching native cursor ABI', () => {
    assert.equal(adapterVersion('46.0'), 46);
    assert.equal(adapterVersion('48.9'), 46);
    assert.equal(adapterVersion('49.0'), 49);
    assert.equal(adapterVersion('50.9'), 49);
    assert.equal(adapterVersion('51.1'), 51);
});

test('older, future and unrecognized Shell releases fail instead of guessing an adapter', () => {
    for (const release of ['45.10', '52.alpha', 'invalid']) {
        assert.throws(() => adapterVersion(release), RangeError);
    }
});
