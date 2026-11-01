// Anleitung: App installieren (iPhone/iPad, Mac mit Chrome oder Safari).
import { h, section } from "./ui.js";

const URL_APP = "https://ru-sirius.github.io/matherechner/";
const steps = (list) => h("ol", { class: "steps" }, list.map((t) => h("li", {}, t)));
const box = (title, children, footer) => section(title, [h("div", { class: "row", style: "display:block" }, ...children)], footer);

export function installView() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  return [
    ...(standalone ? section("", [h("div", { class: "row" }, h("span", { class: "value good" }, "✓ Die App ist auf diesem Gerät bereits installiert."))]) : []),
    ...box("iPhone & iPad (Safari)", [steps([
      `${URL_APP} in Safari öffnen.`,
      "Unten (iPad: oben rechts) auf das Teilen-Symbol tippen – das Quadrat mit dem Pfeil nach oben.",
      "Nach unten scrollen und „Zum Home-Bildschirm“ wählen.",
      "Name prüfen und oben rechts auf „Hinzufügen“ tippen.",
      "Die App über das neue Symbol auf dem Home-Bildschirm starten.",
    ])], "Seit iOS 16.4 geht das auch aus anderen Browsern wie Chrome (Teilen-Symbol in der Adressleiste). Falls „Zum Home-Bildschirm“ fehlt: In der Liste ganz unten „Aktionen bearbeiten“ und den Eintrag hinzufügen."),
    ...box("Mac (Google Chrome)", [steps([
      `${URL_APP} in Chrome öffnen.`,
      "Rechts in der Adressleiste auf das Installieren-Symbol klicken (Bildschirm mit Pfeil nach unten) und „Installieren“ bestätigen.",
      "Falls das Symbol fehlt: Menü ⋮ oben rechts → „Streamen, speichern und teilen“ → „Seite als App installieren…“ (Bezeichnung je nach Chrome-Version).",
      "Die App öffnet sich in einem eigenen Fenster und liegt danach im Launchpad bzw. unter ~/Programme/Chrome-Apps. Für das Dock: App-Symbol im Dock rechtsklicken → Optionen → „Im Dock behalten“.",
    ])], "Deinstallieren: In der App oben rechts auf ⋮ → „MatheRechner deinstallieren“, oder in Chrome chrome://apps öffnen und die App per Rechtsklick entfernen."),
    ...box("Mac (Safari, ab macOS 14 Sonoma)", [steps([
      `${URL_APP} in Safari öffnen.`,
      "In der Menüleiste „Ablage“ → „Zum Dock hinzufügen…“ wählen und bestätigen.",
    ])], "Entfernen: Symbol aus dem Dock ziehen bzw. im Ordner ~/Programme löschen."),
    ...box("Gut zu wissen", [steps([
      "Nach dem ersten Öffnen mit Internet funktioniert die App auch offline.",
      "Updates kommen automatisch, sobald die App mit Internetverbindung geöffnet wird. Die installierte Version steht unter Einstellungen.",
      "Projekte und Favoriten werden nur auf dem jeweiligen Gerät gespeichert – sie werden nicht zwischen iPhone und Mac abgeglichen. Beim Löschen der Website-Daten bzw. der App gehen sie verloren.",
    ])]),
  ];
}
