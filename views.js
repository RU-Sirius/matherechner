// Taschenrechner, Gleichungen, Analysis
import * as M from "./mx.js";
import { calcView, section, segmented, selectRow, resultRow, msgRow, h, inputRow } from "./ui.js";
import { schoolCalc } from "./fx.js";

const r = (v, d = 10) => (typeof v === "number" ? M.num(v, d) : String(v));
const ERR = (e) => {
  const m = String(e?.message ?? e);
  if (/Undefined symbol/.test(m)) return `Unbekannter Name: ${m.split("Undefined symbol")[1].trim()}`;
  if (/Unexpected|Parenthesis|end of expression|Value expected/.test(m)) return "Syntaxfehler – Klammern und Operatoren prüfen.";
  return "Nicht berechenbar.";
};

// =================== Taschenrechner ===================
// Ein Eintrag, zwei Ansichten: Standard (Eingabezeile + Tastenfeld) oder Schulrechner (Gehäuse, Lehrbuch-Darstellung).
const MODE_KEY = "mx:calcMode";
export function calculatorSwitch(menuItems, forceMode = null) {
  if (forceMode) localStorage.setItem(MODE_KEY, forceMode);
  const mode = localStorage.getItem(MODE_KEY) || "school";
  const box = h("div");
  const render = (m) => {
    localStorage.setItem(MODE_KEY, m);
    box.replaceChildren(segmented([["standard", "Standard"], ["school", "Schulrechner"]], m, render),
      ...(m === "school" ? [schoolCalc(menuItems)] : calculator()));
  };
  render(mode);
  return [box];
}
const HKEY = "mx:history", SKEY = "mx:calc";
export function calculator() {
  const cfg = JSON.parse(localStorage.getItem(SKEY) || "null") ?? { deg: true, showExact: true, keypad: true };
  const scope = {};
  let history = JSON.parse(localStorage.getItem(HKEY) || "[]");
  for (const hst of history) if (hst.assign) try { M.evaluate(hst.expr, { deg: cfg.deg, scope }); } catch { /* */ }
  const save = () => { localStorage.setItem(SKEY, JSON.stringify(cfg)); localStorage.setItem(HKEY, JSON.stringify(history.slice(-60))); };

  const input = h("input", { class: "calc-input", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
    placeholder: "Ausdruck, z. B. 3/4 + √(2)", inputmode: cfg.keypad ? "none" : "text" });
  const main = h("div", { class: "calc-main" }, "0"), second = h("div", { class: "calc-second" });
  const hist = h("div", { class: "calc-hist" });
  let last = null;

  const show = (res) => {
    if (!res) { main.textContent = "0"; second.textContent = ""; return; }
    const exactFirst = cfg.showExact && res.exact;
    main.textContent = exactFirst ? res.exact : res.decimal;
    second.textContent = [exactFirst ? `≈ ${res.decimal}` : res.exact ? `= ${res.exact}` : "", res.mixed ? `gemischt: ${res.mixed}` : ""].filter(Boolean).join("   ");
  };
  const renderHist = () => hist.replaceChildren(...history.slice(-30).reverse().map((it) => h("button", { class: "hist-item", title: "In die Eingabe übernehmen", onclick: () => { input.value = it.expr; input.focus(); } },
    h("span", { class: "hist-expr" }, it.expr), h("span", { class: "hist-res" }, `= ${it.res}`))));
  const run = () => {
    const expr = input.value.trim(); if (!expr) return;
    try {
      const res = M.evaluate(expr, { deg: cfg.deg, scope }); last = res; show(res);
      history.push({ expr, res: cfg.showExact && res.exact ? res.exact : res.decimal, assign: /^[a-zA-Z]\w*\s*=/.test(expr) });
      save(); renderHist(); input.value = "";
    } catch (e) { main.textContent = "Fehler"; second.textContent = ERR(e); }
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });

  const insert = (txt) => {
    const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + txt + input.value.slice(e);
    // Bei Funktionen mit Klammerpaar die Schreibmarke direkt hinter die öffnende Klammer setzen
    const open = txt.indexOf("("), pos = txt.endsWith(")") && open >= 0 ? s + open + 1 : s + txt.length;
    input.setSelectionRange(pos, pos);
    if (!cfg.keypad) input.focus();
  };
  const back = () => { const s = input.selectionStart ?? input.value.length; if (s > 0) { input.value = input.value.slice(0, s - 1) + input.value.slice(s); input.setSelectionRange(s - 1, s - 1); } };
  const modeBtn = h("button", { class: "key fn" }, cfg.deg ? "DEG" : "RAD");
  modeBtn.onclick = () => { cfg.deg = !cfg.deg; modeBtn.textContent = cfg.deg ? "DEG" : "RAD"; save(); };
  const sdBtn = h("button", { class: "key fn" }, "S⇔D");
  sdBtn.onclick = () => { cfg.showExact = !cfg.showExact; save(); show(last); };
  const K = (label, act, cls = "") => h("button", { class: `key ${cls}`, onclick: typeof act === "function" ? act : () => insert(act) }, label);
  const move = (d) => () => { const p = Math.max(0, Math.min(input.value.length, (input.selectionStart ?? input.value.length) + d)); input.setSelectionRange(p, p); input.focus({ preventScroll: true }); if (cfg.keypad) input.blur(); };
  const keys = [
    modeBtn, sdBtn, K("◀", move(-1), "op"), K("▶", move(1), "op"), K("⌫", back, "op"),
    K("sin", "sin("), K("cos", "cos("), K("tan", "tan("), K("ln", "ln("), K("log", "log10("),
    K("sin⁻¹", "asin("), K("cos⁻¹", "acos("), K("tan⁻¹", "atan("), K("eˣ", "e^("), K("10ˣ", "10^("),
    K("x²", "^2"), K("xʸ", "^"), K("√", "√("), K("ⁿ√", "nthRoot("), K("π", "π"),
    K("(", "("), K(")", ")"), K(",", ","), K("x", "x"), K("i", "i"),
    K("x!", "!"), K("nCr", "nCr("), K("|x|", "abs("), K("Ans", "Ans", "op"), K("AC", () => { input.value = ""; show(null); }, "op warnkey"),
    K("7", "7", "num"), K("8", "8", "num"), K("9", "9", "num"), K("÷", "÷", "op"), K("=", "=", "op"),
    K("4", "4", "num"), K("5", "5", "num"), K("6", "6", "num"), K("×", "×", "op"), K("×10ˣ", "e", "op"),
    K("1", "1", "num"), K("2", "2", "num"), K("3", "3", "num"), K("−", "−", "op"), K("+", "+", "op"),
    K("0", "0", "num"), K(".", ".", "num"), K("nPr", "nPr(", "op"), h("button", { class: "key exe", style: "grid-column: span 2", onclick: run }, "EXE"),
  ];

  const kbBtn = h("button", { class: "linkbtn" }, cfg.keypad ? "Systemtastatur verwenden" : "Rechner-Tastenfeld verwenden");
  kbBtn.onclick = () => { cfg.keypad = !cfg.keypad; save(); location.reload(); };
  setTimeout(renderHist, 0);
  return [
    h("div", { class: "group calc-display", style: "margin-top:12px" }, hist, input, main, second),
    ...(cfg.keypad ? [h("div", { class: "keypad" }, ...keys)] : [h("div", { class: "btnrow" }, h("button", { class: "btn", onclick: run }, "Berechnen (Enter)"))]),
    h("div", { class: "footer" },
      "S⇔D wechselt zwischen exakter Form (Bruch, Wurzel, π) und Dezimalzahl. Variablen: z. B. a = 5, danach 2a. ",
      "„=“ in der Eingabe weist Variablen zu. Weitere Funktionen: floor, ceil, round, gcd, lcm, mod, max, min, log(x, b), sinh, cosh, tanh. ",
      kbBtn),
    h("div", { class: "btnrow" }, h("button", { class: "btn danger", style: "flex:1", onclick: () => { if (confirm("Verlauf und Variablen löschen?")) { history = []; save(); location.reload(); } } }, "Verlauf löschen")),
  ];
}

