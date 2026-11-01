import { LEGAL, h, section, resultRow, navRow, segmented, clearCurrentState, setPreset } from "./ui.js";
import * as V from "./views.js";
import * as V2 from "./views2.js";
import { graphView } from "./graph.js";
import { schoolCalc } from "./fx.js";
import * as V3 from "./views3.js";
import { createExtras } from "./extras.js";
const X = createExtras("mathe");
import { favorites, saveBar, projectsView, reportView, saves } from "./projects.js";
import { installView } from "./install.js";
import { svgIcon } from "./icons.js";

const view = document.getElementById("view");
const header = document.querySelector("header");
const titleEl = document.getElementById("title");
const back = document.getElementById("back");
back.onclick = () => (location.hash = "");
const favBtn = document.getElementById("fav");

// Alle Werkzeuge: Schlüssel → [Listenname, Kurztitel, Farbe, Ansicht]
const G = "#30a46c", B = "#0a84ff", O = "#ff9500", R = "#ff3b30", P = "#af52de", T = "#30b0c7", N = "#8e8e93";
const TOOLS = {
  calc: ["Taschenrechner (Standard & Schulrechner)", "Taschenrechner", G, () => V.calculatorSwitch(MENU_ITEMS())],
  graph: ["Funktionsplotter mit Schiebereglern", "Funktionsplotter", B, graphView],
  poly: ["Polynomgleichungen (Grad 2–6)", "Polynomgleichung", O, V.polynomial],
  ineq: ["Polynom-Ungleichungen", "Ungleichung", O, V.inequality],
  linsys: ["Lineare Gleichungssysteme (2–4)", "Gleichungssystem", O, V.linsys],
  solver: ["Gleichung numerisch lösen", "Gleichungslöser", O, V.solver],
  deriv: ["Ableitung (symbolisch & Wert)", "Ableitung", R, V.derivativeView],
  integral: ["Bestimmtes Integral", "Integral", R, V.integralView],
  curve: ["Kurvendiskussion", "Kurvendiskussion", R, V.curveView],
  sum: ["Summe Σ und Produkt Π", "Σ und Π", R, V.sumView],
  table: ["Wertetabelle", "Wertetabelle", R, V.tableView],
  matrix: ["Matrizen (det, Inverse, Rang, Eigenwerte)", "Matrizen", P, V2.matrix],
  vectors: ["Vektoren (2D/3D)", "Vektoren", P, V2.vectors],
  geometry: ["Geraden & Ebenen (Lage, Schnitt, Abstand)", "Geraden & Ebenen", P, V3.geometry],
  stats: ["Statistik (1 Variable, Quartile)", "Statistik", T, V2.stats],
  regression: ["Regression (2 Variablen)", "Regression", T, V2.regressionView],
  distrib: ["Verteilungen (Normal, Binomial, Poisson)", "Verteilungen", T, V2.distributions],
  combi: ["Kombinatorik (nCr, nPr, n!)", "Kombinatorik", T, V2.combinatorics],
  hypo: ["Signifikanztest (Binomialverteilung)", "Signifikanztest", T, V3.hypothesis],
  tree: ["Baumdiagramm, Vierfeldertafel & Bayes", "Baumdiagramm", T, V3.treeView],
  numtheory: ["Teiler, Primfaktoren, ggT & kgV", "Zahlentheorie", G, V2.numberTheory],
  bases: ["Zahlensysteme (Bin, Okt, Dez, Hex)", "Zahlensysteme", G, V2.bases],
  complex: ["Komplexe Zahlen (kartesisch ↔ polar)", "Komplexe Zahlen", G, V2.complexView],
  units: ["Einheiten umrechnen", "Einheiten", N, V2.unitsView],
  constants: ["Physikalische Konstanten", "Konstanten", N, V2.constants],
};
// Modi für die MENU-Taste der Schulrechner-Ansicht
// Für die MENU-Taste: [Schlüssel, Bezeichnung, Ansicht] – die Funktionen laufen im Rechner-Display
const MENU_ITEMS = () => Object.entries(TOOLS).filter(([k]) => k !== "calc").map(([k, t]) => [k, t[0], t[3], t[1]]);
const nav = (key) => navRow(key, TOOLS[key][0], TOOLS[key][2], svgIcon(key));
const GROUPS = [
  ["Rechnen", ["calc", "numtheory", "bases", "complex"]],
  ["Grafik", ["graph"]],
  ["Gleichungen", ["poly", "ineq", "linsys", "solver"]],
  ["Analysis", ["deriv", "integral", "curve", "sum", "table"]],
  ["Lineare Algebra", ["matrix", "vectors", "geometry"]],
  ["Statistik & Wahrscheinlichkeit", ["stats", "regression", "distrib", "combi", "hypo", "tree"]],
  ["Nachschlagen", ["units", "constants"]],
];

