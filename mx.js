// Rechenlogik MatheRechner. Baut auf math.js (Apache-2.0) auf.
import { math } from "./mathlib.js";
export { math };

const fail = (m = "range") => { throw new Error(m); };

// ---------- Zahlen ein-/ausgeben (für Formularfelder) ----------
// Zahl aus einem Eingabefeld. Akzeptiert auch Rechenausdrücke wie 1/3, √2, 2π, 3·10^4 (wie ein Taschenrechner).
export function parse(text) {
  let s = String(text ?? "").trim();
  if (s === "") return null;
  const simple = s.replace(",", ".");
  if (/^[-+−]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(simple)) return Number(simple.replace("−", "-"));
  if (!s.includes("(")) s = s.replace(/(\d),(\d)/g, "$1.$2"); // Dezimalkomma, solange keine Funktionsargumente vorkommen
  try {
    const v = evaluate(s).value;
    const n = typeof v === "number" ? v : math.isComplex(v) && v.im === 0 ? v.re : NaN;
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}
export const fmt = (v, d = 10) => (Number.isFinite(v) ? v.toLocaleString("de-DE", { maximumFractionDigits: d }) : String(v));
// Kompakte Zahl für Ergebnisse (max. 12 signifikante Stellen, Punkt als Dezimaltrenner wie in der Eingabe).
export function num(v, digits = 12) {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return v > 0 ? "∞" : v < 0 ? "−∞" : "nicht definiert";
    if (v !== 0 && (Math.abs(v) >= 1e12 || Math.abs(v) < 1e-9)) return v.toExponential(digits - 1).replace(/\.?0+e/, "e").replace("e+", "·10^").replace("e-", "·10^-");
    return String(+v.toPrecision(digits));
  }
  return math.format(v, { precision: digits });
}

// ---------- Ausdrücke auswerten ----------
const DEG = Math.PI / 180;
const trigDeg = {
  sin: (x) => math.sin(math.multiply(x, DEG)), cos: (x) => math.cos(math.multiply(x, DEG)), tan: (x) => math.tan(math.multiply(x, DEG)),
  asin: (x) => math.divide(math.asin(x), DEG), acos: (x) => math.divide(math.acos(x), DEG), atan: (x) => math.divide(math.atan(x), DEG),
  atan2: (y, x) => math.atan2(y, x) / DEG, cot: (x) => math.cot(math.multiply(x, DEG)),
};
const engines = {};
function engine(deg, exact) {
  const key = `${deg}-${exact}`;
  if (!engines[key]) {
    const e = math.create(math.all);
    if (exact) e.config({ number: "Fraction" }); // muss nach create gesetzt werden
    if (deg) e.import(Object.fromEntries(Object.entries(trigDeg).map(([k, f]) => [k, (...a) => f(...a.map((v) => (e.isFraction?.(v) ? e.number(v) : v)))])), { override: true });
    // Zusatzfunktionen
    e.import({
      nCr: (n, k) => e.combinations(n, k), nPr: (n, k) => e.permutations(n, k),
      ln: (x) => e.log(x), lg: (x) => e.log10(x), root: (x, n) => e.nthRoot(x, n),
    }, { override: true });
    // ∫, d/dx und Σ im Ausdruck: integral(f, a, b), ddx(f, x0), sigma(f, a, b) – Variable jeweils x.
    const plain = (scope) => { const o = {}; if (scope?.keys) for (const k of scope.keys()) o[k] = scope.get(k); else Object.assign(o, scope); return o; };
    const asNum = (v) => Number(e.isFraction?.(v) ? e.number(v) : v);
    const fnOf = (node, scope) => { const code = node.compile(), base = plain(scope); return (x) => asNum(code.evaluate({ ...base, x })); };
    const integral = (args, _m, scope) => integrate(fnOf(args[0], scope), asNum(args[1].compile().evaluate(plain(scope))), asNum(args[2].compile().evaluate(plain(scope))));
    // Numerische Ableitung (Richardson, Fehler ~h⁴) mit derselben Engine – berücksichtigt so auch DEG/RAD.
    const ddx = (args, _m, scope) => {
      const f = fnOf(args[0], scope), x = asNum(args[1].compile().evaluate(plain(scope))), hh = 1e-3 * Math.max(1, Math.abs(x));
      return (8 * (f(x + hh) - f(x - hh)) - (f(x + 2 * hh) - f(x - 2 * hh))) / (12 * hh);
    };
    const sigma = (args, _m, scope) => sumProduct(fnOf(args[0], scope), asNum(args[1].compile().evaluate(plain(scope))), asNum(args[2].compile().evaluate(plain(scope))));
    const product = (args, _m, scope) => sumProduct(fnOf(args[0], scope), asNum(args[1].compile().evaluate(plain(scope))), asNum(args[2].compile().evaluate(plain(scope))), true);
    integral.rawArgs = true; ddx.rawArgs = true; sigma.rawArgs = true; product.rawArgs = true;
    e.import({ integral, ddx, sigma, product }, { override: true });
    // Schulrechner-Funktionen: Pol/Rec (winkelgerecht), Int/Intg, Rnd, RanInt, ÷R, gemischte Brüche, GCD/LCM
    const n = (v) => asNum(v);
    e.import({
      Pol: (x, y) => [Math.hypot(n(x), n(y)), n(e.atan2(n(y), n(x)))],
      Rec: (r, t) => [n(r) * n(e.cos(n(t))), n(r) * n(e.sin(n(t)))],
      Int: (x) => Math.trunc(n(x)), Intg: (x) => Math.floor(n(x)),
      Rnd: (x, d = 10) => +n(x).toPrecision(Math.max(1, Math.min(15, n(d)))),
      RndFix: (x, d) => Math.round(n(x) * 10 ** n(d)) / 10 ** n(d),
      RanInt: (a, b) => Math.floor(Math.random() * (Math.floor(n(b)) - Math.ceil(n(a)) + 1)) + Math.ceil(n(a)),
      divR: (a, b) => { const A = n(a), B = n(b); if (!Number.isInteger(A) || !Number.isInteger(B) || B === 0) throw new Error("Math ERROR"); const q = Math.trunc(A / B); return [q, A - q * B]; },
      mixed: (w, num, den) => (n(w) < 0 ? e.subtract(w, e.divide(num, den)) : e.add(w, e.divide(num, den))),
      GCD: (a, b) => e.gcd(a, b), LCM: (a, b) => e.lcm(a, b),
      ...Object.fromEntries(CONSTANTS.map(([k]) => [`K_${k}`, constValue(k)])), // Konstanten als reine Zahlen
      // log mit Basis zuerst (Eingabereihenfolge wie im Display: log_b(x)); glatte Ergebnisse exakt
      logab: (b, x) => { const B = n(b), X = n(x); if (!(B > 0) || B === 1 || !(X > 0)) throw new Error("Math ERROR"); const r = Math.log(X) / Math.log(B), R = Math.round(r); return B ** R === X ? R : r; },
    }, { override: true });
    engines[key] = e;
  }
  return engines[key];
}

