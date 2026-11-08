import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { basePyg, maestrosDesdeFilas, ordenExcel, G660, CEBE_LLC, CEBE_CC, SOC01, SOC77 } from "../motores/pyg";
import { abrir, filas, hoja } from "../xlsx";
import type { Valor } from "../xlsx";

const ENT = path.join(__dirname, "..", "..", "..", "datos-reales", "entradas", "felipe");
const ESP = path.join(__dirname, "..", "..", "..", "datos-reales", "esperado", "felipe.json");
const hayDatos = fs.existsSync(ESP);

const ENC = ["Cuenta de mayor", "Cuenta de mayor", "Centro de beneficio", "Centro de beneficio", "Mes del año", "Importe actual en moneda sociedad"];

describe("base del PyG · reglas", () => {
  // Un grupo de juguete: CC Proyectos gana 1.000; LLC reconoce 400 (40 %); Constructora reconoce 590 (debería ser 600).
  const ext: Valor[][] = [ENC,
    ["4110", "Ingresos", "77CC01", "CC Proyectos", "202601", -1000],
    ["4150800101", "MP LLC", CEBE_LLC, "LLC", "202601", -400],
    ["4110", "Ingresos LLC", CEBE_LLC, "LLC", "202601", -100],
    ["4150800100", "MP CC", CEBE_CC, "Inversiones", "202601", -300],
    ["4150800100", "MP CC", CEBE_CC, "Inversiones", "202602", -290],
    ["5110", "Gasto", "01OF01", "Oficina", "202602", 0],
  ];
  const cebes: Valor[][] = [["Sociedad", "CeBe"],
    [SOC77, "77CC01", "", "CC Proyectos", "", "", "", "", "", ""],
    [SOC01, CEBE_LLC, "", "Inversión LLC", "", "", "", "", "", ""],
    [SOC01, CEBE_CC, "", "Inversión CC", "", "", "", "", "", ""],
    [SOC01, "01OF01", "", "Oficina", "", "", "", "", "", ""]];
  const cuentas: Valor[][] = [["ESFS", "Cuenta"],
    ["", "4110", "Ingresos", "410_Ingresos"], ["", "4150800101", "MP", G660], ["", "4150800100", "MP", G660], ["", "5110", "Gasto", "510_Gastos"]];

  it("quita los ceros, aplica el factor de LLC y lleva la diferencia a la última fila de 01I1OI0205", () => {
    const r = basePyg(ext, maestrosDesdeFilas(cebes, cuentas), 0.4);
    expect([r.filasOriginales, r.filasCero, r.filasOptimizado]).toEqual([6, 1, 5]);
    expect(r.utilidadCCP).toBe(1000);
    expect(r.utilidadLLC).toBe(400);
    expect(r.factor).toBeCloseTo(0, 10); // LLC sin CC Proyectos = 400 − 0,4 × 1.000 = 0
    expect(r.mpMetodo).toBe(590);
    expect(r.mpCalculo).toBeCloseTo(600, 9);
    expect(r.diferencia).toBeCloseTo(-10, 9);
    const cc = r.base.filter((b) => b.cebe === CEBE_CC);
    expect(cc.map((b) => [b.mes, b.ajustado])).toEqual([[1, 0], [2, r.diferencia]]);
    expect(r.ajustes).toBe(3);
    expect(Math.abs(r.check)).toBeLessThanOrEqual(1);
    expect(r.estado).toBe("cuadra");
    expect(r.base.find((b) => b.cebe === "77CC01")!.ajustado).toBe(1000); // Valor ajustado = −Valor
  });
  it("se detiene y lista los maestros que faltan", () => {
    const r = basePyg(ext, maestrosDesdeFilas(cebes.slice(0, 3), cuentas));
    expect(r.estado).toBe("bloqueado");
    expect(r.faltantes.cebes.map((c) => c.codigo).sort()).toEqual([CEBE_CC]);
  });
  it("se detiene si la extracción no tiene las 6 columnas de SAP o mezcla años", () => {
    expect(basePyg([["Cuenta", "x"], ["1", "2"]], maestrosDesdeFilas(cebes, cuentas)).estado).toBe("bloqueado");
    const dos = [...ext, ["4110", "Ingresos", "77CC01", "CC Proyectos", "202512", -5]];
    expect(basePyg(dos, maestrosDesdeFilas(cebes, cuentas)).bloqueos[0]).toMatch(/más de un año/);
  });
  it("ordena como una tabla dinámica: números antes que texto", () => {
    expect([ "E415535000", 5305250006, "a1", 4110 ].sort(ordenExcel)).toEqual([4110, 5305250006, "a1", "E415535000"]);
  });
});

