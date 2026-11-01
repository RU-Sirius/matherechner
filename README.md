# MatheRechner – Web-App

Offline-fähige Web-App (PWA) für Schule, Studium und Technik: wissenschaftlicher Taschenrechner mit exakten Ergebnissen,
interaktiver Funktionsplotter und Werkzeuge für Gleichungen, Analysis, lineare Algebra und Statistik.
Keine Datenübertragung: Verlauf, Projekte und Einstellungen bleiben lokal im Browser.

**App öffnen:** https://ru-sirius.github.io/matherechner/

## Installation
- **iPhone & iPad (Safari):** Adresse öffnen → Teilen → „Zum Home-Bildschirm“.
- **Mac (Chrome):** Installieren-Symbol in der Adressleiste bzw. Menü ⋮ → „Streamen, speichern und teilen“ → „Seite als App installieren…“.
- **Mac (Safari, ab macOS 14):** Ablage → „Zum Dock hinzufügen…“.

Ausführliche Anleitung in der App unter **„App installieren“**.

## Funktionen (v1.3.0)

**Rechnen**
- **Startseite mit Umschalter „Liste | Rechner“:** Im Rechner-Modus zeigt die App nur das Rechnergehäuse; über **MENU** öffnen sich alle Funktionen (Gleichungen, Analysis, Matrizen, Statistik, Plotter …) **im Display** und werden mit dem Rechner-Tastenfeld bedient (Feld antippen, ▲▼ wechselt Felder, = weiter, DEL/AC)
- Zahlenfelder akzeptieren Rechenausdrücke wie 1/3, √2, 2π
- **Taschenrechner mit Umschalter „Standard | Schulrechner“** (Wahl wird gespeichert); fehlende schließende Klammern werden am Ende automatisch ergänzt
- **Schulrechner-Ansicht:** Gehäuse mit LCD, natürliche Darstellung wie im Lehrbuch (Brüche, Wurzeln, Potenzen, ∫, d/dx, Σ schon bei der Eingabe),
  SHIFT-/ALPHA-Ebene, Variablen A–F/X/Y/M mit STO/RCL, M+/M−, Ans, S⇔D, ENG/←ENG, °′″, hyp, Verlauf ▲▼,
  MENU (Moduswechsel) und SETUP (Deg/Rad, exakt/dezimal, Norm/Fix/Sci); bedienbar auch über die Computertastatur
- Weitere Tastenfunktionen: OPTN (Hyperbelfunktionen, Rnd/Int/Intg, Re/Im/arg), CALC (Variablen einsetzen), SOLVE (nach x lösen),
  Π, gemischter Bruch, ÷R (Division mit Rest), FACT (Primfaktoren), a b/c ⇔ d/c, i, CONST, CONV (Einheiten), RESET,
  GCD/LCM, Pol/Rec, Int/Intg, Rnd, Ran#/RanInt, π/e, %, ≈; MENU-Auswahl auch über die Zifferntasten
- Taschenrechner mit Tastenfeld oder Systemtastatur, Verlauf, Ans, Variablen, DEG/RAD
- Exakte Ergebnisse als Bruch, gemischte Zahl, Wurzelform (z. B. 2√3) oder Vielfaches von π – Umschalten S⇔D
- Komplexe Zahlen, Fakultät, nCr/nPr, Logarithmen, Hyperbelfunktionen, Konstanten
- Teiler, Primfaktoren, ggT/kgV · Zahlensysteme (Bin/Okt/Dez/Hex, beliebig groß) · komplexe Zahlen kartesisch ↔ polar

**Grafik**
- Funktionsplotter für bis zu 4 Funktionen, Verschieben und Zoomen per Maus oder Finger
- Automatische Schieberegler für Parameter (z. B. a·sin(b·x))
- Nullstellen, Hoch-/Tief-/Sattelpunkte und Schnittpunkte im sichtbaren Bereich, Spur mit Funktionswerten
- Fläche unter f1 mit Integralwert

**Gleichungen**
- Polynomgleichungen Grad 2–6 (reell und komplex; Grad 2 zusätzlich exakt)
- Polynom-Ungleichungen (Lösungsmenge als Intervalle)
- Lineare Gleichungssysteme mit 2–4 Unbekannten (exakt als Bruch, erkennt keine/unendlich viele Lösungen)
- Beliebige Gleichung numerisch lösen

**Analysis**
- Ableitungen 1.–3. Ordnung symbolisch und an einer Stelle
- Bestimmtes Integral (adaptive Simpson-Regel)
- Kurvendiskussion (Nullstellen, Extrema, Wendepunkte) · Summe Σ / Produkt Π · Wertetabelle

**Lineare Algebra**
- Matrizen bis 4 × 4: Determinante, Inverse (exakt), Transponierte, Rang, Eigenwerte, A ± B, A · B
- Vektoren 2D/3D: Betrag, Einheitsvektor, Skalar- und Kreuzprodukt, Winkel, Parallelogrammfläche

**Statistik & Wahrscheinlichkeit**
- 1-Variablen-Statistik mit Häufigkeiten, Quartilen, Modus
- Regression: linear, quadratisch, exponentiell, logarithmisch, Potenz
- Normal-, Binomial- und Poisson-Verteilung (Wahrscheinlichkeiten, Quantile)
- Kombinatorik (nCr, nPr, mit Wiederholung, n!)

**Nachschlagen**
- Einheiten umrechnen · physikalische Konstanten

**Arbeiten mit der App**
- Favoriten, Projekte, PDF über das Teilen-Menü, Projektberichte, Offline-Betrieb, automatische Updates

## Hinweise
Numerische Verfahren (Nullstellen, Integrale, Eigenwerte) liefern Näherungswerte. Nullstellen- und Punktsuche
erfolgt im angegebenen bzw. sichtbaren Bereich. Quartile: Median der unteren/oberen Datenhälfte.

## Entwicklung
- `mx.js`: Rechenlogik · Tests: `node test.mjs`
- `views.js`, `views2.js`: Rechner · `graph.js`: Funktionsplotter · `fx.js`: Schulrechner-Ansicht mit Formelsatz · `mathlib.js` + `vendor/math.js`: math.js
- `ui.js`, `projects.js` (Speicher-Namensraum `mx:`), `pdf.js`, `install.js`, `icons.js`, `app.js`
- `sw.js`: Offline-Cache. **Nach Änderungen `CACHE`-Version erhöhen.**

## Lizenzen
- MatheRechner: MIT (siehe `LICENSE`). Built by Lukas Kopp
- [math.js](https://mathjs.org) von Jos de Jong: Apache License 2.0 (`vendor/LICENSE-mathjs.txt`, `vendor/math.js.LICENSE.txt`).

Kostenloses Hilfsmittel ohne Gewähr.