// Eingabe normalisieren (Tastenfeld-Symbole → math.js-Syntax).
export function normalize(src) {
  return String(src)
    .replace(/×|·/g, "*").replace(/÷|:/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√\(/g, "sqrt(").replace(/√(\d+(\.\d+)?)/g, "sqrt($1)")
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/ℯ/g, "e").replace(/∞/g, "Infinity").replace(/\bAns\b/g, "Ans")
    .replace(/\)(\s*)(?=[0-9.])/g, ")*$1"); // „10^(2)5“ = 10²·5 wie beim Schulrechner
}

// Exakte Darstellung: Bruch, Wurzelform a·√b/c oder Vielfaches von π (wenn der Wert das genau trifft).
const isSmallRational = (f, maxDen = 10000) => Number(f.d) <= maxDen && Math.abs(Number(f.n)) <= 1e12;
function rationalApprox(x, maxDen = 10000) {
  if (!Number.isFinite(x)) return null;
  try { const f = math.fraction(x); if (Number(f.d) <= maxDen && Math.abs(math.number(f) - x) <= 1e-12 * Math.max(1, Math.abs(x))) return f; } catch { /* */ }
  return null;
}
function splitSquare(n) { // n = a²·b mit b quadratfrei
  let a = 1, b = n;
  for (let p = 2; p * p <= b; p++) while (b % (p * p) === 0) { b /= p * p; a *= p; }
  return [a, b];
}
export function fracStr(f) {
  const n = Number(f.n) * Number(f.s ?? 1), d = Number(f.d);
  return d === 1 ? String(n) : `${n}/${d}`;
}
export function mixedStr(f) {
  const n = Number(f.n), d = Number(f.d), s = Number(f.s ?? 1);
  if (d === 1 || n < d) return null;
  return `${s < 0 ? "−" : ""}${Math.floor(n / d)} ${n % d}/${d}`;
}
// Liefert z. B. "2√3", "√2/2", "3π/4" – oder null.
export function exactForm(x) {
  if (typeof x !== "number" || !Number.isFinite(x) || x === 0) return null;
  const r = rationalApprox(x); if (r) return null; // rationale Zahlen zeigt fracStr
  const sign = x < 0 ? "−" : "", ax = Math.abs(x);
  const q = rationalApprox(ax * ax, 1000);
  if (q && Number(q.n) <= 1e7) {
    const p = Number(q.n), d = Number(q.d);
    const [a, b] = splitSquare(p * d); // √(p/d) = √(p·d)/d = a√b/d
    const g = math.gcd(a, d), A = a / g, D = d / g;
    if (b > 1) return `${sign}${A === 1 ? "" : A}√${b}${D === 1 ? "" : "/" + D}`;
  }
  const k = rationalApprox(ax / Math.PI, 1000);
  if (k) { const n = Number(k.n), d = Number(k.d); return `${sign}${n === 1 ? "" : n}π${d === 1 ? "" : "/" + d}`; }
  return null;
}

/**
 * Wertet einen Ausdruck aus. scope wird verändert (Zuweisungen, Ans).
 * Ergebnis: { value, decimal, exact (Bruch/Wurzel/π), mixed, isComplex, text }
 */
