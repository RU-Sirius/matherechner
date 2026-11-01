// Schulrechner-Ansicht: Gehäuse mit LCD, natürliche Darstellung (Lehrbuch-Form), SHIFT/ALPHA-Ebenen.
// Eigenständige Gestaltung im Stil klassischer wissenschaftlicher Schulrechner.
import * as M from "./mx.js";
import { h } from "./ui.js";
import { svgIcon } from "./icons.js";
import { createLcdApp, menuLabel, menuIndex } from "./lcdmodes.js";

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

const CONST_SYM = Object.fromEntries(M.CONSTANTS.map(([k, , sym]) => [`K_${k}`, sym]));
// Felder von Vorlagen markieren, damit man sie im Display antippen kann (n-te Vorlage dieses Namens, Argument-Nr.)
let occ = {};
const fld = (el, fn, k, arg) => { el.dataset.fn = fn; el.dataset.occ = k; el.dataset.arg = arg; return el; };
function render(node) {
  const n = node;
  if (n.isParenthesisNode) return paren(render(n.content));
  if (n.isConstantNode) return span("nc", String(n.value));
  if (n.isSymbolNode) {
    if (n.name === CUR) return span("caret", "");
    if (n.name.includes(CUR)) { const [l, r] = n.name.split(CUR); return span("nm", l, span("caret", ""), r); } // Schreibmarke an einem Namen
    if (n.name === BOX) return span("box", "");
    if (CONST_SYM[n.name]) return span("nv nconst", CONST_SYM[n.name]);
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
    // Schreibmarke direkt vor (oder hinter) einem Funktionsnamen, z. B. ◀ vor ∫
    if (name.includes(CUR)) {
      const inner = render(new math.FunctionNode(new math.SymbolNode(name.replace(CUR, "")), a));
      return name.endsWith(CUR) ? span("nm", inner, span("caret", "")) : span("nm", span("caret", ""), inner);
    }
    const r = (k) => render(strip(a[k]));
    if (name === "sqrt") return root(r(0));
    if (name === "nthRoot" || name === "root") return root(r(0), a[1] ? r(1) : null);
    if (name === "cbrt") return root(r(0), "3");
    if (name === "abs") return span("nm", "|", r(0), "|");
    if (name === "exp") return span("npw", "e", sup(r(0)));
    if (name === "log" && a.length === 2) return span("nm", "log", sub(r(1)), paren(r(0)));
    const k = (occ[name] = (occ[name] ?? -1) + 1); // Reihenfolge = Reihenfolge im Text
    if (name === "logab") return span("nm", "log", fld(sub(r(0)), name, k, 0), fld(paren(a[1] ? r(1) : ""), name, k, 1));
    if (name === "integral") return span("nint", span("nis", "∫"), span("nil", fld(span("nih", a[2] ? r(2) : ""), name, k, 2), fld(span("nil2", a[1] ? r(1) : ""), name, k, 1)), fld(span("nm", r(0)), name, k, 0), span("nop", "dx"));
    if (name === "ddx") return span("nm", frac("d", "dx"), fld(paren(r(0)), name, k, 0), span("nbar", sub(fld(span("nm", "x=", a[1] ? r(1) : ""), name, k, 1))));
    if (name === "sigma") return span("nint", span("nsig", fld(span("nih", a[2] ? r(2) : ""), name, k, 2), span("nsigs", "Σ"), fld(span("nil2", span("nm", "x=", a[1] ? r(1) : "")), name, k, 1)), fld(paren(r(0)), name, k, 0));
    if (name === "nCr" || name === "nPr" || name === "divR") { const k = (i) => (a[i] ? (a[i].isOperatorNode ? paren(render(a[i])) : render(a[i])) : ""); // (2+3) C 2 mit Klammer
      return span("nm", k(0), name === "divR" ? span("nop", "÷R") : span("ncr", name[1]), k(1)); }
    if (name === "mixed") return span("nm", r(0), frac(r(1), r(2)));
    if (name === "product") return span("nint", span("nsig", fld(span("nih", a[2] ? r(2) : ""), name, k, 2), span("nsigs", "Π"), fld(span("nil2", span("nm", "x=", a[1] ? r(1) : "")), name, k, 1)), fld(paren(r(0)), name, k, 0));
    if (name === "random") return span("nm", span("nc", "Ran#"), ...(a.some((x) => x.toString().includes(CUR)) ? [span("caret", "")] : []));
    return span("nm", span("nfn", FN[name] ?? name), paren(span("nm", ...a.flatMap((x, i) => (i ? [", ", render(strip(x))] : [render(strip(x))])))));
  }
  if (n.isAssignmentNode) return span("nm", render(n.value), span("nop", "→"), n.object?.name ?? "");
  return span("nc", n.toString());
}

