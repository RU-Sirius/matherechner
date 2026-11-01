// Rechner-Modi im Display (wie bei einem Schulrechner): nummerierte Menüs, Koeffizienten-/Datentabellen,
// Bearbeitungszeile unten, = rechnet, AC zurück. Bedienung ausschließlich über das Rechner-Tastenfeld.
import { h } from "./ui.js";

export function createLcdApp({ M, natural, exactNode, cfg, vars, save, onComp }) {
  const math = M.math;
  const span = (cls, ...k) => h("span", { class: cls }, ...k);
  const body = h("div", { class: "la-body" }), editLine = h("div", { class: "la-edit" }), msgLine = h("div", { class: "la-msg" });
  const head = h("div", { class: "la-head" });
  const el = h("div", { class: "lcd lcd-app", hidden: "" }, head, body, msgLine, editLine);
  let stack = [], edit = null, msg = "";
  const store = JSON.parse(localStorage.getItem("mx:lcd") || "{}");
  const persist = () => localStorage.setItem("mx:lcd", JSON.stringify(store));
  const top = () => stack[stack.length - 1];

  // ---------- Werte ----------
  const ev = (src) => M.evaluate(String(src), { deg: cfg.deg, scope: { ...vars } }).value;
  const evNum = (src) => { const v = ev(src); const n = typeof v === "number" ? v : math.isComplex(v) && Math.abs(v.im) < 1e-12 ? v.re : NaN; if (!Number.isFinite(n)) throw new Error("Math ERROR"); return n; };
  const exactOf = (v) => { try { return M.evaluate(String(v)).exact; } catch { return null; } };
  // Negative Brüche mit Minus vor dem Bruchstrich (−¼ statt (−1)/4)
  const exNode = (str) => (/^[−-]\d+\/\d+$/.test(str) ? span("nm", "−", exactNode(str.slice(1))) : exactNode(str));
  function valNode(v) {
    if (v === null || v === undefined || v === "") return span("la-dim", "0");
    if (typeof v === "string") { try { return natural(v); } catch { return span("nc", v); } }
    if (typeof v === "number") { const ex = Number.isFinite(v) ? exactOf(v) : null; return ex ? exNode(ex) : span("nc", M.num(v, 10)); }
    if (math.isFraction(v)) return exNode(M.fracStr(v));
    if (math.isComplex(v)) return span("nc", M.num(v, 10));
    return span("nc", String(v));
  }

  // ---------- Darstellung ----------
  function render() {
    const s = top();
    if (!s) return;
    head.replaceChildren(span("la-title", s.title ?? ""), s.hint ? span("la-hint", s.hint) : "");
    msgLine.textContent = msg; msgLine.hidden = !msg;
    editLine.hidden = !edit;
    if (edit) editLine.replaceChildren(natural(edit.text, edit.cur));
    if (s.type === "menu") {
      body.replaceChildren(...s.items.map(([label], i) => h("div", { class: "la-row" + (i === s.sel ? " sel" : ""), onclick: () => { s.sel = i; pick(); } },
        span("la-nr", `${i + 1}:`), span("la-lbl", label))));
    } else if (s.type === "form") {
      body.replaceChildren(...(s.intro ? [h("div", { class: "la-intro" }, typeof s.intro === "function" ? s.intro() : s.intro)] : []),
        ...s.cells.map((c, i) => h("div", { class: "la-row" + (i === s.sel ? " sel" : ""), onclick: () => { commitIfEditing(); s.sel = i; render(); } },
          span("la-lbl", c.label), span("la-val", valNode(c.get())))));
    } else if (s.type === "grid") {
      const rows = s.rows(), cols = s.headers.length;
      body.replaceChildren(h("table", { class: "la-grid" },
        h("tr", {}, h("th", {}, ""), ...s.headers.map((t) => h("th", {}, t))),
        ...Array.from({ length: rows }, (_, r) => h("tr", {}, h("th", {}, s.rowLabel ? s.rowLabel(r) : String(r + 1)),
          ...Array.from({ length: cols }, (_, c) => h("td", { class: r === s.sel[0] && c === s.sel[1] ? "sel" : "", onclick: () => { commitIfEditing(); s.sel = [r, c]; render(); } }, valNode(s.get(r, c))))))));
    } else if (s.type === "result") {
      body.replaceChildren(...s.lines.map(([l, v], i) => h("div", { class: "la-row" + (i === s.sel ? " sel-soft" : "") }, span("la-lbl", l), span("la-val", v instanceof Node ? v : valNode(v)))));
    } else if (s.type === "calc") {
      const o = s.out;
      body.replaceChildren(h("div", { class: "la-calc-out" }, o === null || o === undefined ? span("la-dim", "MatA … über ALPHA A–D oder OPTN") : Array.isArray(o) ? matNode(o) : valNode(o)));
    } else if (s.type === "graph") {
      body.replaceChildren(s.canvas); drawGraph(s);
    }
    const sel = body.querySelector(".sel, .sel-soft");
    if (sel) { // nur im Display scrollen, nicht die Seite
      const row = sel.closest("tr") ?? sel, top0 = row.offsetTop - body.offsetTop, bot = top0 + row.offsetHeight;
      if (top0 < body.scrollTop + (s.type === "grid" ? 18 : 0)) body.scrollTop = Math.max(0, top0 - (s.type === "grid" ? 18 : 0));
      else if (bot > body.scrollTop + body.clientHeight) body.scrollTop = bot - body.clientHeight;
    } else body.scrollTop = 0;
  }

  // ---------- Navigation ----------
  const push = (s) => { stack.push(s); edit = null; msg = ""; render(); };
  const pop = () => { if (stack.length > 1) { stack.pop(); edit = top().ed ?? null; msg = ""; render(); } else showMenu(); };
  const menu = (title, items, extra = {}) => push({ type: "menu", title, items, sel: 0, ...extra });
  const result = (title, lines, extra = {}) => push({ type: "result", title, lines, sel: 0, hint: "▲▼  AC: zurück", ...extra });
  function pick() { const s = top(); const it = s.items[s.sel]; if (!it) return; try { it[1](); } catch (e) { msg = e.message?.startsWith("Math") ? e.message : "Math ERROR"; render(); } }
  function commitIfEditing() { if (edit) commit(); }
  function commit() {
    const s = top(); if (!edit || !s) return true;
    const text = edit.text.trim();
    try {
      const isText = s.type === "form" && s.cells[s.sel].text;
      if (text !== "" && isText) M.compileFn(M.autoClose(text), { deg: cfg.deg }); // Funktionsterm prüfen
      else if (text !== "") evNum(M.autoClose(text)); // Prüfen, ob es eine Zahl ergibt
      setCell(s, text === "" ? "" : M.autoClose(text)); edit = null; msg = ""; return true;
    } catch { msg = "Math ERROR – Eingabe prüfen"; render(); return false; }
  }
  function setCell(s, v) { if (s.type === "form") s.cells[s.sel].set(v); else if (s.type === "grid") s.set(s.sel[0], s.sel[1], v); }
  function moveSel(dr, dc = 0) {
    const s = top();
    if (s.type === "menu") s.sel = (s.sel + dr + s.items.length) % s.items.length;
    else if (s.type === "form") s.sel = Math.max(0, Math.min(s.cells.length - 1, s.sel + dr));
    else if (s.type === "result") s.sel = Math.max(0, Math.min(s.lines.length - 1, s.sel + dr));
    else if (s.type === "grid") {
      let [r, c] = s.sel; c += dc; r += dr;
      if (c >= s.headers.length) { c = 0; r++; } if (c < 0) { c = s.headers.length - 1; r--; }
      if (s.grow && r >= s.rows()) s.grow(r + 1);
      s.sel = [Math.max(0, Math.min(s.rows() - 1, r)), c];
    }
    render();
  }

  // Tastatur-Schnittstelle (wird von der Rechner-Ansicht aufgerufen)
  function key(name, t) {
    const s = top(); if (!s) return;
    if (s.type === "graph") return graphKey(s, name, t);
    if (s.type === "calc") {
      edit = s.ed;
      if (name === "ins" && /^[A-D]$/.test(t)) t = `Mat${t}`; // ALPHA A–D
      if (name === "ac") { if (s.ed.text || s.out !== null) { s.ed.text = ""; s.ed.cur = 0; s.out = null; msg = ""; return render(); } return pop(); }
      if (name === "exe") { try { msg = ""; s.solve(); } catch (e) { msg = e.message; render(); } return; }
      if (name === "up" || name === "down") return;
      if (name === "ins" && s.out !== null && !s.ed.text) s.out = null;
    }
    if (name === "ins") {
      if (s.type === "menu") { if (/^[1-9]$/.test(t) && Number(t) <= s.items.length) { s.sel = Number(t) - 1; pick(); } return; }
      if (s.type === "result" || s.readonly) return;
      if (!edit) edit = { text: "", cur: 0 };
      const slot = t.search(/\(\)|\(,|,,|,\)/);
      if ((t === "," || t === ")") && edit.text[edit.cur] === t) { edit.cur++; return render(); }
      if (/^[A-Za-zπ]/.test(t) && /[A-Za-z]/.test(edit.text[edit.cur - 1] ?? "")) t = " " + t; // MatA MatB statt „MatAMatB“
      edit.text = edit.text.slice(0, edit.cur) + t + edit.text.slice(edit.cur); edit.cur += slot >= 0 ? slot + 1 : t.length; msg = ""; return render();
    }
    if (name === "del") { if (edit && edit.cur > 0) { edit.text = edit.text.slice(0, edit.cur - 1) + edit.text.slice(edit.cur); edit.cur--; render(); } return; }
    if (name === "left" || name === "right") {
      if (edit) { edit.cur = Math.max(0, Math.min(edit.text.length, edit.cur + (name === "left" ? -1 : 1))); return render(); }
      if (s.type === "grid") return moveSel(0, name === "left" ? -1 : 1);
      return;
    }
    if (name === "up" || name === "down") { if (edit && !commit()) return; return moveSel(name === "up" ? -1 : 1); }
    if (name === "ac") { if (edit) { edit = null; msg = ""; return render(); } if (stack.length > 1) return pop(); return; }
    if (name === "exe") {
      if (s.type === "menu") return pick();
      if (s.type === "result") return pop();
      if (edit) { if (commit()) { if (s.type === "grid") moveSel(0, 1); else moveSel(1); } return; }
      try { msg = ""; s.solve?.(); } catch (e) { msg = e.message?.startsWith("Math") ? e.message : "Math ERROR"; render(); }
      return;
    }
    if (name === "optn") { s.optn?.(); return; }
  }

  // ================= Modi =================
  const MODES = [
    ["calc", "Berechnen", () => onComp({})],
    ["complex", "Komplex", () => onComp({ cmplx: true })],
    ["bases", "Basis-N", () => menu("Basis-N: Eingabe", [["Dezimal", () => onComp({ base: 10 })], ["Hexadezimal", () => onComp({ base: 16 })], ["Binär", () => onComp({ base: 2 })], ["Oktal", () => onComp({ base: 8 })]])],
    ["matrix", "Matrix", () => matrixMenu()],
    ["vectors", "Vektor", () => vectorMenu()],
    ["stats", "Statistik", () => statsMenu()],
    ["distrib", "Verteilung", () => distMenu()],
    ["table", "Tabelle", () => tableMode()],
    ["poly", "Gleichung", () => eqMenu()],
    ["graph", "Plotter", () => plotMode()],
    ["curve", "Kurvendiskussion", () => curveMode()],
  ];
  function showMenu() { stack = []; edit = null; msg = ""; menuGrid(); }
  let menuGrid = () => {};
  function open(i) { stack = []; edit = null; msg = ""; MODES[i][2](); }

  // ---------- Gleichung ----------
  function eqMenu() {
    menu("Gleichung", [["Gleichungssystem", () => menu("Anzahl Unbekannte?", [2, 3, 4].map((n) => [`${n} Unbekannte`, () => linsys(n)]))],
      ["Polynomgleichung", () => menu("Grad?", [2, 3, 4, 5, 6].map((n) => [`Grad ${n}`, () => poly(n)]))],
      ["Ungleichung", () => menu("Grad?", [1, 2, 3, 4].map((n) => [`Grad ${n}`, () => menu("Ungleichung", [">", "<", "≥", "≤"].map((op) => [`${polyText(n)} ${op} 0`, () => ineq(n, op)]))]))]]);
  }
  const letters = "abcdefg";
  const polyText = (n) => Array.from({ length: n + 1 }, (_, i) => { const p = n - i; return `${letters[i]}${p > 1 ? "x" + "⁰¹²³⁴⁵⁶"[p] : p === 1 ? "x" : ""}`; }).join("+");
  function linsys(n) {
    const key = `ls${n}`; store[key] ??= Array.from({ length: n }, () => Array(n + 1).fill(""));
    const D = store[key], vn = "xyzw".slice(0, n);
    push({ type: "grid", title: `Gleichungssystem ${n} Unbekannte`, hint: "= lösen", headers: [...vn, "="], sel: [0, 0],
      rows: () => n, get: (r, c) => D[r][c], set: (r, c, v) => { D[r][c] = v; persist(); },
      solve: () => {
        const A = D.map((row) => row.slice(0, n).map((v) => M.toFrac(v === "" ? 0 : evNum(v)))), b = D.map((row) => M.toFrac(row[n] === "" ? 0 : evNum(row[n])));
        const r = M.linearSystem(A, b);
        if (r.kind === "none") return result("Lösung", [["", span("nc", "Keine Lösung")]]);
        if (r.kind === "infinite") return result("Lösung", [["", span("nc", "Unendlich viele Lösungen")]]);
        result("Lösung", r.x.map((v, i) => [`${vn[i]} =`, v]));
      } });
  }
  function readCoeffs(D) { return D.map((v) => (v === "" ? 0 : evNum(v))); }
  function poly(n) {
    const key = `poly${n}`; store[key] ??= Array(n + 1).fill("");
    const D = store[key];
    push({ type: "form", title: `Polynom Grad ${n}`, intro: `${polyText(n)} = 0`, hint: "= lösen", sel: 0,
      cells: D.map((_, i) => ({ label: `${letters[i]} =`, get: () => D[i], set: (v) => { D[i] = v; persist(); } })),
      solve: () => {
        const cs = readCoeffs(D); if (!cs[0]) throw new Error("Math ERROR: a ≠ 0");
        const z = M.polyRoots(cs), lines = [];
        const ex = n === 2 ? M.quadraticExact(...cs) : null;
        z.forEach((zz, i) => {
          const exText = ex && ex.text.length === 2 ? ex.text[i] : ex && ex.text.length === 1 ? ex.text[0] : null;
          lines.push([`x${"₁₂₃₄₅₆"[i]} =`, exText && !exText.includes("i") ? exactNode(exText.replace(/ /g, "")) : zz.im === 0 ? zz.re : math.complex(zz.re, zz.im)]);
        });
        if (n === 2) { const xs = -cs[1] / (2 * cs[0]); lines.push([cs[0] > 0 ? "x-Wert Min =" : "x-Wert Max =", xs], [cs[0] > 0 ? "y-Wert Min =" : "y-Wert Max =", cs[2] - cs[1] ** 2 / (4 * cs[0])]); }
        result("Lösungen", lines);
      } });
  }
  function ineq(n, op) {
    const key = `ineq${n}`; store[key] ??= Array(n + 1).fill("");
    const D = store[key], opm = { ">": ">", "<": "<", "≥": ">=", "≤": "<=" }[op];
    push({ type: "form", title: `Ungleichung Grad ${n}`, intro: `${polyText(n)} ${op} 0`, hint: "= lösen", sel: 0,
      cells: D.map((_, i) => ({ label: `${letters[i]} =`, get: () => D[i], set: (v) => { D[i] = v; persist(); } })),
      solve: () => {
        const cs = readCoeffs(D); if (!cs[0]) throw new Error("Math ERROR: a ≠ 0");
        const r = M.polyInequality(cs, opm), f = (v) => (v === Infinity ? "∞" : v === -Infinity ? "−∞" : M.num(v, 8));
        const parts = r.intervals.map(([lo, hi]) => (lo === -Infinity ? `x ${r.closed ? "≤" : "<"} ${f(hi)}` : hi === Infinity ? `x ${r.closed ? "≥" : ">"} ${f(lo)}` : `${f(lo)} ${r.closed ? "≤" : "<"} x ${r.closed ? "≤" : "<"} ${f(hi)}`));
        if (r.intervals.length === 1 && r.intervals[0][0] === -Infinity && r.intervals[0][1] === Infinity) parts.splice(0, 1, "Alle reellen Zahlen");
        parts.push(...r.singles.map((x) => `x = ${f(x)}`));
        result("Lösung", (parts.length ? parts : ["Keine Lösung"]).map((p) => ["", span("nc", p)]));
      } });
  }

  // ---------- Matrix ----------
  function matStore(name) { store[`mat${name}`] ??= { r: 2, c: 2, d: [["", ""], ["", ""]] }; return store[`mat${name}`]; }
  const matVal = (m) => m.d.map((row) => row.map((v) => M.toFrac(v === "" ? 0 : evNum(v))));
  const MATS = "ABCD";
  function matrixMenu() {
    menu("Matrix", [...[...MATS].map((n) => [`Mat${n} bearbeiten (${matStore(n).r}×${matStore(n).c})`, () => matSize(n)]),
      ["Matrix-Rechnung (MatA×MatB …)", () => matCalc()], ["Rang & Eigenwerte", () => menu("Rang & Eigenwerte", [...MATS].map((n) => [`Mat${n}`, () => matEig(n)]))]]);
  }
  // Rechenbildschirm: Ausdrücke mit MatA–MatD wie beim Schulrechner (ALPHA A–D bzw. OPTN fügt MatA … ein)
  function matScope() {
    const sc = { Trn: (x) => math.transpose(x), Ident: (n) => math.identity(Number(n)).toArray(), Rang: (x) => M.rref(x.toArray ? x.toArray() : x).rank };
    for (const n of MATS) { const m = matStore(n); sc[`Mat${n}`] = matVal(m); }
    return sc;
  }
  function matCalc() {
    const s = { type: "calc", title: "Matrix-Rechnung", hint: "= rechnen  OPTN", ed: { text: "", cur: 0 }, out: null,
      optn: () => menu("OPTN – Matrix", [...[...MATS].map((n) => [`Mat${n}`, () => calcIns(`Mat${n}`)]), ["MatAns", () => calcIns("MatAns")], ["det(", () => calcIns("det(")],
        ["Trn( – transponiert", () => calcIns("Trn(")], ["Ident( – Einheitsmatrix", () => calcIns("Ident(")], ["Rang(", () => calcIns("Rang(")]]),
      solve: () => {
        const src = M.autoClose(M.normalize(s.ed.text)); if (!src.trim()) return;
        const sc = matScope(); if (store.matAns) sc.MatAns = store.matAns.map((r) => r.map((v) => M.toFrac(Number(v))));
        let v;
        try { v = math.evaluate(src, sc); } catch (e) { throw new Error(/dimension|size|Dimension/i.test(e.message) ? "Math ERROR: Größen passen nicht" : /singular|Inverse/i.test(e.message) ? "Math ERROR: det = 0" : /Undefined|Unexpected|Parenthesis|Value expected/.test(e.message) ? "Syntax ERROR" : "Math ERROR"); }
        if (v?.toArray) v = v.toArray();
        if (Array.isArray(v) && !Array.isArray(v[0])) v = v.map((x) => [x]);
        if (Array.isArray(v)) store.matAns = v.map((r) => r.map((x) => math.number(x))), persist();
        s.out = v; edit = s.ed; render();
      } };
    push(s); edit = s.ed; render();
  }
  function calcIns(t) { pop(); key("ins", t); }
  function matEig(n) {
    const m = matStore(n), a = matVal(m), inf = M.matInfo(a.map((r) => r.map((v) => math.number(v))));
    const ev = inf.eigenvalues ? (inf.eigenvalues.toArray ? inf.eigenvalues.toArray() : inf.eigenvalues) : null;
    result(`Mat${n}`, [["Rang =", inf.rank], ...(m.r === m.c ? [["det =", inf.det]] : []),
      ...(ev ? ev.map((v, i) => [`λ${"₁₂₃₄"[i]} =`, typeof v === "number" ? v : math.complex(v)]) : [["", span("nc", "Eigenwerte nur für quadratische Matrizen")]])]);
  }
  function matSize(name) {
    const d = stack.length; // nach dem Bearbeiten zurück ins Matrix-Menü
    menu(`Mat${name}: Zeilen?`, [1, 2, 3, 4].map((r) => [`${r} Zeile${r > 1 ? "n" : ""}`, () => menu(`Mat${name}: Spalten?`, [1, 2, 3, 4].map((c) => [`${c} Spalte${c > 1 ? "n" : ""}`, () => {
      const m = matStore(name);
      m.d = Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => m.d[i]?.[j] ?? "")); m.r = r; m.c = c; persist();
      stack.length = d - 1; matrixMenu(); top().sel = MATS.indexOf(name); matEdit(name); // Menü mit neuer Größe
    }]))]));
  }
  function matEdit(name) {
    const m = matStore(name);
    push({ type: "grid", title: `Mat${name} (${m.r}×${m.c})`, hint: "AC: fertig", headers: Array.from({ length: m.c }, (_, j) => String(j + 1)), sel: [0, 0],
      rows: () => m.r, get: (r, c) => m.d[r][c], set: (r, c, v) => { m.d[r][c] = v; persist(); }, solve: () => pop() });
  }
  function matNode(A) {
    return h("table", { class: "la-mat" }, ...A.map((row) => h("tr", {}, ...row.map((v) => h("td", {}, valNode(v))))));
  }
  // Fehler aus Menüaktionen anzeigen
  const safe = (fn) => () => { try { fn(); } catch (e) { msg = e.message?.startsWith("Math") ? e.message : "Math ERROR"; render(); } };

  // ---------- Vektor ----------
  function vecStore(name) { store[`vec${name}`] ??= { n: 3, d: ["", "", ""] }; return store[`vec${name}`]; }
  function vectorMenu() {
    menu("Vektor", [["VctA bearbeiten", () => vecDim("A")], ["VctB bearbeiten", () => vecDim("B")], ["|VctA|", safe(() => vecOp("abs"))], ["VctA • VctB (Skalarprodukt)", safe(() => vecOp("dot"))],
      ["VctA × VctB (Kreuzprodukt)", safe(() => vecOp("cross"))], ["Winkel(VctA, VctB)", safe(() => vecOp("angle"))], ["VctA + VctB", safe(() => vecOp("add"))], ["VctA − VctB", safe(() => vecOp("sub"))], ["Einheitsvektor VctA", safe(() => vecOp("unit"))]]);
  }
  function vecDim(name) { const d = stack.length; menu(`Vct${name}: Dimension?`, [2, 3].map((n) => [`${n} Komponenten`, () => { const v = vecStore(name); v.d = Array.from({ length: n }, (_, i) => v.d[i] ?? ""); v.n = n; persist(); stack.length = d; vecEdit(name); }])); }
  function vecEdit(name) {
    const v = vecStore(name);
    push({ type: "grid", title: `Vct${name}`, hint: "AC: fertig", headers: "xyz".slice(0, v.n).split(""), sel: [0, 0], rows: () => 1, get: (r, c) => v.d[c], set: (r, c, x) => { v.d[c] = x; persist(); }, solve: () => pop() });
  }
  function vecOp(op) {
    const a = vecStore("A"), b = vecStore("B"), u = a.d.map((x) => (x === "" ? 0 : evNum(x))), w = b.d.map((x) => (x === "" ? 0 : evNum(x)));
    const inf = M.vectorInfo(u, op === "abs" || op === "unit" ? null : w);
    if (op !== "abs" && op !== "unit" && a.n !== b.n) throw new Error("Math ERROR: Dimensionen verschieden");
    const vec = (x) => span("nc", `[${x.map((y) => M.num(y, 8)).join("  ")}]`);
    const out = { abs: [["|VctA| =", inf.normU]], unit: [["", inf.unitU ? vec(inf.unitU) : span("nc", "Math ERROR")]], dot: [["VctA • VctB =", inf.dot]],
      cross: [["", inf.cross ? vec(inf.cross) : span("nc", `${M.num(inf.cross2d)} (2D)`)]], angle: [["θ =", inf.angleDeg !== null ? (cfg.deg ? inf.angleDeg : (inf.angleDeg * Math.PI) / 180) : "–"]],
      add: [["", vec(u.map((x, i) => x + w[i]))]], sub: [["", vec(u.map((x, i) => x - w[i]))]] }[op];
    result({ abs: "|VctA|", unit: "VctA / |VctA|", dot: "Skalarprodukt", cross: "Kreuzprodukt", angle: `Winkel (${cfg.deg ? "°" : "rad"})`, add: "VctA + VctB", sub: "VctA − VctB" }[op], out);
  }

  // ---------- Statistik ----------
  const REG = [["1", "Eine Variable (x)"], ["lin", "y = a + bx"], ["quad", "y = a + bx + cx²"], ["log", "y = a + b·ln x"], ["exp", "y = a·e^(bx)"], ["pow", "y = a·x^b"]];
  function statsMenu() { menu("Statistik", REG.map(([k, l]) => [l, () => statEdit(k)])); }
  function statEdit(kind) {
    store.stat ??= { x: [""], y: [""] };
    const S = store.stat, two = kind !== "1";
    if (S.x.length === 0) { S.x = [""]; S.y = [""]; }
    push({ type: "grid", title: two ? REG.find(([k]) => k === kind)[1] : "Statistik 1 Variable", hint: "= / OPTN: Ergebnisse", headers: two ? ["x", "y"] : ["x"], sel: [0, 0],
      rows: () => S.x.length, get: (r, c) => (c === 0 ? S.x[r] : S.y[r]), set: (r, c, v) => { (c === 0 ? S.x : S.y)[r] = v; persist(); },
      grow: (n) => { if (S.x[S.x.length - 1] === "") return; while (S.x.length < Math.min(n, 200)) { S.x.push(""); S.y.push(""); } persist(); },
      optn: () => menu("OPTN", [["Ergebnisse anzeigen", safe(() => statResult(kind))], ["Alle Daten löschen", () => { S.x = [""]; S.y = [""]; persist(); pop(); }]]),
      solve: () => statResult(kind) });
  }
  function statResult(kind) {
    const S = store.stat, idx = S.x.map((v, i) => i).filter((i) => S.x[i] !== "" && (kind === "1" || S.y[i] !== ""));
    if (!idx.length) throw new Error("Math ERROR: keine Daten");
    const x = idx.map((i) => evNum(S.x[i])), y = idx.map((i) => (kind === "1" ? 0 : evNum(S.y[i])));
    if (kind === "1") {
      const t = M.stats1(x);
      return result("1-Variable", [["x̄ =", t.mean], ["Σx =", t.sum], ["Σx² =", t.sum2], ["σx =", t.sdPop], ["sx =", t.sdSample ?? "–"], ["n =", t.n], ["min(x) =", t.min], ["Q₁ =", t.q1], ["Med =", t.median], ["Q₃ =", t.q3], ["max(x) =", t.max]]);
    }
    const r = M.regression(x, y, kind);
    result("Regression", [["a =", r.a], ["b =", r.b], ...(r.c !== undefined ? [["c =", r.c], ["R² =", r.r2]] : [["r =", r.r]])]);
  }

  // ---------- Verteilung ----------
  function distMenu() {
    menu("Verteilung", [
      ["Normal-VD (Dichte)", () => distForm("Normal-VD", [["x", "0"], ["σ", "1"], ["μ", "0"]], (p) => [["p =", M.normalPdf(p.x, p.μ, p.σ)]])],
      ["Normal-VK (kumulativ)", () => distForm("Normal-VK", [["Untere", "-1"], ["Obere", "1"], ["σ", "1"], ["μ", "0"]], (p) => [["P =", M.normalCdf(p.Obere, p.μ, p.σ) - M.normalCdf(p.Untere, p.μ, p.σ)]])],
      ["Invers Normal", () => distForm("Invers Normal", [["Fläche", "0.95"], ["σ", "1"], ["μ", "0"]], (p) => [["x =", M.normalInv(p.Fläche, p.μ, p.σ)]])],
      ["Binomial-VD", () => distForm("Binomial-VD", [["x", "3"], ["N", "10"], ["p", "0.5"]], (p) => [["P(X = x) =", M.binomPdf(Math.round(p.x), Math.round(p.N), p.p)]])],
      ["Binomial-VK", () => distForm("Binomial-VK", [["x", "3"], ["N", "10"], ["p", "0.5"]], (p) => [["P(X ≤ x) =", M.binomCdf(Math.round(p.x), Math.round(p.N), p.p)]])],
      ["Poisson-VD", () => distForm("Poisson-VD", [["x", "2"], ["λ", "3"]], (p) => [["P(X = x) =", M.poissonPdf(Math.round(p.x), p.λ)]])],
      ["Poisson-VK", () => distForm("Poisson-VK", [["x", "2"], ["λ", "3"]], (p) => [["P(X ≤ x) =", M.poissonCdf(Math.round(p.x), p.λ)]])],
    ]);
  }
  function distForm(title, params, calc) {
    const key = `dist:${title}`; store[key] ??= Object.fromEntries(params);
    const D = store[key];
    push({ type: "form", title, hint: "= berechnen", sel: 0, cells: params.map(([k]) => ({ label: `${k} :`, get: () => D[k], set: (v) => { D[k] = v; persist(); } })),
      solve: () => { const p = Object.fromEntries(params.map(([k]) => [k, evNum(D[k] === "" ? "0" : D[k])])); result(title, calc(p).map(([l, v]) => [l, span("nc", M.num(v, 10))])); } });
  }

  // ---------- Tabelle ----------
  function tableMode() {
    store.table ??= { f: "x^2", g: "", a: "-3", b: "3", s: "1" };
    const T = store.table;
    push({ type: "form", title: "Tabelle", hint: "= Tabelle", sel: 0,
      cells: [{ label: "f(x) =", get: () => T.f, set: (v) => { T.f = v; persist(); }, text: true }, { label: "g(x) =", get: () => T.g, set: (v) => { T.g = v; persist(); }, text: true },
        { label: "Start :", get: () => T.a, set: (v) => { T.a = v; persist(); } }, { label: "Ende :", get: () => T.b, set: (v) => { T.b = v; persist(); } }, { label: "Schritt :", get: () => T.s, set: (v) => { T.s = v; persist(); } }],
      solve: () => {
        const a = evNum(T.a), b = evNum(T.b), st = evNum(T.s);
        if (!(st > 0) || b < a || (b - a) / st > 200) throw new Error("Math ERROR: Bereich (max. 200 Zeilen)");
        const f = M.compileFn(T.f, { deg: cfg.deg }), g = T.g.trim() ? M.compileFn(T.g, { deg: cfg.deg }) : null;
        const rows = []; for (let k = 0; a + k * st <= b + st * 1e-9; k++) rows.push(+(a + k * st).toPrecision(12));
        push({ type: "grid", title: "Tabelle", hint: "▲▼  AC: zurück", headers: g ? ["x", "f(x)", "g(x)"] : ["x", "f(x)"], sel: [0, 0], rows: () => rows.length,
          get: (r, c) => { const x = rows[r]; const v = c === 0 ? x : c === 1 ? f(x) : g(x); return Number.isFinite(v) ? +v.toPrecision(10) : "ERROR"; }, set: () => {}, readonly: true, solve: () => pop() });
      } });
  }

  // ---------- Kurvendiskussion ----------
  function curveMode() {
    store.curve ??= { f: "x^3-3x", a: "-5", b: "5" };
    const K = store.curve;
    push({ type: "form", title: "Kurvendiskussion", hint: "= berechnen", sel: 0,
      cells: [{ label: "f(x) =", get: () => K.f, set: (v) => { K.f = v; persist(); }, text: true }, { label: "von :", get: () => K.a, set: (v) => { K.a = v; persist(); } }, { label: "bis :", get: () => K.b, set: (v) => { K.b = v; persist(); } }],
      solve: () => {
        const r = M.curveAnalysis(K.f, evNum(K.a), evNum(K.b), { deg: cfg.deg });
        const pt = (q) => span("nc", `(${M.num(q.x, 8)} | ${M.num(q.y, 8)})`);
        result("Kurvendiskussion", [["f′(x) =", r.d1], ["f″(x) =", r.d2], ...(r.y0 !== null ? [["f(0) =", r.y0]] : []),
          ...r.zeros.map((q, i) => [`N${i + 1}`, pt(q)]), ...r.extrema.map((q) => [q.kind === "Hochpunkt" ? "HP" : q.kind === "Tiefpunkt" ? "TP" : "SP", pt(q)]),
          ...r.inflections.map((q) => ["WP", pt(q)]), ...(r.zeros.length + r.extrema.length + r.inflections.length ? [] : [["", span("nc", "Keine besonderen Punkte im Bereich")]])]);
      } });
  }

  // ---------- Plotter ----------
  function plotMode() {
    store.plot ??= { f: "sin(x)", g: "x/2" };
    const P = store.plot;
    push({ type: "form", title: "Plotter", hint: "= zeichnen", sel: 0,
      cells: [{ label: "f(x) =", get: () => P.f, set: (v) => { P.f = v; persist(); }, text: true }, { label: "g(x) =", get: () => P.g, set: (v) => { P.g = v; persist(); }, text: true }],
      solve: () => {
        const fns = [P.f, P.g].filter((t) => String(t).trim()).map((t) => M.compileFn(t, { deg: false })); // Graph immer im Bogenmaß
        if (!fns.length) throw new Error("Math ERROR: keine Funktion");
        push({ type: "graph", title: "Graph (Rad)", hint: "◀▶ Spur  ▲▼ f/g  +/− Zoom", fns, canvas: h("canvas", { class: "la-canvas" }), cx: 0, cy: 0, scale: 25, tx: 0, fi: 0 });
      } });
  }
  function drawGraph(s) {
    const cv = s.canvas;
    requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, hh = cv.clientHeight; if (!w) return;
      cv.width = w * dpr; cv.height = hh * dpr; const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const X = (x) => w / 2 + (x - s.cx) * s.scale, Y = (y) => hh / 2 - (y - s.cy) * s.scale, ink = "#1d2320";
      ctx.clearRect(0, 0, w, hh); ctx.strokeStyle = "rgba(29,35,32,.18)"; ctx.lineWidth = 1;
      const step = [1, 2, 5, 10, 20, 50].find((t) => t * s.scale >= 18) ?? 100;
      for (let gx = Math.ceil((s.cx - w / 2 / s.scale) / step) * step; X(gx) <= w; gx += step) { ctx.beginPath(); ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), hh); ctx.stroke(); }
      for (let gy = Math.ceil((s.cy - hh / 2 / s.scale) / step) * step; Y(gy) >= 0; gy += step) { ctx.beginPath(); ctx.moveTo(0, Y(gy)); ctx.lineTo(w, Y(gy)); ctx.stroke(); }
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), hh); ctx.stroke();
      s.fns.forEach((f, k) => {
        ctx.strokeStyle = ink; ctx.lineWidth = k === 0 ? 2 : 1.6; ctx.setLineDash(k === 0 ? [] : [5, 3]); ctx.beginPath(); let pen = false, last = null;
        for (let px = 0; px <= w; px += 1) { const x = s.cx + (px - w / 2) / s.scale; const y = f(x); if (!Number.isFinite(y)) { pen = false; continue; } const py = Y(y);
          if (pen && last !== null && Math.abs(py - last) > hh * 2) pen = false; if (pen) ctx.lineTo(px, Math.max(-1e4, Math.min(1e4, py))); else ctx.moveTo(px, py); pen = true; last = py; }
        ctx.stroke(); ctx.setLineDash([]);
      });
      const f = s.fns[s.fi], ty = f(s.tx);
      if (Number.isFinite(ty)) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(X(s.tx), Y(ty), 3.5, 0, 2 * Math.PI); ctx.fill(); }
      msgLine.hidden = false; msgLine.textContent = `${s.fi === 0 ? "f" : "g"}:  x = ${M.num(s.tx, 6)}   y = ${Number.isFinite(ty) ? M.num(ty, 6) : "–"}`;
    });
  }
  function graphKey(s, name, t) {
    const stepX = 5 / s.scale;
    if (name === "left" || name === "right") { s.tx += name === "left" ? -stepX : stepX; const w = s.canvas.clientWidth / s.scale / 2; if (Math.abs(s.tx - s.cx) > w * 0.9) s.cx = s.tx; }
    else if (name === "up" || name === "down") s.fi = (s.fi + 1) % s.fns.length;
    else if (name === "ins" && (t === "+" || t === "−" || t === "-")) { s.scale *= t === "+" ? 1.5 : 1 / 1.5; s.cx = s.tx; }
    else if (name === "ac" || name === "exe") return pop();
    drawGraph(s);
  }

  return { el, key, open, showMenu, modes: MODES, setMenuRenderer: (fn) => { menuGrid = fn; }, active: () => stack.length > 0 };
}
