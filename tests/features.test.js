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
    assert.equal(keys.length, 38);
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
    assert.equal(Object.keys(flags).length, 38);
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

test("all 38 Admin controls have complete Indonesian, English, and Arabic copy", () => {
    const source = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
    const copy = evaluateFrontendConstant(source, "ADMIN_FEATURE_COPY", "\nconst ADMIN_FEATURE_GROUPS");
    const groups = evaluateFrontendConstant(source, "ADMIN_FEATURE_GROUPS", "\nfunction renderAdminFeatures");
    const keys = Object.keys(FEATURE_DEFAULTS);
    const renderedKeys = groups.flatMap(group => group.items.map(item => item[0]));

    assert.equal(groups.length, 6);
    assert.equal(renderedKeys.length, 38);
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
        "testWhatsappNoConsent",
        "authModalKicker", "authModalTitle", "cameraLightingHint", "studentAccountHint",
        "faceEnrollmentLightingHint", "exportAccountsCsv", "governanceLoading", "testGpsCaveat",
        "absenceDispensation", "absenceSeverityLabel", "absenceSeverityMild",
        "absenceSeverityModerate", "absenceSeveritySevere", "absenceSeverityHelp",
        "absenceMedicalEvidenceLabel", "absenceMedicalEvidenceHelp", "absenceDispensationTitle",
        "absenceDispensationDesc", "studentAbsenceHistoryTitle", "studentAbsenceHistoryDesc",
        "studentAbsenceEmpty", "studentHomeroomKicker", "studentHomeroomTitle",
        "studentHomeroomUnassigned", "studentHomeroomDesc", "dialogConfirm", "dialogSave",
        "absenceCardPending", "absenceCardApproved", "absenceCardRejected", "absenceCardRevoked",
        "absenceEvidenceAttached", "absenceEvidenceMissing", "absenceCardUpdated"
    ];
    for (const language of ["id", "en", "ar"]) {
        for (const key of required) {
            assert.ok(typeof extra[language]?.[key] === "string" && extra[language][key].length > 0,
                `Missing ${language} translation for ${key}`);
        }
    }
});



function extractTopLevelObjectKeys(source, objectName, language) {
    const start = source.indexOf("const " + objectName + " =");
    const stopMarker = objectName === "EXTRA_T" ? "\nconst state =" : null;
    const open = source.indexOf("{", start);
    const end = stopMarker ? source.indexOf(stopMarker, open) : -1;
    assert.ok(start >= 0 && open > start && end > open, "Could not locate " + objectName);

    const block = source.slice(open + 1, end);
    const languageMatch = new RegExp("\\b" + language + "\\s*:\\s*\\{").exec(block);
    assert.ok(languageMatch, "Missing " + language + " in " + objectName);
    const bodyStart = languageMatch.index + languageMatch[0].length;
    const remaining = block.slice(bodyStart);
    const nextLanguage = /\b(?:en|ar)\s*:\s*\{/g;
    const nextMatch = nextLanguage.exec(remaining);
    const body = remaining.slice(0, nextMatch ? nextMatch.index : remaining.length);

    const keys = [];
    let quote = null;
    let escaped = false;
    for (let i = 0; i < body.length;) {
        const char = body[i];
        if (quote) {
            if (escaped) { escaped = false; i++; continue; }
            if (char === "\\") { escaped = true; i++; continue; }
            if (char === quote) quote = null;
            i++;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            i++;
            continue;
        }
        if (/[A-Za-z_$]/.test(char)) {
            let j = i + 1;
            while (j < body.length && /[A-Za-z0-9_$]/.test(body[j])) j++;
            let k = j;
            while (k < body.length && /\s/.test(body[k])) k++;
            if (body[k] === ":") keys.push(body.slice(i, j));
            i = j;
            continue;
        }
        i++;
    }
    return keys;
}

test("application language dictionaries are complete and preserve interpolation placeholders", () => {
    const source = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
    const dictionaries = [
        ["ROLE_T", "\nconst EXTRA_T ="],
        ["EXTRA_T", "\nconst state ="],
        ["T", "\nObject.keys(ROLE_T)"],
        ["LANDING_T", "\nObject.keys(LANDING_T)"],
        ["ADMIN_T", "\nObject.keys(ADMIN_T)"]
    ];

    for (const [name, nextDeclaration] of dictionaries) {
        const dictionary = evaluateFrontendConstant(source, name, nextDeclaration);
        const canonicalKeys = Object.keys(dictionary.id).sort();
        assert.deepEqual(Object.keys(dictionary.en).sort(), canonicalKeys, name + ": EN keys differ from ID");
        assert.deepEqual(Object.keys(dictionary.ar).sort(), canonicalKeys, name + ": AR keys differ from ID");

        for (const key of canonicalKeys) {
            const placeholders = value => Array.from(String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g), match => match[1]).sort();
            assert.deepEqual(placeholders(dictionary.en[key]), placeholders(dictionary.id[key]), name + "." + key + ": EN placeholders differ");
            assert.deepEqual(placeholders(dictionary.ar[key]), placeholders(dictionary.id[key]), name + "." + key + ": AR placeholders differ");
        }
    }
});

