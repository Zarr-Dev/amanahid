export const FACE_MODEL_KEY = "auraface-glintr100-int8-v1";
export const FACE_EMBEDDING_DIMENSIONS = 512;
export const FACE_MODEL_URL = "https://huggingface.co/Dao-Dung/auraface-v1-int8/resolve/main/glintr100_int8.onnx";
export const FACE_MODEL_SHA256 = "be03976204dd44700d7fdd81080457ee4ab6a28f717c1fde00f3b8b7120dde21";
export const FACE_MODEL_BYTES = 104560467;
export const FACE_MODEL_VERSION = "1.0.0";

const ORT_VERSION = "1.31.1";
const ORT_SOURCES = [
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VERSION + "/dist/ort.min.js",
    "https://unpkg.com/onnxruntime-web@" + ORT_VERSION + "/dist/ort.min.js"
];
const ORT_WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ORT_VERSION + "/dist/";
const CACHE_NAME = "amanah-face-model-" + FACE_MODEL_VERSION;
const INPUT_SIZE = 112;
const DESTINATION = [
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041]
];
const LANDMARK_GROUPS = [[36, 37, 38, 39, 40, 41], [42, 43, 44, 45, 46, 47], [30], [48], [54]];

function finitePoint(point) {
    return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function averagePoints(points, indexes) {
    const chosen = indexes.map(index => points[index]).filter(finitePoint);
    if (chosen.length !== indexes.length) throw new Error("Face landmarks are incomplete");
    return {
        x: chosen.reduce((sum, point) => sum + Number(point.x), 0) / chosen.length,
        y: chosen.reduce((sum, point) => sum + Number(point.y), 0) / chosen.length
    };
}

export function extractArcFaceLandmarks(detection) {
    const points = detection && detection.landmarks && detection.landmarks.positions;
    if (!Array.isArray(points) || points.length < 55) throw new Error("68-point face landmarks are required");
    return LANDMARK_GROUPS.map(group => averagePoints(points, group));
}

/**
 * Least-squares 2D similarity transform: translation + rotation + uniform scale.
 * The transform maps source facial landmarks to the canonical ArcFace 112x112 layout.
 */
export function computeSimilarityTransform(sourcePoints, targetPoints = DESTINATION) {
    if (!Array.isArray(sourcePoints) || sourcePoints.length !== 5 ||
        !Array.isArray(targetPoints) || targetPoints.length !== 5 ||
        !sourcePoints.every(finitePoint) || !targetPoints.every(finitePoint)) {
        throw new TypeError("Exactly five finite source and target landmarks are required");
    }

    const sourceMean = sourcePoints.reduce((acc, point) => ({
        x: acc.x + Number(point.x) / 5,
        y: acc.y + Number(point.y) / 5
    }), { x: 0, y: 0 });
    const targetMean = targetPoints.reduce((acc, point) => ({
        x: acc.x + Number(point[0]) / 5,
        y: acc.y + Number(point[1]) / 5
    }), { x: 0, y: 0 });

    let denominator = 0;
    let numeratorA = 0;
    let numeratorB = 0;
    for (let index = 0; index < 5; index += 1) {
        const sx = Number(sourcePoints[index].x) - sourceMean.x;
        const sy = Number(sourcePoints[index].y) - sourceMean.y;
        const tx = Number(targetPoints[index][0]) - targetMean.x;
        const ty = Number(targetPoints[index][1]) - targetMean.y;
        denominator += sx * sx + sy * sy;
        numeratorA += sx * tx + sy * ty;
        numeratorB += sx * ty - sy * tx;
    }
    if (!Number.isFinite(denominator) || denominator < 1e-6) {
        throw new Error("Face landmarks do not define a stable alignment");
    }

    const a = numeratorA / denominator;
    const b = numeratorB / denominator;
    const scale = Math.hypot(a, b);
    if (!Number.isFinite(scale) || scale < 0.05 || scale > 20) {
        throw new Error("Face alignment scale is outside the supported range");
    }
    return {
        a,
        b,
        c: -b,
        d: a,
        e: targetMean.x - a * sourceMean.x + b * sourceMean.y,
        f: targetMean.y - b * sourceMean.x - a * sourceMean.y,
        scale
    };
}

export function normalizeEmbedding(values) {
    if (!values || typeof values.length !== "number" || values.length !== FACE_EMBEDDING_DIMENSIONS) {
        throw new TypeError("ArcFace output must contain exactly 512 values");
    }
    const result = Array.from(values, Number);
    if (!result.every(Number.isFinite)) throw new TypeError("ArcFace embedding contains non-finite values");
    const norm = Math.sqrt(result.reduce((sum, value) => sum + value * value, 0));
    if (!Number.isFinite(norm) || norm < 1e-8) throw new Error("ArcFace embedding has zero magnitude");
    return result.map(value => value / norm);
}

export function cosineDistance(left, right) {
    if (!left || !right || left.length !== FACE_EMBEDDING_DIMENSIONS ||
        right.length !== FACE_EMBEDDING_DIMENSIONS) {
        throw new TypeError("Cosine distance requires two 512-dimensional embeddings");
    }
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < FACE_EMBEDDING_DIMENSIONS; index += 1) {
        const a = Number(left[index]);
        const b = Number(right[index]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) throw new TypeError("Embedding values must be finite");
        dot += a * b;
        leftNorm += a * a;
        rightNorm += b * b;
    }
    if (leftNorm < 1e-12 || rightNorm < 1e-12) throw new Error("Cannot compare a zero-length embedding");
    const similarity = Math.max(-1, Math.min(1, dot / Math.sqrt(leftNorm * rightNorm)));
    return 1 - similarity;
}

