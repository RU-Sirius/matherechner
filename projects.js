// Favoriten, gespeicherte Berechnungen (Projekte), PDF-Ausgabe und Projektberichte.
// Alles bleibt lokal im Browser (localStorage); nichts wird übertragen.
import { h, section, resultRow, msgRow, currentState, setPreset, LEGAL } from "./ui.js";
import { sharePdf, safeFilename } from "./pdf.js";

// Eigener Namensraum: Mehrere Apps unter derselben Domain teilen sich sonst den Speicher.
const NS = "mx:";
const KEY_FAV = NS + "favorites", KEY_SAVES = NS + "savedCalcs", KEY_LAST = NS + "lastProject";
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const favorites = {
  list: () => load(KEY_FAV, []),
  has: (key) => favorites.list().includes(key),
  toggle: (key) => {
    const l = favorites.list();
    store(KEY_FAV, l.includes(key) ? l.filter((k) => k !== key) : [...l, key]);
  },
};

export const saves = {
  list: () => load(KEY_SAVES, []),
  add: (entry) => store(KEY_SAVES, [...saves.list(), entry]),
  remove: (id) => store(KEY_SAVES, saves.list().filter((e) => e.id !== id)),
  projects: () => [...new Set(saves.list().map((e) => e.project))].sort((a, b) => a.localeCompare(b, "de")),
};

// Liest Eingaben und Ergebnisse der aktuellen Ansicht als Text aus (für Berichte).
function snapshot(root) {
  const out = [];
  let title = "";
  for (const el of root.querySelectorAll(".section-title, .group")) {
    if (el.closest(".noprint")) continue;
    if (el.classList.contains("section-title")) { title = el.textContent.trim(); continue; }
    const rows = [];
    for (const row of el.querySelectorAll(".row")) {
      const label = row.querySelector(".label")?.textContent.trim() ?? "";
      const input = row.querySelector("input");
      const select = row.querySelector("select");
      const seg = row.querySelector(".seg button.on");
      const val = row.querySelector(".value");
      let value;
      if (input) value = `${input.value} ${row.querySelector(".unit")?.textContent ?? ""}`.trim();
      else if (select) value = select.options[select.selectedIndex]?.text ?? "";
      else if (seg) value = seg.textContent;
      else if (val) value = val.textContent.trim();
      else value = row.textContent.trim();
      if (label || value) rows.push([label, value]);
    }
    if (rows.length) out.push({ title, rows });
    title = "";
  }
  return out;
}

const fmtDate = (iso) => new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

// Leiste unter jedem Rechner: speichern und drucken.
export function saveBar(routeKey, title, root) {
  return h("div", { class: "noprint" },
    ...section("Speichern & Export", [h("div", { class: "btnrow" },
      h("button", { class: "btn", onclick: () => {
        const last = localStorage.getItem(KEY_LAST) || "Allgemein";
        const project = prompt("In welchem Projekt speichern?", last);
        if (!project) return;
        const name = prompt("Bezeichnung der Berechnung", title) || title;
        localStorage.setItem(KEY_LAST, project.trim());
        saves.add({ id: Date.now().toString(36), project: project.trim(), name: name.trim(), route: routeKey, title,
                    date: new Date().toISOString(), state: currentState ? { ...currentState } : null, data: snapshot(root) });
        alert(`Gespeichert in „${project.trim()}“.`);
      } }, "In Projekt speichern"),
      h("button", { class: "btn", onclick: () => {
        const date = fmtDate(new Date().toISOString());
        sharePdf(`${safeFilename(title)}.pdf`, { title, subtitle: `MatheRechner · ${date}`,
          blocks: snapshot(root).map((g) => ({ heading: g.title, rows: g.rows })), footer: `Built by R. U. Sirius? · ${LEGAL}` });
      } }, "PDF teilen / sichern"),
    ), h("div", { class: "btnrow" }, h("button", { class: "btn", style: "flex:1;opacity:.8", onclick: () => window.print() }, "Drucken"))],
    "„PDF teilen / sichern“ öffnet auf dem iPhone das Teilen-Menü (z. B. „In Dateien sichern“, Mail, Drucken). Am Computer wird die Datei heruntergeladen."));
}

export function projectsView() {
  const projects = saves.projects();
  if (!projects.length) return section("", [msgRow("Noch keine gespeicherten Berechnungen. Öffne einen Rechner und tippe unten auf „In Projekt speichern“.")]);
  return projects.flatMap((p) => {
    const entries = saves.list().filter((e) => e.project === p);
    return section(p, [
      ...entries.map((e) => h("div", { class: "row" },
        h("a", { class: "label", href: `#${e.route}`, style: "color:inherit;text-decoration:none", onclick: () => setPreset(e.state) },
          h("div", {}, e.name), h("div", { class: "report-meta" }, `${e.title} · ${fmtDate(e.date)}`)),
        h("button", { class: "btn danger", "aria-label": "Löschen", onclick: () => {
          if (confirm(`„${e.name}“ löschen?`)) { saves.remove(e.id); window.dispatchEvent(new HashChangeEvent("hashchange")); }
        } }, "✕"))),
      h("div", { class: "btnrow" }, h("a", { class: "btn", href: `#report/${encodeURIComponent(p)}`, style: "text-align:center;text-decoration:none" }, "Projektbericht")),
    ]);
  });
}

export function reportView(project) {
  const entries = saves.list().filter((e) => e.project === project);
  return [
    h("div", { class: "report-head" }, h("h2", {}, project),
      h("div", { class: "report-meta" }, `Projektbericht · ${entries.length} Berechnung(en) · erstellt ${fmtDate(new Date().toISOString())}`)),
    h("div", { class: "noprint" }, ...section("", [h("div", { class: "btnrow" },
      h("button", { class: "btn", onclick: () => sharePdf(`Projektbericht_${safeFilename(project)}.pdf`, {
        title: `Projektbericht: ${project}`,
        subtitle: `MatheRechner · ${entries.length} Berechnung(en) · erstellt ${fmtDate(new Date().toISOString())}`,
        blocks: entries.flatMap((e) => [{ big: e.name, text: `${e.title} · ${fmtDate(e.date)}` }, ...e.data.map((g) => ({ heading: g.title, rows: g.rows }))]),
        footer: `Built by R. U. Sirius? · ${LEGAL}` }) }, "Bericht als PDF"),
      h("button", { class: "btn", style: "opacity:.8", onclick: () => window.print() }, "Drucken"))])),
    ...entries.flatMap((e) => [
      h("div", { class: "report-head" }, h("h2", { style: "font-size:18px" }, e.name), h("div", { class: "report-meta" }, `${e.title} · ${fmtDate(e.date)}`)),
      ...e.data.flatMap((g) => section(g.title, g.rows.map(([a, b]) => resultRow(a, b)))),
    ]),
    h("div", { class: "print-only", style: "display:block" }, `MatheRechner – Built by R. U. Sirius? · ${LEGAL}`),
  ];
}
