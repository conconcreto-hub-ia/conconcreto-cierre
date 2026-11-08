import { describe, it, expect } from "vitest";
import { calcularCruces, traeCifras } from "../cruces";

describe("cruces entre procesos", () => {
  const pyg = { resultadoId: "r1", proceso: "pyg_base", sociedadId: "4811", salidas: [{ clave: "utilidad_ejercicio", etiqueta: "Utilidad del ejercicio", valor: 790_179_259 }, { clave: "mp_reconocido", etiqueta: "MP reconocido", valor: 406_807_234 }] };
  const inv = { resultadoId: "r2", proceso: "inversion", sociedadId: "4811", salidas: [{ clave: "utilidad_ejercicio", etiqueta: "Utilidad del ejercicio", valor: 842_579_259 }, { clave: "mp_reconocido", etiqueta: "MP reconocido", valor: 406_807_234.4 }] };
  it("encuentra la utilidad que no coincide y calcula la diferencia", () => {
    const c = calcularCruces([pyg, inv]);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ clave: "utilidad_ejercicio", procesoA: "inversion", procesoB: "pyg_base", diferencia: 842_579_259 - 790_179_259 });
  });
  it("no cruza un proceso consigo mismo ni sociedades distintas", () => {
    expect(calcularCruces([pyg, { ...inv, proceso: "pyg_base" }])).toHaveLength(0);
    expect(calcularCruces([pyg, { ...inv, sociedadId: "1200" }])).toHaveLength(0);
  });
  it("el orden de entrada no cambia el resultado", () => {
    expect(calcularCruces([inv, pyg])).toEqual(calcularCruces([pyg, inv]));
  });
});

describe("el modelo no escribe cifras", () => {
  it("rechaza plata, porcentajes y números con miles", () => {
    for (const t of ["La diferencia es de $52.400.000", "queda en 52,4 millones", "el 51,485 % de la utilidad", "faltan 1.240.000"]) expect(traeCifras(t)).toBe(true);
  });
  it("deja pasar identificadores y fechas", () => {
    for (const t of ["La cuenta P145010000 no tiene saldo en SAP", "La factura FE-PF-0918 de la sociedad 1300", "el balance del 30 de septiembre de 2026", "la extracción V3"]) expect(traeCifras(t)).toBe(false);
  });
});
