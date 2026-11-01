// Analytische Geometrie (Geraden, Ebenen), Signifikanztest, Baumdiagramm & Vierfeldertafel
import * as M from "./mx.js";
import * as G from "./geo.js";
import { calcView, section, segmented, resultRow, msgRow, h } from "./ui.js";

// Zahl exakt, wenn möglich (Bruch, Wurzel, π), sonst gerundet
function nice(v, d = 6) {
  if (!Number.isFinite(v)) return "–";
  if (Math.abs(v) < 1e-10) return "0";
  const ex = M.exactForm(v); if (ex) return ex;
  try { const f = M.math.fraction(v); if (Number(f.d) <= 1000 && Math.abs(M.math.number(f) - v) < 1e-10) return M.fracStr(f); } catch { /* */ }
  return M.num(+v.toPrecision(10), d);
}
const vec = (a) => `(${a.map((x) => nice(x)).join(" | ")})`;
// "1; 2; 3", "1 2 3", "(1|2|3)" oder "1/2; √2; 0" → [x, y, z]
function readVec(t) {
  const parts = String(t ?? "").replace(/[()[\]]/g, "").split(/\s*[;|]\s*|\s+/).filter(Boolean);
  if (parts.length !== 3) throw new Error("vec");
  const v = parts.map((x) => M.parse(x));
  if (v.some((x) => x === null)) throw new Error("vec");
  return v;
}
const ERR = { vec: "Vektoren mit drei Komponenten eingeben, z. B. 1; 2; 3 (auch Brüche wie 1/2).", degenerate: "Richtungs- bzw. Spannvektoren dürfen nicht null oder parallel sein." };
const guard = (fn) => { try { return fn(); } catch (e) { return [msgRow(ERR[e.message] ?? "Eingaben prüfen.", "error")]; } };
const planeText = (E) => planeParts(E).text;
const planeParts = ({ n, d }) => {
  // Koordinatenform mit möglichst ganzzahligen Koeffizienten
  const all = [...n, d], fr = all.map((x) => { try { return M.math.fraction(x); } catch { return null; } });
  let k = 1;
  if (fr.every((f) => f && Number(f.d) <= 1000 && Math.abs(M.math.number(f) - all[fr.indexOf(f)]) < 1e-9)) {
    const lcm = fr.reduce((a, f) => M.math.lcm(a, Number(f.d)), 1); k = lcm;
    const g = fr.map((f) => Math.round(M.math.number(f) * lcm)).filter((x) => x !== 0).reduce((a, b) => M.math.gcd(a, Math.abs(b)), 0) || 1; k /= g;
  }
  if ((n.find((x) => Math.abs(x) > 1e-12) ?? 1) < 0) k = -k;
  const c = n.map((x) => x * k), dd = d * k;
  const terms = c.map((x, i) => [x, "xyz"[i]]).filter(([x]) => Math.abs(x) > 1e-12)
    .map(([x, v], i) => `${x < 0 ? (i ? " − " : "−") : i ? " + " : ""}${Math.abs(Math.abs(x) - 1) < 1e-12 ? "" : nice(Math.abs(x))}${v}`).join("");
  return { text: `${terms} = ${nice(dd)}`, terms, c, dd };
};
// Hessesche Normalenform: (a·x + b·y + c·z − d) / |n| = 0
const hesse = (E) => { const q = planeParts(E), len = Math.hypot(...q.c);
  const lhs = Math.abs(q.dd) < 1e-12 ? q.terms : `${q.terms} ${q.dd > 0 ? "−" : "+"} ${nice(Math.abs(q.dd))}`;
  return Math.abs(len - 1) < 1e-12 ? `${lhs} = 0` : `(${lhs}) / ${nice(len)} = 0`; };