// Umschalter auf der Startseite: Liste oder komplette Rechner-Ansicht (wird gespeichert)
const HOME_KEY = "mx:homeMode";
function homeSwitch(mode) {
  return h("div", { class: "home-switch" + (mode === "calc" ? " compact" : "") }, segmented([["list", "Liste"], ["calc", "Rechner"]], mode, (m) => { localStorage.setItem(HOME_KEY, m); route(); }));
}
// Startansicht aus den Einstellungen beim Öffnen der App anwenden ("last" = zuletzt verwendete beibehalten)
const START_KEY = "mx:startView";
{ const sv = localStorage.getItem(START_KEY); if (sv === "list" || sv === "calc") localStorage.setItem(HOME_KEY, sv); }
function home() {
  const mode = localStorage.getItem(HOME_KEY) || "list";
  if (mode === "calc") return [homeSwitch(mode), schoolCalc(MENU_ITEMS())];
  return [homeSwitch(mode), ...homeList()];
}
function homeList() {
  const favs = favorites.list().filter((k) => k in TOOLS);
  const nSaved = saves.list().length;
  const rec = X.recent.list().filter((k) => k in TOOLS && !favs.includes(k)).slice(0, 4);
  return X.withSearch([
    ...(favs.length ? section("★ Favoriten", favs.map(nav)) : []),
    ...(rec.length ? section("Zuletzt verwendet", rec.map(nav)) : []),
    ...section("", [navRow("projects", `Projekte & gespeicherte Berechnungen${nSaved ? ` (${nSaved})` : ""}`, N, svgIcon("projects"))]),
    ...GROUPS.flatMap(([title, keys]) => section(title, keys.map(nav))),
    ...section("", [navRow("install", "App installieren (iPhone, iPad, Mac)", N, svgIcon("install")), navRow("settings", "Einstellungen & Lizenzen", N, svgIcon("settings"))]),
    h("div", { class: "credit" }, "Built by R. U. Sirius?"),
  ], { tools: TOOLS, groups: GROUPS, nav, extra: SEARCH_EXTRA });
}
// Zusätzliche Suchbegriffe (Synonyme)
const SEARCH_EXTRA = { calc: "taschenrechner schulrechner casio", poly: "nullstellen quadratisch pq mitternachtsformel", linsys: "lgs gauss",
  solver: "gleichung loesen", deriv: "ableiten differenzieren", integral: "integrieren flaeche", curve: "extrempunkte wendepunkte hochpunkt", matrix: "determinante inverse",
  stats: "mittelwert median standardabweichung", regression: "ausgleichsgerade trend", distrib: "normalverteilung binomial poisson wahrscheinlichkeit", combi: "fakultaet binomialkoeffizient",
  numtheory: "ggt kgv primzahl teiler", bases: "binaer hex dual", complex: "imaginaer", units: "umrechnen einheit",
  geometry: "vektorgeometrie gerade ebene schnittpunkt abstand windschief normalenvektor koordinatenform analytische geometrie", hypo: "hypothesentest signifikanz ablehnungsbereich fehler",
  tree: "bedingte wahrscheinlichkeit vierfeldertafel bayes", graph: "plotter funktion zeichnen graph parameterkurve polarkurve ableitung" };

