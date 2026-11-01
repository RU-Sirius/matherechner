// math.js (Apache-2.0) – im Browser global über vendor/math.js geladen, in Node per require (für Tests).
let lib = globalThis.math;
if (!lib) { const { createRequire } = await import("node:module"); lib = createRequire(import.meta.url)("./vendor/math.js"); }
export const math = lib;
