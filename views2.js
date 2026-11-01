// Matrizen & Vektoren, Statistik, Wahrscheinlichkeit, Zahlen, Einheiten, Konstanten
import * as M from "./mx.js";
import { calcView, section, segmented, selectRow, resultRow, msgRow, h } from "./ui.js";

const r = (v, d = 10) => (typeof v === "number" ? M.num(v, d) : String(v));
const ev = (t) => Number(M.evaluate(String(t || "0")).value);
const fr = (v) => { const n = M.math.number(v); const f = M.fracStr(v); return f === r(n) ? f : `${f} (≈ ${r(n, 6)})`; };
const matTable = (A, f = fr) => h("div", { class: "row chart-row" }, h("table", { class: "ttable" }, ...A.map((row) => h("tr", {}, ...row.map((v) => h("td", {}, f(v)))))));
const numList = (t) => String(t).split(/[\s;]+|,(?=\s)/).map((x) => x.trim().replace(",", ".")).filter(Boolean).map(Number);

// =================== Matrizen ===================
export function matrix() {
  const cells = (pre) => Object.fromEntries([...Array(4)].flatMap((_, i) => [...Array(4)].map((__, j) => [`${pre}${i}${j}`, i === j ? "1" : "0"])));
  return calcView({
    init: { rows: "2", cols: "2", op: "info", ...cells("a"), ...cells("b"), a00: "1", a01: "2", a10: "3", a11: "4", b00: "2", b01: "0", b10: "1", b11: "2" },
    inputs: (s, { field, set }) => {
      const R = Number(s.rows), Cc = Number(s.cols), needB = ["add", "sub", "mul"].includes(s.op);
      const grid = (pre, rr, cc) => Array.from({ length: rr }, (_, i) => Array.from({ length: cc }, (_, j) => field(`${pre}${i}${j}`, `${pre.toUpperCase()}${i + 1}${j + 1}`, "", "text"))).flat();
      return [
        ...section("Rechnung", [selectRow("Operation", [["info", "Eigenschaften von A (det, A⁻¹, Rang, Eigenwerte)"], ["add", "A + B"], ["sub", "A − B"], ["mul", "A · B"]], s.op, (e) => set("op", e.target.value)),
          selectRow("Zeilen", [1, 2, 3, 4].map((k) => [String(k), String(k)]), s.rows, (e) => set("rows", e.target.value)),
          selectRow("Spalten", [1, 2, 3, 4].map((k) => [String(k), String(k)]), s.cols, (e) => set("cols", e.target.value))]),
        ...section(`Matrix A (${R} × ${Cc})`, grid("a", R, Cc)),
        ...(needB ? section(`Matrix B (${s.op === "mul" ? Cc : R} × ${Cc})`, grid("b", s.op === "mul" ? Cc : R, Cc)) : []),
      ];
    },
    compute: (s) => {
      const R = Number(s.rows), Cc = Number(s.cols);
      const read = (pre, rr, cc) => Array.from({ length: rr }, (_, i) => Array.from({ length: cc }, (_, j) => M.toFrac(ev(s[`${pre}${i}${j}`]))));
      const A = read("a", R, Cc);
      if (s.op === "info") {
        const inf = M.matInfo(A.map((row) => row.map((v) => M.math.number(v))));
        const rows = [resultRow("Rang", String(inf.rank)), h("div", { class: "row" }, h("span", { class: "label" }, "Transponierte Aᵀ")), matTable(inf.transpose)];
        if (R === Cc) {
          rows.unshift(resultRow("Determinante", fr(inf.det), "good"));
          if (inf.inverse) rows.push(h("div", { class: "row" }, h("span", { class: "label" }, "Inverse A⁻¹")), matTable(inf.inverse));
          else rows.push(msgRow("A ist singulär (det = 0) – keine Inverse."));
          if (inf.eigenvalues) rows.push(resultRow("Eigenwerte", inf.eigenvalues.map((v) => M.num(typeof v === "number" ? v : M.math.complex(v), 8)).join(" ; ")));
        } else rows.push(msgRow("Determinante, Inverse und Eigenwerte nur für quadratische Matrizen."));
        return rows;
      }
      const B = read("b", s.op === "mul" ? Cc : R, Cc);
      const res = s.op === "add" ? M.math.add(A, B) : s.op === "sub" ? M.math.subtract(A, B) : M.math.multiply(A, B);
      return [h("div", { class: "row" }, h("span", { class: "label" }, { add: "A + B", sub: "A − B", mul: "A · B" }[s.op])), matTable(res)];
    },
    rangeMsg: "Einträge prüfen (Zahlen, Brüche oder Ausdrücke).",
    footer: "Exakt mit Brüchen, Eigenwerte numerisch (math.js). Bei A · B hat B so viele Zeilen wie A Spalten.",
  });
}

