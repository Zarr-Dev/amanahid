import assert from "node:assert/strict";
import test from "node:test";
import {
    FACE_EMBEDDING_DIMENSIONS,
    computeSimilarityTransform,
    cosineDistance,
    extractArcFaceLandmarks,
    normalizeEmbedding
} from "../public/face-engine.js";

test("ArcFace embeddings are normalized to a stable 512-dimensional unit vector", () => {
    const values = Array.from({ length: FACE_EMBEDDING_DIMENSIONS }, (_, index) => index + 1);
    const normalized = normalizeEmbedding(values);
    assert.equal(normalized.length, 512);
    const norm = Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0));
    assert.ok(Math.abs(norm - 1) < 1e-10);
});

test("ArcFace embedding validation rejects incorrect dimensions, NaN and zero vectors", () => {
    assert.throws(() => normalizeEmbedding([1, 2, 3]), /512/);
    assert.throws(() => normalizeEmbedding(Array.from({ length: 512 }, () => Number.NaN)), /non-finite/);
    assert.throws(() => normalizeEmbedding(Array.from({ length: 512 }, () => 0)), /zero magnitude/);
});

test("cosine distance is zero for an identical embedding and one for orthogonal embeddings", () => {
    const first = [1, ...Array.from({ length: 511 }, () => 0)];
    const second = [0, 1, ...Array.from({ length: 510 }, () => 0)];
    assert.equal(cosineDistance(first, first), 0);
    assert.equal(cosineDistance(first, second), 1);
});

test("ArcFace five-point similarity alignment is identity when landmarks are canonical", () => {
    const target = [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041]
    ];
    const source = target.map(([x, y]) => ({ x, y }));
    const transform = computeSimilarityTransform(source, target);
    assert.ok(Math.abs(transform.a - 1) < 1e-10);
    assert.ok(Math.abs(transform.b) < 1e-10);
    assert.ok(Math.abs(transform.e) < 1e-9);
    assert.ok(Math.abs(transform.f) < 1e-9);
});

test("ArcFace landmark extraction averages eye points and uses nose and mouth corners", () => {
    const positions = Array.from({ length: 68 }, (_, index) => ({ x: index, y: index * 2 }));
    const points = extractArcFaceLandmarks({ landmarks: { positions } });
    assert.equal(points.length, 5);
    assert.equal(points[0].x, (36 + 37 + 38 + 39 + 40 + 41) / 6);
    assert.equal(points[1].x, (42 + 43 + 44 + 45 + 46 + 47) / 6);
    assert.equal(points[2].x, 30);
    assert.equal(points[3].x, 48);
    assert.equal(points[4].x, 54);
});

test("ArcFace alignment rejects incomplete or degenerate landmark sets", () => {
    assert.throws(() => extractArcFaceLandmarks({ landmarks: { positions: [] } }), /68-point/);
    assert.throws(() => computeSimilarityTransform([{ x: 1, y: 1 }]), /five/);
    assert.throws(() => computeSimilarityTransform(
        Array.from({ length: 5 }, () => ({ x: 1, y: 1 }))
    ), /stable alignment/);
});