// =================== Geraden & Ebenen ===================
const GEO_TASKS = [["ll", "Gerade – Gerade"], ["lp", "Gerade – Ebene"], ["pp", "Ebene – Ebene"], ["pt", "Punkt – Abstand"], ["e3", "Ebene aufstellen"]];
export function geometry() {
  return calcView({
    init: { task: "ll", P: "1; 0; 2", u: "1; 1; 0", Q: "0; 1; 3", v: "2; 0; -1", eForm: "coord", ea: "1", eb: "2", ec: "2", ed: "6", A: "1; 0; 0", B: "0; 1; 0", C: "0; 0; 1", X: "3; 3; 3",
      E2a: "0", E2b: "0", E2c: "1", E2d: "1", ptTarget: "plane" },
    inputs: (s, { field, set }) => {
      const t = (k, l) => field(k, l, "", "text");
      const plane = (title) => section(title, [segmented([["coord", "Koordinatenform"], ["param", "Parameterform"], ["three", "3 Punkte"]], s.eForm, (v) => set("eForm", v)),
        ...(s.eForm === "coord" ? [field("ea", "a  (a·x + b·y + c·z = d)", ""), field("eb", "b", ""), field("ec", "c", ""), field("ed", "d", "")]
          : s.eForm === "param" ? [t("A", "Stützvektor"), t("B", "Spannvektor 1"), t("C", "Spannvektor 2")] : [t("A", "Punkt A"), t("B", "Punkt B"), t("C", "Punkt C")])]);
      const rows = [...section("Aufgabe", [h("div", { class: "row" }, h("select", { class: "wide-select", onchange: (e) => set("task", e.target.value) },
        ...GEO_TASKS.map(([k, l]) => h("option", { value: k, selected: k === s.task }, l))))])];
      if (s.task === "ll") rows.push(...section("Gerade g: x = P + r·u", [t("P", "Stützvektor P"), t("u", "Richtungsvektor u")]), ...section("Gerade h: x = Q + s·v", [t("Q", "Stützvektor Q"), t("v", "Richtungsvektor v")]));
      if (s.task === "lp") rows.push(...section("Gerade g: x = P + r·u", [t("P", "Stützvektor P"), t("u", "Richtungsvektor u")]), ...plane("Ebene E"));
      if (s.task === "pp") rows.push(...plane("Ebene E₁"), ...section("Ebene E₂: a·x + b·y + c·z = d", [field("E2a", "a", ""), field("E2b", "b", ""), field("E2c", "c", ""), field("E2d", "d", "")]));
      if (s.task === "pt") rows.push(...section("Punkt", [t("X", "Punkt X")]), ...section("Abstand zu", [segmented([["plane", "Ebene"], ["line", "Gerade"]], s.ptTarget, (v) => set("ptTarget", v))]),
        ...(s.ptTarget === "line" ? section("Gerade g: x = P + r·u", [t("P", "Stützvektor P"), t("u", "Richtungsvektor u")]) : plane("Ebene E")));
      if (s.task === "e3") rows.push(...plane("Ebene"));
      return rows;
    },
    compute: (s, p) => guard(() => {
      const E1 = () => (s.eForm === "coord" ? G.planeFromCoord(p(s.ea), p(s.eb), p(s.ec), p(s.ed)) : s.eForm === "param" ? G.planeFromParam(readVec(s.A), readVec(s.B), readVec(s.C)) : G.planeFrom3(readVec(s.A), readVec(s.B), readVec(s.C)));
      if (s.task === "ll") {
        const r = G.lineLine(readVec(s.P), readVec(s.u), readVec(s.Q), readVec(s.v));
        return [resultRow("Lage", r.kind, "good"), r.S && resultRow("Schnittpunkt S", vec(r.S)), r.S && resultRow("Parameter", `r = ${nice(r.s)}, s = ${nice(r.t)}`),
          r.angle !== undefined && resultRow("Schnittwinkel", `${M.num(r.angle, 4)}°`), r.dist !== undefined && resultRow("Abstand", `${nice(r.dist)} ≈ ${M.num(r.dist, 6)}`),
          r.F1 && resultRow("Lotfußpunkte", `${vec(r.F1)} · ${vec(r.F2)}`)];
      }
      if (s.task === "lp") {
        const E = E1(), r = G.linePlane(readVec(s.P), readVec(s.u), E);
        return [resultRow("Ebene E", planeText(E)), resultRow("Lage", r.kind, "good"), r.S && resultRow("Durchstoßpunkt S", vec(r.S)), r.S && resultRow("Parameter r", nice(r.s)),
          r.angle !== undefined && resultRow("Schnittwinkel", `${M.num(r.angle, 4)}°`), r.dist !== undefined && resultRow("Abstand", `${nice(r.dist)} ≈ ${M.num(r.dist, 6)}`)];
      }
      if (s.task === "pp") {
        const A = E1(), B = G.planeFromCoord(p(s.E2a), p(s.E2b), p(s.E2c), p(s.E2d)), r = G.planePlane(A, B);
        return [resultRow("E₁", planeText(A)), resultRow("Lage", r.kind, "good"), r.P && resultRow("Schnittgerade", `x = ${vec(r.P)} + t·${vec(r.u)}`),
          r.angle !== undefined && resultRow("Schnittwinkel", `${M.num(r.angle, 4)}°`), r.dist !== undefined && resultRow("Abstand", `${nice(r.dist)} ≈ ${M.num(r.dist, 6)}`)];
      }
      if (s.task === "pt") {
        const X = readVec(s.X);
        const r = s.ptTarget === "line" ? G.pointLine(X, readVec(s.P), readVec(s.u)) : G.pointPlane(X, E1());
        return [resultRow("Abstand", `${nice(r.dist)} ≈ ${M.num(r.dist, 6)}`, "good"), resultRow("Lotfußpunkt F", vec(r.F))];
      }
      const E = E1();
      return [resultRow("Koordinatenform", planeText(E), "good"), resultRow("Normalenvektor n", vec(E.n)),
        resultRow("Hessesche Normalenform", hesse(E)),
        resultRow("Abstand zum Ursprung", `${nice(Math.abs(E.d) / G.norm(E.n))}`)];
    }),
    footer: "Vektoren als „x; y; z“ eingeben (auch 1/2, √2, 2pi). Winkel zwischen Geraden bzw. Ebenen im Bereich 0°–90°. Numerisch berechnet; exakte Darstellung, wenn erkennbar.",
  });
}