export function vectors() {
  return calcView({
    init: { dim: "3", u0: "1", u1: "2", u2: "3", v0: "4", v1: "5", v2: "6" },
    inputs: (s, { field, set }) => [...section("Dimension", [segmented([["2", "2D"], ["3", "3D"]], s.dim, (v) => set("dim", v))]),
      ...section("Vektor u", Array.from({ length: Number(s.dim) }, (_, i) => field(`u${i}`, `u${"xyz"[i]}`, "", "text"))),
      ...section("Vektor v (optional)", Array.from({ length: Number(s.dim) }, (_, i) => field(`v${i}`, `v${"xyz"[i]}`, "", "text")))],
    compute: (s) => {
      const n = Number(s.dim), u = Array.from({ length: n }, (_, i) => ev(s[`u${i}`]));
      const vRaw = Array.from({ length: n }, (_, i) => s[`v${i}`]); const v = vRaw.every((x) => String(x).trim()) ? vRaw.map(ev) : null;
      const res = M.vectorInfo(u, v), vec = (a) => `(${a.map((x) => r(x, 8)).join(" | ")})`;
      return [resultRow("|u|", r(res.normU), "good"), res.unitU ? resultRow("Einheitsvektor u/|u|", vec(res.unitU)) : null,
              ...(v ? [resultRow("|v|", r(res.normV)), resultRow("Skalarprodukt u · v", r(res.dot), "good"), resultRow("Winkel ∠(u, v)", res.angleDeg !== null ? `${r(res.angleDeg, 8)}°` : "–"),
                res.cross ? resultRow("Kreuzprodukt u × v", vec(res.cross), "good") : null, res.cross2d !== undefined ? resultRow("Fläche des Parallelogramms", r(Math.abs(res.cross2d))) : null,
                res.cross ? resultRow("Fläche des Parallelogramms |u × v|", r(Math.hypot(...res.cross))) : null,
                resultRow("u + v", vec(u.map((x, i) => x + v[i]))), resultRow("u − v", vec(u.map((x, i) => x - v[i]))),
                resultRow("orthogonal?", Math.abs(res.dot) < 1e-12 ? "ja" : "nein")] : [])];
    },
  });
}

// =================== Statistik ===================
export function stats() {
  return calcView({
    init: { x: "2 4 4 4 5 5 7 9", f: "" },
    inputs: (s, { field }) => [...section("Daten (1 Variable)", [field("x", "Werte (Leerzeichen/Semikolon)", "", "text"), field("f", "Häufigkeiten (optional)", "", "text")])],
    compute: (s) => {
      const xs = numList(s.x), fs = s.f.trim() ? numList(s.f) : null;
      if (xs.some((v) => !Number.isFinite(v)) || (fs && fs.length !== xs.length)) throw new Error("range");
      const t = M.stats1(xs, fs);
      return [resultRow("Anzahl n", String(t.n)), resultRow("Mittelwert x̄", r(t.mean), "good"), resultRow("Summe Σx", r(t.sum)), resultRow("Σx²", r(t.sum2)),
              resultRow("Std.-Abw. σ (Grundgesamtheit)", r(t.sdPop)), resultRow("Std.-Abw. s (Stichprobe)", t.sdSample !== null ? r(t.sdSample) : "–"),
              resultRow("Varianz σ² / s²", `${r(t.sdPop ** 2)} / ${t.sdSample !== null ? r(t.sdSample ** 2) : "–"}`),
              resultRow("Minimum", r(t.min)), resultRow("Q₁", r(t.q1)), resultRow("Median", r(t.median), "good"), resultRow("Q₃", r(t.q3)), resultRow("Maximum", r(t.max)),
              resultRow("Spannweite / IQR", `${r(t.max - t.min)} / ${r(t.q3 - t.q1)}`), resultRow("Modus", t.mode.length ? t.mode.map((v) => r(v)).join(", ") : "keiner")];
    },
    rangeMsg: "Werte als Zahlen eingeben; Häufigkeiten in gleicher Anzahl.",
    footer: "Quartile als Median der unteren bzw. oberen Datenhälfte (bei ungerader Anzahl ohne den Median). Andere Programme nutzen teils andere Quartilsdefinitionen.",
  });
}

