import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { conciliarFiducia, lineasDeLibro, leerTxt, patrimonioDelArchivo, periodoTxt, type Comparacion } from "../motores/fiducia";
import { leerSap, leerHomologacion, journal } from "../motores/fiducia-archivos";
import { abrir } from "../xlsx";
import { aCentavos, redondearPesos } from "../motores/pesos";

const ENT = path.join(__dirname, "..", "..", "..", "datos-reales", "entradas", "laura");
const ESP = path.join(__dirname, "..", "..", "..", "datos-reales", "esperado", "laura.json");
const hayDatos = fs.existsSync(ESP);

describe("pesos", () => {
  it("lee los formatos del TXT", () => {
    expect(aCentavos("1,751,040,900.22")).toBe(175104090022);
    expect(aCentavos("974,592,291.00-")).toBe(-97459229100);
    expect(aCentavos("-0.5")).toBe(-50);
  });
  it("redondea a pesos lejos de cero", () => {
    expect(redondearPesos(10008341)).toBe(10008300);
    expect(redondearPesos(50)).toBe(100);
    expect(redondearPesos(-50)).toBe(-100);
    expect(redondearPesos(-149)).toBe(-100);
  });
});

describe("conciliación de fiduciaria · reglas", () => {
  const txt = ["Periodo: 202609",
    "1\t\tACTIVO\t100.00\t0.00\t0.00\t100.00",
    "11\t\tDISPONIBLE\t100.00\t0.00\t0.00\t100.00",
    "11150502051\t\tBANCO\t100.40\t0.00\t0.00\t100.40",
    "39150001001\t\tGANANCIA\t-5.00\t0.00\t0.00\t-5.00",
    "59050001001\t\tGANANCIAS\t5.00\t0.00\t0.00\t5.00",
    "13020501001\t\tNUEVA SIN HOMOLOGAR\t1.00\t0.00\t0.00\t1.00"].join("\n");
  const base = {
    txtNombre: "1-FIDEICOMISO PRUEBA Sin terceros.txt", txt, mes: "2026.09",
    sap: [{ cebe: "X1", cuenta: "P111005000", nombre: "BANCOS", l1: 10000, l2: 10000 }, { cebe: "X1", cuenta: "PF1", nombre: "FLUJO", l1: 5, l2: 5 }],
    homologacion: [{ fiducia: "31", puf: "11150502051", puc: "P111005000" }],
    proyectos: [{ cebe: "X1", fiducia: "31", nombre: "FIDEICOMISO PRUEBA" }],
  };
  it("toma la última subcuenta, excluye 59+ y 3915, y se detiene si falta homologación", () => {
    const r = conciliarFiducia(base);
    expect(r.detalle.map((d) => d.cuenta)).toEqual(["11150502051", "39150001001", "59050001001", "13020501001"]);
    expect(r.excluidas.map((d) => d.cuenta)).toEqual(["39150001001", "59050001001"]);
    expect(r.estado).toBe("bloqueado");
    expect(r.bloqueos[0]).toMatch(/sin homologación: 13020501001/);
    expect(r.cebe).toBe("X1");
  });
  it("cuadra si solo hay redondeo, y deja fuera las PF", () => {
    const r = conciliarFiducia({ ...base, txt: txt.replace(/^13020501001.*$/m, "") });
    expect(r.comparacion).toHaveLength(1);
    expect(r.comparacion[0].txtRedondeado).toBe(10000);
    expect(r.pfExcluidas.map((p) => p.cuenta)).toEqual(["PF1"]);
    expect(r.estado).toBe("cuadra");
  });
  it("se detiene si el TXT es de otro mes", () => {
    const r = conciliarFiducia({ ...base, txt: txt.replace("202609", "202608") });
    expect(r.estado).toBe("bloqueado");
    expect(r.bloqueos.join(" ")).toMatch(/202608/);
  });
  it("el descuadre por redondeo va a P429581000 y no puede pasar de $10", () => {
    const comp = (d: number[]): Comparacion[] => d.map((x, i) => ({ cuenta: `P${i}`, nombre: "", txt: 0, txtRedondeado: 0, l1: 0, dif1: x, l2: 0, dif2: x, enSap: true }));
    const ok = lineasDeLibro(comp([500, -300, -300]), "dif1");
    expect(ok.descuadre).toBe(-100);
    expect(ok.lineas.find((l) => l.cuenta === "P429581000")?.valor).toBe(100);
    expect(lineasDeLibro(comp([5000, -3000, -900]), "dif1").descuadre).toBe(1100);
    expect(lineasDeLibro(comp([5000, -3000, -900]), "dif1").lineas).toEqual([]);
  });
  it("lee el periodo y el nombre del patrimonio", () => {
    expect(periodoTxt("x\nRango de fechas : 2026/09/01 - 2026/09/30")).toBe("202609");
    expect(patrimonioDelArchivo("297638-FIDEICOMISO CONTREE CASTROPOL Sin terceros.txt")).toBe("FIDEICOMISO CONTREE CASTROPOL");
    expect(patrimonioDelArchivo("1234 PA MONTEBIANCO (sin auxiliares).txt")).toBe("PA MONTEBIANCO");
  });
  it("una fiducia sin lector registrado prueba los lectores en orden (ancho fijo)", () => {
    const r = leerTxt("11100501 BANCOS                 1,000.00   500.00   200.00   1,300.00", "99");
    expect(r.lector).toMatch(/Ancho fijo/);
    expect(r.filas[0].sf).toBe(130000);
  });
});