// =================== Gleichungen ===================
const cplx = (z) => (z.im === 0 ? r(z.re) : `${z.re === 0 ? "" : r(z.re) + " "}${z.im < 0 ? "− " : z.re === 0 ? "" : "+ "}${r(Math.abs(z.im))}i`);

export function polynomial() {
  return calcView({
    init: { deg: "2", c0: "1", c1: "-2", c2: "-1", c3: "0", c4: "0", c5: "0", c6: "0" },
    inputs: (s, { field, set }) => {
      const n = Number(s.deg);
      return [...section("Gleichung aₙxⁿ + … + a₁x + a₀ = 0", [
        selectRow("Grad", [2, 3, 4, 5, 6].map((k) => [String(k), String(k)]), s.deg, (e) => set("deg", e.target.value)),
        ...Array.from({ length: n + 1 }, (_, i) => field(`c${i}`, `a${"₀₁₂₃₄₅₆"[n - i]} (x${n - i > 1 ? "^" + (n - i) : n - i === 1 ? "" : "⁰"})`, "", "text"))])];
    },
    compute: (s) => {
      const n = Number(s.deg), cs = Array.from({ length: n + 1 }, (_, i) => M.evaluate(s[`c${i}`] || "0").value).map(Number);
      if (!cs[0]) return [msgRow("Der höchste Koeffizient darf nicht 0 sein.", "error")];
      const z = M.polyRoots(cs);
      const rows = z.map((zz, k) => resultRow(`x${"₁₂₃₄₅₆"[k]}`, cplx(zz), zz.im === 0 ? "good" : ""));
      if (n === 2) {
        const ex = M.quadraticExact(...cs);
        if (ex) rows.unshift(resultRow("Exakt", ex.text.join(" ;  ")));
        rows.push(resultRow("Diskriminante b² − 4ac", r(cs[1] ** 2 - 4 * cs[0] * cs[2])));
        rows.push(resultRow("Scheitelpunkt", `(${r(-cs[1] / (2 * cs[0]))} | ${r(cs[2] - cs[1] ** 2 / (4 * cs[0]))})`));
      }
      return rows;
    },
    rangeMsg: "Koeffizienten prüfen (Zahlen oder Ausdrücke wie 1/2, √(2)).",
    footer: "Numerisch (Durand-Kerner, mehrfache Nullstellen nachgeschärft), bei Grad 2 zusätzlich exakt. Koeffizienten dürfen Ausdrücke sein (z. B. 1/3, sqrt(2)).",
  });
}

