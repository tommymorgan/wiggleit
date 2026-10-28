'use strict';

import GLib from 'gi://GLib';

type Point = { x: number; y: number };

const calcDistance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const calcGamma = (st: Point, nd: Point, rd: Point) => {
    var a = Math.sqrt(Math.pow(st.x - nd.x, 2) + Math.pow(st.y - nd.y, 2));
    var b = Math.sqrt(Math.pow(nd.x - rd.x, 2) + Math.pow(nd.y - rd.y, 2));
    var c = Math.sqrt(Math.pow(rd.x - st.x, 2) + Math.pow(rd.y - st.y, 2));

    if (a * b === 0) {
        return 0;
    }
    return Math.PI - Math.acos((Math.pow(a, 2) + Math.pow(b, 2) - Math.pow(c, 2)) / (2 * a * b));
};

export default class History {
    private _samples: (Point & { t: number })[] = [];
    sampleSize = 25;
    radiansThreshold = 15;
    distanceThreshold = 180;

    get lastCoords() {
        return this._samples[this._samples.length - 1];
    }

    clear() {
        this._samples = [];
    }

    check() {
        let now = GLib.get_monotonic_time();

        for (let i = this._samples.length - 1; i >= 0; i--) {
            const sample = this._samples[i];
            if (sample && now - sample.t > this.sampleSize * 1000) {
                this._samples.splice(i, 1);
            }
        }

        let radians = 0;
        let distance = 0;
        for (let i = 2; i < this._samples.length; i++) {
            const first = this._samples[i - 2];
            const second = this._samples[i - 1];
            const third = this._samples[i];
            if (first && second && third) {
                radians += calcGamma(first, second, third);
                distance = Math.max(distance, calcDistance(second, third));
            }
        }
        return radians > this.radiansThreshold && distance > this.distanceThreshold;
    }

    push(x: number, y: number) {
        this._samples.push({ x: x, y: y, t: GLib.get_monotonic_time() });
    }
}
