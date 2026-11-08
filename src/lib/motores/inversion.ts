// Inversión contra patrimonio · MOTOR DE DEMOSTRACIÓN, falta validar con Tatiana López.
//
// Tatiana no entregó archivos: este motor tiene la misma forma que el de Laura (dos fuentes, comparación línea a
// línea, diferencias, umbral, ajuste propuesto) y corre con datos inventados. Lo que hay que validar con ella:
// los conceptos en que se parte la inversión, las cuentas del ajuste y el umbral.
//
// Por cada subsidiaria de la inversora (la matriz):
//   esperado   = % de participación × el componente del patrimonio de la subsidiaria (a la TRM de cierre si está en USD),
//                redondeado a pesos
//   registrado = lo que la matriz tiene como inversión, partido en los mismos componentes
//   diferencia = esperado − registrado
// Los componentes: el resultado del ejercicio (método de participación del año), el otro resultado integral
// y el resto del patrimonio (capital, prima, reservas y resultados acumulados).
import type ExcelJS from "exceljs";
import { filas, hoja, texto, type Valor } from "../xlsx";
import { pesosRedondos } from "./pesos";

export const DEMO = true;
export const TOLERANCIA_PESOS = 1;

export type Concepto = "resultado" | "ori" | "base";
export const CONCEPTO: Record<Concepto, string> = {
  resultado: "Resultado del ejercicio (método de participación)",
  ori: "Otro resultado integral",
  base: "Capital, reservas y resultados acumulados",
};
/** Cuentas del ajuste propuesto. Supuestas: confirmar con Tatiana. */
export const CUENTAS = {
  inversion: { cuenta: "1205050000", nombre: "Inversiones en subsidiarias (método de participación)" },
  resultado: { ganancia: { cuenta: "4150800100", nombre: "Ingreso por método de participación" }, perdida: { cuenta: "5313050101", nombre: "Pérdida por método de participación" } },
  ori: { cuenta: "3815050000", nombre: "ORI · método de participación" },
  base: { cuenta: "3705050000", nombre: "Resultados de ejercicios anteriores" },
} as const;

export type Patrimonio = { codigo: string; nombre: string; moneda: string; capital: number; reservas: number; acumulados: number; resultado: number; ori: number };
export type Inversion = { codigo: string; nombre: string; pct: number; saldo: number; mpResultado: number; mpOri: number };
export type EntradaInversion = { corte: string; trm: number; inversora: string; patrimonios: Patrimonio[]; inversiones: Inversion[]; umbral?: number };

export type LineaInv = { concepto: Concepto; base: number; esperado: number; registrado: number; dif: number; marcada: boolean };
export type AsientoLinea = { cuenta: string; nombre: string; debito: number; credito: number };
export type SubsidiariaInv = {
  codigo: string; nombre: string; pct: number; moneda: string; estado: "cuadra" | "no_cuadra" | "bloqueado";
  patrimonioCop: number; resultadoCop: number; lineas: LineaInv[]; total: { esperado: number; registrado: number; dif: number };
  asiento: AsientoLinea[]; mensaje: string | null;
};
export type ResultadoInversion = { demo: true; corte: string; trm: number; inversora: string; umbral: number; subsidiarias: SubsidiariaInv[]; marcadas: number };