// Fehlende schließende Klammern am Ende ergänzen – wie bei Schulrechnern üblich: "cos(20" → "cos(20)".
export function autoClose(src) {
  let depth = 0;
  for (const ch of String(src)) { if (ch === "(") depth++; else if (ch === ")") depth = Math.max(0, depth - 1); }
  return String(src) + ")".repeat(depth);
}

// Polarform r∠φ → r·(cos φ + i·sin φ); der Winkel folgt dem eingestellten Winkelmaß (DEG/RAD).
const POLAR_ARG = String.raw`(?:\d+(?:\.\d+)?(?:e[-+]?\d+)?|[A-Za-z]\w*|\([^()]*(?:\([^()]*\)[^()]*)*\))`;
const POLAR_RE = new RegExp(`(${POLAR_ARG})\\s*∠\\s*(-?${POLAR_ARG})`, "g");
export const polarize = (expr) => String(expr).replace(POLAR_RE, "(($1)*(cos($2)+i*sin($2)))");

export function evaluate(src, { deg = false, scope = {} } = {}) {
  const expr = polarize(autoClose(normalize(src).trim()));
  if (!expr) fail("empty");
  const dec = engine(deg, false).evaluate(expr, scope);
  let exact = null, mixed = null;
  // Exakt mit Brüchen versuchen (nur wenn ohne Fehler und Ergebnis ein Bruch ist)
  try {
    const exScope = Object.fromEntries(Object.entries(scope).map(([k, v]) => [k, typeof v === "number" ? (rationalApprox(v) ?? v) : v]));
    const ex = engine(deg, true).evaluate(expr, exScope);
    if (math.isFraction(ex) && isSmallRational(ex, 1e9)) { exact = fracStr(ex); mixed = mixedStr(ex); }
  } catch { /* exakte Auswertung nicht möglich */ }
  const decimal = num(dec);
  // Rundungsreste wie sin 30° = 0,49999999999999994 → ½ (wie im Math-Modus eines Schulrechners)
  if (!exact && typeof dec === "number" && !Number.isInteger(dec)) { const f = rationalApprox(dec); if (f && Number(f.d) > 1) { exact = fracStr(f); mixed = mixedStr(f); } }
  if (!exact && typeof dec === "number") exact = exactForm(dec);
  if (exact === decimal) exact = null;
  if (/K_/.test(expr)) { exact = null; mixed = null; } // mit Naturkonstanten dezimal anzeigen
  if (typeof dec === "number" || math.isComplex(dec)) scope.Ans = dec;
  return { value: dec, decimal, exact, mixed, isComplex: math.isComplex(dec) };
}

// Funktion einer Variablen kompilieren: "x^2 - 2" oder "f(x)=…", "y=…".
export function compileFn(src, { deg = false, scope = {}, variable = "x" } = {}) {
  const expr = normalize(src).replace(/^\s*(?:[a-zA-Z]\w*\s*\(\s*\w+\s*\)|y)\s*=\s*/, "");
  if (!expr.trim()) fail("empty");
  const code = engine(deg, false).compile(expr);
  const f = (x) => { const v = code.evaluate({ ...scope, [variable]: x }); return typeof v === "number" ? v : math.isComplex(v) && Math.abs(v.im) < 1e-12 ? v.re : NaN; };
  f(0.123456789); // Syntax-/Namensfehler früh erkennen
  return Object.assign(f, { expr });
}
// Freie Parameter eines Ausdrucks (alles außer der Variablen, bekannten Funktionen und Konstanten).
export function freeSymbols(src, variable = "x") {
  const expr = normalize(src).replace(/^\s*(?:[a-zA-Z]\w*\s*\(\s*\w+\s*\)|y)\s*=\s*/, "");
  const node = math.parse(expr);
  const fnNames = new Set(node.filter((n) => n.isFunctionNode).map((n) => n.fn.name ?? n.name));
  const known = new Set(["pi", "e", "i", "Infinity", "E", "PI", "phi", "tau", "Ans", variable]);
  return [...new Set(node.filter((n) => n.isSymbolNode).map((n) => n.name))]
    .filter((s) => !known.has(s) && !fnNames.has(s) && !(s in math) && !/^(nCr|nPr|ln|lg|root)$/.test(s));
}

