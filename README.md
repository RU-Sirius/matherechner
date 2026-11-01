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

## Funktionen (v1.6.3)

**Rechnen**
- **Startansicht wählbar** (Einstellungen: Liste, Rechner oder zuletzt verwendet); die Rechner-Ansicht passt sich der Bildschirmhöhe an – kein Scrollen
- **Startseite mit Umschalter „Liste | Rechner“:** Im Rechner-Modus zeigt die App nur das Rechnergehäuse
- **Rechner-Modi im Display wie bei einem Schulrechner** (MENU, Auswahl per Zifferntaste 1–9, danach Buchstaben A, B … über ALPHA bzw. Tastatur; alle Modi ohne Scrollen sichtbar, auch auf kleinen iPhones): keine Eingabefelder, sondern LCD-Bildschirme mit
  nummerierten Menüs, Koeffizienten- und Datentabellen, Bearbeitungszeile unten; ◀▶▲▼ bewegen den Cursor, = übernimmt bzw. rechnet, AC führt zurück
  - **Berechnen**, **Komplex** (CMPLX; i über die Taste ENG, r∠φ über OPTN → ∠; S⇔D wechselt a+bi ↔ r∠θ), **Basis-N** (Eingabe Dez/Hex/Bin/Okt, Ergebnis ganzzahlig in allen vier Systemen)
  - **Matrix** (vier Matrizen MatA–MatD bis 4 × 4; Matrix-Rechnung mit frei eingegebenen Ausdrücken wie MatA×MatB+MatC, MatA⁻¹, MatA², det(, Trn(, Ident(, Rang(, MatAns – MatA–D über ALPHA A–D oder OPTN; exakte Brüche; Rang, det und Eigenwerte je Matrix), **Vektor** (VctA/VctB 2D/3D; Betrag, Skalar-/Kreuzprodukt, Winkel, Summe/Differenz, Einheitsvektor)
  - **Statistik** (1 Variable oder Regression linear/quadratisch/log/exp/Potenz; x/y-Datentabelle), **Verteilung** (Normal-VD/-VK, Invers Normal, Binomial-VD/-VK, Poisson-VD/-VK)
  - **Tabelle** (f(x), g(x), Start/Ende/Schritt, max. 200 Zeilen), **Gleichung** (Gleichungssystem 2–4 Unbekannte, Polynom Grad 2–6, Ungleichung Grad 1–4)
  - **Plotter** (f und g im Display, Spur mit ◀▶, Zoom mit +/−; immer im Bogenmaß) und **Kurvendiskussion** (f′, f″, Nullstellen, Extrema, Wendepunkte)
  - Eingaben der Modi bleiben gespeichert; die Listenansicht der App bietet dieselben Werkzeuge weiterhin als Formulare
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
- Teiler, Primfaktoren, ggT/kgV · Zahlensysteme (Bin/Okt/Dez/Hex, beliebig groß) · **komplexe Zahlen**: z₁ ± z₂, z₁·z₂, z₁/z₂, zⁿ, √z, 1/z, konjugiert, Betrag/Argument, freier Ausdruck – Ergebnisse kartesisch und polar; Eingabe auch als r∠φ (auch im Taschenrechner, ∠ unter OPTN)

**Grafik**
- Funktionsplotter für bis zu 4 Funktionen, Verschieben und Zoomen per Maus oder Finger
- Automatische Schieberegler für Parameter (z. B. a·sin(b·x))
- Nullstellen, Hoch-/Tief-/Sattelpunkte und Schnittpunkte im sichtbaren Bereich, Spur mit Funktionswerten
- Fläche unter f1 mit Integralwert
- Ableitung f1′ einblendbar (gestrichelt) · Parameterkurven x(t), y(t) und Polarkurven r(t)

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
- Geraden & Ebenen: Lage zweier Geraden (schneidend/parallel/identisch/windschief, Schnittpunkt, Abstand, Winkel), Gerade–Ebene, Ebene–Ebene (Schnittgerade), Abstand Punkt–Ebene/Gerade mit Lotfußpunkt, Ebene aus Parameterform oder 3 Punkten (Koordinaten- und Hessesche Normalenform)

**Statistik & Wahrscheinlichkeit**
- 1-Variablen-Statistik mit Häufigkeiten, Quartilen, Modus
- Regression: linear, quadratisch, exponentiell, logarithmisch, Potenz
- Normal-, Binomial- und Poisson-Verteilung (Wahrscheinlichkeiten, Quantile)
- Kombinatorik (nCr, nPr, mit Wiederholung, n!)
- Signifikanztest (Binomialverteilung, links-/rechts-/beidseitig): Ablehnungsbereich, tatsächliche Irrtumswahrscheinlichkeit, Fehler 2. Art, Entscheidung
- Zweistufiges Baumdiagramm mit Vierfeldertafel, totaler Wahrscheinlichkeit und Satz von Bayes

**Nachschlagen**
- Einheiten umrechnen · physikalische Konstanten

**Arbeiten mit der App**
- **Suche** auf der Startseite (auch nach Synonymen, z. B. „Wallbox“, „FI“, „pq-Formel“); Enter öffnet den ersten Treffer
- **Zuletzt verwendet**: die letzten Rechner oben auf der Startseite
- **Datensicherung** (Einstellungen): Projekte, Favoriten und Einstellungen als Datei exportieren und wieder einspielen (iPhone: Teilen-Menü → „In Dateien sichern“)
- **Weitere Apps** (Einstellungen): Links zu den anderen Rechnern der Reihe
- Favoriten, Projekte, PDF über das Teilen-Menü (Werte exakt rechtsbündig), Projektberichte, Offline-Betrieb, automatische Updates

## Hinweise
Numerische Verfahren (Nullstellen, Integrale, Eigenwerte) liefern Näherungswerte. Nullstellen- und Punktsuche
erfolgt im angegebenen bzw. sichtbaren Bereich. Quartile: Median der unteren/oberen Datenhälfte.

## Entwicklung
- `mx.js`: Rechenlogik · Tests: `node test.mjs`
- `views.js`, `views2.js`, `views3.js`: Rechner · `geo.js`: Geometrie/Signifikanztest/Baumdiagramm · `extras.js`: Suche, Zuletzt verwendet, Datensicherung · `graph.js`: Funktionsplotter · `fx.js`: Schulrechner-Ansicht mit Formelsatz · `lcdmodes.js`: Rechner-Modi im Display · `mathlib.js` + `vendor/math.js`: math.js
- `ui.js`, `projects.js` (Speicher-Namensraum `mx:`), `pdf.js`, `install.js`, `icons.js`, `app.js`
- `sw.js`: Offline-Cache. **Nach Änderungen `CACHE`-Version erhöhen.**

## Lizenzen
- MatheRechner: MIT (siehe `LICENSE`). Built by R. U. Sirius?
- [math.js](https://mathjs.org) von Jos de Jong: Apache License 2.0 (`vendor/LICENSE-mathjs.txt`, `vendor/math.js.LICENSE.txt`).

Kostenloses Hilfsmittel ohne Gewähr.