// Vorschau der Eingabe mit Cursor (fehlende Klammern ergänzen, leere Felder als Kästchen).
export function previewNode(text, cursor) {
  let t = M.normalize(text.slice(0, cursor)) + CUR + M.normalize(text.slice(cursor));
  const open0 = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
  if (open0 > 0) t += ")".repeat(open0); // fehlende Klammern zuerst ergänzen, dann leere Felder erkennen
  // leere Felder einer Vorlage als Kästchen □
  t = t.replace(/\(\)/g, `(${BOX})`).replace(/\(,/g, `(${BOX},`).replace(/,\)/g, `,${BOX})`).replace(/,,/g, `,${BOX},`).replace(/,,/g, `,${BOX},`);
  // fehlende Operanden wie beim Schulrechner als □ zeigen: „^2“ am Anfang → □², „2+“ → 2+□
  t = t.replace(/(^|[(,+\-*/^])(\s*)(?=[\^*/!])/g, `$1$2${BOX}`);
  t = t.replace(/([+\-*/^])(\s*)(?=$|[),])/g, `$1$2${BOX}`);
  const open = (t.match(/\(/g) || []).length - (t.match(/\)/g) || []).length;
  if (open > 0) t += ")".repeat(open);
  return math.parse(t);
}
export function natural(text, cursor = null) {
  occ = {};
  if (text.includes("∠")) { // Polarform im Display unverändert zeigen
    const t = cursor === null ? text : text.slice(0, cursor) + "\u0000" + text.slice(cursor);
    return span("nm", ...t.split("\u0000").flatMap((part, i) => (i ? [span("caret", ""), part] : [part])));
  }
  try { return render(cursor === null ? math.parse(M.normalize(text)) : previewNode(text, cursor)); }
  catch {
    if (cursor === null) return span("nc", text);
    return span("nm", text.slice(0, cursor), span("caret", ""), text.slice(cursor));
  }
}
// ---------- Felder von Vorlagen (für ▲▼ und Antippen) ----------
// Innerste Klammer bzw. Funktion um die Position: Name, Argumentgrenzen, Argument der Schreibmarke
export function enclosingCall(text, cur) {
  let d = 0;
  for (let i = cur - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ")") d++;
    else if (ch === "(" && d-- === 0) {
      let s = i; while (s > 0 && /[A-Za-z_]/.test(text[s - 1])) s--;
      const args = []; let st = i + 1, dd = 0;
      for (let j = i + 1; ; j++) {
        const c = text[j];
        if (j >= text.length || (c === ")" && dd === 0)) { args.push({ start: st, end: j }); break; }
        if (c === "(") dd++; else if (c === ")") dd--; else if (c === "," && dd === 0) { args.push({ start: st, end: j }); st = j + 1; }
      }
      return { name: text.slice(s, i), nameStart: s, open: i, close: args.at(-1).end, args, argIdx: args.findIndex((a) => cur >= a.start && cur <= a.end) };
    }
  }
  return null;
}
// ▲ (dir = −1) / ▼ (dir = +1): obere/untere Grenze von ∫, Σ, Π; Zähler/Nenner eines Bruchs; Zähler/Nenner einer gemischten Zahl
export function fieldTarget(text, cur, dir) {
  for (let c = enclosingCall(text, cur); c; c = c.nameStart > 0 ? enclosingCall(text, c.nameStart) : null) {
    const to = (k) => (c.args[k] && k !== c.argIdx ? c.args[k].end : null);
    if (["integral", "sigma", "product"].includes(c.name)) { const t = to(dir < 0 ? 2 : 1); if (t !== null) return t; }
    if (c.name === "mixed") { const t = to(dir < 0 ? 1 : 2); if (t !== null) return t; }
    if (c.name === "") {
      if (dir > 0 && text.startsWith(")/(", c.close)) { const den = enclosingCall(text, c.close + 3); if (den) return den.close; }
      if (dir < 0 && text.slice(c.open - 2, c.open) === ")/") { const num = enclosingCall(text, c.open - 2); if (num) return num.close; }
    }
  }
  return null;
}
// Antippen: n-te Vorlage „name(“ im Text, Argument arg → Position am Ende dieses Feldes
export function fieldPos(text, name, n, arg) {
  const re = new RegExp(`(^|[^A-Za-z_])${name}\\(`, "g"); let m, k = -1;
  while ((m = re.exec(text))) if (++k === Number(n)) { const c = enclosingCall(text, m.index + m[0].length); return c?.args[arg]?.end ?? null; }
  return null;
}
// Ergebnisdarstellung (exakte Form → natürliche Darstellung)
function exactNode(str) {
  if (/^[−-]/.test(str) && !/[+−-]/.test(str.slice(1).trim())) return span("nm", "−", exactNode(str.slice(1).trim())); // −½ statt (−1)/2
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
const mi = (s) => String(s).replace(/-/g, "−"); // echtes Minuszeichen in der Anzeige
const numNode = (f) => (f.exp !== undefined ? span("nm", mi(f.mant), span("nop", "×"), span("npw", "10", sup(mi(f.exp)))) : span("nc", mi(f.text)));
function dms(v) {
  const s = v < 0 ? "−" : "", a = Math.abs(v), d = Math.floor(a), mm = Math.floor((a - d) * 60), ss = ((a - d) * 60 - mm) * 60;
  return `${s}${d}°${mm}′${+ss.toFixed(2)}″`;
}

// ================= Ansicht =================
// menuItems: [[schlüssel, bezeichnung, ansicht()], …] – werden über MENU im Display geöffnet.
export function schoolCalc(menuItems = []) {
  const cfg = Object.assign({ deg: true, exact: true, fmt: "norm", digits: 4 }, JSON.parse(localStorage.getItem(SKEY) || "{}"));
  const vars = Object.assign({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0, M: 0 }, JSON.parse(localStorage.getItem(VKEY) || "{}"));
  let hist = JSON.parse(localStorage.getItem(HKEY) || "[]");
  const save = () => { localStorage.setItem(SKEY, JSON.stringify(cfg)); localStorage.setItem(VKEY, JSON.stringify(vars)); localStorage.setItem(HKEY, JSON.stringify(hist.slice(-40))); };

  let text = "", cur = 0, shift = false, alpha = false, sto = false, rcl = false, res = null, showExact = cfg.exact, engOn = false, engShift = 0, showDms = false, showMixed = false, hIdx = null, done = false;

  const status = h("div", { class: "lcd-status" }), inLine = h("div", { class: "lcd-in" }), outLine = h("div", { class: "lcd-out" });
  const lcd = h("div", { class: "lcd" }, status, inLine, outLine);
  // Feld im Display antippen (z. B. obere/untere Integralgrenze) → Schreibmarke dorthin; sonst ans Ende
  inLine.addEventListener("click", (e) => {
    if (mode !== "comp" || !text) return;
    const f = e.target.closest("[data-fn]");
    const pos = f ? fieldPos(text, f.dataset.fn, f.dataset.occ, Number(f.dataset.arg)) : null;
    if (done) { done = false; res = null; }
    cur = pos ?? text.length; hIdx = null; paint();
  });

  function paint() {
    status.replaceChildren(...[shift && "S", alpha && "A", sto && "STO", rcl && "RCL", vars.M ? "M" : "", cm.cmplx && "CMPLX", cm.base !== 10 && BASE_NAME[cm.base], cfg.deg ? "D" : "R",
      cfg.fmt === "fix" ? `FIX${cfg.digits}` : cfg.fmt === "sci" ? `SCI${cfg.digits}` : "", cfg.exact ? "Math" : "Linear"].filter(Boolean).map((t) => span("st", t)));
    inLine.replaceChildren(text || !done ? natural(text, done ? null : cur) : span("nc", ""));
    if (!res) { outLine.replaceChildren(); return; }
    if (res.error) { outLine.replaceChildren(span("lcd-err", res.error)); return; }
    let node;
    const arr = res.value?.toArray ? res.value.toArray() : Array.isArray(res.value) ? res.value : null;
    if (res.node) node = res.node;
    else if (res.special) node = span("nc fx-special", res.special);
    else if (cm.cmplx && res.isComplex) { const f = M.complexForms(res.value, cfg.deg); node = span("nc", showExact ? f.cart : f.polar); }
    else if (arr && arr.length === 2 && /^\s*(Pol|Rec|divR)\(/.test(text)) {
      const [p, q] = arr.map(Number), f = (v) => M.num(v, 10), kind = text.trim().slice(0, 3);
      node = span("nc fx-special", kind === "Pol" ? `r = ${f(p)},  θ = ${f(q)}` : kind === "Rec" ? `x = ${f(p)},  y = ${f(q)}` : `Q = ${f(p)},  R = ${f(q)}`);
    }
    else if (showMixed && res.mixed) node = exactNode(res.mixed);
    else if (showDms && typeof res.value === "number") node = span("nc", dms(res.value));
    else if (engOn && typeof res.value === "number") node = numNode(formatNumber(res.value, cfg, engShift, true));
    else if (showExact && res.exact && cfg.fmt === "norm") node = exactNode(res.exact);
    else node = typeof res.value === "number" ? numNode(formatNumber(res.value, cfg)) : span("nc", mi(res.decimal));
    outLine.replaceChildren(node);
  }

  // ---------- Eingabe-Hilfen ----------
  const ident = /[A-Za-z_]/;
  // nCr, nPr und ÷R stehen wie beim Schulrechner zwischen zwei Zahlen: „5 nCr 2“
  const INFIX = new Set(["nCr(,)", "nPr(,)", "divR(,)"]);
  function operandStart(s, end) {
    let i = end;
    if (s[i - 1] === ")") { let d = 0; for (i = end - 1; i >= 0; i--) { if (s[i] === ")") d++; else if (s[i] === "(" && --d === 0) break; } if (i < 0) return null; while (i > 0 && ident.test(s[i - 1])) i--; return i; }
    if (/[\d.]/.test(s[i - 1] ?? "")) { while (i > 0 && /[\d.]/.test(s[i - 1])) i--; return i; }
    if (/[A-Za-zπ!²³]/.test(s[i - 1] ?? "")) { while (i > 0 && /[A-Za-zπ]/.test(s[i - 1])) i--; return i; }
    return null;
  }
  function insert(t) {
    if (mode !== "comp") return fieldOp("insert", t);
    if (INFIX.has(t)) {
      if (done) { text = "Ans"; cur = 3; done = false; res = null; }
      const st = operandStart(text, cur);
      if (st !== null) { const name = t.slice(0, t.indexOf("(")); text = `${text.slice(0, st)}${name}(${text.slice(st, cur)},)${text.slice(cur)}`; cur = st + name.length + 1 + (cur - st) + 1; hIdx = null; return paint(); }
    }
    if (done) { // nach einem Ergebnis: Operator setzt mit Ans fort, sonst neue Eingabe
      // Rechenzeichen setzen mit Ans fort; das Vorzeichen (−) und alles andere beginnt neu
      if (/^[+−×÷*/^!]/.test(t)) { text = "Ans"; cur = 3; } else { text = ""; cur = 0; }
      done = false; res = null; engOn = false; showDms = false;
    }
    // Variable/Funktion direkt nach einem Buchstaben: Leerzeichen = implizites Mal (A x statt Name „Ax“)
    if (cm.base === 10 && /^[A-Za-zπ]/.test(t) && /[A-Za-z]/.test(text[cur - 1] ?? "")) t = " " + t;
    // Komma bzw. „)“ einer Vorlage nicht doppeln: steht es schon an der Schreibmarke, nur darüber springen
    if ((t === "," || t === ")") && text[cur] === t) { cur++; hIdx = null; return paint(); }
    text = text.slice(0, cur) + t + text.slice(cur);
    // Schreibmarke ins erste leere Feld einer Vorlage, sonst ans Ende des Eingefügten
    const slot = t === "random()" ? -1 : t.search(/\(\)|\(,|,,|,\)/); // Ran# hat kein Eingabefeld
    cur += slot >= 0 ? slot + 1 : t.length;
    hIdx = null; paint();
  }
  // Cursor springt wie beim Schulrechner zwischen Feldern: Zähler ↔ Nenner, Argumente von ∫/Σ/log, Exponent.
  function left() {
    if (mode !== "comp") return fieldOp("left");
    if (done) { done = false; cur = text.length; return paint(); }
    if (cur === 0) return paint();
    if (text.slice(cur - 3, cur) === ")/(") cur -= 3;
    else if (text[cur - 1] === ",") cur -= 1;
    else { cur--; while (cur > 0 && ident.test(text[cur - 1]) && (ident.test(text[cur]) || text[cur] === "(")) cur--; }
    paint();
  }
  function right() {
    if (mode !== "comp") return fieldOp("right");
    if (done) { done = false; cur = 0; return paint(); }
    if (cur >= text.length) return paint();
    if (text.startsWith(")/(", cur)) cur += 3;
    else if (text[cur] === ",") cur += 1;
    else { cur++; while (cur < text.length && ident.test(text[cur - 1]) && ident.test(text[cur])) cur++; if (text[cur] === "(" && ident.test(text[cur - 1])) cur++; }
    paint();
  }
  function del() {
    if (mode !== "comp") return fieldOp("del");
    if (done) { done = false; cur = text.length; }
    if (cur === 0) return paint();
    if (text.slice(cur - 3, cur) === ")/(") { cur -= 3; return paint(); } // im Nenner vorne: zurück in den Zähler
    let s = cur - 1;
    if (text[s] === "(") {
      while (s > 0 && ident.test(text[s - 1])) s--; // ganzen Funktionsnamen löschen …
      // … und die zugehörige schließende Klammer; Inhalt des ersten Feldes bleibt stehen (wie beim Schulrechner)
      let d = 0, close = -1, comma = -1;
      for (let i = cur - 1; i < text.length; i++) { if (text[i] === "(") d++; else if (text[i] === ")") { if (--d === 0) { close = i; break; } } else if (text[i] === "," && d === 1 && comma < 0) comma = i; }
      if (close >= 0) {
        let keep = text.slice(cur, comma >= 0 ? comma : close), rest = text.slice(close + 1);
        if (s === cur - 1 && rest.startsWith("/(")) { // Bruch: Zähler und Nenner als a/b behalten
          let d2 = 0, c2 = -1; for (let i = close + 2; i < rest.length + close + 1; i++) { const ch = text[i]; if (ch === "(") d2++; else if (ch === ")" && --d2 === 0) { c2 = i; break; } }
          if (c2 >= 0) { const den = text.slice(close + 3, c2); keep = den ? `${keep}/${den}` : keep; rest = text.slice(c2 + 1); }
        }
        text = text.slice(0, s) + keep + rest; cur = s; hIdx = null; return paint();
      }
    } else if (ident.test(text[s])) while (s > 0 && ident.test(text[s - 1])) s--;
    text = text.slice(0, s) + text.slice(cur); cur = s; paint();
  }
  function ac() { if (mode !== "comp") return fieldOp("ac"); text = ""; cur = 0; res = null; done = false; engOn = false; showDms = false; hIdx = null; paint(); }
  function exe() {
    if (mode !== "comp") return fieldOp("next");
    if (!text.trim()) return;
    text = M.autoClose(text); // auch in der Anzeige ergänzen
    try {
      const r = cm.base !== 10 ? baseEval(text) : M.evaluate(text, { deg: cfg.deg, scope: vars }); // Zuweisungen (A = 5) landen direkt in vars
      res = r; showExact = cfg.exact; engOn = false; engShift = 0; showDms = false; showMixed = false;
      const arr = r.value?.toArray ? r.value.toArray() : Array.isArray(r.value) ? r.value : null;
      if (arr && arr.length === 2 && /^\s*(Pol|Rec)\(/.test(text)) { vars.X = Number(arr[0]); vars.Y = Number(arr[1]); vars.Ans = vars.X; save(); }
      hist.push(text); save();
    } catch (e) { res = { error: /Undefined symbol/.test(e.message) ? "Variablenfehler" : /Unexpected|Parenthesis|Value expected|end of expression/.test(e.message) ? "Syntax ERROR" : "Math ERROR" }; }
    done = true; hIdx = null; paint();
  }
  function histMove(d) {
    if (mode !== "comp") return fieldOp(d < 0 ? "up" : "down");
    if (!done && text) { const t = fieldTarget(text, cur, d); if (t !== null) { cur = t; hIdx = null; paint(); } return; } // in Vorlagen: Feld wechseln
    if (!hist.length) return;
    hIdx = hIdx === null ? (d < 0 ? hist.length - 1 : null) : hIdx + d;
    if (hIdx === null || hIdx < 0 || hIdx >= hist.length) { hIdx = hIdx < 0 ? 0 : null; if (hIdx === null) return; }
    text = hist[hIdx]; cur = text.length; done = false; res = null; paint();
  }
  // Variable antippen: je nach Zustand speichern, abrufen oder einfügen
  function variable(name) {
    if (mode !== "comp") { alpha = false; return fieldOp("insert", name); }
    if (cm.base === 16 && /^[A-F]$/.test(name)) { alpha = false; return insert(name); } // Hex-Ziffern
    if (sto) { exeIfNeeded(); vars[name] = vars.Ans ?? 0; sto = false; alpha = false; save(); res = { value: vars[name], decimal: M.num(Number(vars[name])), exact: null }; text = `Ans→${name}`; done = true; return paint(); }
    if (rcl) { rcl = false; alpha = false; try { res = M.evaluate(name, { scope: vars }); } catch { res = { error: "Variablenfehler" }; } text = name; done = true; return paint(); }
    alpha = false; insert(name);
  }

  // ---------- Tasten ----------
  // [Hauptbeschriftung, Hauptaktion, SHIFT-Beschriftung, SHIFT-Aktion, ALPHA-Variable, Klasse]
  // ---------- Modi im Display: MENU-Übersicht und Funktionen, bedient über das Tastenfeld ----------
  let mode = "comp";
  const cm = { cmplx: false, base: 10 };
  const scrHead = h("div", { class: "scr-head" }), scrBody = h("div", { class: "scr-body" });
  const screen = h("div", { class: "lcd lcd-screen", hidden: "" }, scrHead, scrBody);
  // Modi im Display (Gleichung, Matrix, Statistik …): eigene LCD-Bildschirme, bedient über das Tastenfeld
  const app = createLcdApp({ M, natural, exactNode, cfg, vars, save, onComp: (o) => showComp(o) });
  app.setMenuRenderer(() => showMenu());
  // Tasten im Modus-Bildschirm: Eingabe, Cursor, DEL, AC, =, OPTN an den Modus weiterreichen
  function fieldOp(op, t) {
    if (mode === "const") return constKey(op, t);
    if (mode === "menu") { if (op === "ac") showComp(); else if (op === "insert") { const i = menuIndex(t); if (i !== null) pickTile(i + 1); } return; }
    app.key({ insert: "ins", del: "del", ac: "ac", left: "left", right: "right", next: "exe", prev: "up", down: "down", optn: "optn" }[op] ?? op, t);
  }
  function showComp(o) {
    if (o) { const c = { cmplx: !!o.cmplx, base: o.base ?? 10 }; if (c.cmplx !== cm.cmplx || c.base !== cm.base) { text = ""; cur = 0; res = null; done = false; } Object.assign(cm, c); }
    mode = "comp"; screen.hidden = true; app.el.hidden = true; lcd.hidden = false; paint();
  }
  function showMenu() {
    mode = "menu"; lcd.hidden = true; app.el.hidden = true; screen.hidden = false;
    scrHead.replaceChildren(span("scr-title", "MENU – Modus wählen"));
    scrBody.replaceChildren(h("div", { class: "scr-grid" }, ...app.modes.map(([key, label], i) =>
      h("button", { class: "scr-tile", "data-nr": i + 1, onclick: () => openMode(i) }, h("span", { class: "scr-ico" }, svgIcon(key)), span("scr-lbl", label), span("scr-nr", menuLabel(i))))));
    scrBody.scrollTop = 0;
  }
  function openMode(i) {
    const key = app.modes[i][0];
    if (key === "calc" || key === "complex") return app.open(i);
    mode = "app"; screen.hidden = true; lcd.hidden = true; app.el.hidden = false; app.open(i);
  }
  // ---------- CONST: Konstanten im Display wählen (▲▼ oder zweistellige Nummer, = einfügen, AC zurück) ----------
  let constSel = 0, constPrev = "comp", constCode = "";
  const supTxt = (s) => String(s).replace(/[-0-9]/g, (c) => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(c)]);
  const sci = (v) => { const a = Math.abs(v); if (a >= 1e-3 && a < 1e6) return M.num(v, 10).replace(".", ","); const [m, e] = v.toExponential(9).split("e"); return `${String(+m).replace(".", ",")}×10${supTxt(Number(e))}`; };
  // „m^3 / (kg s^2)“ → „m³/(kg·s²)“
  const unitTxt = (u) => u.replace(/\^(?:\((-?\d+)\)|(-?\d+))/g, (_, a, b) => supTxt(a ?? b)).replace(/ \/ /g, "/").replace(/ /g, "·");
  function showConst() {
    constPrev = mode === "app" ? "app" : "comp"; mode = "const"; constCode = "";
    lcd.hidden = true; app.el.hidden = true; screen.hidden = false; renderConst();
  }
  function renderConst() {
    scrHead.replaceChildren(span("scr-title", `CONST${constCode ? " " + constCode + "_" : ""}`), span("scr-hint", "▲▼ / Nr. · = einfügen · AC zurück"));
    const list = h("div", { class: "const-list" }, ...M.CONSTANTS.map(([k, lbl, sym], i) => h("div", { class: "const-row" + (i === constSel ? " sel" : ""), onclick: () => { constSel = i; pickConst(); } },
      span("const-nr", String(i + 1).padStart(2, "0")), span("const-sym", sym), span("const-lbl", lbl.replace(/ \S+$/, (w) => (w.trim() === sym || w.trim().length <= 2 ? "" : w))),
      span("const-val", `${sci(M.constValue(k))} ${unitTxt(M.constUnit(k))}`))));
    scrBody.replaceChildren(list);
    const row = list.children[constSel]; if (row) { const top = row.offsetTop - list.offsetTop; if (top < scrBody.scrollTop) scrBody.scrollTop = top; else if (top + row.offsetHeight > scrBody.scrollTop + scrBody.clientHeight) scrBody.scrollTop = top + row.offsetHeight - scrBody.clientHeight; }
  }
  function leaveConst() { if (constPrev === "app") { mode = "app"; screen.hidden = true; app.el.hidden = false; } else showComp(); }
  function pickConst() { const k = `K_${M.CONSTANTS[constSel][0]}`; leaveConst(); if (mode === "app") app.key("ins", k); else insert(k); }
  function constKey(op, t) {
    const n = M.CONSTANTS.length;
    if (op === "up" || op === "down") { constSel = (constSel + (op === "up" ? -1 : 1) + n) % n; constCode = ""; return renderConst(); }
    if (op === "next") return pickConst();
    if (op === "ac") return leaveConst();
    if (op === "del") { constCode = constCode.slice(0, -1); return renderConst(); }
    if (op === "insert" && /^\d$/.test(t)) {
      constCode += t;
      if (constCode.length === 2) { const i = Number(constCode) - 1; constCode = ""; if (i >= 0 && i < n) { constSel = i; return pickConst(); } }
      return renderConst();
    }
  }
  function pickTile(k) { if (k <= app.modes.length) openMode(k - 1); }
  // Basis-N: Zahlen in der gewählten Basis eingeben, ganzzahlig rechnen
  const BASE_NAME = { 16: "HEX", 2: "BIN", 8: "OCT", 10: "DEC" };
  function baseEval(src) {
    const digits = { 2: /^[01]+$/, 8: /^[0-7]+$/, 16: /^[0-9A-F]+$/ }[cm.base];
    const conv = M.normalize(src).replace(/\bAns\b/g, `(${Math.trunc(Number(vars.Ans ?? 0))})`).replace(/\b[0-9A-F]+\b/g, (tok) => {
      if (!digits.test(tok)) throw new Error("Syntax");
      return `(${parseInt(tok, cm.base)})`;
    });
    const v = math.evaluate(conv); // Ergebnis wird ganzzahlig abgeschnitten
    const n = typeof v === "number" ? Math.trunc(v) : NaN;
    if (!Number.isSafeInteger(n)) throw new Error("Math");
    vars.Ans = n; save();
    const row = (b) => span("bn-row", span("bn-l", BASE_NAME[b]), span("bn-v", (n < 0 ? "−" : "") + Math.abs(n).toString(b).toUpperCase()));
    return { value: n, decimal: String(n), exact: null, node: h("span", { class: "bn" }, row(cm.base), ...[10, 16, 2, 8].filter((b) => b !== cm.base).map(row)) };
  }
  const COMP_ONLY = new Set(["S⇔D", "ENG", "STO", "M+", "°′″", "CALC"]);
  const I = (t) => () => insert(t);
  const toggleShift = () => { shift = !shift; alpha = false; paint(); };
  const toggleAlpha = () => { alpha = !alpha; shift = false; paint(); };
  const hasNum = () => done && res && !res.error && typeof res.value === "number";
  const toggle = (fn) => () => { if (hasNum() || (done && res && !res.error)) { fn(); paint(); } };

  // ---------- Zusatzfunktionen der Tasten ----------
  function fact() { // Primfaktorzerlegung des Ergebnisses
    if (!hasNum() || !Number.isSafeInteger(res.value) || res.value < 2) { res = { error: "Math ERROR" }; return paint(); }
    res = { ...res, special: M.factorize(res.value).map(([q, e]) => (e > 1 ? `${q}^${e}` : String(q))).join(" × ") }; paint();
  }
  function approx() { if (mode !== "comp") return fieldOp("next"); exe(); if (res && !res.error) { showExact = false; paint(); } }
  // CALC: Werte für die im Ausdruck vorkommenden Variablen abfragen, dann berechnen
  function calcPrompt(solve = false) {
    if (!text.trim()) return;
    const names = [...new Set((M.normalize(text).match(/\b[A-FXYMx]\b/g) || []))].filter((v) => !(solve && v === "x"));
    const inputs = names.map((v) => h("input", { type: "text", value: String(vars[v] ?? 0), "data-var": v, class: "calc-var" }));
    const run = () => {
      inputs.forEach((i) => { const val = M.parse(i.value); if (val !== null) vars[i.dataset.var] = val; }); save();
      ov.remove(); solve ? doSolve() : (done = false, exe());
    };
    const ov = h("div", { class: "modal" }, h("div", { class: "modal-box fx-menu" }, h("h2", {}, solve ? "SOLVE – Werte der übrigen Variablen" : "CALC – Werte eingeben"),
      ...(names.length ? names.map((v, k) => h("label", { class: "fx-var-row" }, h("span", {}, `${v} =`), inputs[k])) : [h("p", {}, "Keine Variablen im Ausdruck.")]),
      h("button", { class: "modal-btn", onclick: run }, solve ? "Lösen" : "Berechnen"), h("button", { class: "fx-menu-item fx-menu-close", onclick: () => ov.remove() }, "Abbrechen")));
    document.body.append(ov);
    if (!names.length) { ov.remove(); solve ? doSolve() : exe(); }
  }
  // SOLVE: Gleichung (oder Ausdruck = 0) numerisch nach x auflösen; nächstgelegene Lösung zum aktuellen x
  function doSolve() {
    text = M.autoClose(text);
    const eq = M.normalize(text).replace(/\bAns\b/g, `(${Number(vars.Ans ?? 0)})`);
    const sc = Object.fromEntries(Object.entries(vars).filter(([k]) => k !== "x"));
    let xs = [];
    try { xs = M.solveEquation(eq, -1000, 1000, { deg: cfg.deg, scope: sc }); if (!xs.length) xs = M.solveEquation(eq, -1e6, 1e6, { deg: cfg.deg, scope: sc }); }
    catch { res = { error: "Syntax ERROR" }; done = true; return paint(); }
    if (!xs.length) { res = { error: "Keine Lösung gefunden" }; done = true; return paint(); }
    const x0 = Number(vars.x ?? 0), x = xs.reduce((p, q) => (Math.abs(q - x0) < Math.abs(p - x0) ? q : p));
    vars.x = x; vars.Ans = x; save();
    res = { value: x, decimal: M.num(x), exact: M.evaluate(String(x)).exact, special: `x = ${M.num(x)}${xs.length > 1 ? `   (${xs.length} Lösungen in [−1000; 1000], Startwert x = ${M.num(x0)})` : ""}` };
    done = true; paint();
  }
  const openOptn = () => cm.cmplx ? overlay("OPTN – Komplex", [["i – imaginäre Einheit", I("i")], ["∠ – Polarform r∠φ (z. B. 5∠30)", I("∠")], ["Re – Realteil", I("re(")], ["Im – Imaginärteil", I("im(")],
    ["Abs – Betrag", I("abs(")], ["arg – Argument", I("arg(")], ["Konjugiert", I("conj(")]]) : overlay("OPTN", [["sinh", I("sinh(")], ["cosh", I("cosh(")], ["tanh", I("tanh(")], ["sinh⁻¹", I("asinh(")], ["cosh⁻¹", I("acosh(")], ["tanh⁻¹", I("atanh(")],
    ["Rnd – auf Anzeigegenauigkeit runden", () => insert(cfg.fmt === "fix" ? `RndFix(,${cfg.digits})` : "Rnd(")], ["Int – ganzzahliger Teil", I("Int(")], ["Intg – größte ganze Zahl ≤ x", I("Intg(")],
    ["∠ – Polarform r∠φ (z. B. 5∠30)", I("∠")], ["Abs – Betrag", I("abs(")], ["Re – Realteil", I("re(")], ["Im – Imaginärteil", I("im(")], ["arg – Argument", I("arg(")], ["Konjugiert", I("conj(")], ["Π – Produkt", I("product(,,)")]]);
  const openConst = () => showConst();
  const openConv = () => overlay("CONV – Einheit umrechnen (Wert vorher eingeben)", Object.entries(M.UNIT_GROUPS).flatMap(([g, us]) =>
    us.flatMap((u) => us.filter((v) => v !== u).map((v) => [`${g}: ${u} → ${v}`, I(` ${u} to ${v}`)]))).slice(0, 400));
  const openReset = () => overlay("RESET", [["Einstellungen zurücksetzen", () => { Object.assign(cfg, { deg: true, exact: true, fmt: "norm", digits: 4 }); showExact = true; save(); paint(); }],
    ["Variablen und Speicher löschen", () => { for (const k of "ABCDEFXYM") vars[k] = 0; save(); paint(); }], ["Alles zurücksetzen", () => { localStorage.removeItem(SKEY); localStorage.removeItem(VKEY); localStorage.removeItem(HKEY); location.reload(); }]]);

  // [Haupt, Aktion, SHIFT-Beschriftung, SHIFT-Aktion, ALPHA (Variable "A" oder [Beschriftung, Aktion]), Klasse]
  const KEYS = [
    ["SHIFT", toggleShift, "", null, null, "k-shift"], ["ALPHA", toggleAlpha, "", null, null, "k-alpha"],
    ["◀", left, "", null, null, "k-nav"], ["▶", right, "", null, null, "k-nav"], ["▲", () => histMove(-1), "", null, null, "k-nav"], ["▼", () => histMove(1), "", null, null, "k-nav"],

    ["OPTN", () => (mode === "comp" ? openOptn() : fieldOp("optn")), "", null, null, "k-sys"], ["CALC", () => calcPrompt(false), "SOLVE", () => calcPrompt(true), ["=", I("=")]],
    ["∫▢", I("integral(,,)"), "d/dx", I("ddx(,)"), null], ["x", I("x"), "Σ", I("sigma(,,)"), ["Π", I("product(,,)")]],
    ["MENU", () => openMenu(), "", null, null, "k-sys"], ["SETUP", () => openSetup(), "", null, null, "k-sys"],

    ["▢/▢", I("()/()"), "▢▢/▢", I("mixed(,,)"), ["÷R", I("divR(,)")]], ["√▢", I("sqrt()"), "³√▢", I("nthRoot(,3)"), null], ["x²", I("^2"), "x³", I("^3"), null],
    ["x^▢", I("^()"), "ⁿ√▢", I("nthRoot(,)"), null], ["log▢", I("logab(,)"), "10^▢", I("10^()"), null], ["ln", I("ln("), "e^▢", I("e^()"), null],

    ["(−)", I("-"), "log", I("log10("), "A"], ["°′″", toggle(() => { showDms = !showDms; }), "FACT", () => fact(), "B"], ["x⁻¹", I("^(-1)"), "x!", I("!"), "C"],
    ["sin", I("sin("), "sin⁻¹", I("asin("), "D"], ["cos", I("cos("), "cos⁻¹", I("acos("), "E"], ["tan", I("tan("), "tan⁻¹", I("atan("), "F"],

    ["STO", () => { sto = true; alpha = true; paint(); }, "RECALL", () => { rcl = true; alpha = true; paint(); }, null],
    ["ENG", () => (cm.cmplx ? insert("i") : toggle(() => { if (engOn) engShift++; else { engOn = true; engShift = 0; } })()), "←ENG", toggle(() => { if (engOn) engShift--; else { engOn = true; engShift = 0; } }), ["i", I("i")]],
    ["(", I("("), "Abs", I("abs("), null], [")", I(")"), ",", I(","), "X"],
    ["S⇔D", toggle(() => { showExact = !showExact; engOn = false; showDms = false; showMixed = false; }), "ab/c⇔d/c", toggle(() => { showMixed = !showMixed; }), "Y"],
    ["M+", () => { exeIfNeeded(); vars.M = Number(vars.M) + Number(vars.Ans ?? 0); save(); paint(); }, "M−", () => { exeIfNeeded(); vars.M = Number(vars.M) - Number(vars.Ans ?? 0); save(); paint(); }, "M"],
  ];

  function exeIfNeeded() { if (!done && text.trim()) exe(); }
  // ---------- Auswahlfenster: SETUP u. a. ----------
  function overlay(title, items) {
    const close = () => ov.remove();
    const ov = h("div", { class: "modal", onclick: (e) => { if (e.target === ov) close(); } },
      h("div", { class: "modal-box fx-menu" }, h("h2", {}, title), ...items.map(([label, act]) => h("button", { class: "fx-menu-item", onclick: () => { close(); act(); } }, label)),
        h("button", { class: "fx-menu-item fx-menu-close", onclick: close }, "Schließen")));
    document.body.append(ov);
  }
  const openMenu = () => showMenu();
  const set = (c) => () => { Object.assign(cfg, c); showExact = cfg.exact; save(); paint(); };
  const openSetup = () => overlay("SETUP", [
    [`Winkel: Grad (Deg)${cfg.deg ? " ✓" : ""}`, set({ deg: true })], [`Winkel: Bogenmaß (Rad)${!cfg.deg ? " ✓" : ""}`, set({ deg: false })],
    [`Ausgabe: exakt (Bruch/Wurzel/π)${cfg.exact ? " ✓" : ""}`, set({ exact: true })], [`Ausgabe: dezimal${!cfg.exact ? " ✓" : ""}`, set({ exact: false })],
    [`Zahlenformat: Norm${cfg.fmt === "norm" ? " ✓" : ""}`, set({ fmt: "norm" })],
    ...[0, 1, 2, 3, 4, 6, 9].map((d) => [`Fix ${d} Nachkommastellen${cfg.fmt === "fix" && cfg.digits === d ? " ✓" : ""}`, set({ fmt: "fix", digits: d })]),
    ...[3, 5, 10].map((d) => [`Sci ${d} signifikante Stellen${cfg.fmt === "sci" && cfg.digits === d ? " ✓" : ""}`, set({ fmt: "sci", digits: d })]),
    ["Variablen A–F, X, Y, M auf 0 setzen", () => { for (const k of "ABCDEFXYM") vars[k] = 0; save(); paint(); }],
    ["Verlauf löschen", () => { hist = []; save(); }],
  ]);
  // [Haupt, Aktion, Klasse, SHIFT-Beschriftung, SHIFT-Aktion, ALPHA [Beschriftung, Aktion]]
  const NUM = [
    ["7", I("7"), "", "CONST", openConst], ["8", I("8"), "", "CONV", openConv], ["9", I("9"), "", "RESET", openReset], ["DEL", del, "k-del"], ["AC", ac, "k-del"],
    ["4", I("4")], ["5", I("5")], ["6", I("6")], ["×", I("×"), "k-op", "nPr", I("nPr(,)"), ["GCD", I("GCD(,)")]], ["÷", I("÷"), "k-op", "nCr", I("nCr(,)"), ["LCM", I("LCM(,)")]],
    ["1", I("1")], ["2", I("2")], ["3", I("3")], ["+", I("+"), "k-op", "Pol", I("Pol(,)"), ["Int", I("Int(")]], ["−", I("−"), "k-op", "Rec", I("Rec(,)"), ["Intg", I("Intg(")]],
    ["0", I("0"), "", "Rnd", () => insert(cfg.fmt === "fix" ? `RndFix(,${cfg.digits})` : "Rnd("), null], [".", I("."), "", "Ran#", I("random()"), ["RanInt", I("RanInt(,)")]],
    ["×10^x", I("e"), "k-op", "π", I("π"), ["e", I("e")]], ["Ans", I("Ans"), "k-op", "%", I("/100")], ["=", exe, "k-exe", "≈", approx],
  ];
  const press = (fn, sfn) => (e) => { e.preventDefault(); if (shift && sfn) { shift = false; sfn(); } else { const wasShift = shift; shift = false; fn(); if (wasShift) paint(); } };
  const alphaLabel = (av) => (av ? span("lbl-a", Array.isArray(av) ? av[0] : av) : null);
  const onAlpha = (av) => { if (Array.isArray(av)) { alpha = false; av[1](); paint(); } else variable(av); };
  const fnKeys = KEYS.map(([lab, fn, slab, sfn, avar, cls = ""]) => h("div", { class: `fxk ${cls}` },
    h("div", { class: "fxk-lbl" }, span("lbl-s", slab || ""), alphaLabel(avar)),
    h("button", { class: "fxb", onclick: (e) => { e.preventDefault(); if (alpha && avar) return onAlpha(avar); if (mode !== "comp" && COMP_ONLY.has(lab) && !shift) return; press(fn, sfn)(e); } },
      lab === "∫▢" ? [span("int-glyph", "∫"), "▢"] : lab)));
  const numKeys = NUM.map(([lab, fn, cls = "", slab, sfn, avar]) => h("div", { class: `fxk ${cls}` },
    h("div", { class: "fxk-lbl" }, span("lbl-s", slab ?? ""), alphaLabel(avar)),
    h("button", { class: "fxb fxb-num", onclick: (e) => { e.preventDefault(); if (mode === "menu" && /^[1-9]$/.test(lab)) return pickTile(Number(lab)); if (alpha && avar) return onAlpha(avar); press(fn, sfn)(e); } }, lab)));

  // Physische Tastatur (Computer)
  const onKey = (e) => {
    if (!document.body.contains(lcd)) return document.removeEventListener("keydown", onKey);
    if (e.metaKey || e.ctrlKey) return;
    const k = e.key;
    if (mode !== "comp") { // Modus-Bildschirm: Tastatur wie Rechner-Tastenfeld
      const map = { Enter: "next", "=": "next", Backspace: "del", Escape: "ac", ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      if (map[k]) { e.preventDefault(); return fieldOp(map[k]); }
      if (k.length === 1 && /[0-9a-zA-Z+\-*/^().,!%]/.test(k)) { e.preventDefault(); if (mode === "menu") { const i = menuIndex(k); if (i !== null) pickTile(i + 1); return; } fieldOp("insert", k === "*" ? "×" : k === "/" ? "÷" : k === "-" ? "−" : k); }
      return;
    }
    if (k === "Enter" || k === "=") { e.preventDefault(); exe(); } else if (k === "Backspace") { e.preventDefault(); del(); } else if (k === "Escape") ac();
    else if (k === "ArrowLeft") left(); else if (k === "ArrowRight") right(); else if (k === "ArrowUp") histMove(-1); else if (k === "ArrowDown") histMove(1);
    else if (k.length === 1 && /[0-9a-zA-Z+\-*/^().,!%]/.test(k)) { e.preventDefault(); insert(k === "*" ? "×" : k === "/" ? "÷" : k === "-" ? "−" : k); }
  };
  document.addEventListener("keydown", onKey);
  setTimeout(paint, 0);
  const fxEl = h("div", { class: "fx" },
    h("div", { class: "fx-top" }, span("fx-brand", "R. U. Sirius?"), span("fx-model", "MatheRechner")),
    lcd, screen, app.el,
    h("div", { class: "fx-fn" }, ...fnKeys),
    h("div", { class: "fx-num" }, ...numKeys));
  // Gehäuse an die verfügbare Bildschirmhöhe anpassen – kein Scrollen nötig. Tasten und Schrift skalieren per CSS mit.
  const fit = () => {
    if (!fxEl.isConnected) { window.removeEventListener("resize", fit); window.visualViewport?.removeEventListener("resize", fit); return; }
    const top = fxEl.getBoundingClientRect().top + window.scrollY;
    const avail = (window.visualViewport?.height ?? window.innerHeight) - top - 6;
    fxEl.style.height = `${Math.max(430, Math.min(avail, 900))}px`;
    fxEl.style.setProperty("--fxh", `${Math.max(430, Math.min(avail, 900))}px`);
  };
  requestAnimationFrame(() => requestAnimationFrame(fit));
  window.addEventListener("resize", fit); window.visualViewport?.addEventListener("resize", fit);
  return fxEl;
}
