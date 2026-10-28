import GLib from 'gi://GLib';

const [scenario, historyUri] = ARGV;
const { default: History } = await import(historyUri);

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function historyWith({ radiansThreshold = 15, distanceThreshold = 180 } = {}) {
    const history = new History();
    // Keep non-expiry cases independent of machine speed and process startup.
    history.sampleSize = 60_000;
    history.radiansThreshold = radiansThreshold;
    history.distanceThreshold = distanceThreshold;
    return history;
}

function pushReversals(history) {
    for (let i = 0; i < 10; i++)
        history.push(i % 2 === 0 ? 0 : 300, 0);
}

const scenarios = {
    reversals() {
        const history = historyWith();
        pushReversals(history);
        assert(history.check() === true, 'Rapid 300px reversals must qualify as a shake');
    },

    straight() {
        const history = historyWith();
        for (let i = 0; i < 10; i++)
            history.push(i * 300, 0);
        assert(history.check() === false, 'Long straight motion must not qualify as a shake');
    },

    stationary() {
        const history = historyWith();
        for (let i = 0; i < 10; i++)
            history.push(100, 100);
        assert(history.check() === false, 'Repeated stationary samples must not qualify as a shake');
    },

    angleBoundary() {
        // A single exact reversal contributes PI radians with a nonzero segment.
        for (const [threshold, expected] of [
            [Math.PI - 1e-9, true],
            [Math.PI, false],
            [Math.PI + 1e-9, false],
        ]) {
            const history = historyWith({ radiansThreshold: threshold, distanceThreshold: 99 });
            history.push(0, 0);
            history.push(100, 0);
            history.push(0, 0);
            assert(history.check() === expected,
                `A PI-radian reversal with angle threshold ${threshold} must return ${expected}`);
        }
    },

    distanceBoundary() {
        for (const [threshold, expected] of [
            [99, true],
            [100, false],
            [101, false],
        ]) {
            const history = historyWith({ radiansThreshold: 3, distanceThreshold: threshold });
            history.push(0, 0);
            history.push(100, 0);
            history.push(0, 0);
            assert(history.check() === expected,
                `A 100px reversal with distance threshold ${threshold} must return ${expected}`);
        }
    },

    clear() {
        const history = historyWith();
        pushReversals(history);
        assert(history.check() === true, 'The pre-clear gesture must qualify');
        history.clear();
        assert(history.check() === false, 'Clearing must discard the qualifying gesture');
        history.push(0, 0);
        history.push(300, 0);
        assert(history.check() === false, 'Two new points must not reuse pre-clear turns');
        pushReversals(history);
        assert(history.check() === true, 'New reversals must still qualify after clearing');
    },

    expiry() {
        const history = historyWith();
        const square = [[0, 0], [300, 0], [300, 300], [0, 300]];
        for (let i = 0; i < 32; i++) {
            const [x, y] = square[i % square.length];
            history.push(x, y);
        }
        assert(history.check() === true, 'The fresh square-path gesture must qualify before expiry');
        history.sampleSize = 1;
        // A wide margin over the real 1ms window; no clock mocks or scheduling races.
        GLib.usleep(20_000);
        assert(history.check() === false, 'Every expired sample must be excluded from shake detection');
    },
};

assert(Object.hasOwn(scenarios, scenario), `Unknown History scenario: ${scenario}`);
scenarios[scenario]();
