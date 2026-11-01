// Gemeinsame Zusatzfunktionen (in allen drei Apps gleich): Suche, „Zuletzt verwendet“, Datensicherung, weitere Apps.
// Alles bleibt lokal im Browser; Export/Import arbeitet nur mit einer Datei auf dem Gerät.
import { h, section } from "./ui.js";

// Alle Apps liegen unter derselben Domain und teilen sich den localStorage → Namensräume.
const NAMESPACES = { elektro: "", mechanik: "mr:", mathe: "mx:" };
export const APPS = [
  ["elektro", "ElektroRechner", "https://ru-sirius.github.io/elektrorechner/", "Elektrotechnik, Schutztechnik, PV, Automatisierung, Netzwerk"],
  ["mechanik", "MechanikRechner", "https://ru-sirius.github.io/mechanikrechner/", "Maschinenbau, Festigkeit, Antriebe, Fertigung, Hydraulik"],
  ["mathe", "MatheRechner", "https://ru-sirius.github.io/matherechner/", "Schulrechner, Funktionsplotter, Gleichungen, Statistik"],
];

export function createExtras(app) {
  const ns = NAMESPACES[app];
  const appName = APPS.find(([k]) => k === app)[1];
  const others = Object.values(NAMESPACES).filter((p) => p && p !== ns);
  // Gehört ein Speicher-Schlüssel zu dieser App? (ElektroRechner hat keinen Präfix → alles, was keiner anderen App gehört)
  const own = (k) => (ns ? k.startsWith(ns) : !others.some((p) => k.startsWith(p)));
  const RKEY = ns + "recent";

  // ---------- Zuletzt verwendet ----------
  const recent = {
    list: () => { try { return JSON.parse(localStorage.getItem(RKEY)) ?? []; } catch { return []; } },
    track: (key) => localStorage.setItem(RKEY, JSON.stringify([key, ...recent.list().filter((k) => k !== key)].slice(0, 8))),
    clear: () => localStorage.removeItem(RKEY),
  };

  // ---------- Suche ----------
  const fold = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[-–·&/()]/g, " ");
  // tools: { key: [Listenname, Kurztitel, …] }, groups: [[Gruppe, [keys]]], nav(key) → Zeile, extra: { key: "Suchbegriffe" }
  function withSearch(nodes, { tools, groups, nav, extra = {} }) {
    const groupOf = Object.fromEntries(groups.flatMap(([g, keys]) => keys.map((k) => [k, g])));
    const index = Object.keys(tools).filter((k) => groupOf[k]).map((k) => [k, fold(`${tools[k][0]} ${tools[k][1]} ${groupOf[k]} ${extra[k] ?? ""} ${k}`)]);
    const list = h("div", {}, ...nodes), results = h("div", { hidden: "" });
    const input = h("input", { type: "search", class: "search-input", placeholder: "Rechner suchen …", "aria-label": "Rechner suchen", autocomplete: "off", enterkeyhint: "search" });
    const run = () => {
      const words = fold(input.value).split(/\s+/).filter(Boolean);
      if (!words.length) { results.hidden = true; list.hidden = false; return; }
      const hits = index.filter(([, t]) => words.every((w) => t.includes(w))).map(([k]) => k);
      results.replaceChildren(...(hits.length ? section(`${hits.length} Treffer`, hits.map(nav))
        : section("", [h("div", { class: "row" }, h("span", { class: "hint" }, "Kein Rechner gefunden."))])));
      results.hidden = false; list.hidden = true;
    };
    input.addEventListener("input", run);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const a = results.querySelector("a"); if (a) a.click(); } if (e.key === "Escape") { input.value = ""; run(); } });
    return [h("div", { class: "search-wrap" }, input), results, list];
  }

  // ---------- Datensicherung ----------
  function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (own(k)) data[k] = localStorage.getItem(k); }
    const json = JSON.stringify({ format: "ru-sirius-backup", app, appName, created: new Date().toISOString(), data }, null, 1);
    const name = `${appName}_Sicherung_${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: "application/json" });
    // wie bei der PDF-Ausgabe: Teilen-Menü, wo möglich (iPhone/iPad), sonst Download
    const download = () => { const url = URL.createObjectURL(file), a = h("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); };
    if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], title: name }).catch((e) => { if (e.name !== "AbortError") download(); });
    else download();
    return Object.keys(data).length;
  }
  function importData() {
    const inp = h("input", { type: "file", accept: "application/json,.json", style: "display:none" });
    inp.addEventListener("change", async () => {
      const f = inp.files?.[0]; inp.remove(); if (!f) return;
      let obj;
      try { obj = JSON.parse(await f.text()); } catch { return alert("Die Datei ist keine gültige Sicherung."); }
      if (obj?.format !== "ru-sirius-backup" || typeof obj.data !== "object") return alert("Die Datei ist keine gültige Sicherung.");
      if (obj.app !== app) return alert(`Diese Sicherung stammt aus dem ${obj.appName ?? "einer anderen App"} und kann hier nicht eingespielt werden.`);
      const keys = Object.keys(obj.data).filter(own);
      if (!confirm(`Sicherung vom ${new Date(obj.created).toLocaleString("de-DE")} einspielen?\n\nProjekte, Favoriten und Einstellungen dieser App werden durch den Stand der Sicherung ersetzt.`)) return;
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (own(k)) localStorage.removeItem(k); }
      keys.forEach((k) => localStorage.setItem(k, String(obj.data[k])));
      alert(`${keys.length} Einträge wiederhergestellt.`);
      location.hash = ""; location.reload();
    });
    document.body.append(inp); inp.click();
  }
  const backupSection = () => section("Datensicherung", [h("div", { class: "btnrow" },
    h("button", { class: "btn", onclick: () => exportData() }, "Sicherung exportieren"),
    h("button", { class: "btn", onclick: () => importData() }, "Sicherung einspielen"))],
    "Speichert Projekte, Favoriten und Einstellungen dieser App als Datei (iPhone: Teilen-Menü → „In Dateien sichern“). " +
    "Die Daten liegen sonst nur im Browser und gehen z. B. beim Löschen der Websitedaten verloren.");

  // ---------- Weitere Apps ----------
  const appsSection = () => section("Weitere Apps", APPS.filter(([k]) => k !== app).map(([, name, url, desc]) =>
    h("a", { class: "row", href: url, target: "_blank", rel: "noopener", style: "color:inherit;text-decoration:none" },
      h("span", { class: "label" }, h("div", {}, name), h("div", { class: "hint" }, desc)))));

  return { recent, withSearch, backupSection, appsSection, exportData };
}
