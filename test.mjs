// node test.mjs – Referenzwerte: exakt herleitbar bzw. mit Python nachgerechnet.
import assert from "node:assert/strict";
import * as M from "./mx.js";
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
let r;
// Rechnen & exakte Darstellung
r = M.evaluate("1/3+1/6"); assert.equal(r.exact, "1/2"); assert.equal(r.decimal, "0.5");
r = M.evaluate("0.1+0.2"); assert.equal(r.exact, "3/10"); assert.equal(r.decimal, "0.3");
r = M.evaluate("7/3"); assert.equal(r.exact, "7/3"); assert.equal(r.mixed, "2 1/3");
r = M.evaluate("√(12)"); assert.equal(r.exact, "2√3"); r = M.evaluate("sqrt(2)/2"); assert.equal(r.exact, "√2/2");
r = M.evaluate("3π/4"); assert.equal(r.exact, "3π/4"); r = M.evaluate("2^10"); assert.equal(r.decimal, "1024");
r = M.evaluate("sin(30)", { deg: true }); assert.equal(r.decimal, "0.5"); r = M.evaluate("asin(1)", { deg: true }); assert.equal(r.decimal, "90");
r = M.evaluate("sin(pi/6)"); assert.equal(r.decimal, "0.5");
const sc = {}; M.evaluate("a = 5", { scope: sc }); r = M.evaluate("2a + Ans", { scope: sc }); assert.equal(r.decimal, "15");
r = M.evaluate("sqrt(-4)"); assert.ok(r.isComplex); assert.equal(r.decimal, "2i");
r = M.evaluate("nCr(5,2) + 5!"); assert.equal(r.decimal, "130"); r = M.evaluate("ln(e^3)"); assert.equal(r.decimal, "3");
assert.throws(() => M.evaluate("2+*"));
assert.deepEqual(M.freeSymbols("a*sin(b*x)+c"), ["a", "b", "c"]); assert.deepEqual(M.freeSymbols("f(x)=x^2+pi"), []);
// Analysis
near(M.integrate(Math.sin, 0, Math.PI), 2, 1e-10); near(M.integrate((x) => x * x, 0, 3), 9, 1e-10);
near(M.integrate((x) => Math.exp(-x * x), -3, 3), 1.7724146965190422, 1e-9);
assert.equal(M.derivative("x^2*sin(x)").toString(), "2 * x * sin(x) + x ^ 2 * cos(x)");
r = M.curveAnalysis("x^3-3x", -3, 3);
assert.equal(r.zeros.length, 3); near(r.zeros[0].x, -Math.sqrt(3), 1e-9); near(r.zeros[1].x, 0, 1e-12); near(r.zeros[2].x, Math.sqrt(3), 1e-9);
assert.equal(r.extrema.length, 2); near(r.extrema[0].x, -1, 1e-9); assert.equal(r.extrema[0].kind, "Hochpunkt"); near(r.extrema[0].y, 2, 1e-9); assert.equal(r.extrema[1].kind, "Tiefpunkt");
assert.equal(r.inflections.length, 1); near(r.inflections[0].x, 0, 1e-9);
r = M.roots(M.compileFn("(x-1)^2"), -5, 5); assert.equal(r.length, 1); near(r[0], 1, 1e-5); // Berührstelle
r = M.roots(M.compileFn("1/x"), -1, 1); assert.equal(r.length, 0); // Polstelle ist keine Nullstelle
near(M.sumProduct((k) => k * k, 1, 10), 385); near(M.sumProduct((k) => k, 1, 5, true), 120);
// Gleichungen
r = M.polyRoots([1, -6, 11, -6]); assert.deepEqual(r.map((z) => z.re), [1, 2, 3]);
r = M.polyRoots([1, 0, 1]); assert.deepEqual(r.map((z) => [z.re, z.im]), [[0, -1], [0, 1]]);
r = M.polyRoots([1, 0, 0, 0, -16]); assert.deepEqual(r.filter((z) => z.im === 0).map((z) => z.re), [-2, 2]);
r = M.quadraticExact(1, -2, -1); assert.deepEqual(r.text, ["1 − √2", "1 + √2"]);
r = M.quadraticExact(1, 0, 4); assert.deepEqual(r.text, ["−2i", "2i"]); r = M.quadraticExact(1, -2, 1); assert.deepEqual(r.text, ["1"]);
r = M.polyInequality([1, 0, -4], "<"); assert.deepEqual(r.intervals, [[-2, 2]]);
r = M.polyInequality([1, 0, -4], ">="); assert.deepEqual(r.intervals, [[-Infinity, -2], [2, Infinity]]);
r = M.polyInequality([1, -2, 1], "<="); assert.deepEqual(r.intervals, []); assert.deepEqual(r.singles, [1]);
r = M.linearSystem([[2, 1], [1, 3]], [3, 5]); assert.equal(r.kind, "unique"); assert.deepEqual(r.x.map(M.fracStr), ["4/5", "7/5"]);
assert.equal(M.linearSystem([[1, 1], [2, 2]], [1, 3]).kind, "none"); assert.equal(M.linearSystem([[1, 1], [2, 2]], [1, 2]).kind, "infinite");
r = M.solveEquation("cos(x) = x", 0, 2); near(r[0], 0.7390851332151607, 1e-12);
// Matrizen & Vektoren
r = M.matInfo([[1, 2], [3, 4]]); near(M.math.number(r.det), -2); assert.equal(r.rank, 2);
assert.deepEqual(r.inverse.map((row) => row.map(M.fracStr)), [["-2", "1"], ["3/2", "-1/2"]]);
r = M.matInfo([[2, 1], [1, 2]]); assert.deepEqual(r.eigenvalues.map((v) => +M.math.number(v).toFixed(10)).sort(), [1, 3]);
assert.equal(M.matInfo([[1, 2], [2, 4]]).rank, 1);
r = M.vectorInfo([1, 0, 0], [0, 1, 0]); assert.deepEqual(r.cross, [0, 0, 1]); near(r.angleDeg, 90); near(M.vectorInfo([3, 4]).normU, 5);
// Statistik
r = M.stats1([1, 2, 3, 4, 5, 6, 7, 8]); near(r.mean, 4.5); near(r.median, 4.5); near(r.q1, 2.5); near(r.q3, 6.5); near(r.sdPop, 2.29128784747792); near(r.sdSample, 2.449489742783178);
r = M.stats1([1, 2, 3, 4, 5, 6, 7]); near(r.q1, 2); near(r.q3, 6); near(r.median, 4);
r = M.stats1([1, 2, 3], [1, 2, 1]); near(r.mean, 2); assert.equal(r.n, 4);
r = M.regression([1, 2, 3, 4], [2, 4, 5, 8], "lin"); near(r.a, 0, 1e-12); near(r.b, 1.9); near(r.r, 0.9811557810392123);
r = M.regression([0, 1, 2, 3, 4], [0, 1, 2, 3, 4].map((t) => 1 + 2 * t + 3 * t * t), "quad"); near(r.a, 1, 1e-9); near(r.b, 2, 1e-9); near(r.c, 3, 1e-9); near(r.r2, 1, 1e-12);
r = M.regression([0, 1, 2, 3], [0, 1, 2, 3].map((t) => 2 * Math.exp(0.5 * t)), "exp"); near(r.a, 2, 1e-12); near(r.b, 0.5, 1e-12);
r = M.regression([1, 2, 4], [1, 2, 4].map((t) => 3 * t ** 1.5), "pow"); near(r.a, 3, 1e-12); near(r.b, 1.5, 1e-12);
// Wahrscheinlichkeit
near(M.normalCdf(1.96), 0.9750021048517796, 1e-12); near(M.normalInv(0.975), 1.959963984540054, 1e-9); near(M.normalCdf(110, 100, 10) - M.normalCdf(90, 100, 10), 0.6826894921370859, 1e-12);
near(M.binomPdf(3, 10, 0.5), 0.1171875, 1e-12); near(M.binomCdf(3, 10, 0.5), 0.171875, 1e-12);
near(M.poissonPdf(2, 3), 0.22404180765538775, 1e-12); near(M.poissonCdf(4, 3), 0.8152632445237721, 1e-12);
// Zahlentheorie
assert.deepEqual(M.factorize(360), [[2, 3], [3, 2], [5, 1]]); assert.deepEqual(M.divisors(28), [1, 2, 4, 7, 14, 28]);
assert.ok(M.isPrime(97)); assert.ok(!M.isPrime(91));
assert.deepEqual(M.convertBase("ff", 16), { dec: "255", bin: "11111111", oct: "377", hex: "FF" });
// Einheiten
near(M.convertUnit(1, "inch", "cm"), 2.54, 1e-12); near(M.convertUnit(100, "degC", "degF"), 212, 1e-9); near(M.convertUnit(1, "kWh", "J"), 3.6e6, 1e-6);
console.log("Alle Tests bestanden.");
// Mehrfache Nullstellen
assert.deepEqual(M.polyRoots([1, -2, 1]).map((z) => z.re), [1, 1]);
assert.deepEqual(M.polyRoots([1, -6, 12, -8]).map((z) => z.re), [2, 2, 2]);
r = M.polyRoots([1, -5, 6, 4, -8]); assert.deepEqual(r.map((z) => z.re), [-1, 2, 2, 2]);
console.log("Mehrfachnullstellen ok.");
// ∫, d/dx, Σ im Ausdruck (Variable x; Referenz: exakt)
let rr = M.evaluate("integral(x^2, 0, 3)"); near(Number(rr.value), 9, 1e-10);
rr = M.evaluate("integral(sin(x), 0, pi)"); near(Number(rr.value), 2, 1e-10);
rr = M.evaluate("ddx(x^3, 2)"); near(Number(rr.value), 12, 1e-9);
rr = M.evaluate("sigma(x^2, 1, 10)"); assert.equal(rr.decimal, "385");
const sc2 = {}; M.evaluate("A = 2", { scope: sc2 }); rr = M.evaluate("integral(A*x, 0, 1)", { scope: sc2 }); near(Number(rr.value), 1, 1e-10);
rr = M.evaluate("ddx(sin(x), 0)", { deg: false }); near(Number(rr.value), 1, 1e-10);
rr = M.evaluate("ddx(sin(x), 0)", { deg: true }); near(Number(rr.value), Math.PI / 180, 1e-12);
rr = M.evaluate("ddx(e^x, 1)"); near(Number(rr.value), Math.E, 1e-9);
console.log("∫/ddx/Σ ok.");
// Fehlende Klammern werden ergänzt
assert.equal(M.autoClose("cos(20"), "cos(20)"); assert.equal(M.autoClose("sqrt(2*(3+1"), "sqrt(2*(3+1))");
assert.equal(M.evaluate("cos(60", { deg: true }).decimal, "0.5"); assert.equal(M.evaluate("2*(3+4").decimal, "14");
console.log("Klammerergänzung ok.");
r = M.quadraticExact(1, -5, 6); assert.deepEqual(r.text, ["2", "3"]); r = M.quadraticExact(2, 1, -1); assert.deepEqual(r.text, ["-1", "1/2"]);
r = M.quadraticExact(1, -2, 5); assert.deepEqual(r.text, ["1 − 2i", "1 + 2i"]);
console.log("Quadratisch exakt zusammengefasst ok.");