test("EXTRA_T has no duplicate translation keys in Indonesian, English, or Kuwaiti Arabic", () => {
    const source = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
    for (const language of ["id", "en", "ar"]) {
        const keys = extractTopLevelObjectKeys(source, "EXTRA_T", language);
        assert.equal(new Set(keys).size, keys.length, "Duplicate property in EXTRA_T." + language);
    }
});

test("Arabic locale metadata uses Kuwait regional formatting and keeps right-to-left layout", () => {
    const source = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
    const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
    const css = readFileSync(new URL("../public/style.css", import.meta.url), "utf8");

    assert.ok(source.includes('document.documentElement.lang = lang === "ar" ? "ar-KW" : lang;'));
    assert.ok(source.includes('document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";'));
    assert.ok(source.includes('state.lang === "ar" ? "ar-KW"'));
    assert.equal((html.match(/data-lang="ar" lang="ar-KW"/g) ?? []).length, 4);
    assert.equal((html.match(/option value="ar" lang="ar-KW"/g) ?? []).length, 2);
    assert.match(html, /العربية \(الكويت\)/);
    assert.match(css, /html\[dir="rtl"\]/);
});


test("remaining student and system labels are wired to the three-language dictionaries", () => {
    const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
    const keys = [
        "authModalKicker", "authModalTitle", "cameraLightingHint", "studentAccountHint",
        "faceEnrollmentLightingHint", "exportAccountsCsv", "governanceLoading", "testGpsCaveat",
        "absenceDispensation", "absenceSeverityLabel", "absenceSeverityMild",
        "absenceSeverityModerate", "absenceSeveritySevere", "absenceSeverityHelp",
        "absenceMedicalEvidenceLabel", "absenceMedicalEvidenceHelp", "absenceDispensationTitle",
        "absenceDispensationDesc", "studentAbsenceHistoryTitle", "studentAbsenceHistoryDesc",
        "studentAbsenceEmpty", "studentHomeroomKicker", "studentHomeroomTitle",
        "studentHomeroomUnassigned", "studentHomeroomDesc", "dialogConfirm", "dialogSave"
    ];
    for (const key of keys) {
        assert.ok(html.includes('data-i18n="' + key + '"'), "Missing data-i18n binding for " + key);
    }
});


test("GPS defaults and user-facing GPS errors stay consistent across the attendance UI", () => {
    const source = readFileSync(new URL("../public/script.js", import.meta.url), "utf8");
    const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
    const attendanceApi = readFileSync(new URL("../api/attendance.js", import.meta.url), "utf8");

    assert.match(source, /radius:\s*50/);
    assert.match(source, /const MAX_GPS_ACCURACY_METERS = 35;/);
    assert.match(attendanceApi, /const MAX_ACCURACY = 35;/);
    assert.match(html, /id="school-radius-slider"[^>]*value="50"/);
    assert.match(html, /id="allowed-radius"[^>]*>Radius diizinkan: 50 m/);
    assert.doesNotMatch(source, /FACE_MATCH_THRESHOLD\s*=\s*0\.45/);

    const extra = evaluateFrontendConstant(source, "EXTRA_T", "\\nconst state =");
    for (const language of ["id", "en", "ar"]) {
        for (const key of [
            "dispensationGpsUnsupported",
            "dispensationGpsDenied",
            "dispensationGpsUnavailable",
            "dispensationGpsTimeout",
            "dispensationGpsAccuracy"
        ]) {
            assert.ok(typeof extra[language]?.[key] === "string" && extra[language][key].length > 0,
                "Missing " + language + " translation for " + key);
        }
    }
});