describe.skipIf(!hayDatos)("conciliación de fiduciaria · reproduce la prueba de Laura (Contree Castropol, sept-2026)", async () => {
  const esp = hayDatos ? JSON.parse(fs.readFileSync(ESP, "utf8")) : null;
  const nombreTxt = "297638-FIDEICOMISO CONTREE CASTROPOL Sin terceros.txt";
  const r = hayDatos ? conciliarFiducia({
    txtNombre: nombreTxt, txt: fs.readFileSync(path.join(ENT, nombreTxt), "utf8"), mes: "2026.09",
    sap: await leerSap(fs.readFileSync(path.join(ENT, "SAP Septiembre.xlsx"))),
    ...(await leerHomologacion(fs.readFileSync(path.join(ENT, "Homologación PUF – PUC.xlsx")))),
    umbral: 1_000_000_000,
  }) : null!;

  it("encuentra el CEBE y la fiducia en la hoja Proyectos", () => {
    expect(r.cebe).toBe("411PA119");
    expect(r.fiducia).toBe("31");
    expect(r.fecha).toBe("2026-09-30");
  });
  it("toma las mismas últimas subcuentas y excluye las mismas", () => {
    expect(r.detalle).toHaveLength(66);
    expect(r.excluidas.map((d) => d.cuenta).sort()).toEqual(["39150001001", "39200001001", "59050001001", "59050001002"]);
    expect(r.sinHomologacion).toEqual([]);
    expect(r.pfExcluidas.map((p) => p.cuenta)).toEqual(["PF21000200", "PF21000099"]);
  });
  it("la comparación es idéntica, cuenta por cuenta", () => {
    expect(r.comparacion.map((c) => c.cuenta)).toEqual(esp.comparacion.map((c: { cuenta: string }) => c.cuenta));
    for (const [i, c] of r.comparacion.entries()) {
      const e = esp.comparacion[i];
      expect(c.txt / 100).toBeCloseTo(e.txt, 2);
      expect([c.txtRedondeado / 100, c.l1 / 100, c.dif1 / 100, c.l2 / 100, c.dif2 / 100]).toEqual([e.txtRedondeado, e.l1, e.dif1, e.l2, e.dif2]);
    }
  });
  it("descuadre de 1 peso por libro, llevado a P429581000", () => {
    expect(r.libros!.L1.descuadre).toBe(-100);
    expect(r.libros!.L2.descuadre).toBe(-100);
    expect(r.libros!.L1.lineas.find((l) => l.cuenta === "P429581000")!.valor).toBe(500);
  });
  it("los mismos ajustes y journals con débitos = créditos = 38.040.954.018 (L1) y 36.004.079.113 (L2)", () => {
    const mio = (["L1", "L2"] as const).flatMap((k, j) => r.libros![k].lineas.map((l) => ({ libro: `Libro ${j + 1}`, cuenta: l.cuenta, debito: l.valor > 0 ? l.valor / 100 : null, credito: l.valor < 0 ? -l.valor / 100 : null })));
    expect(mio).toEqual(esp.ajuste);
    expect(r.libros!.L1.lineas).toHaveLength(18);
    expect(r.libros!.L2.lineas).toHaveLength(19);
    expect(r.libros!.L1.debitos / 100).toBe(38_040_954_018);
    expect(r.libros!.L1.creditos / 100).toBe(38_040_954_018);
    expect(r.libros!.L2.debitos / 100).toBe(36_004_079_113);
    expect(r.libros!.L2.creditos / 100).toBe(36_004_079_113);
  });
  it("el journal que genera es el suyo, línea por línea", async () => {
    for (const [k, e] of [["L1", esp.journal1], ["L2", esp.journal2]] as const) {
      const wb = await abrir(await journal(r, r.libros![k]));
      const ws = wb.getWorksheet("Data")!;
      const lineas = [];
      for (let f = 12; f < 12 + r.libros![k].lineas.length; f++) {
        const row = ws.getRow(f);
        lineas.push({ cuenta: row.getCell(17).value, debe: row.getCell(19).value ?? null, haber: row.getCell(20).value ?? null, cebe: row.getCell(26).value, asociada: row.getCell(33).value ? String(row.getCell(33).value) : "" });
      }
      expect(lineas).toEqual(e.lineas);
      const cab = ws.getRow(12);
      expect([2, 3, 6, 7, 8, 9, 12].map((c) => (cab.getCell(c).value === null ? "" : String(cab.getCell(c).value)))).toEqual(e.cabecera);
    }
  });
  it("AGREGADO · marca para revisión los $12.435 millones de P145010000, que no tiene saldo en SAP", () => {
    const m = r.marcadas.find((x) => x.cuenta === "P145010000")!;
    expect(m.dif1 / 100).toBe(12_435_000_000);
    expect(m.motivo).toMatch(/no tiene saldo en SAP/);
    expect(r.marcadas.map((x) => x.cuenta)).toContain("P238095002");
    expect(r.estado).toBe("no_cuadra");
  });
  it("AGREGADO · avisa que P238095002 (partes relacionadas) no termina en 0002 y queda sin sociedad asociada", () => {
    expect(r.observaciones.join(" ")).toMatch(/P238095002.*no termina en 0002/);
  });
});