// ---------- Numerische Verfahren ----------
// Nullstellen von f in [a, b]: Vorzeichenwechsel + Bisektion, zusätzlich Berührstellen über Minima von |f|.
export function roots(f, a, b, n = 2000) {
  if (!(b > a)) fail();
  const out = [], h = (b - a) / n;
  const refine = (lo, hi) => { let flo = f(lo); for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2, fm = f(mid); if (!Number.isFinite(fm)) return null; if (fm === 0) return mid; if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid; if (hi - lo < 1e-15 * Math.max(1, Math.abs(lo))) break; } return (lo + hi) / 2; };
  let x0 = a, f0 = f(a);
  const vals = [f0];
  for (let i = 1; i <= n; i++) {
    const x1 = a + i * h, f1 = f(x1); vals.push(f1);
    if (Number.isFinite(f0) && Number.isFinite(f1)) {
      if (f0 === 0) out.push(x0);
      else if (f0 * f1 < 0) {
        const r = refine(x0, x1);
        // Polstellen ausschließen (Vorzeichenwechsel über Unendlich)
        if (r !== null && Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(f0), Math.abs(f1)) ) out.push(r);
      }
    }
    x0 = x1; f0 = f1;
  }
  if (f0 === 0) out.push(b);
  // Berührstellen (doppelte Nullstellen): lokale Minima von |f| nahe 0
  for (let i = 1; i < n; i++) {
    const l = Math.abs(vals[i - 1]), m = Math.abs(vals[i]), r = Math.abs(vals[i + 1]);
    if (m <= l && m <= r && m < 1e-3 * (1 + Math.abs(vals[0]))) {
      let lo = a + (i - 1) * h, hi = a + (i + 1) * h;
      for (let k = 0; k < 100; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1; }
      const x = (lo + hi) / 2;
      if (Math.abs(f(x)) < 1e-9) out.push(x);
    }
  }
  out.sort((p, q) => p - q);
  return out.filter((x, k) => k === 0 || Math.abs(x - out[k - 1]) > 1e-7 * Math.max(1, Math.abs(x))).map((x) => (Math.abs(x) < 1e-12 ? 0 : x));
}
// Adaptive Simpson-Integration.
export function integrate(f, a, b, tol = 1e-10) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) fail();
  if (a === b) return 0;
  const simpson = (a0, b0, fa, fm, fb) => ((b0 - a0) / 6) * (fa + 4 * fm + fb);
  let evals = 0;
  const rec = (a0, b0, fa, fm, fb, whole, eps, depth) => {
    const m = (a0 + b0) / 2, lm = (a0 + m) / 2, rm = (m + b0) / 2;
    const flm = f(lm), frm = f(rm); evals += 2;
    const left = simpson(a0, m, fa, flm, fm), right = simpson(m, b0, fm, frm, fb);
    if (depth <= 0 || evals > 2e6 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
    return rec(a0, m, fa, flm, fm, left, eps / 2, depth - 1) + rec(m, b0, fm, frm, fb, right, eps / 2, depth - 1);
  };
  // In Teilintervalle zerlegen, damit schmale Strukturen nicht übersehen werden
  const parts = 64, h = (b - a) / parts;
  let sum = 0;
  for (let k = 0; k < parts; k++) {
    const x0 = a + k * h, x1 = x0 + h, fa = f(x0), fb = f(x1), fm = f((x0 + x1) / 2);
    sum += rec(x0, x1, fa, fm, fb, simpson(x0, x1, fa, fm, fb), tol / parts, 40);
  }
  if (!Number.isFinite(sum)) fail("diverge");
  return sum;
}
// Symbolische Ableitung (n-te), vereinfacht.
export function derivative(src, n = 1, variable = "x") {
  let node = math.parse(normalize(src).replace(/^\s*(?:[a-zA-Z]\w*\s*\(\s*\w+\s*\)|y)\s*=\s*/, ""));
  for (let k = 0; k < n; k++) node = math.derivative(node, variable);
  return math.simplify(node);
}
export function sumProduct(f, a, b, product = false) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || b < a || b - a > 1e6) fail();
  let acc = product ? 1 : 0;
  for (let k = a; k <= b; k++) acc = product ? acc * f(k) : acc + f(k);
  return acc;
}
// Kurvendiskussion im Intervall.
export function curveAnalysis(src, a, b, opts = {}) {
  const f = compileFn(src, opts), d1s = derivative(src, 1), d2s = derivative(src, 2);
  const d1 = compileFn(d1s.toString(), opts), d2 = compileFn(d2s.toString(), opts);
  const zeros = roots(f, a, b).map((x) => ({ x, y: 0 }));
  const ext = roots(d1, a, b).map((x) => { const c = d2(x); return { x, y: f(x), kind: c < -1e-9 ? "Hochpunkt" : c > 1e-9 ? "Tiefpunkt" : "Sattelpunkt?" }; });
  const infl = roots(d2, a, b).filter((x) => { const h = 1e-4 * Math.max(1, Math.abs(x)); return Math.sign(d2(x - h)) !== Math.sign(d2(x + h)); }).map((x) => ({ x, y: f(x), slope: d1(x) }));
  let y0 = null; try { y0 = f(0); } catch { /* */ }
  return { d1: d1s.toString(), d2: d2s.toString(), zeros, extrema: ext, inflections: infl, y0: Number.isFinite(y0) ? y0 : null };
}