export function regressionView() {
  return calcView({
    init: { x: "1 2 3 4 5", y: "2.1 3.9 6.2 7.8 10.1", model: "lin", x0: "" },
    inputs: (s, { field, set }) => [...section("Daten (2 Variablen)", [field("x", "x-Werte", "", "text"), field("y", "y-Werte", "", "text"),
      selectRow("Modell", Object.entries(M.REG_MODELS), s.model, (e) => set("model", e.target.value)), field("x0", "Prognose für x = (optional)", "")])],
    compute: (s, p) => {
      const x = numList(s.x), y = numList(s.y);
      if (x.length !== y.length || x.some((v) => !Number.isFinite(v)) || y.some((v) => !Number.isFinite(v))) throw new Error("range");
      const res = M.regression(x, y, s.model);
      const rows = [resultRow("Modell", M.REG_MODELS[s.model]), resultRow("a", r(res.a), "good"), resultRow("b", r(res.b), "good")];
      if (res.c !== undefined) rows.push(resultRow("c", r(res.c), "good"), resultRow("Bestimmtheitsmaß R²", r(res.r2, 8)));
      else rows.push(resultRow("Korrelationskoeffizient r", r(res.r, 8)), resultRow("r²", r(res.r ** 2, 8)));
      const x0 = p(s.x0); if (x0 !== null) rows.push(resultRow(`ŷ(${r(x0)})`, r(res.f(x0))));
      return rows;
    },
    rangeMsg: "Gleich viele x- und y-Werte eingeben (bei exp/log/Potenz nur positive Werte, wo nötig).",
    footer: "Kleinste Quadrate. Bei exp, log und Potenz wird nach Logarithmieren linear angepasst; r bezieht sich dann auf die transformierten Daten.",
  });
}

// =================== Wahrscheinlichkeit ===================
export function distributions() {
  return calcView({
    init: { dist: "norm", mu: "100", sigma: "15", a: "85", b: "115", p: "0.95", n: "10", pp: "0.5", k: "3", lambda: "3" },
    inputs: (s, { field, set }) => [
      ...section("Verteilung", [segmented([["norm", "Normal"], ["binom", "Binomial"], ["pois", "Poisson"]], s.dist, (v) => set("dist", v))]),
      ...section("Parameter", s.dist === "norm" ? [field("mu", "Erwartungswert μ", ""), field("sigma", "Standardabweichung σ", ""), field("a", "untere Grenze a", "", "text"), field("b", "obere Grenze b", "", "text"), field("p", "Quantil für p =", "")]
        : s.dist === "binom" ? [field("n", "n", ""), field("pp", "p", ""), field("k", "k", "")] : [field("lambda", "λ", ""), field("k", "k", "")]),
    ],
    compute: (s, p) => {
      if (s.dist === "norm") {
        const mu = p(s.mu), sg = p(s.sigma); if (!(sg > 0)) throw new Error("positive");
        const A = s.a.trim() ? ev(s.a.replace(/^-?inf$/i, (m) => (m.startsWith("-") ? "-Infinity" : "Infinity"))) : -Infinity, B = s.b.trim() ? ev(s.b.replace(/^-?inf$/i, (m) => (m.startsWith("-") ? "-Infinity" : "Infinity"))) : Infinity;
        const rows = [resultRow(`P(${r(A)} ≤ X ≤ ${r(B)})`, r(M.normalCdf(B, mu, sg) - M.normalCdf(A, mu, sg), 10), "good"),
                      resultRow(`P(X ≤ ${r(B)})`, r(M.normalCdf(B, mu, sg), 10)), resultRow(`Dichte φ(${r(B)})`, r(M.normalPdf(B, mu, sg), 10))];
        const q = p(s.p); if (q !== null && q > 0 && q < 1) rows.push(resultRow(`Quantil x mit P(X ≤ x) = ${r(q)}`, r(M.normalInv(q, mu, sg), 10)));
        return rows;
      }
      const k = Math.round(p(s.k) ?? 0);
      if (s.dist === "binom") {
        const n = Math.round(p(s.n)), pp = p(s.pp);
        return [resultRow(`P(X = ${k})`, r(M.binomPdf(k, n, pp), 10), "good"), resultRow(`P(X ≤ ${k})`, r(M.binomCdf(k, n, pp), 10)),
                resultRow(`P(X ≥ ${k})`, r(1 - M.binomCdf(k - 1, n, pp), 10)), resultRow("Erwartungswert n·p", r(n * pp)), resultRow("Standardabweichung √(n·p·(1−p))", r(Math.sqrt(n * pp * (1 - pp))))];
      }
      const l = p(s.lambda);
      return [resultRow(`P(X = ${k})`, r(M.poissonPdf(k, l), 10), "good"), resultRow(`P(X ≤ ${k})`, r(M.poissonCdf(k, l), 10)),
              resultRow(`P(X ≥ ${k})`, r(1 - M.poissonCdf(k - 1, l), 10)), resultRow("Erwartungswert = Varianz", r(l))];
    },
    rangeMsg: "Parameter prüfen (0 ≤ p ≤ 1, σ > 0, λ > 0, n ganzzahlig).",
    footer: "Grenzen der Normalverteilung leer lassen oder inf/−inf eingeben für ±∞. Φ über die Fehlerfunktion (math.js).",
  });
}

