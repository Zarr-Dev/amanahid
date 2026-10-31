import {
    createCipheriv,
    createDecipheriv,
    createHmac,
    randomBytes,
    randomInt,
    timingSafeEqual
} from "node:crypto";

const CAPTCHA_TTL_MS = 3 * 60 * 1000;
const WORDS = ["PAGI", "KELAS", "GURU", "SISWA", "BUKU", "MEJA", "AMANAH", "SEKOLAH", "KAMERA", "JADWAL"];
const VOWELS = ["A", "I", "U", "E", "O"];

const COPY = {
    id: {
        reverse: "Balik urutan kata: {value}",
        first: "Huruf pertama dari kata {value}?",
        count: "Jumlah huruf {letter} pada kata {value}?",
        vowel: "Pilih huruf vokal: {value}",
        largest: "Pilih angka terbesar: {value}",
        digit: "Pilih angka di antara huruf: {value}",
        sequence: "Lengkapi pola: {value}, ?"
    },
    en: {
        reverse: "Reverse the word: {value}",
        first: "What is the first letter of {value}?",
        count: "How many {letter} letters are in {value}?",
        vowel: "Choose the vowel: {value}",
        largest: "Choose the largest number: {value}",
        digit: "Choose the number between the letters: {value}",
        sequence: "Complete the pattern: {value}, ?"
    },
    ar: {
        reverse: "اعكس ترتيب الكلمة: {value}",
        first: "ما الحرف الأول من الكلمة {value}؟",
        count: "كم مرة يظهر الحرف {letter} في كلمة {value}؟",
        vowel: "اختر حرف العلة: {value}",
        largest: "اختر الرقم الأكبر: {value}",
        digit: "اختر الرقم الواقع بين الحروف: {value}",
        sequence: "أكمل النمط: {value}, ؟"
    }
};

function randomItem(values) {
    return values[randomInt(0, values.length)];
}

function shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
        const swapIndex = randomInt(0, index + 1);
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

function normaliseAnswer(value) {
    if (typeof value !== "string") return "";
    const answer = value.trim().normalize("NFKC").toUpperCase();
    return /^[A-Z0-9]{1,12}$/.test(answer) ? answer : "";
}

function getEncryptionKey() {
    const secret = process.env.SESSION_SECRET;
    if (typeof secret !== "string" || secret.length < 32) {
        throw new Error("SESSION_SECRET must contain at least 32 characters");
    }
    return createHmac("sha256", secret).update("amanah-id-login-captcha-v1").digest();
}

function buildChallenge(language) {
    const lang = ["id", "en", "ar"].includes(language) ? language : "id";
    const word = randomItem(WORDS);
    const kind = randomInt(0, 7);
    let key;
    let values = {};
    let answer;

    if (kind === 0) {
        key = "reverse";
        values = { value: word };
        answer = word.split("").reverse().join("");
    } else if (kind === 1) {
        key = "first";
        values = { value: word };
        answer = word[0];
    } else if (kind === 2) {
        key = "count";
        const letter = randomItem(["A", "E", "I", "S"]);
        values = { letter, value: word };
        answer = String([...word].filter(character => character === letter).length);
    } else if (kind === 3) {
        key = "vowel";
        const vowel = randomItem(VOWELS);
        const consonants = shuffle(["B", "K", "M", "R", "T", "S"]).slice(0, 2);
        values = { value: shuffle([vowel, ...consonants]).join(" · ") };
        answer = vowel;
    } else if (kind === 4) {
        key = "largest";
        const digits = new Set();
        while (digits.size < 3) digits.add(String(randomInt(1, 10)));
        const shuffled = shuffle([...digits]);
        values = { value: shuffled.join(" · ") };
        answer = String(Math.max(...shuffled.map(Number)));
    } else if (kind === 5) {
        key = "digit";
        const letters = shuffle(["B", "K", "M", "R", "T", "S"]).slice(0, 2);
        const digit = String(randomInt(1, 10));
        values = { value: shuffle([...letters, digit]).join(" · ") };
        answer = digit;
    } else {
        key = "sequence";
        const start = randomInt(1, 5);
        const step = randomInt(2, 4);
        values = { value: [start, start + step, start + step * 2].join(", ") };
        answer = String(start + step * 3);
    }

    let question = COPY[lang][key];
    for (const [name, value] of Object.entries(values)) {
        question = question.replaceAll(`{${name}}`, String(value));
    }
    return { question, answer: normaliseAnswer(answer) };
}

export function createLoginCaptcha(language = "id") {
    const challenge = buildChallenge(language);
    if (!challenge.answer) throw new Error("Could not create a valid login challenge");

    const payload = Buffer.from(JSON.stringify({
        answer: challenge.answer,
        exp: Date.now() + CAPTCHA_TTL_MS
    }));
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
    const token = [
        "v1",
        iv.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        ciphertext.toString("base64url")
    ].join(".");

    // The answer is returned only to server-side tests; API handlers must never expose it.
    return { question: challenge.question, token, answer: challenge.answer };
}

export function verifyLoginCaptcha(token, submittedAnswer) {
    if (typeof token !== "string" || token.length > 2048 || typeof submittedAnswer !== "string") return false;
    const parts = token.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") return false;

    const expectedAnswer = normaliseAnswer(submittedAnswer);
    if (!expectedAnswer) return false;

    try {
        const iv = Buffer.from(parts[1], "base64url");
        const tag = Buffer.from(parts[2], "base64url");
        const ciphertext = Buffer.from(parts[3], "base64url");
        if (iv.length !== 12 || tag.length !== 16 || ciphertext.length < 8 || ciphertext.length > 1024) return false;

        const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const payload = JSON.parse(plaintext.toString("utf8"));
        if (!payload || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return false;

        const storedAnswer = normaliseAnswer(payload.answer);
        if (!storedAnswer) return false;
        const expected = Buffer.from(storedAnswer, "utf8");
        const actual = Buffer.from(expectedAnswer, "utf8");
        return expected.length === actual.length && timingSafeEqual(expected, actual);
    } catch {
        return false;
    }
}