// ---------- Gleichungen ----------
// Polynomnullstellen (Durand-Kerner mit Newton-Nachiteration). coeffs: [a_n, …, a_0]
export function polyRoots(coeffs) {
  let c = coeffs.map(Number);
  while (c.length && c[0] === 0) c.shift();
  if (c.length < 2) fail();
  const n = c.length - 1, lead = c[0];
  c = c.map((v) => v / lead);
  const C = (re, im = 0) => ({ re, im });
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const sub = (a, b) => C(a.re - b.re, a.im - b.im);
  const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const evalP = (z) => c.reduce((acc, k) => C(acc.re * z.re - acc.im * z.im + k, acc.re * z.im + acc.im * z.re), C(0));
  const R = 1 + Math.max(...c.slice(1).map(Math.abs));
  let z = Array.from({ length: n }, (_, k) => C(R * 0.9 * Math.cos((2 * Math.PI * k) / n + 0.4), R * 0.9 * Math.sin((2 * Math.PI * k) / n + 0.4)));
  for (let it = 0; it < 2000; it++) {
    let delta = 0;
    z = z.map((zi, i) => {
      let den = C(1);
      z.forEach((zj, j) => { if (i !== j) den = mul(den, sub(zi, zj)); });
      const step = div(evalP(zi), den);
      delta = Math.max(delta, Math.hypot(step.re, step.im));
      return sub(zi, step);
    });
    if (delta < 1e-15) break;
  }
  // Mehrfache Nullstellen: Durand-Kerner trifft sie nur auf ca. √ε genau. Gruppen nah beieinanderliegender
  // Näherungen erkennen und per Newton auf der (m−1)-ten Ableitung (dort einfache Nullstelle) nachschärfen.
  const deriv = (cs) => cs.slice(0, -1).map((k, i) => k * (cs.length - 1 - i));
  const evalC = (cs, zz) => cs.reduce((acc, k) => C(acc.re * zz.re - acc.im * zz.im + k, acc.re * zz.im + acc.im * zz.re), C(0));
  const used = new Array(n).fill(false), out = [];
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    const grp = [i]; used[i] = true;
    for (let j = i + 1; j < n; j++) if (!used[j] && Math.hypot(z[i].re - z[j].re, z[i].im - z[j].im) < 1e-4 * Math.max(1, Math.hypot(z[i].re, z[i].im))) { grp.push(j); used[j] = true; }
    let w = C(grp.reduce((s2, k) => s2 + z[k].re, 0) / grp.length, grp.reduce((s2, k) => s2 + z[k].im, 0) / grp.length);
    if (grp.length > 1) {
      let q = c; for (let k = 1; k < grp.length; k++) q = deriv(q);
      const dq = deriv(q);
      for (let it = 0; it < 100; it++) { const fz = evalC(q, w), dz = evalC(dq, w); if (Math.hypot(dz.re, dz.im) === 0) break; const st = div(fz, dz); w = sub(w, st); if (Math.hypot(st.re, st.im) < 1e-16) break; }
    }
    grp.forEach(() => out.push(w));
  }
  const clean = (v) => (Math.abs(v) < 1e-10 ? 0 : Math.abs(v - Math.round(v)) < 1e-10 ? Math.round(v) : v);
  return out.map((r) => ({ re: clean(r.re), im: clean(r.im) })).sort((p, q) => p.re - q.re || p.im - q.im);
}
// Exakte Lösung quadratischer Gleichungen mit rationalen Koeffizienten (Wurzelform).
export function quadraticExact(a, b, c) {
  const A = rationalApprox(a), B = rationalApprox(b), Cc = rationalApprox(c);
  if (!A || !B || !Cc || a === 0) return null;
  const m = math.divide(math.unaryMinus(B), math.multiply(2, A)); // −b/(2a)
  const r = math.divide(math.subtract(math.multiply(B, B), math.multiply(4, math.multiply(A, Cc))), math.multiply(4, math.multiply(A, A))); // D/(4a²)
  const rv = math.number(r);
  const mStr = math.number(m) === 0 ? "" : fracStr(m);
  if (rv === 0) return { kind: "double", text: [fracStr(m)] };
  const surd = rationalApprox(Math.sqrt(Math.abs(rv)));
  // Rationale Wurzel und reelle Lösungen: direkt zusammenfassen (5/2 ± 1/2 → 2 ; 3)
  if (surd && rv > 0) return { kind: "real", text: [fracStr(math.subtract(m, surd)), fracStr(math.add(m, surd))], discriminant: math.number(math.subtract(math.multiply(B, B), math.multiply(4, math.multiply(A, Cc)))) };
  const root = surd ? fracStr(surd) : exactForm(Math.sqrt(Math.abs(rv)));
  if (!root) return null;
  const im = rv < 0 ? "i" : "";
  const join = (sg) => (mStr ? `${mStr} ${sg} ${root}${im}` : `${sg === "−" ? "−" : ""}${root}${im}`);
  return { kind: rv > 0 ? "real" : "complex", text: [join("−"), join("+")], discriminant: math.number(math.subtract(math.multiply(B, B), math.multiply(4, math.multiply(A, Cc)))) };
}
// Polynom-Ungleichung p(x) op 0 → Intervalle.
export function polyInequality(coeffs, op) {
  const real = polyRoots(coeffs).filter((r) => r.im === 0).map((r) => r.re).sort((p, q) => p - q);
  const uniq = real.filter((x, k) => k === 0 || Math.abs(x - real[k - 1]) > 1e-9);
  const p = (x) => coeffs.reduce((acc, k) => acc * x + k, 0);
  const pts = [-Infinity, ...uniq, Infinity];
  const strict = op === "<" || op === ">", want = op === "<" || op === "<=" ? -1 : 1;
  const parts = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const lo = pts[k], hi = pts[k + 1];
    const mid = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1) : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    if (Math.sign(p(mid)) === want) parts.push([lo, hi]);
  }
  // Benachbarte Intervalle bei nicht-strikter Ungleichung zusammenfassen bzw. Einzelpunkte ergänzen
  const out = [];
  for (const [lo, hi] of parts) {
    const last = out[out.length - 1];
    if (last && !strict && last[1] === lo) last[1] = hi; else out.push([lo, hi]);
  }
  const singles = strict ? [] : uniq.filter((r) => !out.some(([lo, hi]) => r >= lo && r <= hi));
  return { intervals: out, closed: !strict, singles, roots: uniq };
}
// Lineares Gleichungssystem exakt (Brüche) per Gauß-Jordan; erkennt keine/unendlich viele Lösungen.
export function rref(rows) {
  const M = rows.map((r) => r.map((v) => (typeof v === "object" ? v : rationalApprox(v) ?? math.fraction(v))));
  const m = M.length, n = M[0].length;
  let lead = 0;
  const pivots = [];
  for (let r = 0; r < m && lead < n; r++) {
    let i = r;
    while (lead < n && math.equal(M[i][lead], 0)) { i++; if (i === m) { i = r; lead++; } }
    if (lead >= n) break;
    [M[i], M[r]] = [M[r], M[i]];
    const lv = M[r][lead];
    M[r] = M[r].map((v) => math.divide(v, lv));
    for (let k = 0; k < m; k++) if (k !== r) { const f = M[k][lead]; M[k] = M[k].map((v, j) => math.subtract(v, math.multiply(f, M[r][j]))); }
    pivots.push(lead); lead++;
  }
  return { M, pivots, rank: pivots.length };
}
export function linearSystem(A, b) {
  const n = A[0].length;
  const aug = A.map((r, i) => [...r, b[i]]);
  const { M, pivots } = rref(aug);
  if (pivots.includes(n)) return { kind: "none" };
  if (pivots.length < n) return { kind: "infinite", rank: pivots.length };
  return { kind: "unique", x: M.slice(0, n).map((r) => r[n]) };
}
// Beliebige Gleichung lhs = rhs numerisch in [a, b].
export function solveEquation(src, a, b, opts = {}) {
  const [l, r] = normalize(src).split("=");
  const f = compileFn(r === undefined ? l : `(${l})-(${r})`, opts);
  return roots(f, a, b);
}

