import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const requiredFiles = [
    "package.json", "package-lock.json", "vercel.json", "public/index.html", "public/style.css", "public/script.js",
    "public/assets/amanah-favicon.png", "public/assets/amanah-favicon.svg",
    "api/_lib/admin-auth.js", "api/_lib/admin-api.js", "api/_lib/audit.js",
    "api/_lib/supabase.js", "api/_lib/validate.js", "api/_lib/whatsapp.js",
    "api/admin/login.js", "api/admin/users.js",
    "api/admin/settings.js", "api/admin/audit.js", "api/_lib/test-tools.js", "api/auth/login.js",
    "api/absence.js", "supabase/migrations/20261029080000_create_absence_requests.sql", "supabase/migrations/20261029080500_unique_pending_absence_request.sql", "supabase-demo-accounts.sql"
];
const missing = requiredFiles.filter(path => !existsSync(join(root, path)));
if (missing.length) {
    console.error(`Build check failed. Missing required files: ${missing.join(", ")}`);
    process.exit(1);
}

const packageText = readFileSync(join(root, "package.json"), "utf8");
const pkg = JSON.parse(packageText);
if (pkg.type !== "module" || (packageText.match(/"type"\s*:/g) ?? []).length !== 1) {
    console.error("package.json must declare exactly one root type: module field.");
    process.exit(1);
}
if (pkg.engines?.node !== "24.x") {
    console.error("package.json must target Vercel-supported Node.js 24.x.");
    process.exit(1);
}
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
if (lock.packages?.[""]?.engines?.node !== pkg.engines.node) {
    console.error("package-lock.json Node.js engine must match package.json.");
    process.exit(1);
}
const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
if (!vercel.$schema?.includes("openapi.vercel.sh/vercel.json") ||
    !vercel.functions?.["api/admin/*.js"] || !vercel.functions?.["api/auth/*.js"] ||
    !vercel.functions?.["api/settings.js"]) {
    console.error("vercel.json schema or explicit serverless function settings are missing.");
    process.exit(1);
}

function collectJs(directory) {
    const files = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (["node_modules", ".git", ".vercel"].includes(entry.name)) continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...collectJs(path));
        else if (entry.isFile() && path.endsWith(".js")) files.push(path);
    }
    return files;
}
const frontendSource = readFileSync(join(root, "public/script.js"), "utf8");
if (!/function\s+\$\s*\(\s*id\s*\)/.test(frontendSource)) {
    console.error("Frontend DOM helper function $(id) is required by startup and event handlers.");
    process.exit(1);
}
if (!/function\s+initialize\s*\(/.test(frontendSource) || !/initialize\s*\(\s*\)\s*;/.test(frontendSource)) {
    console.error("Frontend initialization entrypoint is missing.");
    process.exit(1);
}

const apiFiles = collectJs(join(root, "api"));
const jsFiles = [...apiFiles, ...collectJs(join(root, "scripts")), join(root, "public/script.js")];
for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
        console.error(`Syntax error in ${relative(root, file)}\n${result.stderr || result.stdout}`);
        process.exit(1);
    }
}