function settingsView() {
  const sv = localStorage.getItem(START_KEY) || "last";
  return [
    ...section("Startansicht", [segmented([["list", "Liste"], ["calc", "Rechner"], ["last", "Zuletzt"]], sv, (v) => { localStorage.setItem(START_KEY, v); if (v !== "last") localStorage.setItem(HOME_KEY, v); route(); })],
      "Legt fest, womit die App startet: Funktionsliste, Rechner-Ansicht oder die zuletzt verwendete Ansicht. Umschalten geht jederzeit oben auf der Startseite."),
    ...X.backupSection(),
    ...section("Haftungshinweis", [h("div", { class: "row" }, h("span", { class: "hint" }, LEGAL))]),
    ...X.appsSection(),
    ...section("Verwendete Software", [h("div", { class: "row" }, h("span", { class: "hint" },
      "math.js – Copyright Jos de Jong, Apache License 2.0 (siehe vendor/LICENSE-mathjs.txt im Repository).")) ]),
    ...section("", [resultRow("Version", "1.6.2 (Web)"), resultRow("Entwickelt von", "R. U. Sirius?"), resultRow("Lizenz", "MIT")]),
  ];
}

// ---------- Routing ----------
const PAGES = { settings: ["Einstellungen", settingsView], projects: ["Projekte", projectsView], install: ["App installieren", installView] };
const NO_SAVEBAR = new Set(["calc", "constants"]);
function route() {
  let [key, arg] = location.hash.slice(1).split("/");
  if (key === "fx") { localStorage.setItem("mx:calcMode", "school"); key = "calc"; }
  clearCurrentState();
  let title, nodes, isTool = false;
  if (key in TOOLS) { title = TOOLS[key][1]; nodes = TOOLS[key][3](); isTool = true; X.recent.track(key); }
  else if (key in PAGES) { title = PAGES[key][0]; nodes = PAGES[key][1](); }
  else if (key === "report" && arg) { title = "Projektbericht"; nodes = reportView(decodeURIComponent(arg)); }
  else { title = "MatheRechner"; nodes = home(); }
  const isHome = title === "MatheRechner";
  const calcHome = isHome && (localStorage.getItem(HOME_KEY) || "list") === "calc";
  titleEl.textContent = title;
  header.classList.toggle("sub", !isHome || calcHome); // in der Rechner-Ansicht kompakter Kopf
  document.body.classList.toggle("calc-home", calcHome);
  back.hidden = isHome;
  favBtn.hidden = !isTool;
  if (isTool) {
    const set = () => { favBtn.textContent = favorites.has(key) ? "★" : "☆"; };
    set();
    favBtn.onclick = () => { favorites.toggle(key); set(); };
  }
  view.replaceChildren(...nodes);
  setPreset(null);
  if (isTool && !NO_SAVEBAR.has(key)) {
    view.append(saveBar(key, title, view), h("div", { class: "print-only" }, `MatheRechner – Built by R. U. Sirius? · ${LEGAL}`));
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();

// Haftungshinweis beim ersten Start bestätigen lassen.
if (localStorage.getItem("mx:legalAccepted") !== "1") {
  const overlay = h("div", { class: "modal", role: "dialog", "aria-modal": "true" },
    h("div", { class: "modal-box" },
      h("h2", {}, "Bitte beachten"),
      h("p", {}, LEGAL),
      h("button", { class: "modal-btn", onclick: () => { localStorage.setItem("mx:legalAccepted", "1"); overlay.remove(); } }, "Verstanden")));
  document.body.append(overlay);
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
  // Bei jedem Zurückkehren in die App nach Updates schauen.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update(); });
});
// Sobald eine neue Version aktiv ist: einmal neu laden, damit sie sofort sichtbar wird.
// (Nicht beim allerersten Start, da gibt es noch keine alte Version.)
let reloaded = false;
const hadController = !!navigator.serviceWorker?.controller;
navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (hadController && !reloaded) { reloaded = true; location.reload(); }
});
