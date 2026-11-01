import * as C from "./mx.js";

export const LEGAL = "Kostenloses Hilfsmittel ohne Gewähr. Numerische Verfahren liefern Näherungswerte; Ergebnisse vor der Verwendung in Prüfungen, " +
  "Abgaben oder technischen Anwendungen bitte plausibilisieren. Die Nutzung erfolgt auf eigene Verantwortung.";

// ---------- kleine DOM-Helfer ----------
export const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
};
export const section = (title, rows, footer) => [
  title ? h("div", { class: "section-title" }, title) : null,
  h("div", { class: "group" }, rows),
  footer ? h("div", { class: "footer" }, footer) : null,
].filter(Boolean);
// Tastatur für Zahlenfelder: „num“ = Ziffernblock (ohne Minus/Buchstaben auf dem iPhone), „full“ = volle Tastatur
const KBD_KEY = "mx:keyboard";
export const keyboardMode = () => localStorage.getItem(KBD_KEY) || "full";
export const setKeyboardMode = (m) => localStorage.setItem(KBD_KEY, m);
// mode: "decimal" (Zahl – Tastatur laut Einstellung) oder "text" (immer volle Tastatur, z. B. Formeln, IP-Adressen, Hex)
export const inputRow = (label, unit, value, oninput, id, mode = "decimal") => {
  const full = mode === "text" || keyboardMode() === "full";
  return h("label", { class: "row" + (mode === "text" ? " wide" : "") }, h("span", { class: "label" }, label),
    h("input", { type: "text", inputmode: full ? "text" : "decimal", value, placeholder: "–", id, oninput, autocomplete: "off",
                 autocapitalize: full ? "off" : undefined, autocorrect: full ? "off" : undefined, spellcheck: full ? "false" : undefined }),
    h("span", { class: "unit" }, unit));
};
export const resultRow = (label, value, cls = "") =>
  h("div", { class: "row" }, h("span", { class: "label" }, label), h("span", { class: "value " + cls }, value));
export const msgRow = (text, cls = "hint") => h("div", { class: "row" }, h("span", { class: cls }, text));
export const selectRow = (label, options, value, onchange) =>
  h("label", { class: "row" }, h("span", { class: "label" }, label),
    h("select", { onchange }, options.map(([v, t]) => h("option", { value: v, selected: v === value }, t))));
export const segmented = (options, value, onpick) =>
  h("div", { class: "row seg-row" }, h("div", { class: "seg" },
    options.map(([v, t]) => h("button", { class: v === value ? "on" : "", onclick: () => onpick(v) }, t))));
export const navRow = (hash, label, color, icon) =>
  h("a", { class: "row", href: "#" + hash },
    h("span", { class: "icon", style: `background:${color}` }, icon), h("span", { class: "label" }, label));


// Generischer Rechner: Eingaben → Ergebnis, mit sofortiger Neuberechnung.
const ERRORS = {
  positive: "Bitte gültige Werte > 0 eingeben.",
  cos: "cos φ muss zwischen 0 und 1 liegen.",
  eta: "Wirkungsgrad muss zwischen 0 und 1 liegen.",
};
// Gespeicherte Eingaben, die beim nächsten Öffnen eines Rechners übernommen werden.
let preset = null;
export const setPreset = (v) => { preset = v; };
// Zustand des gerade angezeigten Rechners (für „Speichern“).
export let currentState = null;
export const clearCurrentState = () => { currentState = null; };

export function calcView({ init, inputs, compute, resultTitle = "Ergebnis", footer, rangeMsg = "Werte außerhalb des gültigen Bereichs." }) {
  const s = { ...init, ...(preset ?? {}) };
  preset = null;
  currentState = s;
  const container = h("div");
  const resultBox = h("div");
  const bind = (k) => (e) => { s[k] = e.target.value; renderResult(); };
  const set = (k, v) => { s[k] = v; renderAll(); };
  const field = (k, label, unit, mode) => inputRow(label, unit, s[k], bind(k), undefined, mode);
  const renderResult = () => {
    let rows;
    try { rows = compute(s, C.parse); }
    catch (e) { rows = [msgRow(e.message === "range" ? rangeMsg : ERRORS[e.message] ?? ERRORS.positive)]; }
    rows = rows.filter(Boolean);
    // Überlauf (z. B. 1e300) nicht als „NaN“/„Infinity“ anzeigen
    if (rows.some((r) => /\bNaN\b|Infinity/.test(r.textContent ?? ""))) rows = [msgRow(rangeMsg)];
    resultBox.replaceChildren(...section(resultTitle, rows));
  };
  const renderAll = () => {
    container.replaceChildren(...inputs(s, { field, set }), resultBox,
      ...(footer ? [h("div", { class: "footer" }, typeof footer === "function" ? footer(s) : footer)] : []));
    renderResult();
  };
  renderAll();
  return [container];
}
export const PREFIX_HINT = "";
