// Schulrechner-Ansicht: Gehäuse mit LCD, natürliche Darstellung (Lehrbuch-Form), SHIFT/ALPHA-Ebenen.
// Eigenständige Gestaltung im Stil klassischer wissenschaftlicher Schulrechner.
import * as M from "./mx.js";
import { h } from "./ui.js";

const math = M.math;
const CUR = "__c__", BOX = "__p__";
const SKEY = "mx:fx", HKEY = "mx:fxhist", VKEY = "mx:fxvars";

// ================= Natürliche Darstellung =================
const strip = (n) => (n?.isParenthesisNode ? n.content : n);
const span = (cls, ...kids) => h("span", { class: cls }, ...kids);
const frac = (a, b) => span("nf", span("nn", a), span("nd", b));
const sup = (a) => span("ns", a);
const sub = (a) => span("nsb", a);
const root = (a, idx) => span("nr", idx ? span("nri", idx) : null, span("nrs", "√"), span("nrb", a));
const paren = (a) => span("np", "(", a, ")");
const FN = { asin: "sin⁻¹", acos: "cos⁻¹", atan: "tan⁻¹", log10: "log", sinh: "sinh", cosh: "cosh", tanh: "tanh", asinh: "sinh⁻¹", acosh: "cosh⁻¹", atanh: "tanh⁻¹" };
const PREC = { add: 1, subtract: 1, multiply: 2, divide: 2, unaryMinus: 3, pow: 4, factorial: 5 };

function render(node) {
  const n = node;
  if (n.isParenthesisNode) return paren(render(n.content));
  if (n.isConstantNode) return span("nc", String(n.value));
  if (n.isSymbolNode) {
    if (n.name === CUR) return span("caret", "");
    if (n.name === BOX) return span("box", "");
    return span(n.name.length === 1 && /[a-zA-Z]/.test(n.name) ? "nv" : "nc", { pi: "π", Infinity: "∞", Ans: "Ans" }[n.name] ?? n.name);
  }
  if (n.isOperatorNode) {
    const [a, b] = n.args;
    const wrap = (child) => (child.isOperatorNode && PREC[child.fn] < PREC[n.fn] && !child.isParenthesisNode ? paren(render(child)) : render(child));
    switch (n.fn) {
      case "divide": return frac(render(strip(a)), render(strip(b)));
      case "pow": return span("npw", a.isOperatorNode || (a.isFunctionNode && a.fn.name !== "sqrt") ? paren(render(strip(a))) : render(a), sup(render(strip(b))));
      case "multiply": return span("nm", wrap(a), n.implicit ? null : span("nop", "×"), wrap(b));
      case "add": return span("nm", render(a), span("nop", "+"), render(b));
      case "subtract": return span("nm", render(a), span("nop", "−"), wrap(b));
      case "unaryMinus": return span("nm", "−", wrap(a));
      case "unaryPlus": return span("nm", "+", wrap(a));
      case "factorial": return span("nm", wrap(a), "!");
      default: return span("nm", ...n.args.flatMap((x, i) => (i ? [span("nop", n.op), render(x)] : [render(x)])));
    }
  }
  if (n.isFunctionNode) {
    const name = n.fn.name ?? String(n.fn), a = n.args;
    const r = (k) => render(strip(a[k]));
    if (name === "sqrt") return root(r(0));
    if (name === "nthRoot" || name === "root") return root(r(0), a[1] ? r(1) : null);
    if (name === "cbrt") return root(r(0), "3");
    if (name === "abs") return span("nm", "|", r(0), "|");
    if (name === "exp") return span("npw", "e", sup(r(0)));
    if (name === "log" && a.length === 2) return span("nm", "log", sub(r(1)), paren(r(0)));
    if (name === "integral") return span("nint", span("nis", "∫"), span("nil", span("nih", a[2] ? r(2) : ""), span("nil2", a[1] ? r(1) : "")), r(0), span("nop", "dx"));
    if (name === "ddx") return span("nm", frac("d", "dx"), paren(r(0)), span("nbar", sub(span("nm", "x=", a[1] ? r(1) : ""))));
    if (name === "sigma") return span("nint", span("nsig", span("nih", a[2] ? r(2) : ""), span("nsigs", "Σ"), span("nil2", span("nm", "x=", a[1] ? r(1) : ""))), paren(r(0)));
    if (name === "nCr" || name === "nPr") return span("nm", r(0), span("ncr", name[1]), r(1));
    return span("nm", span("nfn", FN[name] ?? name), paren(span("nm", ...a.flatMap((x, i) => (i ? [", ", render(strip(x))] : [render(strip(x))])))));
  }
  if (n.isAssignmentNode) return span("nm", render(n.value), span("nop", "→"), n.object?.name ?? "");
  return span("nc", n.toString());
}