// ---------- Matrizen & Vektoren ----------
export const toFrac = (v) => rationalApprox(v) ?? v;
export function matInfo(A) {
  const F = A.map((r) => r.map(toFrac));
  const sq = A.length === A[0].length;
  const r = { rank: rref(F).rank, transpose: math.transpose(F) };
  if (sq) {
    r.det = math.det(F);
    if (!math.equal(r.det, 0)) r.inverse = math.inv(F);
    try { r.eigenvalues = math.eigs(A.map((row) => row.map(Number))).values; } catch { r.eigenvalues = null; }
  }
  return r;
}
export function vectorInfo(u, v) {
  const nu = Math.hypot(...u), nv = v ? Math.hypot(...v) : null;
  const r = { normU: nu, unitU: nu ? u.map((x) => x / nu) : null };
  if (v) {
    const dot = u.reduce((s, x, i) => s + x * v[i], 0);
    r.dot = dot; r.normV = nv;
    r.angleDeg = nu && nv ? (Math.acos(Math.min(1, Math.max(-1, dot / (nu * nv)))) * 180) / Math.PI : null;
    if (u.length === 3) r.cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (u.length === 2) r.cross2d = u[0] * v[1] - u[1] * v[0];
  }
  return r;
}

// ---------- Statistik ----------
const sorted = (a) => [...a].sort((p, q) => p - q);
const medianOf = (s) => (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
// Quartile als Median der unteren/oberen Hälfte (ohne den Median bei ungerader Anzahl).
export function stats1(values, freqs = null) {
  const xs = freqs ? values.flatMap((v, i) => Array(Math.max(0, Math.round(freqs[i]))).fill(v)) : values;
  if (!xs.length) fail("positive");
  const n = xs.length, sum = xs.reduce((a, b) => a + b, 0), mean = sum / n;
  const ss = xs.reduce((a, b) => a + (b - mean) ** 2, 0);
  const s = sorted(xs), half = Math.floor(n / 2);
  return { n, sum, sum2: xs.reduce((a, b) => a + b * b, 0), mean, sdPop: Math.sqrt(ss / n), sdSample: n > 1 ? Math.sqrt(ss / (n - 1)) : null,
           min: s[0], max: s[n - 1], median: medianOf(s), q1: n > 1 ? medianOf(s.slice(0, half)) : s[0], q3: n > 1 ? medianOf(s.slice(n % 2 ? half + 1 : half)) : s[0],
           mode: modeOf(xs) };
}
function modeOf(xs) {
  const c = new Map(); xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  const max = Math.max(...c.values());
  return max > 1 ? [...c.entries()].filter(([, k]) => k === max).map(([x]) => x).sort((p, q) => p - q) : [];
}
const linfit = (x, y) => {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  const b = sxy / sxx; return { a: my - b * mx, b, r: sxy / Math.sqrt(sxx * syy) };
};
export const REG_MODELS = { lin: "y = a + b·x", quad: "y = a + b·x + c·x²", exp: "y = a·e^(b·x)", log: "y = a + b·ln(x)", pow: "y = a·x^b" };
export function regression(x, y, model) {
  if (x.length !== y.length || x.length < 2) fail("positive");
  if (model === "lin") { const r = linfit(x, y); return { ...r, f: (t) => r.a + r.b * t }; }
  if (model === "exp") { if (y.some((v) => v <= 0)) fail("range"); const r = linfit(x, y.map(Math.log)); const a = Math.exp(r.a); return { a, b: r.b, r: r.r, f: (t) => a * Math.exp(r.b * t) }; }
  if (model === "log") { if (x.some((v) => v <= 0)) fail("range"); const r = linfit(x.map(Math.log), y); return { ...r, f: (t) => r.a + r.b * Math.log(t) }; }
  if (model === "pow") { if (x.some((v) => v <= 0) || y.some((v) => v <= 0)) fail("range"); const r = linfit(x.map(Math.log), y.map(Math.log)); const a = Math.exp(r.a); return { a, b: r.b, r: r.r, f: (t) => a * t ** r.b }; }
  if (model === "quad") {
    if (x.length < 3) fail("positive");
    const S = (k) => x.reduce((s, v) => s + v ** k, 0), T = (k) => x.reduce((s, v, i) => s + v ** k * y[i], 0);
    const [a, b, c] = math.lusolve([[x.length, S(1), S(2)], [S(1), S(2), S(3)], [S(2), S(3), S(4)]], [T(0), T(1), T(2)]).map((r) => r[0]);
    const my = y.reduce((s, v) => s + v, 0) / y.length;
    const ssr = y.reduce((s, v, i) => s + (v - (a + b * x[i] + c * x[i] ** 2)) ** 2, 0), sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
    return { a, b, c, r2: 1 - ssr / sst, f: (t) => a + b * t + c * t * t };
  }
  fail("range");
}

// ---------- Wahrscheinlichkeit ----------
export const normalPdf = (x, mu = 0, s = 1) => Math.exp(-(((x - mu) / s) ** 2) / 2) / (s * Math.sqrt(2 * Math.PI));
export const normalCdf = (x, mu = 0, s = 1) => (x === Infinity ? 1 : x === -Infinity ? 0 : 0.5 * (1 + math.erf((x - mu) / (s * Math.SQRT2))));
export function normalInv(p, mu = 0, s = 1) {
  if (!(p > 0 && p < 1) || !(s > 0)) fail();
  let lo = -40, hi = 40;
  for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (normalCdf(m) < p) lo = m; else hi = m; }
  return mu + s * (lo + hi) / 2;
}
const logChoose = (n, k) => math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1);
export function binomPdf(k, n, p) { if (!Number.isInteger(n) || n < 0 || !(p >= 0 && p <= 1)) fail(); if (!Number.isInteger(k) || k < 0 || k > n) return 0; if (p === 0) return k === 0 ? 1 : 0; if (p === 1) return k === n ? 1 : 0; return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)); }
export function binomCdf(k, n, p) { let s = 0; for (let i = 0; i <= Math.min(Math.floor(k), n); i++) s += binomPdf(i, n, p); return Math.min(1, s); }
export function poissonPdf(k, l) { if (!(l > 0)) fail(); if (!Number.isInteger(k) || k < 0) return 0; return Math.exp(k * Math.log(l) - l - math.lgamma(k + 1)); }
export function poissonCdf(k, l) { let s = 0; for (let i = 0; i <= Math.floor(k); i++) s += poissonPdf(i, l); return Math.min(1, s); }