export function conciliarInversion(e: EntradaInversion): ResultadoInversion {
  const umbral = e.umbral ?? 20_000_000;
  const pat = new Map(e.patrimonios.map((p) => [p.codigo, p]));
  const subsidiarias: SubsidiariaInv[] = e.inversiones.map((inv) => {
    const p = pat.get(inv.codigo);
    if (!p) {
      return { codigo: inv.codigo, nombre: inv.nombre, pct: inv.pct, moneda: "", estado: "bloqueado", patrimonioCop: 0, resultadoCop: 0, lineas: [], asiento: [],
        total: { esperado: 0, registrado: inv.saldo, dif: 0 }, mensaje: `Falta el patrimonio de ${inv.nombre}: no viene en el balance de subsidiarias.` };
    }
    const k = p.moneda === "USD" ? e.trm : 1;
    const cop = (v: number) => v * k;
    const resto = p.capital + p.reservas + p.acumulados;
    const linea = (concepto: Concepto, baseVal: number, registrado: number): LineaInv => {
      const esperado = pesosRedondos(inv.pct * cop(baseVal));
      const dif = esperado - registrado;
      return { concepto, base: pesosRedondos(cop(baseVal)), esperado, registrado, dif, marcada: Math.abs(dif) >= umbral };
    };
    const lineas = [
      linea("resultado", p.resultado, inv.mpResultado),
      linea("ori", p.ori, inv.mpOri),
      linea("base", resto, inv.saldo - inv.mpResultado - inv.mpOri),
    ];
    const total = { esperado: lineas.reduce((a, l) => a + l.esperado, 0), registrado: inv.saldo, dif: 0 };
    total.dif = total.esperado - total.registrado;
    const asiento: AsientoLinea[] = [];
    for (const l of lineas) {
      if (Math.abs(l.dif) <= TOLERANCIA_PESOS) continue;
      const v = Math.abs(l.dif);
      const contra = l.concepto === "resultado" ? (l.dif > 0 ? CUENTAS.resultado.ganancia : CUENTAS.resultado.perdida) : CUENTAS[l.concepto];
      if (l.dif > 0) asiento.push({ ...CUENTAS.inversion, debito: v, credito: 0 }, { ...contra, debito: 0, credito: v });
      else asiento.push({ ...contra, debito: v, credito: 0 }, { ...CUENTAS.inversion, debito: 0, credito: v });
    }
    const cuadra = lineas.every((l) => Math.abs(l.dif) <= TOLERANCIA_PESOS);
    return { codigo: inv.codigo, nombre: inv.nombre, pct: inv.pct, moneda: p.moneda, estado: cuadra ? "cuadra" : "no_cuadra",
      patrimonioCop: pesosRedondos(cop(resto + p.resultado + p.ori)), resultadoCop: pesosRedondos(cop(p.resultado)), lineas, total, asiento, mensaje: null };
  });
  return { demo: true, corte: e.corte, trm: e.trm, inversora: e.inversora, umbral, subsidiarias, marcadas: subsidiarias.reduce((a, s) => a + s.lineas.filter((l) => l.marcada).length, 0) };
}

const n = (v: Valor | undefined) => Number(v ?? 0) || 0;

/** El Excel de la demostración: hojas «Parámetros», «Patrimonio subsidiarias» e «Inversiones matriz». */
export function leerInversion(wb: ExcelJS.Workbook): EntradaInversion {
  const par = hoja(wb, "Parámetros", "Parametros"), hp = hoja(wb, "Patrimonio subsidiarias"), hi = hoja(wb, "Inversiones matriz");
  if (!par || !hp || !hi) throw new Error("El archivo tiene que traer las hojas «Parámetros», «Patrimonio subsidiarias» e «Inversiones matriz».");
  const p: Record<string, Valor> = {};
  for (const f of filas(par)) if (f[0]) p[texto(f[0])] = f[1] ?? null;
  const corte = p["Fecha de corte"] instanceof Date ? (p["Fecha de corte"] as Date).toISOString().slice(0, 10) : texto(p["Fecha de corte"]);
  const patrimonios = filas(hp).slice(1).filter((f) => texto(f[0])).map((f) => ({ codigo: texto(f[0]), nombre: texto(f[1]), moneda: texto(f[2]) || "COP", capital: n(f[3]), reservas: n(f[4]), acumulados: n(f[5]), resultado: n(f[6]), ori: n(f[7]) }));
  const inversiones = filas(hi).slice(1).filter((f) => texto(f[0])).map((f) => ({ codigo: texto(f[0]), nombre: texto(f[1]), pct: n(f[2]), saldo: n(f[3]), mpResultado: n(f[4]), mpOri: n(f[5]) }));
  return { corte, trm: n(p["TRM de cierre (COP por USD)"]), inversora: texto(p["Sociedad inversora"]), patrimonios, inversiones };
}