// Vorschau der Eingabe mit Cursor (fehlende Klammern ergänzen, leere Felder als Kästchen).
export function previewNode(text, cursor) {
  let t = M.normalize(text.slice(0, cursor)) + CUR + M.normalize(text.slice(cursor));
  t = t.replace(/\(\)/g, `(${BOX})`).replace(/\(,/g, `(${BOX},`).replace(/,\)/g, `,${BOX})`).replace(/,,/g, `,${BOX},`).replace(/,(__c__)\)/g, ",$1)");
  const open = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
  if (open > 0) t += ")".repeat(open);
  return math.parse(t);
}
export function natural(text, cursor = null) {
  try { return render(cursor === null ? math.parse(M.normalize(text)) : previewNode(text, cursor)); }
  catch {
    if (cursor === null) return span("nc", text);
    return span("nm", text.slice(0, cursor), span("caret", ""), text.slice(cursor));
  }
}
// Ergebnisdarstellung (exakte Form → natürliche Darstellung)
function exactNode(str) {
  if (/^−?\d+ \d+\/\d+$/.test(str)) { const [w, f] = str.split(" "); const [p, q] = f.split("/"); return span("nm", w, frac(p, q)); }
  // Leerzeichen statt * → implizite Multiplikation, wird ohne „ד dargestellt (2√3, 3π/4)
  const expr = str.replace(/−/g, "-").replace(/(\d*)√(\d+)/g, (_, k, v) => `${k ? k + " " : ""}sqrt(${v})`).replace(/(\d*)π/g, (_, k) => (k ? `${k} pi` : "pi"));
  try { return render(math.parse(expr)); } catch { return span("nc", str); }
}

// ================= Zahlenformate =================
function formatNumber(v, cfg, engShift = 0, engOn = false) {
  if (typeof v !== "number") return { text: M.num(v, 10) };
  if (!Number.isFinite(v)) return { text: M.num(v) };
  if (engOn) {
    const e0 = (v === 0 ? 0 : Math.floor(Math.log10(Math.abs(v)) / 3) * 3) + engShift * 3;
    return { mant: String(+(v / 10 ** e0).toPrecision(10)), exp: e0 };
  }
  if (cfg.fmt === "fix") return { text: v.toFixed(cfg.digits) };
  if (cfg.fmt === "sci") { const [m, e] = v.toExponential(Math.max(0, cfg.digits - 1)).split("e"); return { mant: m, exp: Number(e) }; }
  if (v !== 0 && (Math.abs(v) >= 1e10 || Math.abs(v) < 1e-9)) { const [m, e] = v.toExponential(9).split("e"); return { mant: String(+m), exp: Number(e) }; }
  return { text: String(+v.toPrecision(10)) };
}
const numNode = (f) => (f.exp !== undefined ? span("nm", f.mant, span("nop", "×"), span("npw", "10", sup(String(f.exp)))) : span("nc", f.text));
function dms(v) {
  const s = v < 0 ? "−" : "", a = Math.abs(v), d = Math.floor(a), mm = Math.floor((a - d) * 60), ss = ((a - d) * 60 - mm) * 60;
  return `${s}${d}°${mm}′${+ss.toFixed(2)}″`;
}