// ---------- Zahlentheorie & Zahlensysteme ----------
export function factorize(n) {
  if (!Number.isSafeInteger(n) || n < 2) fail();
  const out = []; let m = n;
  for (const p of [2, 3]) { let e = 0; while (m % p === 0) { m /= p; e++; } if (e) out.push([p, e]); }
  for (let p = 5; p * p <= m; p += 6) for (const q of [p, p + 2]) { let e = 0; while (m % q === 0) { m /= q; e++; } if (e) out.push([q, e]); }
  if (m > 1) out.push([m, 1]);
  return out;
}
export function divisors(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 1e12) fail();
  const lo = [], hi = [];
  for (let d = 1; d * d <= n; d++) if (n % d === 0) { lo.push(d); if (d * d !== n) hi.unshift(n / d); }
  return [...lo, ...hi];
}
export const isPrime = (n) => Number.isSafeInteger(n) && n >= 2 && factorize(n).length === 1 && factorize(n)[0][1] === 1;
export function convertBase(text, from) {
  const s = String(text).trim().toLowerCase().replace(/^-/, "");
  const neg = String(text).trim().startsWith("-");
  const digits = "0123456789abcdef".slice(0, from);
  if (!s || [...s].some((ch) => !digits.includes(ch))) fail();
  let v = 0n; for (const ch of s) v = v * BigInt(from) + BigInt(digits.indexOf(ch));
  if (neg) v = -v;
  const f = (b) => (v < 0n ? "-" : "") + (v < 0n ? -v : v).toString(b).toUpperCase();
  return { dec: f(10), bin: f(2), oct: f(8), hex: f(16) };
}