const routeFiles = apiFiles.filter(file => !relative(join(root, "api"), file).split(/[\\/]/).includes("_lib"));
for (const file of routeFiles) {
    const source = readFileSync(file, "utf8");
    if (!/export\s+default\s+async\s+function\s+handler\s*\(/.test(source)) {
        console.error(`API route must use an ESM default handler: ${relative(root, file)}`);
        process.exit(1);
    }
}
if (routeFiles.length > 12) {
    console.error(`Build check failed: Vercel Hobby supports at most 12 API functions; found ${routeFiles.length}.`);
    process.exit(1);
}
const allApiSource = apiFiles.map(file => readFileSync(file, "utf8")).join("\n");
if (/\brequire\s*\(|\bmodule\.exports\b/.test(allApiSource)) {
    console.error("CommonJS syntax was found under api/. Use ESM imports and exports.");
    process.exit(1);
}

const html = readFileSync(join(root, "public/index.html"), "utf8");
const css = readFileSync(join(root, "public/style.css"), "utf8");
const js = readFileSync(join(root, "public/script.js"), "utf8");
const extraStart = js.indexOf("const EXTRA_T = {");
const extraEnd = js.indexOf("\n};", extraStart);
const extraTranslations = extraStart >= 0 && extraEnd > extraStart ? js.slice(extraStart, extraEnd) : "";
if (!extraTranslations || extraTranslations.includes(": tr(")) {
    console.error("Build check failed: EXTRA_T must not call tr() while its own translation object is initializing.");
    process.exit(1);
}
const htmlChecks = [
    ["admin login modal", /id="admin-login-modal"/],
    ["splash accessible name and live region", /<div\b(?=[^>]*\bid="splash-screen")(?=[^>]*\baria-label="Amanah ID")(?=[^>]*\baria-live="polite")[^>]*>/],
    ["static splash logo", /<img class="splash-mark" src="assets\/amanah-logo\.svg"/],
    ["official SVG favicon", /rel="icon" type="image\/svg\+xml" href="assets\/amanah-favicon\.svg"/],
    ["two-tone Amanah ID wordmark", /class="brand-name-amanah"[\s\S]*?class="brand-name-id"/],
    ["standalone stylesheet and script", /href="style\.css"[\s\S]*?src="script\.js"/],
    ["administrator dashboard", /id="dashboard-admin"[\s\S]*?id="admin-view-dashboard"[\s\S]*?id="admin-view-users"[\s\S]*?id="admin-view-settings"[\s\S]*?id="admin-view-audit"[\s\S]*?id="admin-view-profile"/],
    ["teacher-managed student account fields", /id="input-student-email"[\s\S]*?id="input-student-password"/],
    ["Admin parent WhatsApp field", /id="admin-user-parent-whatsapp"/],
    ["visible student face sample progress", /id="face-sample-progress-bar"/],
    ["student absence form", /id="student-absence-form"/],
    ["teacher absence request table", /id="absence-requests-tbody"/],
    ["admin test lab", /id="admin-view-tests"/],
    ["admin camera diagnostics", /id="admin-test-camera-start"/],
    ["admin WhatsApp test preview", /id="admin-test-whatsapp-preview"/],
    ["admin GPS diagnostics", /id="admin-test-gps-run"/],
    ["rotating Admin CAPTCHA", /id="admin-captcha-answer"/],
    ["editable school GPS map", /id="admin-school-map"/],
    ["Admin school-to-device distance", /id="admin-map-device-distance"/],
    ["Admin school GPS accuracy diagnostics", /id="admin-map-device-accuracy"/],
    ["Admin WhatsApp consent checkbox", /class="admin-test-consent"[\s\S]*?type="checkbox"/],
    ["Admin account export", /id="admin-export-users"/],
    ["Admin audit export", /id="admin-export-audit"/]
];
if (html.includes('id="admin-demo-password"') || html.includes("SuperSecurePass123!")) {
    console.error("Build check failed: public Admin demo credentials must never be shipped.");
    process.exit(1);
}
const demoAccountsSql = readFileSync(join(root, "supabase-demo-accounts.sql"), "utf8");
if (!/insert into public[.]teachers/i.test(demoAccountsSql) ||
    !/insert into public[.]students/i.test(demoAccountsSql) ||
    /insert into public[.]admin_users/i.test(demoAccountsSql)) {
    console.error("Demo seed must create only Guru and Siswa accounts, never an Admin.");
    process.exit(1);
}
if (html.includes('id="btn-capture-face"')) {
    console.error("Build check failed: the manual face sample button must be removed.");
    process.exit(1);
}
for (const [label, pattern] of htmlChecks) {
    if (!pattern.test(html)) {
        console.error(`Build check failed: missing ${label} in public/index.html.`);
        process.exit(1);
    }
}
if (/<details\s+class="about-amanah"/.test(html)) {
    console.error("The cramped about-amanah details block must not be present in the hero.");
    process.exit(1);
}
if (/id="(?:tab-register|signup-form|register-form)"/.test(html) || /id="(?:tab-register|signup-form|register-form)"/.test(js)) {
    console.error("Public self-registration UI must be disabled; teachers create student accounts after face enrollment.");
    process.exit(1);
}
const adminUserApi = readFileSync(join(root, "api/admin/users.js"), "utf8");
if (!adminUserApi.includes('pattern: /^(guru|siswa)$/') ||
    !adminUserApi.includes('face_descriptors: []') ||
    !adminUserApi.includes('nisn: { type: "string"')) {
    console.error("Admin must be able to create Guru and Siswa accounts; new Siswa accounts must require later face enrollment.");
    process.exit(1);
}

const cssChecks = [
    ["WhatsApp test checkbox fixed dimensions", /\.admin-test-consent input\[type="checkbox"\][\s\S]*?width:\s*18px[\s\S]*?flex:\s*0\s+0\s+18px/],
    ["Admin map distance diagnostics styling", /\.admin-map-device-panel\s*\{/],
    ["responsive splash dimensions", /\.splash-mark\s*\{[^}]*width:\s*clamp\(160px,\s*25vw,\s*280px\)/s],
    ["square splash logo", /\.splash-mark\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s],
    ["theme-aware wordmark", /\.brand-name-amanah\s*\{[^}]*var\(--brand-word-color/s],
    ["dark theme wordmark contrast", /body\.theme-dark\s*\{[^}]*--brand-word-color:\s*#f8fafc/s],
    ["bright splash background", /\.splash-screen\s*\{[^}]*background:[^;]*#fff/s],
    ["splash text animation", /@keyframes\s+splash-text-in\s*\{[\s\S]*?translateY\(-10px\)[\s\S]*?translateY\(0\)/],
    ["reduced motion preference", /@media\s*\(prefers-reduced-motion:\s*reduce\)/],
    ["mobile safe-area bottom nav", /height:\s*66px;[\s\S]{0,180}padding-bottom:\s*max\(5px,\s*env\(safe-area-inset-bottom\)\)/],
    ["touch-scrollable tables", /\.table-wrap\s*\{[^}]*overflow-x:\s*auto;[^}]*-webkit-overflow-scrolling:\s*touch;/s],
    ["large screen content width cap", /@media\s*\(min-width:\s*1600px\)[\s\S]*?\.app-shell\s*\{\s*max-width:\s*1600px;/],
    ["absence form styling", /\.absence-form-panel\s+\.registration-form/]
];
for (const [label, pattern] of cssChecks) {
    if (!pattern.test(css)) {
        console.error(`Build check failed: missing ${label} in public/style.css.`);
        process.exit(1);
    }
}
if (/drop-shadow\(\s*0\s+8px\s+13px\s+rgba\(57,\s*120,\s*246,\s*\.2\)\)/.test(css)) {
    console.error("The previous shadow under the splash logo must be removed.");
    process.exit(1);
}
if (/height:\s*100vh\b/.test(css)) {
    console.error("Use min-height: 100svh for viewport-height layouts instead of height: 100vh.");
    process.exit(1);
}
if (!/headers\["X-Admin-Token"\]\s*=\s*token/.test(js) ||
    !/stats\?\.total_students\s*\?\?\s*0/.test(js) ||
    !/body\.parent_whatsapp\s*=\s*parentWhatsApp\.replace\(\/\^08\/,\s*"628"\)/.test(js) ||
    !/parent_whatsapp:\s*body\.parent_whatsapp\s*\?\s*body\.parent_whatsapp\.replace\(\/\^08\/,\s*"628"\)/.test(adminUserApi) ||
    !allApiSource.includes("sendWhatsApp(target, message)")) {
    console.error("Build check failed: admin token injection, null-safe statistics, or parent WhatsApp delivery wiring is missing.");
    process.exit(1);
}

const publicBrandSource = html + "\n" + js;
if (/Amanah\.id/i.test(publicBrandSource)) {
    console.error("Build check failed: public UI must use the official brand name Amanah ID.");
    process.exit(1);
}
if (!js.includes('phase === "pending" ? "disabled"') ||
    !js.includes("state.adminFeatureSaveQueue") ||
    !js.includes("body: payload });")) {
    console.error("Build check failed: Admin feature toggles must show per-switch loading and serialize JSON updates.");
    process.exit(1);
}

if (!js.includes("@v0.22.2/weights") || !js.includes("inputSize: 512, scoreThreshold: 0.55") ||
    !js.includes("function updateAttendanceLiveness") || !js.includes("function isFaceDetectionUsable") ||
    !allApiSource.includes("FACE_MATCH_THRESHOLD = 0.42") ||
    !allApiSource.includes("GPS_BOUNDARY_UNCERTAIN")) {
    console.error("Build check failed: pinned face model, face quality/liveness checks, or conservative server matching/geofence guards are missing.");
    process.exit(1);
}

const featureDefaultsSource = readFileSync(join(root, "api/_lib/features.js"), "utf8");
const defaultsBlock = featureDefaultsSource.slice(
    featureDefaultsSource.indexOf("export const FEATURE_DEFAULTS"),
    featureDefaultsSource.indexOf("// These controls protect")
);
const featureKeys = [...defaultsBlock.matchAll(/^\s{4}([a-z_]+):/gm)].map(match => match[1]);
const adminGroupStart = js.indexOf("const ADMIN_FEATURE_GROUPS = [");
const adminGroupEnd = js.indexOf("\n];", adminGroupStart);
const adminGroups = adminGroupStart >= 0 && adminGroupEnd > adminGroupStart
    ? js.slice(adminGroupStart, adminGroupEnd) : "";
const adminFeatureCopyStart = js.indexOf("const ADMIN_FEATURE_COPY = {");
const adminFeatureCopyEnd = js.indexOf("\nconst ADMIN_FEATURE_GROUPS", adminFeatureCopyStart);
const adminFeatureCopy = adminFeatureCopyStart >= 0 && adminFeatureCopyEnd > adminFeatureCopyStart
    ? js.slice(adminFeatureCopyStart, adminFeatureCopyEnd) : "";
const renderedFeatureKeys = [...adminGroups.matchAll(/\["([a-z_]+)","/g)].map(match => match[1]);
if (featureKeys.length !== 38 || new Set(featureKeys).size !== 38 ||
    renderedFeatureKeys.length !== 38 || new Set(renderedFeatureKeys).size !== 38 ||
    !["id:", "en:", "ar:"].every(language => adminFeatureCopy.includes(language)) ||
    featureKeys.some(key => !adminFeatureCopy.includes(key + ": ["))) {
    console.error("Build check failed: all 38 Admin controls must be present once and translated in Indonesian, English, and Arabic.");
    process.exit(1);
}
if (!js.includes("phase === \"pending\" ? \"disabled\"") || !js.includes("feature-spinner")) {
    console.error("Build check failed: per-switch loading feedback is missing.");
    process.exit(1);
}
if (!existsSync(join(root, "api/_lib/test-tools.js"))) {
    console.error("Build check failed: admin Fonnte test handler is missing.");
    process.exit(1);
}
if (!js.includes("function faceAngleBucket") || !allApiSource.includes("GPS_FIX_STALE") || !js.includes("faceSampleAngles.includes(angle)")) {
    console.error("Build check failed: face-angle capture or fresh GPS checks are missing.");
    process.exit(1);
}
if (!js.includes("async function submitStudentAbsence") || !js.includes("loadAbsenceRequests")) {
    console.error("Build check failed: student absence request workflow is missing.");
    process.exit(1);
}

if (!js.includes("refreshAdminCaptcha()") || !js.includes("syncAdminSettingsMap")) {
    console.error("Build check failed: rotating Admin CAPTCHA or editable school GPS map is missing.");
    process.exit(1);
}
if (!css.includes("left: 50%;") || !css.includes("transform: translate(-50%, 0);")) {
    console.error("Build check failed: toast notifications must be centered at the bottom of the viewport.");
    process.exit(1);
}

console.log(`Build check passed: ${jsFiles.length} JavaScript files, ${routeFiles.length} ESM API routes, frontend requirements, assets, and Vercel configuration validated.`);