function canvasForFace(image, detection) {
    if (typeof document === "undefined") throw new Error("Canvas is unavailable in this environment");
    const sourceWidth = Number(image && (image.videoWidth || image.naturalWidth || image.width));
    const sourceHeight = Number(image && (image.videoHeight || image.naturalHeight || image.height));
    if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth < 1 || sourceHeight < 1) {
        throw new Error("Face source image is not ready");
    }

    const sourcePoints = extractArcFaceLandmarks(detection);
    const transform = computeSimilarityTransform(sourcePoints);
    const canvas = document.createElement("canvas");
    canvas.width = INPUT_SIZE;
    canvas.height = INPUT_SIZE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.fillStyle = "#000";
    context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
    context.drawImage(image, 0, 0, sourceWidth, sourceHeight);
    context.setTransform(1, 0, 0, 1, 0, 0);
    return { canvas, context, transform, sourceWidth, sourceHeight };
}

function makeTensorData(imageData) {
    const pixels = imageData.data;
    const plane = INPUT_SIZE * INPUT_SIZE;
    const tensor = new Float32Array(plane * 3);
    for (let pixel = 0; pixel < plane; pixel += 1) {
        const offset = pixel * 4;
        tensor[pixel] = (pixels[offset] - 127.5) / 127.5;
        tensor[plane + pixel] = (pixels[offset + 1] - 127.5) / 127.5;
        tensor[(plane * 2) + pixel] = (pixels[offset + 2] - 127.5) / 127.5;
    }
    return tensor;
}

function scriptLoad(source) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = source;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = () => {
            script.remove();
            reject(new Error("ONNX Runtime script could not be loaded"));
        };
        document.head.appendChild(script);
    });
}

async function getOrt(onProgress) {
    if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("ArcFace browser runtime is unavailable");
    }
    if (!window.ort) {
        let lastError = null;
        for (const source of ORT_SOURCES) {
            try {
                onProgress({ stage: "runtime", percent: 3, message: "Loading ONNX Runtime…" });
                await scriptLoad(source);
                if (window.ort) break;
            } catch (error) {
                lastError = error;
            }
        }
        if (!window.ort) throw lastError || new Error("ONNX Runtime is unavailable");
    }
    window.ort.env.wasm.wasmPaths = ORT_WASM_BASE;
    window.ort.env.wasm.numThreads = 1;
    window.ort.env.wasm.proxy = false;
    return window.ort;
}