// ================= Ansicht =================
export function schoolCalc(menuItems = []) {
  const cfg = Object.assign({ deg: true, exact: true, fmt: "norm", digits: 4 }, JSON.parse(localStorage.getItem(SKEY) || "{}"));
  const vars = Object.assign({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0 }, JSON.parse(localStorage.getItem(VKEY) || "{}"));
  let hist = JSON.parse(localStorage.getItem(HKEY) || "[]");
  const save = () => { localStorage.setItem(SKEY, JSON.stringify(cfg)); localStorage.setItem(VKEY, JSON.stringify(vars)); localStorage.setItem(HKEY, JSON.stringify(hist.slice(-40))); };

  let text = "", cur = 0, shift = false, alpha = false, sto = false, rcl = false, res = null, showExact = cfg.exact, engOn = false, engShift = 0, showDms = false, hIdx = null, done = false;

  const status = h("div", { class: "lcd-status" }), inLine = h("div", { class: "lcd-in" }), outLine = h("div", { class: "lcd-out" });
  const lcd = h("div", { class: "lcd" }, status, inLine, outLine);

  function paint() {
    status.replaceChildren(...[shift && "S", alpha && "A", sto && "STO", rcl && "RCL", vars.M ? "M" : "", cfg.deg ? "D" : "R",
      cfg.fmt === "fix" ? `FIX${cfg.digits}` : cfg.fmt === "sci" ? `SCI${cfg.digits}` : "", cfg.exact ? "Math" : "Linear"].filter(Boolean).map((t) => span("st", t)));
    inLine.replaceChildren(text || !done ? natural(text, done ? null : cur) : span("nc", ""));
    if (!res) { outLine.replaceChildren(); return; }
    if (res.error) { outLine.replaceChildren(span("lcd-err", res.error)); return; }
    let node;
    if (showDms && typeof res.value === "number") node = span("nc", dms(res.value));
    else if (engOn && typeof res.value === "number") node = numNode(formatNumber(res.value, cfg, engShift, true));
    else if (showExact && res.exact && cfg.fmt === "norm") node = exactNode(res.exact);
    else node = typeof res.value === "number" ? numNode(formatNumber(res.value, cfg)) : span("nc", res.decimal);
    outLine.replaceChildren(node);
  }

  // ---------- Eingabe-Hilfen ----------
  const ident = /[A-Za-z_]/;
  function insert(t) {
    if (done) { // nach einem Ergebnis: Operator setzt mit Ans fort, sonst neue Eingabe
      // Rechenzeichen setzen mit Ans fort; das Vorzeichen (−) und alles andere beginnt neu
      if (/^[+−×÷*/^!]/.test(t)) { text = "Ans"; cur = 3; } else { text = ""; cur = 0; }
      done = false; res = null; engOn = false; showDms = false;
    }
    text = text.slice(0, cur) + t + text.slice(cur);
    // Schreibmarke ins erste leere Feld einer Vorlage, sonst ans Ende des Eingefügten
    const slot = t.search(/\(\)|\(,|,,|,\)/);
    cur += slot >= 0 ? slot + 1 : t.length;
    hIdx = null; paint();
  }
  // Cursor springt wie beim Schulrechner zwischen Feldern: Zähler ↔ Nenner, Argumente von ∫/Σ/log, Exponent.
  function left() {
    if (done) { done = false; cur = text.length; return paint(); }
    if (cur === 0) return paint();
    if (text.slice(cur - 3, cur) === ")/(") cur -= 3;
    else if (text[cur - 1] === ",") cur -= 1;
    else { cur--; while (cur > 0 && ident.test(text[cur - 1]) && (ident.test(text[cur]) || text[cur] === "(")) cur--; }
    paint();
  }
  function right() {
    if (done) { done = false; cur = 0; return paint(); }
    if (cur >= text.length) return paint();
    if (text.startsWith(")/(", cur)) cur += 3;
    else if (text[cur] === ",") cur += 1;
    else { cur++; while (cur < text.length && ident.test(text[cur - 1]) && ident.test(text[cur])) cur++; if (text[cur] === "(" && ident.test(text[cur - 1])) cur++; }
    paint();
  }
  function del() {
    if (done) { done = false; cur = text.length; }
    if (cur === 0) return paint();
    let s = cur - 1;
    if (text[s] === "(") while (s > 0 && ident.test(text[s - 1])) s--; // ganzen Funktionsnamen löschen
    else if (ident.test(text[s])) while (s > 0 && ident.test(text[s - 1])) s--;
    text = text.slice(0, s) + text.slice(cur); cur = s; paint();
  }
  function ac() { text = ""; cur = 0; res = null; done = false; engOn = false; showDms = false; hIdx = null; paint(); }
  function exe() {
    if (!text.trim()) return;
    try {
      const r = M.evaluate(text, { deg: cfg.deg, scope: vars }); // Zuweisungen (A = 5) landen direkt in vars
      res = r; showExact = cfg.exact; engOn = false; engShift = 0; showDms = false;
      hist.push(text); save();
    } catch (e) { res = { error: /Undefined symbol/.test(e.message) ? "Variablenfehler" : /Unexpected|Parenthesis|Value expected|end of expression/.test(e.message) ? "Syntax ERROR" : "Math ERROR" }; }
    done = true; hIdx = null; paint();
  }
  function histMove(d) {
    if (!hist.length) return;
    hIdx = hIdx === null ? (d < 0 ? hist.length - 1 : null) : hIdx + d;
    if (hIdx === null || hIdx < 0 || hIdx >= hist.length) { hIdx = hIdx < 0 ? 0 : null; if (hIdx === null) return; }
    text = hist[hIdx]; cur = text.length; done = false; res = null; paint();
  }
  // Variable antippen: je nach Zustand speichern, abrufen oder einfügen
  function variable(name) {
    if (sto) { exeIfNeeded(); vars[name] = vars.Ans ?? 0; sto = false; alpha = false; save(); res = { value: vars[name], decimal: M.num(Number(vars[name])), exact: null }; text = `Ans→${name}`; done = true; return paint(); }
    if (rcl) { rcl = false; alpha = false; try { res = M.evaluate(name, { scope: vars }); } catch { res = { error: "Variablenfehler" }; } text = name; done = true; return paint(); }
    alpha = false; insert(name);
  }

  // ---------- Tasten ----------
  // [Hauptbeschriftung, Hauptaktion, SHIFT-Beschriftung, SHIFT-Aktion, ALPHA-Variable, Klasse]
  const I = (t) => () => insert(t);
  const toggleShift = () => { shift = !shift; alpha = false; paint(); };
  const toggleAlpha = () => { alpha = !alpha; shift = false; paint(); };
  const KEYS = [
    ["SHIFT", toggleShift, "", null, null, "k-shift"], ["ALPHA", toggleAlpha, "", null, null, "k-alpha"],
    ["◀", left, "", null, null, "k-nav"], ["▶", right, "", null, null, "k-nav"], ["▲", () => histMove(-1), "", null, null, "k-nav"], ["▼", () => histMove(1), "", null, null, "k-nav"],

    ["∫▢", I("integral(,,)"), "Σ", I("sigma(,,)"), null], ["d/dx", I("ddx(,)"), "", null, null], ["x⁻¹", I("^(-1)"), "x!", I("!"), null],
    ["log▢", I("log(,)"), "", null, null], ["▢/▢", I("()/()"), "", null, null], ["MENU", () => openMenu(), "SETUP", () => openSetup(), null, "k-sys"],

    ["√▢", I("sqrt()"), "³√▢", I("nthRoot(,3)"), null], ["x²", I("^2"), "x³", I("^3"), null], ["x^▢", I("^()"), "ⁿ√▢", I("nthRoot(,)"), null],
    ["log", I("log10("), "10^▢", I("10^()"), null], ["ln", I("ln("), "e^▢", I("e^()"), null], ["(−)", I("-"), "|x|", I("abs("), "A"],

    ["°′″", () => { if (done && res && typeof res.value === "number") { showDms = !showDms; paint(); } }, "", null, "B"], ["hyp", () => openHyp(), "", null, "C"],
    ["sin", I("sin("), "sin⁻¹", I("asin("), "D"], ["cos", I("cos("), "cos⁻¹", I("acos("), "E"], ["tan", I("tan("), "tan⁻¹", I("atan("), "F"],
    ["RCL", () => { rcl = true; alpha = true; paint(); }, "STO", () => { sto = true; alpha = true; paint(); }, null],

    ["ENG", () => { if (done && res && typeof res.value === "number") { if (engOn) engShift++; else { engOn = true; engShift = 0; } paint(); } }, "←ENG", () => { if (done && res && typeof res.value === "number") { if (engOn) engShift--; else { engOn = true; engShift = 0; } paint(); } }, null],
    ["(", I("("), "%", I("/100"), null], [")", I(")"), ",", I(","), "X"], ["S⇔D", () => { if (done && res) { showExact = !showExact; engOn = false; showDms = false; paint(); } }, "", null, "Y"],
    ["M+", () => { exeIfNeeded(); vars.M = Number(vars.M) + Number(vars.Ans ?? 0); save(); paint(); }, "M−", () => { exeIfNeeded(); vars.M = Number(vars.M) - Number(vars.Ans ?? 0); save(); paint(); }, "M"],
    ["x", I("x"), "e", I("e"), null],
  ];

  function exeIfNeeded() { if (!done && text.trim()) exe(); }
  // ---------- Auswahlfenster: MENU, SETUP, hyp ----------
  function overlay(title, items) {
    const close = () => ov.remove();
    const ov = h("div", { class: "modal", onclick: (e) => { if (e.target === ov) close(); } },
      h("div", { class: "modal-box fx-menu" }, h("h2", {}, title), ...items.map(([label, act]) => h("button", { class: "fx-menu-item", onclick: () => { close(); act(); } }, label)),
        h("button", { class: "fx-menu-item fx-menu-close", onclick: close }, "Schließen")));
    document.body.append(ov);
  }
  const openMenu = () => overlay("Modus wählen", [["Berechnungen (diese Ansicht)", () => {}], ...menuItems.map(([key, label]) => [label, () => { location.hash = key; }])]);
  const openHyp = () => overlay("Hyperbelfunktionen", [["sinh", I("sinh(")], ["cosh", I("cosh(")], ["tanh", I("tanh(")], ["sinh⁻¹", I("asinh(")], ["cosh⁻¹", I("acosh(")], ["tanh⁻¹", I("atanh(")]]);
  const set = (c) => () => { Object.assign(cfg, c); showExact = cfg.exact; save(); paint(); };
  const openSetup = () => overlay("SETUP", [
    [`Winkel: Grad (Deg)${cfg.deg ? " ✓" : ""}`, set({ deg: true })], [`Winkel: Bogenmaß (Rad)${!cfg.deg ? " ✓" : ""}`, set({ deg: false })],
    [`Ausgabe: exakt (Bruch/Wurzel/π)${cfg.exact ? " ✓" : ""}`, set({ exact: true })], [`Ausgabe: dezimal${!cfg.exact ? " ✓" : ""}`, set({ exact: false })],
    [`Zahlenformat: Norm${cfg.fmt === "norm" ? " ✓" : ""}`, set({ fmt: "norm" })],
    ...[0, 2, 4, 6].map((d) => [`Fix ${d} Nachkommastellen${cfg.fmt === "fix" && cfg.digits === d ? " ✓" : ""}`, set({ fmt: "fix", digits: d })]),
    ...[3, 5, 10].map((d) => [`Sci ${d} signifikante Stellen${cfg.fmt === "sci" && cfg.digits === d ? " ✓" : ""}`, set({ fmt: "sci", digits: d })]),
    ["Variablen A–F, X, Y, M auf 0 setzen", () => { for (const k of "ABCDEFXYM") vars[k] = 0; save(); paint(); }],
    ["Verlauf löschen", () => { hist = []; save(); }],
  ]);
  const NUM = [
    ["7", I("7")], ["8", I("8")], ["9", I("9")], ["DEL", del, "k-del"], ["AC", ac, "k-del"],
    ["4", I("4")], ["5", I("5")], ["6", I("6")], ["×", I("×"), "k-op", "nPr", I("nPr(,)")], ["÷", I("÷"), "k-op", "nCr", I("nCr(,)")],
    ["1", I("1")], ["2", I("2")], ["3", I("3")], ["+", I("+"), "k-op"], ["−", I("−"), "k-op"],
    ["0", I("0")], [".", I("."), "", "Ran#", I("random()")], ["×10^x", I("e"), "k-op", "π", I("π")], ["Ans", I("Ans"), "k-op"], ["=", exe, "k-exe"],
  ];
  const press = (fn, sfn) => (e) => { e.preventDefault(); if (shift && sfn) { shift = false; sfn(); } else { const wasShift = shift; shift = false; fn(); if (wasShift) paint(); } };
  const fnKeys = KEYS.map(([lab, fn, slab, sfn, avar, cls = ""]) => h("div", { class: `fxk ${cls}` },
    h("div", { class: "fxk-lbl" }, slab ? span("lbl-s", slab) : span("lbl-s", ""), avar ? span("lbl-a", avar) : null),
    h("button", { class: "fxb", onclick: (e) => { e.preventDefault(); if (alpha && avar) return variable(avar); press(fn, sfn)(e); } }, lab)));
  const numKeys = NUM.map(([lab, fn, cls = "", slab, sfn]) => h("div", { class: `fxk ${cls}` },
    h("div", { class: "fxk-lbl" }, span("lbl-s", slab ?? "")), h("button", { class: "fxb fxb-num", onclick: press(fn, sfn) }, lab)));

  // Physische Tastatur (Computer)
  const onKey = (e) => {
    if (!document.body.contains(lcd)) return document.removeEventListener("keydown", onKey);
    if (e.metaKey || e.ctrlKey) return;
    const k = e.key;
    if (k === "Enter" || k === "=") { e.preventDefault(); exe(); } else if (k === "Backspace") { e.preventDefault(); del(); } else if (k === "Escape") ac();
    else if (k === "ArrowLeft") left(); else if (k === "ArrowRight") right(); else if (k === "ArrowUp") histMove(-1); else if (k === "ArrowDown") histMove(1);
    else if (k.length === 1 && /[0-9a-zA-Z+\-*/^().,!%]/.test(k)) { e.preventDefault(); insert(k === "*" ? "×" : k === "/" ? "÷" : k === "-" ? "−" : k); }
  };
  document.addEventListener("keydown", onKey);
  setTimeout(paint, 0);
  return h("div", { class: "fx" },
    h("div", { class: "fx-top" }, span("fx-brand", "MatheRechner"), span("fx-model", "Schulrechner-Ansicht")),
    lcd,
    h("div", { class: "fx-fn" }, ...fnKeys),
    h("div", { class: "fx-num" }, ...numKeys));
}