export function combinatorics() {
  return calcView({
    init: { n: "49", k: "6" },
    inputs: (s, { field }) => [...section("Kombinatorik", [field("n", "n", ""), field("k", "k", "")])],
    compute: (s, p) => {
      const n = p(s.n), k = p(s.k);
      if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n || n > 10000) throw new Error("range");
      const big = (x) => { const t = M.math.format(x, { notation: "fixed" }); return t.length > 40 ? M.num(Number(x)) : t; };
      const bn = M.math.bignumber;
      return [resultRow("Kombinationen nCr (ohne Reihenfolge)", big(M.math.combinations(bn(n), bn(k))), "good"), resultRow("Variationen nPr (mit Reihenfolge)", big(M.math.permutations(bn(n), bn(k)))),
              resultRow("mit Wiederholung, ohne Reihenfolge C(n+k−1, k)", big(M.math.combinations(bn(n + k - 1), bn(k)))), resultRow("mit Wiederholung, mit Reihenfolge nᵏ", big(M.math.pow(bn(n), bn(k)))),
              resultRow("n!", big(M.math.factorial(bn(n))))];
    },
    rangeMsg: "Ganze Zahlen mit 0 ≤ k ≤ n ≤ 10 000.",
  });
}

// =================== Zahlen ===================
export function numberTheory() {
  return calcView({
    init: { a: "360", b: "84" },
    inputs: (s, { field }) => [...section("Ganze Zahlen", [field("a", "a", ""), field("b", "b (optional)", "")])],
    compute: (s, p) => {
      const a = p(s.a), b = p(s.b);
      if (!Number.isSafeInteger(a) || a < 1) throw new Error("range");
      const pf = (n) => M.factorize(n).map(([q, e]) => (e > 1 ? `${q}^${e}` : String(q))).join(" · ");
      const rows = [resultRow("Primfaktoren von a", a > 1 ? pf(a) : "–", "good"), resultRow("a ist Primzahl?", M.isPrime(a) ? "ja" : "nein")];
      if (a <= 1e10) { const d = M.divisors(a); rows.push(resultRow(`Teiler von a (${d.length})`, d.length > 60 ? d.slice(0, 60).join(", ") + " …" : d.join(", "))); }
      if (b !== null && Number.isSafeInteger(b) && b >= 1) {
        rows.push(resultRow("ggT(a, b)", String(M.math.gcd(a, b)), "good"), resultRow("kgV(a, b)", String(M.math.lcm(a, b)), "good"),
                  resultRow("a mod b", String(a % b)), resultRow("Gekürzter Bruch a/b", M.fracStr(M.math.fraction(a, b))));
      }
      return rows;
    },
    rangeMsg: "Natürliche Zahlen ≥ 1 (bis 2⁵³) eingeben.",
  });
}

