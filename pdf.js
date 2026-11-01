// Minimaler PDF-Erzeuger (PDF 1.4, A4, Standardschrift Helvetica, WinAnsi-Kodierung).
// Keine externen Bibliotheken – funktioniert offline. Zeichen außerhalb von Windows-1252
// (z. B. Ω, φ, ≤) werden durch lesbare Ersatztexte ersetzt.

const REPLACE = {
  "Ω": "Ohm", "φ": "phi", "≤": "<=", "≥": ">=", "√": "sqrt", "✓": "", "✗": "", "ϑ": "theta", "τ": "tau", "π": "pi",
  "η": "eta", "κ": "kappa", "α": "alpha", "β": "beta", "Δ": "Delta ", "−": "-", "→": "->", "↔": "<->", "★": "*", "☆": "*",
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "ᵢ": "i", "ⱼ": "j",
  " ": " ", " ": " ", "⫴": "||", "⌀": "D",
  "μ": "\u00b5", "σ": "sigma", "λ": "lambda", "ω": "omega", "ρ": "rho", "ν": "ny", "δ": "delta", "γ": "gamma", "ε": "eps", "Σ": "Summe ",
  "≈": "~", "≠": "!=", "∞": "unendlich",
};
// Windows-1252: Sonderbelegung 0x80–0x9F.
const CP1252 = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99 };

// Hochgestellte Folgen, die nicht in Windows-1252 liegen (z. B. ⁻⁶), als „^-6“ schreiben; ² und ³ bleiben erhalten.
const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
const supRuns = (t) => String(t).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => (/^[¹²³]+$/.test(m) ? m : "^" + [...m].map((c) => SUP[c]).join("")));

function encode(text) {
  let out = "";
  for (const ch of supRuns(text)) {
    if (REPLACE[ch] !== undefined) { out += encode(REPLACE[ch]); continue; }
    const c = ch.codePointAt(0);
    let b;
    if (c < 0x80) b = c;
    else if (CP1252[ch]) b = CP1252[ch];
    else if (c >= 0xa0 && c <= 0xff) b = c;
    else b = 0x3f; // "?"
    if (b === 0x28 || b === 0x29 || b === 0x5c) out += "\\";
    out += String.fromCharCode(b);
  }
  return out;
}

// Grobe Zeichenbreite für Helvetica (Anteil der Schriftgröße) – für Zeilenumbruch und Rechtsbündigkeit.
const charW = (ch) => (/[il.,:;'|!]/.test(ch) ? 0.28 : /[mwMW]/.test(ch) ? 0.83 : /[A-Z]/.test(ch) ? 0.67 : /[0-9]/.test(ch) ? 0.556 : ch === " " ? 0.278 : 0.5);
const textW = (t, size) => [...String(t)].reduce((a, ch) => a + charW(ch), 0) * size;
function wrap(text, size, width) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (textW(t, size) > width && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/**
 * doc = { title, subtitle, blocks: [{ heading?, rows?: [[label, value]], text? , big? }], footer }
 * Gibt die PDF-Datei als Uint8Array zurück.
 */
export function buildPdf(doc) {
  const W = 595.28, H = 841.89, M = 50, CONTENT_W = W - 2 * M;
  const pages = [];
  let ops = [], y = H - M;
  const newPage = () => { if (ops.length) pages.push(ops); ops = []; y = H - M; };
  const need = (h) => { if (y - h < M + 30) newPage(); };
  const text = (x, yy, s, size, bold = false, gray = 0) =>
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${gray} g ${x.toFixed(2)} ${yy.toFixed(2)} Td (${encode(s)}) Tj ET`);
  const line = (yy) => ops.push(`0.8 G 0.5 w ${M} ${yy.toFixed(2)} m ${W - M} ${yy.toFixed(2)} l S`);

  text(M, y - 18, doc.title, 18, true); y -= 26;
  if (doc.subtitle) { for (const l of wrap(doc.subtitle, 9, CONTENT_W)) { text(M, y - 9, l, 9, false, 0.35); y -= 12; } }
  y -= 8;

  for (const b of doc.blocks) {
    if (b.big) { need(30); y -= 8; text(M, y - 14, b.big, 14, true); y -= 20; if (b.text) { text(M, y - 9, b.text, 9, false, 0.35); y -= 14; } continue; }
    if (b.heading) { need(28); y -= 6; text(M, y - 9, b.heading.toUpperCase(), 9, true, 0.35); y -= 14; }
    if (b.text) { for (const l of wrap(b.text, 9, CONTENT_W)) { need(12); text(M, y - 9, l, 9, false, 0.25); y -= 12; } }
    for (const [label, value] of b.rows ?? []) {
      const lab = wrap(label, 10, CONTENT_W * 0.55), val = wrap(value, 10, CONTENT_W * 0.42);
      const n = Math.max(lab.length, val.length);
      need(n * 13 + 4);
      for (let i = 0; i < n; i++) {
        if (lab[i]) text(M, y - 10, lab[i], 10);
        if (val[i]) text(W - M - textW(val[i], 10), y - 10, val[i], 10, true);
        y -= 13;
      }
      y -= 3; line(y); y -= 3;
    }
  }
  if (doc.footer) { need(40); y -= 14; for (const l of wrap(doc.footer, 8, CONTENT_W)) { need(10); text(M, y - 8, l, 8, false, 0.4); y -= 10; } }
  pages.push(ops);

  // Seitenzahlen
  pages.forEach((p, i) => p.push(`BT /F1 8 Tf 0.5 g ${(W - M - 40).toFixed(2)} 25 Td (${encode(`Seite ${i + 1}/${pages.length}`)}) Tj ET`));

  // Objekte zusammensetzen
  const objs = [];
  const add = (s) => { objs.push(s); return objs.length; };
  const catalog = add(null), pagesObj = add(null);
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids = [];
  for (const p of pages) {
    const stream = p.join("\n");
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0));
}

// PDF über das Teilen-Menü (iPhone/iPad/Android) ausgeben, sonst herunterladen.
export async function sharePdf(filename, doc) {
  const file = new File([buildPdf(doc)], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: doc.title }); return "shared"; }
    catch (e) { if (e.name === "AbortError") return "aborted"; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return "downloaded";
}

const UMLAUT = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };
export const safeFilename = (s) => String(s).replace(/[äöüÄÖÜß]/g, (c) => UMLAUT[c]).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "Berechnung";
