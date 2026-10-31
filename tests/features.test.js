import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
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
    assert.equal(keys.length, 37);
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
    assert.equal(Object.keys(flags).length, 37);
    for (const key of LOCKED_FEATURE_FLAGS) assert.equal(flags[key], true, key);
    assert.equal(flags.parent_notifications, false);
    assert.equal(flags.camera_attendance, false);
    assert.equal(flags.face_ambiguity_guard, true);
    assert.equal(flags.gps_boundary_guard, true);

    const publicFlags = publicFeatureFlags(flags);
    assert.deepEqual(Object.keys(publicFlags), [...PUBLIC_FEATURE_KEYS]);
    assert.ok(Object.values(publicFlags).every(value => typeof value === "boolean"));
    assert.equal(Object.hasOwn(publicFlags, "admin_audit_log"), false);
});

function evaluateFrontendConstant(source, name, nextDeclaration) {
    const start = source.indexOf(`const ${name} =`);
    const end = source.indexOf(nextDeclaration, start);
    assert.ok(start >= 0 && end > start, `Could not locate ${name} in frontend source`);
    return runInNewContext(`${source.slice(start, end)}\n${name}`);
}

test("all 37 Admin controls have complete Indonesian, English, and Arabic copy", () => {
    const source = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
    const copy = evaluateFrontendConstant(source, "ADMIN_FEATURE_COPY", "\nconst ADMIN_FEATURE_GROUPS");
    const groups = evaluateFrontendConstant(source, "ADMIN_FEATURE_GROUPS", "\nfunction renderAdminFeatures");
    const keys = Object.keys(FEATURE_DEFAULTS);
    const renderedKeys = groups.flatMap(group => group.items.map(item => item[0]));

    assert.equal(groups.length, 6);
    assert.equal(renderedKeys.length, 37);
    assert.deepEqual([...renderedKeys].sort(), [...keys].sort());
    for (const language of ["id", "en", "ar"]) {
        assert.ok(copy[language], `Missing ${language} Admin translations`);
        for (const key of keys) {
            assert.ok(Array.isArray(copy[language].features[key]), `Missing ${language} label for ${key}`);
            assert.equal(copy[language].features[key].length, 2);
            assert.ok(copy[language].features[key].every(value => typeof value === "string" && value.length > 0));
        }
        assert.ok(copy[language].groups.attendance);
        assert.ok(copy[language].groups.location);
        assert.ok(copy[language].countLoaded);
        assert.ok(copy[language].countSaved);
    }
});

test("face, GPS map, and WhatsApp testing strings exist in all three app languages", () => {
    const source = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
    const extra = evaluateFrontendConstant(source, "EXTRA_T", "\nconst state =");
    const required = [
        "faceQualityLow", "livenessFaceForward", "livenessTurnLeft",
        "livenessTurnRight", "livenessReturnFront", "adminMapDeviceTitle",
        "adminMapDeviceDistance", "adminMapGpsAccuracy", "adminMapSchoolRadius",
        "adminMapCheckDeviceLocation", "adminMapBoundary", "adminMapPointChanged", "adminMapSaved",
        "adminSettingsSaving", "adminSettingsSaved", "testWhatsappConfirm",
        "testWhatsappNoConsent"
    ];
    for (const language of ["id", "en", "ar"]) {
        for (const key of required) {
            assert.ok(typeof extra[language]?.[key] === "string" && extra[language][key].length > 0,
                `Missing ${language} translation for ${key}`);
        }
    }
});