export function inequality() {
  const fmtI = (lo, hi, closed) => `${lo === -Infinity ? "]−∞" : (closed ? "[" : "]") + r(lo)} ; ${hi === Infinity ? "∞[" : r(hi) + (closed ? "]" : "[")}`;
  return calcView({
    init: { deg: "2", op: "<", c0: "1", c1: "0", c2: "-4", c3: "0", c4: "0" },
    inputs: (s, { field, set }) => {
      const n = Number(s.deg);
      return [...section("Ungleichung", [selectRow("Grad", [1, 2, 3, 4].map((k) => [String(k), String(k)]), s.deg, (e) => set("deg", e.target.value)),
        ...Array.from({ length: n + 1 }, (_, i) => field(`c${i}`, `a${"₀₁₂₃₄"[n - i]}`, "", "text")),
        selectRow("Relation", [["<", "… < 0"], ["<=", "… ≤ 0"], [">", "… > 0"], [">=", "… ≥ 0"]], s.op, (e) => set("op", e.target.value))])];
    },
    compute: (s) => {
      const n = Number(s.deg), cs = Array.from({ length: n + 1 }, (_, i) => Number(M.evaluate(s[`c${i}`] || "0").value));
      if (!cs[0]) return [msgRow("Der höchste Koeffizient darf nicht 0 sein.", "error")];
      const res = M.polyInequality(cs, s.op);
      const parts = [...res.intervals.map(([lo, hi]) => fmtI(lo, hi, res.closed)), ...res.singles.map((x) => `{ ${r(x)} }`)];
      return [resultRow("Lösungsmenge", parts.length ? parts.join("  ∪  ") : "leere Menge", "good"),
              resultRow("Reelle Nullstellen", res.roots.length ? res.roots.map((x) => r(x)).join(" ; ") : "keine")];
    },
    footer: "Vorzeichentabelle über die reellen Nullstellen des Polynoms.",
  });
}

