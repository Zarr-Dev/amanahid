import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const frontend = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");

function extract(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    assert.ok(start >= 0 && end > start, `Unable to extract ${startMarker}`);
    return source.slice(start, end);
}

const distanceFunction = extract(
    frontend,
    "function calculateDistance(",
    "\nfunction geolocationErrorKey"
);
const geofenceFunction = extract(
    frontend,
    "async function checkGeofence()",
    "\nfunction setLocationError"
);

function makePosition({
    latitude = 0.00004,
    longitude = 0.00003,
    accuracy = 6,
    speed = 1.7,
    timestamp = Date.now()
} = {}) {
    return {
        coords: { latitude, longitude, accuracy, speed },
        timestamp
    };
}

async function runGeofence(position, { previousFix = null, radius = 50 } = {}) {
    const state = { lastGpsFix: previousFix, lastLocation: null };
    const context = {
        state,
        SCHOOL_LOCATION: { lat: 0, lng: 0, radius },
        navigator: { geolocation: { getCurrentPosition() {}, watchPosition() {} } },
        getBestGpsPosition: async () => position,
        setLocationError: errorKey => ({
            inside: false,
            distance: NaN,
            accuracy: NaN,
            error: errorKey
        }),
        tr: key => key,
        renderLocationBadge() {},
        updateMapUserMarker() {},
        updateMapText() {},
        console
    };
    const result = await runInNewContext(
        `${distanceFunction}\n${geofenceFunction}\ncheckGeofence()`,
        context
    );
    return { result, state };
}

test("GPS geofence returns the complete fresh fix required by attendance API", async () => {
    const timestamp = Date.now();
    const position = makePosition({ timestamp });
    const { result, state } = await runGeofence(position);

    assert.equal(result.inside, true);
    assert.equal(result.boundaryUncertain, false);
    assert.equal(result.lat, position.coords.latitude);
    assert.equal(result.lng, position.coords.longitude);
    assert.equal(result.accuracy, position.coords.accuracy);
    assert.equal(result.positionTimestamp, timestamp);
    assert.equal(result.speed, position.coords.speed);
    assert.equal(result.error, null);

    assert.equal(state.lastLocation.lat, result.lat);
    assert.equal(state.lastLocation.lng, result.lng);
    assert.equal(state.lastLocation.positionTimestamp, result.positionTimestamp);
    assert.equal(state.lastLocation.speed, result.speed);
});

test("GPS geofence rejects uncertain boundary fixes without losing diagnostic coordinates", async () => {
    const position = makePosition({ latitude: 0.0005, longitude: 0, accuracy: 10, speed: 0 });
    const { result } = await runGeofence(position);

    assert.equal(result.inside, false);
    assert.equal(result.boundaryUncertain, true);
    assert.equal(result.lat, position.coords.latitude);
    assert.equal(result.lng, position.coords.longitude);
    assert.equal(result.positionTimestamp, position.timestamp);
    assert.equal(result.error, null);
});

test("GPS geofence rejects stale positions", async () => {
    const position = makePosition({ timestamp: Date.now() - 60_000 });
    const { result } = await runGeofence(position);

    assert.equal(result.inside, false);
    assert.equal(result.error, "gpsUnavailable");
});

test("GPS geofence rejects implausible reported movement", async () => {
    const position = makePosition({ speed: 56 });
    const { result } = await runGeofence(position);

    assert.equal(result.inside, false);
    assert.equal(result.fakeLocation, true);
    assert.equal(result.error, "fakeLocation");
});

test("attendance request forwards all required GPS fields from the geofence result", () => {
    const requestStart = frontend.indexOf('await cloudRequest("/api/attendance"');
    assert.ok(requestStart >= 0, "Attendance API request is missing");
    const request = frontend.slice(requestStart, requestStart + 900);

    assert.ok(request.includes("lat: location.lat"));
    assert.ok(request.includes("lng: location.lng"));
    assert.ok(request.includes("accuracy: location.accuracy"));
    assert.ok(request.includes("gpsTimestamp: location.positionTimestamp"));
    assert.ok(request.includes("speed: location.speed || 0"));
});


test("GPS selector uses high-accuracy watch and keeps the best eligible fix", async () => {
    const first = makePosition({ latitude: 0.0001, accuracy: 28, speed: 0 });
    const best = makePosition({ latitude: 0.0002, accuracy: 14, speed: 0 });
    let watchOptions = null;
    let clearedWatch = null;
    let clearedTimer = null;

    const selector = extract(
        frontend,
        "async function getBestGpsPosition()",
        "\\nasync function checkGeofence"
    );
    const context = {
        navigator: {
            geolocation: {
                watchPosition(onSuccess, _onError, options) {
                    watchOptions = options;
                    queueMicrotask(() => {
                        onSuccess(first);
                        onSuccess(best);
                    });
                    return 73;
                },
                clearWatch(id) { clearedWatch = id; }
            }
        },
        window: {
            setTimeout(_callback, delay) {
                assert.equal(delay, 9000);
                return 91;
            },
            clearTimeout(id) { clearedTimer = id; }
        }
    };

    const result = await runInNewContext(`${selector}\\ngetBestGpsPosition()`, context);
    assert.equal(result.coords.accuracy, best.coords.accuracy);
    assert.equal(result.timestamp, best.timestamp);
    assert.equal(watchOptions.enableHighAccuracy, true);
    assert.equal(watchOptions.maximumAge, 0);
    assert.equal(watchOptions.timeout, 10000);
    assert.equal(clearedWatch, 73);
    assert.equal(clearedTimer, 91);
});

test("GPS selector falls back to getCurrentPosition when watchPosition is unavailable", async () => {
    const position = makePosition({ accuracy: 18, speed: 0 });
    let options = null;
    const selector = extract(
        frontend,
        "async function getBestGpsPosition()",
        "\\nasync function checkGeofence"
    );
    const context = {
        navigator: {
            geolocation: {
                getCurrentPosition(onSuccess, _onError, nextOptions) {
                    options = nextOptions;
                    queueMicrotask(() => onSuccess(position));
                }
            }
        },
        window: {
            setTimeout() { return 92; },
            clearTimeout() {}
        }
    };

    const result = await runInNewContext(`${selector}\\ngetBestGpsPosition()`, context);
    assert.equal(result.timestamp, position.timestamp);
    assert.equal(result.coords.accuracy, 18);
    assert.equal(options.enableHighAccuracy, true);
    assert.equal(options.maximumAge, 0);
});