// =================== Signifikanztest ===================
export function hypothesis() {
  return calcView({
    init: { n: "100", p0: "0,5", alpha: "0,05", side: "right", p1: "", k: "" },
    inputs: (s, { field, set }) => [
      ...section("Nullhypothese H₀: p = p₀", [field("n", "Stichprobenumfang n", ""), field("p0", "p₀", ""), field("alpha", "Signifikanzniveau α", "")]),
      ...section("Gegenhypothese H₁", [segmented([["left", "p < p₀"], ["right", "p > p₀"], ["two", "p ≠ p₀"]], s.side, (v) => set("side", v))]),
      ...section("Optional", [field("k", "Beobachtete Trefferzahl", ""), field("p1", "Wahre Wahrscheinlichkeit p₁ (für β)", "")]),
    ],
    compute: (s, p) => {
      const n = p(s.n), k = p(s.k), r = G.binomialTest({ n, p0: p(s.p0), alpha: p(s.alpha), side: s.side, p1: p(s.p1), k: k === null ? null : k });
      const parts = [];
      if (r.kLeft !== undefined) parts.push(r.kLeft >= 0 ? `{0; …; ${r.kLeft}}` : "∅ (links)");
      if (r.kRight !== undefined) parts.push(r.kRight <= n ? `{${r.kRight}; …; ${n}}` : "∅ (rechts)");
      return [resultRow("Ablehnungsbereich K̄", parts.join(" ∪ "), "good"),
        resultRow("Tatsächliche Irrtumswahrscheinlichkeit", `${M.num(r.alphaReal, 6)} (${M.num(r.alphaReal * 100, 3)} %)`),
        r.beta !== undefined && resultRow("Fehler 2. Art β (bei p₁)", `${M.num(r.beta, 6)} (${M.num(r.beta * 100, 3)} %)`),
        r.decision !== undefined && resultRow("Entscheidung", r.decision ? "H₀ ablehnen" : "H₀ nicht ablehnen", r.decision ? "bad" : "good")];
    },
    footer: "X ~ B(n; p₀). Der Ablehnungsbereich ist so gewählt, dass P(X ∈ K̄) ≤ α (beidseitig je α/2). β = Wahrscheinlichkeit, H₀ beizubehalten, obwohl p = p₁ gilt.",
  });
}

