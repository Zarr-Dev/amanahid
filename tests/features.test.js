import assert from "node:assert/strict";
import test from "node:test";
import {
    FEATURE_DEFAULTS,
    LOCKED_FEATURE_FLAGS,
    PUBLIC_FEATURE_KEYS,
    getFeatureFlags,
    publicFeatureFlags
} from "../api/_lib/features.js";

test("Admin feature catalogue is complete, typed, and has no duplicate keys", () => {
    const keys = Object.keys(FEATURE_DEFAULTS);
    assert.equal(keys.length, 36);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.every(key => typeof FEATURE_DEFAULTS[key] === "boolean"));
    assert.ok(LOCKED_FEATURE_FLAGS.every(key => Object.hasOwn(FEATURE_DEFAULTS, key)));
    assert.ok(PUBLIC_FEATURE_KEYS.every(key => Object.hasOwn(FEATURE_DEFAULTS, key)));
});

test("saved Admin flags are normalized and safety-critical controls remain enabled", async t => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SECRET_KEY;
    const originalFetch = globalThis.fetch;
    t.after(() => {
        if (previousUrl === undefined) delete process.env.SUPABASE_URL;
        else process.env.SUPABASE_URL = previousUrl;
        if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
        else process.env.SUPABASE_SECRET_KEY = previousKey;
        globalThis.fetch = originalFetch;
    });

    process.env.SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SECRET_KEY = "test-service-secret";
    const stored = Object.fromEntries(Object.keys(FEATURE_DEFAULTS).map(key => [key, false]));
    stored.parent_notifications = false;
    globalThis.fetch = async () => new Response(JSON.stringify([
        { feature_flags: stored }
    ]), { status: 200 });

    const flags = await getFeatureFlags();
    assert.equal(Object.keys(flags).length, 36);
    for (const key of LOCKED_FEATURE_FLAGS) assert.equal(flags[key], true, key);
    assert.equal(flags.parent_notifications, false);
    assert.equal(flags.camera_attendance, false);

    const publicFlags = publicFeatureFlags(flags);
    assert.deepEqual(Object.keys(publicFlags), [...PUBLIC_FEATURE_KEYS]);
    assert.ok(Object.values(publicFlags).every(value => typeof value === "boolean"));
    assert.equal(Object.hasOwn(publicFlags, "admin_audit_log"), false);
});
