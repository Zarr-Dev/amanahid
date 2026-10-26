import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const requiredFiles = [
    "package.json", "package-lock.json", "vercel.json", "public/index.html", "public/style.css", "public/script.js",
    "public/assets/amanah-logo-animation.mp4", "public/assets/amanah-favicon.png",
    "api/_lib/admin-auth.js", "api/_lib/admin-api.js", "api/_lib/audit.js",
    "api/_lib/supabase.js", "api/_lib/validate.js", "api/_lib/whatsapp.js",
    "api/admin/login.js", "api/admin/users.js",
    "api/admin/settings.js", "api/admin/audit.js", "api/auth/login.js",
    "api/index.js", "supabase-demo-admin.sql"
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
    !vercel.functions?.["api/index.js"]) {
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
const htmlChecks = [
    ["admin login modal", /id="admin-login-modal"/],
    ["visible demo admin email", /id="admin-demo-email">admin@amanah\.sch\.id<\/code>/],
    ["visible demo admin password", /id="admin-demo-password">SuperSecurePass123!<\/code>/],
    ["numeric captcha field", /id="admin-captcha"[^>]*type="number"/],
    ["splash accessible name and live region", /id="splash-screen"[^>]*aria-label="Amanah\.id"[^>]*aria-live="polite"/],
    ["muted splash video with fallback poster", /<video class="splash-mark"[\s\S]*?muted playsinline preload="auto"[\s\S]*?poster="assets\/amanah-favicon\.png"/],
    ["standalone stylesheet and script", /href="style\.css"[\s\S]*?src="script\.js"/],
    ["administrator dashboard", /id="dashboard-admin"[\s\S]*?id="admin-view-dashboard"[\s\S]*?id="admin-view-users"[\s\S]*?id="admin-view-settings"[\s\S]*?id="admin-view-audit"[\s\S]*?id="admin-view-profile"/],
    ["teacher-managed student account fields", /id="input-student-email"[\s\S]*?id="input-student-password"/],
    ["visible student face sample progress", /id="face-sample-progress-bar"/]
];
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
if (!adminUserApi.includes('pattern: /^guru$/') || adminUserApi.includes('face_descriptors: []')) {
    console.error("Admin user creation must be teacher-only; student accounts require face descriptors and teacher authorization.");
    process.exit(1);
}

const cssChecks = [
    ["responsive splash dimensions", /\.splash-mark\s*\{[^}]*width:\s*clamp\(160px,\s*25vw,\s*280px\)/s],
    ["square splash video", /\.splash-mark\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s],
    ["splash video blend mode", /\.splash-mark\s*\{[^}]*mix-blend-mode:\s*multiply/s],
    ["splash text animation", /@keyframes\s+splash-text-in\s*\{[\s\S]*?translateY\(-10px\)[\s\S]*?translateY\(0\)/],
    ["reduced motion preference", /@media\s*\(prefers-reduced-motion:\s*reduce\)/],
    ["mobile safe-area bottom nav", /height:\s*66px;[\s\S]{0,180}padding-bottom:\s*max\(5px,\s*env\(safe-area-inset-bottom\)\)/],
    ["touch-scrollable tables", /\.table-wrap\s*\{[^}]*overflow-x:\s*auto;[^}]*-webkit-overflow-scrolling:\s*touch;/s],
    ["large screen content width cap", /@media\s*\(min-width:\s*1600px\)[\s\S]*?\.app-shell\s*\{\s*max-width:\s*1600px;/]
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
if (!/captchaValue\s*===\s*""\s*\|\|\s*captchaValue\s*!==\s*"8"/.test(js) ||
    !/headers\["X-Admin-Token"\]\s*=\s*token/.test(js) ||
    !/stats\?\.total_students\s*\?\?\s*0/.test(js)) {
    console.error("Build check failed: strict captcha, admin token injection, or null-safe statistics handling is missing.");
    process.exit(1);
}

console.log(`Build check passed: ${jsFiles.length} JavaScript files, ${routeFiles.length} ESM API routes, frontend requirements, assets, and Vercel configuration validated.`);
