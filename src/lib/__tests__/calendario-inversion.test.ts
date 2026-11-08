import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { festivos, fechaDiaHabil, diaHabilDe, pascua } from "../calendario";
import { conciliarInversion, leerInversion } from "../motores/inversion";
import { abrir } from "../xlsx";

describe("calendario del cierre", () => {
  it("Pascua", () => {
    expect(pascua(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(pascua(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });
  it("los festivos de 2026 en Colombia", () => {
    expect([...festivos(2026)].sort()).toEqual([
      "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15",
      "2026-06-29", "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
    ]);
  });
  it("el cierre de septiembre: día 1 jueves 1 de octubre, día 3 lunes 5 de octubre", () => {
    expect(fechaDiaHabil("2026-09", 1).toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(fechaDiaHabil("2026-09", 3).toISOString().slice(0, 10)).toBe("2026-10-05");
  });
  it("el cierre de octubre se salta el festivo del 2 de noviembre", () => {
    expect(fechaDiaHabil("2026-10", 1).toISOString().slice(0, 10)).toBe("2026-11-03");
  });
  it("el cierre de diciembre cruza el año", () => {
    expect(fechaDiaHabil("2026-12", 1).toISOString().slice(0, 10)).toBe("2027-01-04");
  });
  it("qué día hábil es hoy", () => {
    expect(diaHabilDe("2026-09", new Date("2026-09-30T00:00:00Z"))).toBe(0);
    expect(diaHabilDe("2026-09", new Date("2026-10-04T00:00:00Z"))).toBe(2); // domingo
    expect(diaHabilDe("2026-09", new Date("2026-10-05T00:00:00Z"))).toBe(3);
  });
});

describe("inversión contra patrimonio · motor de demostración", async () => {
  const e = leerInversion(await abrir(fs.readFileSync(path.join(__dirname, "..", "..", "..", "datos-demo", "Inversion_Patrimonio_2026-09.xlsx"))));
  const r = conciliarInversion(e);
  const s = (c: string) => r.subsidiarias.find((x) => x.codigo === c)!;

  it("CCC Proyectos: el método quedó sobre la utilidad del PyG, no la del balance", () => {
    const l = s("4811").lineas.find((x) => x.concepto === "resultado")!;
    expect(l.esperado).toBe(Math.round(0.51485 * 842_579_259));
    expect(l.registrado).toBe(406_807_234);
    expect(l.dif).toBe(l.esperado - 406_807_234);
    expect(l.marcada).toBe(true);
    expect(s("4811").resultadoCop).toBe(842_579_259);
  });
  it("Inmobiliaria: el ORI no se reconoció", () => {
    const l = s("1200").lineas.find((x) => x.concepto === "ori")!;
    expect(l.dif).toBe(85_300_000);
    expect(s("1200").estado).toBe("no_cuadra");
  });
  it("Prefabricados: diferencia chica, bajo el umbral", () => {
    const l = s("1300").lineas.find((x) => x.concepto === "base")!;
    expect(l.dif).toBe(1_240_000);
    expect(l.marcada).toBe(false);
  });
  it("las que cuadran, cuadran (también la que está en dólares)", () => {
    for (const c of ["1100", "1400", "2000"]) expect(s(c).estado).toBe("cuadra");
  });
  it("Andes Builders USA: sin balance, queda bloqueada", () => {
    expect(s("3000").estado).toBe("bloqueado");
    expect(s("3000").mensaje).toMatch(/Falta el patrimonio/);
  });
  it("el asiento propuesto suma igual en débitos y créditos", () => {
    for (const x of r.subsidiarias) expect(x.asiento.reduce((a, l) => a + l.debito, 0)).toBe(x.asiento.reduce((a, l) => a + l.credito, 0));
    expect(s("1200").asiento.map((l) => [l.cuenta, l.debito > 0 ? "D" : "C"])).toEqual([["1205050000", "D"], ["3815050000", "C"]]);
  });
  it("el total es la suma de los conceptos", () => {
    for (const x of r.subsidiarias.filter((y) => y.estado !== "bloqueado")) expect(x.total.dif).toBe(x.lineas.reduce((a, l) => a + l.dif, 0));
  });
});