async function readModel(onProgress) {
    let cache = null;
    const cacheKey = new Request(FACE_MODEL_URL);
    try {
        if (typeof caches !== "undefined") {
            cache = await caches.open(CACHE_NAME);
            const saved = await cache.match(cacheKey);
            if (saved) {
                onProgress({ stage: "verify", percent: 96, message: "Verifying cached face model…" });
                const buffer = await saved.arrayBuffer();
                const digest = await crypto.subtle.digest("SHA-256", buffer);
                const hex = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
                if (hex === FACE_MODEL_SHA256) {
                    onProgress({ stage: "ready", percent: 100, message: "Face model ready." });
                    return buffer;
                }
                await cache.delete(cacheKey);
            }
        }
    } catch {
        cache = null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
        const response = await fetch(FACE_MODEL_URL, {
            method: "GET",
            mode: "cors",
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal
        });
        if (!response.ok) throw new Error("Face model download failed (" + response.status + ")");
        const total = Number(response.headers.get("content-length")) || FACE_MODEL_BYTES;
        let buffer;
        if (response.body && typeof response.body.getReader === "function") {
            const reader = response.body.getReader();
            const chunks = [];
            let received = 0;
            while (true) {
                const part = await reader.read();
                if (part.done) break;
                chunks.push(part.value);
                received += part.value.byteLength;
                const percent = Math.min(94, Math.round((received / total) * 94));
                onProgress({
                    stage: "download",
                    percent,
                    received,
                    total,
                    message: "Downloading face model " + Math.round(received / 1048576) + " / " + Math.ceil(total / 1048576) + " MB…"
                });
            }
            const combined = new Uint8Array(received);
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.byteLength;
            }
            buffer = combined.buffer;
        } else {
            buffer = await response.arrayBuffer();
        }

        onProgress({ stage: "verify", percent: 96, message: "Checking face model integrity…" });
        const digest = await crypto.subtle.digest("SHA-256", buffer);
        const hex = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
        if (hex !== FACE_MODEL_SHA256) throw new Error("Face model integrity check failed");
        if (cache) {
            try {
                await cache.put(cacheKey, new Response(buffer.slice(0), {
                    headers: { "Content-Type": "application/octet-stream" }
                }));
            } catch {
                // Cache quota is optional; the in-memory model remains usable for this session.
            }
        }
        onProgress({ stage: "ready", percent: 100, message: "Face model ready." });
        return buffer;
    } finally {
        clearTimeout(timeout);
    }
}

export async function createAmanahFaceEngine(options = {}) {
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    const ort = await getOrt(onProgress);
    const model = await readModel(onProgress);
    onProgress({ stage: "initialize", percent: 98, message: "Preparing face recognition…" });

    const session = await ort.InferenceSession.create(model, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
        enableMemPattern: true
    });
    const inputName = session.inputNames && session.inputNames[0] ? session.inputNames[0] : "data";
    const outputName = session.outputNames && session.outputNames[0] ? session.outputNames[0] : "1333";

    return {
        modelKey: FACE_MODEL_KEY,
        dimensions: FACE_EMBEDDING_DIMENSIONS,
        async embed(image, detection) {
            const aligned = canvasForFace(image, detection);
            const pixels = aligned.context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
            const data = makeTensorData(pixels);
            const tensor = new ort.Tensor("float32", data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
            const outputs = await session.run({ [inputName]: tensor });
            const output = outputs && outputs[outputName] ? outputs[outputName].data : null;
            return {
                embedding: normalizeEmbedding(output),
                alignment: { width: INPUT_SIZE, height: INPUT_SIZE, scale: aligned.transform.scale }
            };
        },
        async dispose() {
            await session.release();
        }
    };
}
