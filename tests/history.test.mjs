import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const fixturePath = fileURLToPath(new URL('./fixtures/history.mjs', import.meta.url));
const historyUri = new URL('../dist/history.js', import.meta.url).href;

function runHistoryScenario(scenario) {
    const result = spawnSync('gjs', ['-m', fixturePath, scenario, historyUri], {
        encoding: 'utf8',
        timeout: 5_000,
        maxBuffer: 1024 * 1024,
    });
    const diagnostics = [
        `History scenario: ${scenario}`,
        `Exit status: ${result.status}; signal: ${result.signal}`,
        result.error ? `Process error: ${result.error.message}` : '',
        `stdout:\n${result.stdout ?? ''}`,
        `stderr:\n${result.stderr ?? ''}`,
    ].filter(Boolean).join('\n');
    assert.ifError(result.error && new Error(diagnostics, { cause: result.error }));
    assert.equal(result.status, 0, diagnostics);
}

for (const [name, scenario] of [
    ['History recognizes rapid reversals exceeding both shake thresholds', 'reversals'],
    ['History rejects straight motion even when its distance exceeds the threshold', 'straight'],
    ['History rejects stationary samples', 'stationary'],
    ['History requires accumulated turning strictly greater than the angle threshold', 'angleBoundary'],
    ['History requires motion distance strictly greater than the distance threshold', 'distanceBoundary'],
    ['History clear discards previous turns and permits a new gesture', 'clear'],
    ['History rejects a formerly qualifying gesture once all its samples expire', 'expiry'],
]) {
    test(name, { timeout: 10_000 }, () => runHistoryScenario(scenario));
}