// =================== Baumdiagramm & Vierfeldertafel ===================
export function treeView() {
  return calcView({
    init: { pA: "0,01", pBgA: "0,99", pBgnA: "0,05" },
    inputs: (s, { field }) => [...section("Zweistufiger Zufallsversuch", [field("pA", "P(A)", ""), field("pBgA", "P(B | A)", ""), field("pBgnA", "P(B | Ā)", "")],
      "Beispiel: A = krank, B = Test positiv. Eingabe auch als Bruch (1/6) oder Prozent als Dezimalzahl.")],
    compute: (s, p) => {
      const pA = p(s.pA), b1 = p(s.pBgA), b2 = p(s.pBgnA), r = G.tree({ pA, pBgA: b1, pBgnA: b2 }), f = (v) => (v === null ? "–" : nice(v, 6) === M.num(+v.toPrecision(10), 6) ? M.num(v, 6) : `${nice(v)} ≈ ${M.num(v, 6)}`);
      return [h("div", { class: "row chart-row" }, treeSvg(pA, b1, b2, r)),
        h("div", { class: "row chart-row" }, h("table", { class: "ttable four" },
          h("tr", {}, h("th", {}, ""), h("th", {}, "B"), h("th", {}, "B̄"), h("th", {}, "Σ")),
          h("tr", {}, h("th", {}, "A"), h("td", {}, M.num(r.AB, 6)), h("td", {}, M.num(r.AnB, 6)), h("td", {}, M.num(pA, 6))),
          h("tr", {}, h("th", {}, "Ā"), h("td", {}, M.num(r.nAB, 6)), h("td", {}, M.num(r.nAnB, 6)), h("td", {}, M.num(1 - pA, 6))),
          h("tr", {}, h("th", {}, "Σ"), h("td", {}, M.num(r.pB, 6)), h("td", {}, M.num(1 - r.pB, 6)), h("td", {}, "1")))),
        resultRow("P(B) (totale Wahrscheinlichkeit)", f(r.pB)), resultRow("P(A | B) (Bayes)", f(r.pAgB), "good"), resultRow("P(A | B̄)", f(r.pAgnB)),
        resultRow("A und B unabhängig?", r.independent ? "ja" : "nein")];
    },
    footer: "P(B) = P(A)·P(B|A) + P(Ā)·P(B|Ā); P(A|B) = P(A)·P(B|A) / P(B).",
  });
}
function treeSvg(pA, b1, b2, r) {
  const NS = "http://www.w3.org/2000/svg", el = (tag, at, txt) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); if (txt !== undefined) e.textContent = txt; return e; };
  const svg = el("svg", { viewBox: "0 0 340 200", class: "tree-svg", role: "img", "aria-label": "Baumdiagramm" });
  const n = (v) => M.num(v, 4);
  const line = (x1, y1, x2, y2, lbl, up) => { svg.append(el("line", { x1, y1, x2, y2, class: "tl" }), el("text", { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + (up ? -5 : 13), class: "tp", "text-anchor": "middle" }, lbl)); };
  const node = (x, y, t) => svg.append(el("circle", { cx: x, cy: y, r: 11, class: "tn" }), el("text", { x, y: y + 4, "text-anchor": "middle", class: "tt" }, t));
  line(18, 100, 120, 50, n(pA), true); line(18, 100, 120, 150, n(1 - pA), false);
  line(120, 50, 230, 22, n(b1), true); line(120, 50, 230, 78, n(1 - b1), false); line(120, 150, 230, 122, n(b2), true); line(120, 150, 230, 178, n(1 - b2), false);
  node(120, 50, "A"); node(120, 150, "Ā"); node(230, 22, "B"); node(230, 78, "B̄"); node(230, 122, "B"); node(230, 178, "B̄");
  [[22, r.AB], [78, r.AnB], [122, r.nAB], [178, r.nAnB]].forEach(([y, v]) => svg.append(el("text", { x: 250, y: y + 4, class: "tr" }, `= ${n(v)}`)));
  svg.prepend(el("circle", { cx: 18, cy: 100, r: 4, class: "tn0" }));
  return svg;
}