// ---------- Einheiten & Konstanten (Werte aus math.js) ----------
export const UNIT_GROUPS = {
  "Länge": ["mm", "cm", "m", "km", "inch", "foot", "yard", "mile", "nmi"],
  "Fläche": ["mm2", "cm2", "m2", "km2", "hectare", "acre", "sqin", "sqft"],
  "Volumen": ["ml", "l", "m3", "cm3", "cuin", "cuft", "gallon", "pint"],
  "Masse": ["mg", "g", "kg", "tonne", "lb", "oz"],
  "Zeit": ["s", "min", "h", "day", "week", "year"],
  "Geschwindigkeit": ["m/s", "km/h", "mi/h", "kn"],
  "Temperatur": ["degC", "degF", "K"],
  "Druck": ["Pa", "kPa", "bar", "psi", "atm", "mmHg"],
  "Energie": ["J", "kJ", "MJ", "Wh", "kWh", "eV"],
  "Leistung": ["W", "kW", "hp"],
  "Winkel": ["deg", "rad", "grad", "arcmin", "arcsec"],
  "Datenmenge": ["b", "B", "kB", "MB", "GB", "KiB", "MiB", "GiB"],
};
// Ergänzte, exakt definierte Einheiten: internationale Seemeile (1852 m) und Knoten (1 sm/h).
for (const [name, def] of [["nmi", "1852 m"], ["kn", "1852 m/h"]]) { try { math.createUnit(name, def); } catch { /* bereits vorhanden */ } }
export function convertUnit(value, from, to) { return math.unit(value, from).toNumber(to); }
// [math.js-Name, Bezeichnung, Symbol im Display] – Zahlenwerte aus math.js (SI), im Rechner als reine Zahlen K_<Name>
export const CONSTANTS = [
  ["speedOfLight", "Lichtgeschwindigkeit c", "c₀"], ["gravitationConstant", "Gravitationskonstante G", "G"], ["gravity", "Normfallbeschleunigung g", "gₙ"],
  ["planckConstant", "Planck-Konstante h", "h"], ["reducedPlanckConstant", "Reduzierte Planck-Konstante ħ", "ħ"], ["elementaryCharge", "Elementarladung e", "qₑ"],
  ["electronMass", "Elektronenmasse", "mₑ"], ["protonMass", "Protonenmasse", "mₚ"], ["neutronMass", "Neutronenmasse", "mₙ"], ["atomicMass", "Atomare Masseneinheit u", "u"],
  ["avogadro", "Avogadro-Konstante", "N_A"], ["boltzmann", "Boltzmann-Konstante k", "k_B"], ["gasConstant", "Universelle Gaskonstante R", "R"], ["faraday", "Faraday-Konstante", "F"],
  ["electricConstant", "Elektrische Feldkonstante ε₀", "ε₀"], ["magneticConstant", "Magnetische Feldkonstante μ₀", "μ₀"], ["stefanBoltzmann", "Stefan-Boltzmann-Konstante σ", "σ"],
  ["rydberg", "Rydberg-Konstante", "R∞"], ["bohrRadius", "Bohrscher Radius", "a₀"], ["molarVolume", "Molares Volumen (ideales Gas)", "Vₘ"],
];
export const constValue = (key) => math[key].value;          // Zahlenwert in SI-Basiseinheiten
export const constUnit = (key) => math[key].formatUnits();    // zugehörige SI-Einheit

// ---------- Komplexe Zahlen ----------
// Darstellung einer komplexen Zahl kartesisch und polar (Winkel in Grad oder Bogenmaß).
export function complexForms(z, deg = true) {
  const c = math.complex(z);
  const r = Math.hypot(c.re, c.im), phi = Math.atan2(c.im, c.re) * (deg ? 180 / Math.PI : 1);
  const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
  return { re: clean(c.re), im: clean(c.im), r, phi: clean(phi), cart: num(math.complex(clean(c.re), clean(c.im)), 10),
           polar: `${num(r, 10)} ∠ ${num(clean(phi), 10)}${deg ? "°" : ""}` };
}
export function complexOps(z1src, z2src, { deg = true, n = 2 } = {}) {
  const ev = (t) => math.complex(evaluate(String(t), { deg }).value);
  const a = ev(z1src), b = z2src && String(z2src).trim() ? ev(z2src) : null;
  const out = { z1: a, ops: [] };
  const add = (label, v) => out.ops.push([label, v]);
  if (b) {
    out.z2 = b;
    add("z₁ + z₂", math.add(a, b)); add("z₁ − z₂", math.subtract(a, b)); add("z₁ · z₂", math.multiply(a, b));
    if (!(b.re === 0 && b.im === 0)) add("z₁ ÷ z₂", math.divide(a, b));
  }
  add(`z₁^${n}`, math.pow(a, n)); add("√z₁ (Hauptwert)", math.sqrt(a)); add("1 / z₁", a.re === 0 && a.im === 0 ? null : math.divide(1, a)); add("konjugiert z̄₁", math.conj(a));
  return out;
}