export function bases() {
  return calcView({
    init: { v: "255", from: "10" },
    inputs: (s, { field, set }) => [...section("Zahlensystem", [selectRow("Eingabe als", [["10", "Dezimal"], ["2", "Binär"], ["8", "Oktal"], ["16", "Hexadezimal"]], s.from, (e) => set("from", e.target.value)),
      field("v", "Zahl", "", "text")])],
    compute: (s) => { const res = M.convertBase(s.v, Number(s.from));
      return [resultRow("Dezimal", res.dec, "good"), resultRow("Binär", res.bin.replace(/\B(?=(\d{4})+(?!\d))/g, " ")), resultRow("Oktal", res.oct), resultRow("Hexadezimal", res.hex)]; },
    rangeMsg: "Nur gültige Ziffern des gewählten Systems (ganze Zahlen, beliebig groß).",
  });
}

export function complexView() {
  return calcView({
    init: { mode: "cart", re: "3", im: "4", abs: "5", arg: "53.13", deg: "deg" },
    inputs: (s, { field, set }) => [...section("Komplexe Zahl", [segmented([["cart", "a + bi → Polar"], ["polar", "Polar → a + bi"]], s.mode, (v) => set("mode", v)),
      segmented([["deg", "Grad"], ["rad", "Bogenmaß"]], s.deg, (v) => set("deg", v)),
      ...(s.mode === "cart" ? [field("re", "Realteil a", "", "text"), field("im", "Imaginärteil b", "", "text")] : [field("abs", "Betrag r", "", "text"), field("arg", "Argument φ", s.deg === "deg" ? "°" : "rad", "text")])])],
    compute: (s) => {
      const k = s.deg === "deg" ? Math.PI / 180 : 1;
      let re, im;
      if (s.mode === "cart") { re = ev(s.re); im = ev(s.im); } else { const rr = ev(s.abs), ph = ev(s.arg) * k; re = rr * Math.cos(ph); im = rr * Math.sin(ph); }
      const absV = Math.hypot(re, im), arg = Math.atan2(im, re) / k;
      return [resultRow("Kartesisch", M.num(M.math.complex(re, im), 10), "good"), resultRow("Betrag r", r(absV)), resultRow(`Argument φ (${s.deg === "deg" ? "°" : "rad"})`, r(arg)),
              resultRow("Polarform", `${r(absV, 8)} · e^(i·${r(arg * k, 8)})`), resultRow("Konjugiert", M.num(M.math.complex(re, -im), 10))];
    },
    footer: "Rechnen mit komplexen Zahlen ist direkt im Taschenrechner möglich, z. B. (2+3i)·(1−i) oder sqrt(−4).",
  });
}

// =================== Einheiten & Konstanten ===================
export function unitsView() {
  const groups = Object.keys(M.UNIT_GROUPS);
  return calcView({
    init: { g: "Länge", from: "inch", v: "1" },
    inputs: (s, { field, set }) => [...section("Einheiten umrechnen", [selectRow("Größe", groups.map((g) => [g, g]), s.g, (e) => { s.g = e.target.value; s.from = M.UNIT_GROUPS[s.g][0]; set("g", s.g); }),
      selectRow("Von", M.UNIT_GROUPS[s.g].map((u) => [u, u]), s.from, (e) => set("from", e.target.value)), field("v", "Wert", s.from)])],
    compute: (s, p) => { const v = p(s.v); if (v === null) throw new Error("positive");
      return M.UNIT_GROUPS[s.g].filter((u) => u !== s.from).map((u) => { try { return resultRow(u, r(M.convertUnit(v, s.from, u), 10)); } catch { return msgRow(`${u}: nicht umrechenbar`, "error"); } }); },
    footer: "Umrechnungsfaktoren aus math.js. Kurzzeichen: degC/degF = °C/°F, sqft = ft², cuft = ft³, hp = mechanische PS (hp), b/B = Bit/Byte, nmi = Seemeile (1852 m), kn = Knoten.",
  });
}

export function constants() {
  const rows = M.CONSTANTS.flatMap(([key, label]) => {
    let v; try { v = M.math.evaluate(key); } catch { return []; }
    return [h("div", { class: "row" }, h("span", { class: "label" }, label, h("div", { class: "hint", style: "font-size:12px" }, `im Rechner: ${key}`)),
      h("span", { class: "value" }, M.math.format(v, { precision: 10 })))];
  });
  return section("Physikalische Konstanten (aus math.js)", rows.length ? rows : [msgRow("Konstanten nicht verfügbar.")],
    "Werte stammen aus math.js (CODATA). Die kleinen Namen können im Taschenrechner verwendet werden, z. B. 3*speedOfLight.");
}
