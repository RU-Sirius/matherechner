// Interaktiver Funktionsplotter: mehrere Funktionen, automatische Schieberegler für Parameter,
// Verschieben/Zoomen (Maus, Finger), Nullstellen/Extrema/Schnittpunkte, Fläche, Spur.
import * as M from "./mx.js";
import { h, section, resultRow, msgRow, inputRow } from "./ui.js";

const COLORS = ["#0a84ff", "#ff3b30", "#34c759", "#af52de"];
const KEY = "mx:graph";
const r4 = (v) => (Math.abs(v) < 1e-10 ? "0" : String(+v.toFixed(4)));

export function graphView() {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  const st = saved ?? { fns: ["a*sin(x)", "x^2/4 - 1", "", ""], params: {}, view: { cx: 0, cy: 0, scale: 40 }, points: true, area: { on: false, a: "-1", b: "2" }, deg: false };
  const persist = () => localStorage.setItem(KEY, JSON.stringify(st));

  const canvas = h("canvas", { class: "graph-canvas", "aria-label": "Funktionsgraph" });
  const wrap = h("div", { class: "graph-wrap chart-row row" }, canvas);
  const info = h("div", { class: "graph-info" });
  const sliderBox = h("div");
  const listBox = h("div");
  const errBox = h("div");
  let compiled = [], special = [], trace = null, raf = 0, specTimer = 0;

  // ---------- Funktionen kompilieren & Schieberegler ----------
  function rebuild() {
    errBox.replaceChildren();
    const syms = new Set();
    st.fns.forEach((src) => { if (src.trim()) try { M.freeSymbols(src).forEach((s) => syms.add(s)); } catch { /* Fehler unten */ } });
    for (const s of syms) if (!(s in st.params)) st.params[s] = { v: 1, min: -5, max: 5 };
    for (const s of Object.keys(st.params)) if (!syms.has(s)) delete st.params[s];
    const scope = Object.fromEntries(Object.entries(st.params).map(([k, p]) => [k, p.v]));
    compiled = st.fns.map((src, i) => {
      if (!src.trim()) return null;
      try { return { f: M.compileFn(src, { scope, deg: st.deg }), d: M.compileFn(M.derivative(src).toString(), { scope, deg: st.deg }), color: COLORS[i], name: `f${i + 1}` }; }
      catch (e) { errBox.append(msgRow(`f${i + 1}: Ausdruck nicht lesbar (${e.message.split("(")[0].trim()})`, "error")); return null; }
    });
    renderSliders(); persist(); draw(); scheduleSpecial();
  }
  function renderSliders() {
    const rows = Object.entries(st.params).map(([k, p]) => {
      const out = h("span", { class: "value" }, r4(p.v));
      const range = h("input", { type: "range", min: p.min, max: p.max, step: (p.max - p.min) / 200, value: p.v, class: "slider",
        oninput: (e) => { p.v = Number(e.target.value); out.textContent = r4(p.v); quickUpdate(); } });
      return h("div", { class: "row slider-row" }, h("span", { class: "label" }, k), range, out);
    });
    sliderBox.replaceChildren(...(rows.length ? section("Schieberegler (Parameter)", rows, "Buchstaben außer x in den Funktionen werden automatisch zu Parametern. Bereich −5 … 5.") : []));
  }
  // Schieberegler bewegt: nur neu kompilieren (ohne Regler neu aufzubauen)
  function quickUpdate() {
    const scope = Object.fromEntries(Object.entries(st.params).map(([k, p]) => [k, p.v]));
    compiled = st.fns.map((src, i) => { if (!src.trim()) return null; try { return { f: M.compileFn(src, { scope, deg: st.deg }), d: M.compileFn(M.derivative(src).toString(), { scope, deg: st.deg }), color: COLORS[i], name: `f${i + 1}` }; } catch { return null; } });
    persist(); draw(); scheduleSpecial();
  }

  // ---------- Koordinaten ----------
  const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });
  const toPx = (x, y) => { const { w, h: hh } = size(); return [w / 2 + (x - st.view.cx) * st.view.scale, hh / 2 - (y - st.view.cy) * st.view.scale]; };
  const toWorld = (px, py) => { const { w, h: hh } = size(); return [st.view.cx + (px - w / 2) / st.view.scale, st.view.cy - (py - hh / 2) / st.view.scale]; };
  const xRange = () => { const { w } = size(); return [toWorld(0, 0)[0], toWorld(w, 0)[0]]; };
  function niceStep(scale) { const raw = 80 / scale, mag = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw); }

  // ---------- Zeichnen ----------
  function draw() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1, { w, h: hh } = size();
      if (!w) return;
      canvas.width = w * dpr; canvas.height = hh * dpr;
      const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(document.documentElement);
      const fg = css.getPropertyValue("--text").trim() || "#000", sub = css.getPropertyValue("--sub").trim() || "#888";
      ctx.fillStyle = css.getPropertyValue("--card").trim() || "#fff"; ctx.fillRect(0, 0, w, hh);
      // Gitter
      const step = niceStep(st.view.scale), [x0, y1] = toWorld(0, 0), [x1, y0] = toWorld(w, hh);
      ctx.lineWidth = 1; ctx.font = "11px -apple-system, sans-serif";
      for (let gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) { const [px] = toPx(gx, 0); ctx.strokeStyle = "rgba(128,128,128,.18)"; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, hh); ctx.stroke(); }
      for (let gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) { const [, py] = toPx(0, gy); ctx.strokeStyle = "rgba(128,128,128,.18)"; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke(); }
      // Achsen
      const [ax, ay] = toPx(0, 0);
      ctx.strokeStyle = sub; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(w, ay); ctx.moveTo(ax, 0); ctx.lineTo(ax, hh); ctx.stroke();
      ctx.fillStyle = sub;
      const lblY = Math.min(Math.max(ay + 13, 12), hh - 4), lblX = Math.min(Math.max(ax - 4, 24), w - 4);
      for (let gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) { if (Math.abs(gx) < step / 2) continue; const [px] = toPx(gx, 0); ctx.textAlign = "center"; ctx.fillText(r4(gx).replace(".", ","), px, lblY); }
      for (let gy = Math.ceil(y0 / step) * step; gy <= y1; gy += step) { if (Math.abs(gy) < step / 2) continue; const [, py] = toPx(0, gy); ctx.textAlign = "right"; ctx.fillText(r4(gy).replace(".", ","), lblX, py + 4); }
      // Fläche
      const g0 = compiled[0];
      const A = M.parse(st.area.a), B = M.parse(st.area.b);
      if (st.area.on && g0 && A !== null && B !== null && B > A) {
        ctx.fillStyle = "rgba(10,132,255,.18)"; ctx.beginPath();
        const [pa] = toPx(A, 0), [pb] = toPx(B, 0); ctx.moveTo(pa, ay);
        for (let px = pa; px <= pb; px += 1) { const x = toWorld(px, 0)[0], y = g0.f(x); if (Number.isFinite(y)) ctx.lineTo(px, toPx(0, y)[1]); }
        ctx.lineTo(pb, ay); ctx.closePath(); ctx.fill();
      }
      // Kurven
      for (const c of compiled) {
        if (!c) continue;
        ctx.strokeStyle = c.color; ctx.lineWidth = 2.2; ctx.beginPath();
        let pen = false, lastPy = null;
        for (let px = -1; px <= w + 1; px += 0.5) {
          const x = toWorld(px, 0)[0]; let y; try { y = c.f(x); } catch { y = NaN; }
          if (!Number.isFinite(y)) { pen = false; continue; }
          const py = toPx(0, y)[1];
          // Sprung (Polstelle) nicht verbinden
          if (pen && lastPy !== null && Math.abs(py - lastPy) > hh * 2) pen = false;
          const cy = Math.max(-1e4, Math.min(1e4, py));
          if (pen) ctx.lineTo(px, cy); else ctx.moveTo(px, cy);
          pen = true; lastPy = py;
        }
        ctx.stroke();
      }
      // Besondere Punkte
      if (st.points) for (const p of special) {
        const [px, py] = toPx(p.x, p.y); if (px < -5 || px > w + 5 || py < -5 || py > hh + 5) continue;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // Spur
      if (trace !== null) {
        const [px] = toPx(trace, 0); ctx.strokeStyle = fg; ctx.globalAlpha = .35; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, hh); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        for (const c of compiled) { if (!c) continue; const y = c.f(trace); if (!Number.isFinite(y)) continue; const [, py] = toPx(trace, y); ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(px, py, 5, 0, 2 * Math.PI); ctx.fill(); }
      }
      updateInfo();
    });
  }
  function updateInfo() {
    if (trace === null) { info.textContent = "Ziehen: verschieben · Zwei Finger oder Mausrad: zoomen · Tippen: Werte anzeigen"; return; }
    info.replaceChildren(h("b", {}, `x = ${r4(trace).replace(".", ",")}`), ...compiled.filter(Boolean).map((c) => {
      const y = c.f(trace); return h("span", { style: `color:${c.color}` }, `  ${c.name} = ${Number.isFinite(y) ? r4(y).replace(".", ",") : "–"}`); }));
  }

  // ---------- Besondere Punkte (verzögert berechnet) ----------
  function scheduleSpecial() { clearTimeout(specTimer); specTimer = setTimeout(computeSpecial, 120); }
  function computeSpecial() {
    const [a, b] = xRange();
    const out = [];
    compiled.forEach((c) => {
      if (!c) return;
      try { M.roots(c.f, a, b, 800).forEach((x) => out.push({ x, y: 0, color: c.color, label: `Nullstelle ${c.name}` })); } catch { /* */ }
      try { M.roots(c.d, a, b, 800).forEach((x) => { const y = c.f(x); if (Number.isFinite(y)) out.push({ x, y, color: c.color, label: `${extremumKind(c, x)} ${c.name}` }); }); } catch { /* */ }
    });
    for (let i = 0; i < compiled.length; i++) for (let j = i + 1; j < compiled.length; j++) {
      const p = compiled[i], q = compiled[j]; if (!p || !q) continue;
      try { M.roots((x) => p.f(x) - q.f(x), a, b, 800).forEach((x) => out.push({ x, y: p.f(x), color: "#8e8e93", label: `Schnittpunkt ${p.name} ∩ ${q.name}` })); } catch { /* */ }
    }
    special = out.filter((p) => Number.isFinite(p.y));
    renderList(); draw();
  }
  function extremumKind(c, x) { const h2 = 1e-4 * Math.max(1, Math.abs(x)); const l = c.d(x - h2), r = c.d(x + h2); return l > 0 && r < 0 ? "Hochpunkt" : l < 0 && r > 0 ? "Tiefpunkt" : "Sattelpunkt"; }
  function renderList() {
    const rows = special.slice(0, 40).map((p) => resultRow(p.label, `(${r4(p.x).replace(".", ",")} | ${r4(p.y).replace(".", ",")})`));
    const g0 = compiled[0], A = M.parse(st.area.a), B = M.parse(st.area.b);
    if (st.area.on && g0 && A !== null && B !== null && B > A) {
      try { rows.unshift(resultRow(`∫ f1 dx von ${r4(A)} bis ${r4(B)}`, r4(M.integrate(g0.f, A, B)).replace(".", ","))); } catch { rows.unshift(msgRow("Integral nicht berechenbar (Polstelle im Intervall?)", "warn")); }
    }
    listBox.replaceChildren(...section("Besondere Punkte im sichtbaren Bereich", rows.length ? rows : [msgRow("Keine gefunden.")],
      special.length > 40 ? "Nur die ersten 40 Punkte werden angezeigt." : "Numerisch ermittelt – auf 4 Nachkommastellen gerundet."));
  }

  // ---------- Bedienung (Maus, Finger) ----------
  const pointers = new Map(); let start = null, moved = false;
  canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.offsetX, e.offsetY]); moved = false;
    start = { view: { ...st.view }, pts: new Map(pointers) }; });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    const ids = [...pointers.keys()];
    if (ids.length === 1 && start.pts.has(ids[0])) {
      const [sx, sy] = start.pts.get(ids[0]), [x, y] = pointers.get(ids[0]);
      if (Math.hypot(x - sx, y - sy) > 4) moved = true;
      st.view.cx = start.view.cx - (x - sx) / st.view.scale; st.view.cy = start.view.cy + (y - sy) / st.view.scale; draw();
    } else if (ids.length === 2 && start.pts.size === 2) {
      moved = true;
      const [a0, b0] = ids.map((id) => start.pts.get(id)), [a1, b1] = ids.map((id) => pointers.get(id));
      if (!a0 || !b0) return;
      const d0 = Math.hypot(a0[0] - b0[0], a0[1] - b0[1]), d1 = Math.hypot(a1[0] - b1[0], a1[1] - b1[1]);
      zoomAt((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2, d1 / d0, start.view);
    }
  });
  const end = (e) => {
    if (pointers.has(e.pointerId) && !moved && pointers.size === 1) { trace = toWorld(e.offsetX, e.offsetY)[0]; draw(); }
    pointers.delete(e.pointerId); start = { view: { ...st.view }, pts: new Map(pointers) };
    persist(); scheduleSpecial();
  };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015), { ...st.view }); persist(); scheduleSpecial(); }, { passive: false });
  function zoomAt(px, py, factor, base) {
    const { w, h: hh } = size();
    const wx = base.cx + (px - w / 2) / base.scale, wy = base.cy - (py - hh / 2) / base.scale;
    const s = Math.min(Math.max(base.scale * factor, 1e-3), 1e6);
    st.view.scale = s; st.view.cx = wx - (px - w / 2) / s; st.view.cy = wy + (py - hh / 2) / s; draw();
  }
  const btn = (label, fn, title) => h("button", { class: "gbtn", title, onclick: fn }, label);
  const zoomBtn = (f) => () => { const { w, h: hh } = size(); zoomAt(w / 2, hh / 2, f, { ...st.view }); persist(); scheduleSpecial(); };
  const toolbar = h("div", { class: "gtools" },
    btn("+", zoomBtn(1.5), "Vergrößern"), btn("−", zoomBtn(1 / 1.5), "Verkleinern"),
    btn("⌂", () => { st.view = { cx: 0, cy: 0, scale: 40 }; trace = null; persist(); draw(); scheduleSpecial(); }, "Standardansicht"),
    btn("Punkte", (e) => { st.points = !st.points; e.target.classList.toggle("on", st.points); persist(); draw(); }, "Besondere Punkte ein/aus"),
    btn(st.deg ? "DEG" : "RAD", (e) => { st.deg = !st.deg; e.target.textContent = st.deg ? "DEG" : "RAD"; rebuild(); }, "Winkelmaß für sin/cos/tan"));
  toolbar.children[3].classList.toggle("on", st.points);

  const fnRows = st.fns.map((src, i) => {
    const row = inputRow(`f${i + 1}(x) =`, "", src, (e) => { st.fns[i] = e.target.value; clearTimeout(row._t); row._t = setTimeout(rebuild, 250); }, undefined, "text");
    row.querySelector(".label").prepend(h("span", { class: "swatch", style: `background:${COLORS[i]}` }), " ");
    return row;
  });
  const areaRows = [
    h("label", { class: "row" }, h("span", { class: "label" }, "Fläche unter f1 anzeigen"),
      h("input", { type: "checkbox", checked: st.area.on ? "" : undefined, onchange: (e) => { st.area.on = e.target.checked; persist(); draw(); renderList(); } })),
    inputRow("von a =", "", st.area.a, (e) => { st.area.a = e.target.value; persist(); draw(); renderList(); }),
    inputRow("bis b =", "", st.area.b, (e) => { st.area.b = e.target.value; persist(); draw(); renderList(); }),
  ];

  new ResizeObserver(() => draw()).observe(canvas);
  setTimeout(rebuild, 0);
  return [
    ...section("Funktionen", fnRows, "Beispiele: x^2 − 4 · sin(x) · 2^x · sqrt(x) · abs(x) · ln(x) · a*x + b. Multiplikation darf entfallen (2x)."),
    errBox,
    h("div", { class: "group", style: "margin-top:12px" }, toolbar, wrap, h("div", { class: "row" }, info)),
    sliderBox,
    ...section("Fläche / Integral", areaRows),
    listBox,
  ];
}
