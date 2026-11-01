// Analytische Geometrie im Raum (Geraden, Ebenen, Punkte), Signifikanztest (Binomial), zweistufiges Baumdiagramm.
import { binomCdf } from "./mx.js";

const fail = (m = "range") => { throw new Error(m); };
export const sub = (a, b) => a.map((x, i) => x - b[i]);
export const add = (a, b) => a.map((x, i) => x + b[i]);
export const mul = (a, k) => a.map((x) => x * k);
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => Math.hypot(...a);
const scaleOf = (...vs) => Math.max(1, ...vs.flat().map(Math.abs));
const isZero = (v, ref) => norm(v) <= 1e-9 * ref;
const deg = (rad) => (rad * 180) / Math.PI;
const check3 = (...vs) => vs.forEach((v) => { if (!Array.isArray(v) || v.length !== 3 || v.some((x) => !Number.isFinite(x))) fail("vec"); });

// Ebene in Normalenform n·x = d
export function planeFromParam(P, u, v) { check3(P, u, v); const n = cross(u, v); if (isZero(n, scaleOf(u, v) ** 2)) fail("degenerate"); return { n, d: dot(n, P) }; }
export function planeFrom3(A, B, C) { check3(A, B, C); return planeFromParam(A, sub(B, A), sub(C, A)); }
export function planeFromCoord(a, b, c, d) { const n = [a, b, c]; check3(n); if (isZero(n, 1)) fail("degenerate"); return { n, d }; }

export function lineLine(P, u, Q, v) {
  check3(P, u, Q, v); if (isZero(u, 1) || isZero(v, 1)) fail("degenerate");
  const w = cross(u, v), PQ = sub(Q, P), ref = scaleOf(P, u, Q, v) ** 2;
  if (isZero(w, norm(u) * norm(v) * 1e0)) {
    const dist = norm(cross(PQ, u)) / norm(u);
    return dist <= 1e-9 * scaleOf(P, Q, u) ? { kind: "identisch" } : { kind: "parallel", dist };
  }
  const angle = deg(Math.acos(Math.min(1, Math.abs(dot(u, v)) / (norm(u) * norm(v)))));
  const triple = dot(PQ, w);
  if (Math.abs(triple) <= 1e-9 * ref * scaleOf(P, Q)) {
    const w2 = dot(w, w), s = dot(cross(PQ, v), w) / w2, t = dot(cross(PQ, u), w) / w2;
    return { kind: "schneidend", S: add(P, mul(u, s)), s, t, angle };
  }
  // windschief: Lotfußpunkte der gemeinsamen Lotgeraden
  const a = dot(u, u), b = dot(u, v), c = dot(v, v), dd = dot(u, PQ), e = dot(v, PQ), den = a * c - b * b;
  const s = (dd * c - b * e) / den, t = (b * dd - a * e) / den;
  return { kind: "windschief", dist: Math.abs(triple) / norm(w), F1: add(P, mul(u, s)), F2: add(Q, mul(v, t)), angle };
}

export function linePlane(P, u, { n, d }) {
  check3(P, u, n); if (isZero(u, 1)) fail("degenerate");
  const den = dot(n, u), off = dot(n, P) - d;
  if (Math.abs(den) <= 1e-12 * norm(n) * norm(u)) {
    return Math.abs(off) <= 1e-9 * scaleOf(n, P, [d]) ** 2 ? { kind: "liegt in der Ebene" } : { kind: "parallel", dist: Math.abs(off) / norm(n) };
  }
  const s = -off / den;
  return { kind: "schneidend", S: add(P, mul(u, s)), s, angle: deg(Math.asin(Math.min(1, Math.abs(den) / (norm(n) * norm(u))))) };
}

export function planePlane(E1, E2) {
  const { n: n1, d: d1 } = E1, { n: n2, d: d2 } = E2;
  const w = cross(n1, n2);
  if (isZero(w, norm(n1) * norm(n2))) {
    const P = mul(n1, d1 / dot(n1, n1)); // Punkt auf E1
    const dist = Math.abs(dot(n2, P) - d2) / norm(n2);
    return dist <= 1e-9 * scaleOf(n1, n2, [d1, d2]) ? { kind: "identisch" } : { kind: "parallel", dist };
  }
  const P0 = mul(add(mul(cross(n2, w), d1), mul(cross(w, n1), d2)), 1 / dot(w, w));
  return { kind: "schneidend", P: P0, u: w, angle: deg(Math.acos(Math.min(1, Math.abs(dot(n1, n2)) / (norm(n1) * norm(n2))))) };
}

export function pointPlane(Q, { n, d }) { check3(Q, n); const off = dot(n, Q) - d; return { dist: Math.abs(off) / norm(n), F: sub(Q, mul(n, off / dot(n, n))), side: Math.sign(off) }; }
export function pointLine(Q, P, u) { check3(Q, P, u); if (isZero(u, 1)) fail("degenerate"); const F = add(P, mul(u, dot(sub(Q, P), u) / dot(u, u))); return { dist: norm(sub(Q, F)), F }; }

// ---------- Signifikanztest (Binomialverteilung), H0: p = p0 ----------
export function binomialTest({ n, p0, alpha, side, p1 = null, k = null }) {
  if (!Number.isInteger(n) || n < 1 || n > 100000 || !(p0 > 0 && p0 < 1) || !(alpha > 0 && alpha < 1)) fail();
  const cdf = (x) => (x < 0 ? 0 : binomCdf(x, n, p0)), right = (x) => 1 - cdf(x - 1); // P(X ≥ x)
  const r = { side };
  const aSide = side === "two" ? alpha / 2 : alpha;
  if (side === "left" || side === "two") { let kl = -1; while (kl + 1 <= n && cdf(kl + 1) <= aSide) kl++; r.kLeft = kl; }      // Ablehnung X ≤ kl
  if (side === "right" || side === "two") { let kr = n + 1; while (kr - 1 >= 0 && right(kr - 1) <= aSide) kr--; r.kRight = kr; } // Ablehnung X ≥ kr
  const reject = (x) => (r.kLeft !== undefined && x <= r.kLeft) || (r.kRight !== undefined && x >= r.kRight);
  r.alphaReal = (r.kLeft !== undefined && r.kLeft >= 0 ? cdf(r.kLeft) : 0) + (r.kRight !== undefined && r.kRight <= n ? right(r.kRight) : 0);
  if (p1 !== null && p1 > 0 && p1 < 1) { // Fehler 2. Art: H0 wird angenommen, obwohl p = p1
    const lo = r.kLeft !== undefined ? r.kLeft + 1 : 0, hi = r.kRight !== undefined ? r.kRight - 1 : n;
    r.beta = hi < lo ? 0 : binomCdf(hi, n, p1) - (lo > 0 ? binomCdf(lo - 1, n, p1) : 0);
  }
  if (k !== null && Number.isInteger(k) && k >= 0 && k <= n) r.decision = reject(k);
  return r;
}

// ---------- Zweistufiges Baumdiagramm / Vierfeldertafel ----------
export function tree({ pA, pBgA, pBgnA }) {
  [pA, pBgA, pBgnA].forEach((p) => { if (!(p >= 0 && p <= 1)) fail(); });
  const AB = pA * pBgA, AnB = pA * (1 - pBgA), nAB = (1 - pA) * pBgnA, nAnB = (1 - pA) * (1 - pBgnA), pB = AB + nAB;
  return { AB, AnB, nAB, nAnB, pB, pAgB: pB > 0 ? AB / pB : null, pAgnB: pB < 1 ? AnB / (1 - pB) : null, independent: Math.abs(AB - pA * pB) < 1e-12 };
}
