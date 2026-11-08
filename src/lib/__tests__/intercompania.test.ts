import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cruzar, leerAuxiliares, r2 } from "../motores/intercompania";
import { abrir } from "../xlsx";
import esperado from "./intercompania-esperado-2026-09.json";

// Los auxiliares de la demostración S1 (sociedades y cifras inventadas) y lo que dio el script de Python
// de la skill con ese mismo archivo (huella 98dff9c3…). El port tiene que dar exactamente lo mismo.
const ARCHIVO = path.join(__dirname, "..", "..", "..", "datos-demo", "Auxiliares_Intercompania_2026-09.xlsx");

describe("conciliación intercompañía · igual que conciliar.py", async () => {
  const aux = leerAuxiliares(await abrir(fs.readFileSync(ARCHIVO)));
  const r = cruzar(aux);

  it("lee 7 sociedades y 321 partidas", () => {
    expect(aux.sociedades).toHaveLength(7);
    expect(aux.lineas).toHaveLength(321);
    expect(aux.corte).toBe("2026-09-30");
  });
  it("los mismos indicadores", () => expect(r.kpis).toEqual(esperado.kpis));
  it("cuadra igual", () => expect(r.cuadre).toEqual(esperado.cuadre));
  it("los mismos pares", () => expect(r.pares).toEqual(esperado.pares));
  it("las mismas nueve diferencias, con su regla, su monto y su responsable", () => {
    expect(r.diferencias.map((d) => ({ id: d.id, tipo: d.tipo, regla: d.regla, deudor: d.deudor, acreedor: d.acreedor, refs: d.refs, monto: d.monto, monto_abs: d.monto_abs, responsable: d.responsable, detalle: d.detalle, evidencia: d.evidencia.length })))
      .toEqual(esperado.diferencias);
  });
  it("el mismo estado en cada una de las 54 referencias", () => {
    expect(r.referencias.map((f) => ({ ref: f.ref, deudor: f.deudor, acreedor: f.acreedor, tipo: f.tipo, dif: f.dif, estado: f.estado, regla: f.regla, dif_id: f.dif_id }))).toEqual(esperado.referencias);
  });
  it("es determinístico: mismo archivo, misma huella", () => {
    expect(cruzar(aux).huella).toBe(r.huella);
  });
  it("redondea como Python", () => {
    expect(r2(0.125)).toBe(0.13);
    expect(r2(-23520000)).toBe(-23520000);
    expect(r2(-0)).toBe(0);
  });
});
