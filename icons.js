// Einheitliche Strich-Icons (24 × 24, weiße Linien) für die Startseite.
// Jedes Icon ist eine Liste von SVG-Elementen: Pfad-Strings oder ["circle", cx, cy, r].

const gear = (cx, cy, r, teeth, rt = 2.4) => {
  const out = [["circle", cx, cy, r]];
  for (let k = 0; k < teeth; k++) {
    const a = (2 * Math.PI * k) / teeth, c = Math.cos(a), s = Math.sin(a);
    out.push(`M${(cx + r * c).toFixed(2)} ${(cy + r * s).toFixed(2)}L${(cx + (r + rt) * c).toFixed(2)} ${(cy + (r + rt) * s).toFixed(2)}`);
  }
  return out;
};

export const ICONS = {
  fx: ["M6 2.5h12v19H6z", "M8 5h8v4.5H8z", "M8.5 12.5h.01", "M12 12.5h.01", "M15.5 12.5h.01", "M8.5 15.5h.01", "M12 15.5h.01", "M15.5 15.5h.01", "M8.5 18.5h.01", "M12 18.5h3.5"],
  calc: ["M6 3h12v18H6z", "M8.5 6h7v3h-7z", "M9 13h.01", "M12 13h.01", "M15 13h.01", "M9 17h.01", "M12 17h.01", "M15 17h.01"],
  graph: ["M3 3v18h18", "M5 17c3-9 5-11 7-6s4 4 7-7"],
  poly: ["M3 20h18", "M5 4c2 14 12 14 14 0"],
  ineq: ["M3 12h18", "M7 8 4 12l3 4", "M17 8l3 4-3 4", "M10 12h4"],
  linsys: ["M4 7h16", "M4 12h16", "M4 17h16", "M9 4l6 16"],
  solver: ["M5 9h14", "M5 15h14", ["circle", 12, 12, 9]],
  deriv: ["M3 19c5 0 7-14 18-14", "M8 16l8-8", "M16 8h-3", "M16 8v3"],
  integral: ["M10 21c-2 0-2-2-2-2V5s0-2 2-2 2 2 2 2", "M14 21c1 0 2-1 2-2", "M8 3c-1 0-2 1-2 2"],
  sum: ["M17 4H7l6 8-6 8h10"],
  table: ["M4 4h16v16H4z", "M12 4v16", "M4 9h16", "M4 14.5h16"],
  curve: ["M3 18c3 0 4-12 7-12s3 12 6 12 3-6 5-6", ["circle", 10, 6, 1.6], ["circle", 16, 18, 1.6]],
  matrix: ["M7 4H4v16h3", "M17 4h3v16h-3", "M8.5 9h.01", "M15.5 9h.01", "M8.5 15h.01", "M15.5 15h.01"],
  vectors: ["M4 20 18 6", "M12 6h6v6", "M4 20h14"],
  stats: ["M5 20V12", "M10 20V6", "M15 20v-9", "M20 20V4", "M3 20h18"],
  regression: ["M3 21h18", "M3 3v18", ["circle", 7, 16, 1.3], ["circle", 11, 13, 1.3], ["circle", 14, 11, 1.3], ["circle", 18, 7, 1.3], "M5 18 20 5"],
  distrib: ["M3 19h18", "M3 19c4 0 5-13 9-13s5 13 9 13"],
  combi: [["circle", 7, 8, 2.5], ["circle", 17, 8, 2.5], ["circle", 12, 17, 2.5], "M9 9.5 11 15", "M15 9.5 13 15", "M9.5 8h5"],
  numtheory: ["M9 4 7 20", "M17 4l-2 16", "M4 9h16", "M3.5 15h16"],
  bases: ["M4 8h4v8H4z", "M12 8v8", "M16 8h4v8h-4z"],
  complex: ["M3 12h18", "M12 3v18", "M12 12l6-6", ["circle", 18, 6, 1.6]],
  units: ["M3 9h18v6H3z", "M7 9v3", "M11 9v3", "M15 9v3", "M19 9v2"],
  constants: ["M5 7h14", "M9 7v12", "M15 7v9a3 3 0 0 0 3 3"],
  projects: ["M3 6.5h6.5l2 2.3H21V19H3z"],
  install: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  settings: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9", ["circle", 15, 7, 2], ["circle", 9, 17, 2]],
};

const NS = "http://www.w3.org/2000/svg";
export function svgIcon(name) {
  const svg = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "19", height: "19", fill: "none", stroke: "#fff",
    "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(k, v);
  for (const el of ICONS[name] ?? []) {
    const node = typeof el === "string" ? document.createElementNS(NS, "path") : document.createElementNS(NS, el[0]);
    if (typeof el === "string") node.setAttribute("d", el);
    else { node.setAttribute("cx", el[1]); node.setAttribute("cy", el[2]); node.setAttribute("r", el[3]); }
    svg.append(node);
  }
  return svg;
}