export function linsys() {
  return calcView({
    init: { n: "2", ...Object.fromEntries([...Array(4)].flatMap((_, i) => [...Array(5)].map((__, j) => [`a${i}${j}`, i === j ? "1" : "0"]))), a00: "2", a01: "1", a04: "3", a10: "1", a11: "3", a14: "5" },
    inputs: (s, { field, set }) => {
      const n = Number(s.n), vars = "xyzw";
      return [...section("Anzahl Unbekannte", [segmented([["2", "2"], ["3", "3"], ["4", "4"]], s.n, (v) => set("n", v))]),
        ...Array.from({ length: n }, (_, i) => section(`Gleichung ${i + 1}`, [...Array.from({ length: n }, (_, j) => field(`a${i}${j}`, `Koeffizient von ${vars[j]}`, "", "text")), field(`a${i}4`, "rechte Seite", "", "text")])).flat()];
    },
    compute: (s) => {
      const n = Number(s.n), ev = (t) => { const v = M.evaluate(t || "0"); return M.toFrac(Number(v.value)); };
      const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => ev(s[`a${i}${j}`]))), b = Array.from({ length: n }, (_, i) => ev(s[`a${i}4`]));
      const res = M.linearSystem(A, b);
      if (res.kind === "none") return [msgRow("Keine Lösung (Gleichungen widersprechen sich).", "error")];
      if (res.kind === "infinite") return [msgRow(`Unendlich viele Lösungen (Rang ${res.rank} < ${n}).`, "warn")];
      return res.x.map((v, k) => { const num = M.math.number(v); const fs = M.fracStr(v); return resultRow("xyzw"[k], fs === r(num) ? fs : `${fs}  ≈ ${r(num)}`, "good"); });
    },
    footer: "Exakt mit Brüchen (Gauß-Jordan). Koeffizienten dürfen Brüche oder Ausdrücke sein.",
  });
}

export function solver() {
  return calcView({
    init: { eq: "cos(x) = x", a: "-10", b: "10", deg: "rad" },
    inputs: (s, { field, set }) => [...section("Gleichung in x", [field("eq", "Gleichung", "", "text"), field("a", "Suchbereich von", ""), field("b", "bis", ""),
      segmented([["rad", "RAD"], ["deg", "DEG"]], s.deg, (v) => set("deg", v))])],
    compute: (s, p) => {
      const xs = M.solveEquation(s.eq, p(s.a), p(s.b), { deg: s.deg === "deg" });
      return xs.length ? xs.slice(0, 30).map((x, k) => resultRow(`x${k + 1}`, r(x, 12), "good")) : [msgRow("Keine Lösung im Suchbereich gefunden.")];
    },
    rangeMsg: "Bitte Gleichung und Bereich (von < bis) prüfen.",
    footer: "Numerische Suche (Vorzeichenwechsel + Bisektion, Berührstellen über Minima). Lösungen außerhalb des Bereichs werden nicht gefunden.",
  });
}

// =================== Analysis ===================
export function derivativeView() {
  return calcView({
    init: { f: "x^2*sin(x)", order: "1", x0: "1", deg: "rad" },
    inputs: (s, { field, set }) => [...section("Funktion", [field("f", "f(x) =", "", "text"), selectRow("Ableitung", [["1", "f′(x)"], ["2", "f″(x)"], ["3", "f‴(x)"]], s.order, (e) => set("order", e.target.value)),
      field("x0", "an der Stelle x₀ (optional)", "")])],
    compute: (s, p) => {
      const d = M.derivative(s.f, Number(s.order));
      const rows = [resultRow(["f′(x)", "f″(x)", "f‴(x)"][Number(s.order) - 1], d.toString().replace(/\*/g, "·"), "good")];
      const x0 = p(s.x0);
      if (x0 !== null) { const fn = M.compileFn(d.toString()); rows.push(resultRow(`Wert bei x₀ = ${r(x0)}`, r(fn(x0)))); rows.push(resultRow(`f(x₀)`, r(M.compileFn(s.f)(x0)))); }
      return rows;
    },
    rangeMsg: "Funktion nicht lesbar.",
    footer: "Symbolische Ableitung mit anschließender Vereinfachung (math.js). Die Form kann von der Schreibweise im Unterricht abweichen.",
  });
}

export function integralView() {
  return calcView({
    init: { f: "e^(-x^2)", a: "-3", b: "3" },
    inputs: (s, { field }) => [...section("Bestimmtes Integral", [field("f", "f(x) =", "", "text"), field("a", "untere Grenze a", "", "text"), field("b", "obere Grenze b", "", "text")])],
    compute: (s) => {
      const a = Number(M.evaluate(s.a).value), b = Number(M.evaluate(s.b).value);
      const v = M.integrate(M.compileFn(s.f), a, b);
      const ex = M.exactForm(v);
      return [resultRow("∫ f(x) dx", r(v, 12), "good"), ex ? resultRow("vermutlich exakt", ex) : null,
              resultRow("Fläche (Betrag)", r(M.integrate((x) => Math.abs(M.compileFn(s.f)(x)), a, b), 10))];
    },
    rangeMsg: "Funktion oder Grenzen prüfen (Grenzen dürfen Ausdrücke wie pi/2 sein).",
    footer: "Adaptive Simpson-Regel. Bei Polstellen im Intervall ist das Ergebnis nicht verlässlich. „vermutlich exakt“: der Zahlenwert passt auf eine einfache Wurzel-/π-Form.",
  });
}