describe.skipIf(!hayDatos)("base del PyG · reproduce la prueba de Felipe (septiembre 2026, V3)", async () => {
  const esp = hayDatos ? JSON.parse(fs.readFileSync(ESP, "utf8")) : null;
  let r: ReturnType<typeof basePyg> = null!;
  if (hayDatos) {
    const ex = await abrir(fs.readFileSync(path.join(ENT, "Base SAP PyG septiembre 2026 V3.xlsx")));
    const ma = await abrir(fs.readFileSync(path.join(ENT, "Base de información para PyG.xlsx")));
    r = basePyg(filas(ex.worksheets[0]), maestrosDesdeFilas(filas(hoja(ma, "Base Centros de Beneficio")!), filas(hoja(ma, "Base Cuentas")!)), 0.48515);
  }

  it("47.273 filas originales, 8.357 en cero, 38.916 finales", () => {
    expect([r.filasOriginales, r.filasCero, r.filasOptimizado, r.filasBase]).toEqual([47273, 8357, 38916, 38916]);
    expect(r.anio).toBe("2026");
    expect(r.mesCierre).toBe(9);
  });
  it("16 filas «Ajuste»", () => expect(r.ajustes).toBe(16));
  it("utilidad de CC Proyectos $790.179.259, factor de LLC 1,0940 y diferencia de −$16.557", () => {
    expect(r.utilidadCCP).toBe(790_179_259);
    expect(r.utilidadLLC).toBe(esp.utilidadLLC);
    expect(r.factor.toFixed(4)).toBe("1.0940");
    expect(r.factor).toBeCloseTo(esp.factor, 12);
    expect(r.mpMetodo).toBe(esp.mpCC);
    expect(Math.round(r.diferencia)).toBe(-16_557);
    expect(r.diferencia).toBeCloseTo(esp.diferencia, 6);
  });
  it("check en 0", () => {
    expect(Math.abs(r.check)).toBeLessThanOrEqual(1);
    expect(r.checkPesos).toBe(0);
    expect(r.estado).toBe("cuadra");
  });
  it("la misma base, fila por fila y en el mismo orden", () => {
    expect(r.base).toHaveLength(esp.base.length);
    for (const [i, b] of r.base.entries()) {
      const e = esp.base[i];
      if (b.mes !== e.mes || b.cebe !== e.cebe || String(b.cuenta) !== e.cuenta || b.ajuste !== e.marca) throw new Error(`fila ${i + 3}: ${b.mes}|${b.cebe}|${b.cuenta}|${b.ajuste} ≠ ${e.mes}|${e.cebe}|${e.cuenta}|${e.marca}`);
      expect(b.valor).toBe(e.valor);
      if (Math.abs(b.ajustado - e.ajustado) > 1e-6) throw new Error(`fila ${i + 3}: ajustado ${b.ajustado} ≠ ${e.ajustado}`);
    }
  });
  it("las sumas por sociedad son las de su tabla dinámica", () => {
    expect(r.porSociedad.map((s) => s.sociedad)).toEqual([SOC01, SOC77]);
    expect(r.porSociedad[0].valor).toBe(esp.porSociedad[0][1]);
    expect(r.porSociedad[1].valor).toBe(esp.porSociedad[1][1]);
    expect(r.porSociedad[0].ajustado).toBeCloseTo(esp.porSociedad[0][2], 4);
  });
});
