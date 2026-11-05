# ArcFace model notice — Amanah ID

Amanah ID's browser-side face embedding engine uses the quantized AuraFace-v1 ONNX model published as Dao-Dung/auraface-v1-int8.

- Upstream model: fal/AuraFace-v1
- Published artifact: glintr100_int8.onnx
- Model architecture: ResNet-100 with an ArcFace additive angular-margin objective
- Input contract: ArcFace-aligned RGB face, 112 × 112 pixels, NCHW float32
- Output contract: 512-dimensional float32 embedding; L2-normalize before comparison
- Model artifact size: 104,560,467 bytes
- SHA-256: be03976204dd44700d7fdd81080457ee4ab6a28f717c1fde00f3b8b7120dde21
- License: Apache License 2.0
- Model card and source: https://huggingface.co/Dao-Dung/auraface-v1-int8
- Full license: https://www.apache.org/licenses/LICENSE-2.0

## Modification notice

The published ONNX file is an INT8-quantized derivative of AuraFace-v1. The model publisher states that per-channel weight quantization was performed with ONNX Runtime; the graph architecture and input/output contract remain unchanged. The quantized file is approximately 105 MB versus approximately 260 MB for the FP32 artifact. The publisher notes that INT8 quantization can cause a small accuracy reduction. Copyright and attribution remain with the AuraFace authors.

## Runtime

ONNX Runtime Web is loaded at runtime from its pinned jsDelivr/unpkg package version. Model inference is performed in the user's browser using the WASM execution provider. The application caches the model in browser Cache Storage when permitted and verifies its SHA-256 before creating an inference session.

## Data handling

A generated embedding is still sensitive biometric data; it is not anonymous merely because it is numeric. Current templates are designed to be stored in the private private.student_face_embeddings table and are not returned in student roster APIs. Raw camera frames are processed in memory and are not uploaded by this embedding engine.

This code is not permission to enrol students. The school must approve the processing purpose, provide clear student and parent/guardian notice, obtain the required authorization/consent, set retention and deletion rules, and provide a non-biometric attendance alternative before applying the migration or enrolling real students.

The default similarity threshold in the API is provisional, not a validated school accuracy claim. It must be calibrated and audited with appropriately authorized, representative test data before production attendance decisions rely on it.