export function sumView() {
  return calcView({
    init: { f: "k^2", a: "1", b: "10", mode: "sum" },
    inputs: (s, { field, set }) => [...section("Summe / Produkt über k", [segmented([["sum", "Σ Summe"], ["prod", "Π Produkt"]], s.mode, (v) => set("mode", v)),
      field("f", "Term in k", "", "text"), field("a", "von k =", ""), field("b", "bis", "")])],
    compute: (s, p) => {
      const v = M.sumProduct(M.compileFn(s.f, { variable: "k" }), p(s.a), p(s.b), s.mode === "prod");
      const fr = M.evaluate(String(v)).exact;
      return [resultRow(s.mode === "sum" ? "Σ" : "Π", r(v, 14), "good"), fr ? resultRow("exakt", fr) : null];
    },
    rangeMsg: "Ganzzahlige Grenzen (von ≤ bis, max. 1 000 000 Glieder).",
  });
}

export function tableView() {
  return calcView({
    init: { f: "x^2", g: "", a: "-3", b: "3", step: "1" },
    inputs: (s, { field }) => [...section("Wertetabelle", [field("f", "f(x) =", "", "text"), field("g", "g(x) = (optional)", "", "text"),
      field("a", "Start", ""), field("b", "Ende", ""), field("step", "Schrittweite", "")])],
    compute: (s, p) => {
      const a = p(s.a), b = p(s.b), st = p(s.step);
      if (!(st > 0) || b < a || (b - a) / st > 500) throw new Error("range");
      const f = M.compileFn(s.f), g = s.g.trim() ? M.compileFn(s.g) : null;
      const rows = [];
      for (let k = 0; a + k * st <= b + st * 1e-9; k++) { const x = +(a + k * st).toPrecision(12); rows.push(h("tr", {}, h("td", {}, r(x)), h("td", {}, r(f(x), 8)), ...(g ? [h("td", {}, r(g(x), 8))] : []))); }
      return [h("div", { class: "row chart-row" }, h("table", { class: "ttable" }, h("tr", {}, h("th", {}, "x"), h("th", {}, "f(x)"), ...(g ? [h("th", {}, "g(x)")] : [])), ...rows))];
    },
    rangeMsg: "Bereich prüfen: Start ≤ Ende, Schrittweite > 0, max. 500 Zeilen.",
  });
}

export function curveView() {
  return calcView({
    init: { f: "x^3 - 3x", a: "-5", b: "5" },
    inputs: (s, { field }) => [...section("Kurvendiskussion", [field("f", "f(x) =", "", "text"), field("a", "Untersuchungsbereich von", ""), field("b", "bis", "")])],
    compute: (s, p) => {
      const res = M.curveAnalysis(s.f, p(s.a), p(s.b));
      const pt = (q) => `(${r(q.x, 8)} | ${r(q.y, 8)})`;
      return [resultRow("f′(x)", res.d1.replace(/\*/g, "·")), resultRow("f″(x)", res.d2.replace(/\*/g, "·")),
              resultRow("y-Achsenabschnitt f(0)", res.y0 !== null ? r(res.y0) : "nicht definiert"),
              ...(res.zeros.length ? res.zeros.map((q, k) => resultRow(`Nullstelle N${k + 1}`, pt(q), "good")) : [msgRow("Keine Nullstellen im Bereich.")]),
              ...res.extrema.map((q) => resultRow(q.kind, pt(q))),
              ...res.inflections.map((q) => resultRow("Wendepunkt", `${pt(q)} · Steigung ${r(q.slope, 6)}`))];
    },
    rangeMsg: "Funktion oder Bereich prüfen.",
    footer: "Numerisch im angegebenen Bereich; Ableitungen symbolisch. Verhalten im Unendlichen und Definitionslücken bitte gesondert betrachten (z. B. mit dem Funktionsplotter).",
  });
}
