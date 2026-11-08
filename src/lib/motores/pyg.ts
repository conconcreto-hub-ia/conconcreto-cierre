// Base SAP del PyG mensual, Parte 1.
//
// Portado de la skill `base-sap-pyg` de Felipe Correa (script base_sap_pyg.ps1, S2). Mismas reglas, mismo orden:
//   1. Extracción Original: 6 columnas de SAP. Año = los 4 primeros dígitos de «Mes del año» (todas iguales);
//      mes de cierre = el AAAAMM mayor.
//   2. Optimizado: el mes como número (202604 → 4) y sin las filas en cero.
//   3. La tabla dinámica Mes → CeBe → Cuenta (una fila por combinación, sumando el importe).
//   4. La base: maestros de centros de beneficio y de cuentas, Tipo «Real AAAA», Valor ajustado = −Valor.
//      Si falta un CeBe o una cuenta en los maestros, se detiene y los lista.
//   5. Utilidad CC Proyectos = −(Suma de Valor de «77 - CCC Proyectos S.A.S.»).
//   6A. CeBe 01CT1CLL05, grupo 660: factor = (Utilidad LLC − % LLC × Utilidad CCP) ÷ Utilidad LLC;
//       Valor ajustado = −Valor × factor.
//   6B. CeBe 01I1OI0205, grupo 660: Valor ajustado = 0, y la última fila (la del último mes) lleva la
//       diferencia entre el método de participación y el cálculo.
//   7. Check = Suma de Valor de «01 - Constructora Conconcreto» + Suma de Valor ajustado total. Debe dar 0 (±1 peso).
//
// En Excel esto eran tablas dinámicas y fórmulas; aquí son sumas. El archivo que sale trae las mismas hojas,
// con las fórmulas de Valor ajustado vivas y las tablas de control como valores.

import type { Valor } from "../xlsx";
import { texto } from "../xlsx";

export const G660 = "660_Particip.Ganac.(pérd.)Sub.Asoc.Met.Part.";
export const CEBE_LLC = "01CT1CLL05";
export const CEBE_CC = "01I1OI0205";
export const SOC77 = "77 - CCC Proyectos S.A.S.";
export const SOC01 = "01 - Constructora Conconcreto";
export const PCT_LLC_DEFECTO = 0.48515;
const ENCABEZADOS = ["Cuenta de mayor", "Cuenta de mayor", "Centro de beneficio", "Centro de beneficio", "Mes del año", "Importe actual en moneda sociedad"];
export const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export type MaestroCebe = { sociedad: string; nombreLargo: string; negocio: Valor; linea: Valor; sublinea: Valor; estado: Valor; nombreComun: Valor; subdcd: Valor };
export type MaestroCuenta = { nombre: Valor; grupo: string; subgrupo: Valor; division: Valor; costeo: Valor };
export type Maestros = { cebes: Map<string, MaestroCebe>; cuentas: Map<string, MaestroCuenta> };

/** Una fila de la base (columnas F:Y de la hoja Ajuste). */
export type FilaBase = {
  ajuste: "Sin ajuste" | "Ajuste"; tipo: string; sociedad: string; cebe: string; cebeM: MaestroCebe;
  cuenta: string | number; cuentaM: MaestroCuenta; mes: number; valor: number; ajustado: number;
  /** cómo se calcula el Valor ajustado en el archivo: «menos», «factor», «cero» o «diferencia» */
  regla: "menos" | "factor" | "cero" | "diferencia";
};

export type FilaOptimizada = [string | number, string, string, string, number, number];

export type ResultadoPyg = {
  estado: "cuadra" | "no_cuadra" | "bloqueado";
  bloqueos: string[];
  faltantes: { cebes: { codigo: string; nombre: string }[]; cuentas: { codigo: string; nombre: string }[] };
  anio: string;
  mesCierre: number;
  filasOriginales: number;
  filasCero: number;
  filasOptimizado: number;
  filasBase: number;
  ajustes: number;
  porSociedad: { sociedad: string; valor: number; ajustado: number }[];
  utilidadCCP: number; // AF14
  utilidadLLC: number; // AF13
  pctLLC: number; // AF15
  participacionLLC: number; // AF16
  utilidadLLCsinCCP: number; // AF17
  factor: number; // AF18
  pctCC: number; // AF25
  mpCalculo: number; // AF26
  mpMetodo: number; // AF27
  diferencia: number; // AF28
  check: number; // AC7
  checkPesos: number; // el check redondeado a pesos (sin el −0 del redondeo)
  optimizado: FilaOptimizada[];
  base: FilaBase[];
};

/** Las cuentas con solo dígitos van como número, como en el archivo de ejemplo; las que tienen letras, como texto. */
const cod = (v: Valor): string | number => { const s = texto(v); return /^\d+$/.test(s) ? Number(s) : s; };

/** El orden de una tabla dinámica de Excel: números antes que texto; el texto sin distinguir mayúsculas. */
export function ordenExcel(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  const x = a.toUpperCase(), y = b.toUpperCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

export function basePyg(extraccion: Valor[][], maestros: Maestros, pctLLC = PCT_LLC_DEFECTO): ResultadoPyg {
  const vacio = { checkPesos: 0, faltantes: { cebes: [], cuentas: [] }, anio: "", mesCierre: 0, filasOriginales: 0, filasCero: 0, filasOptimizado: 0, filasBase: 0, ajustes: 0, porSociedad: [], utilidadCCP: 0, utilidadLLC: 0, pctLLC, participacionLLC: 0, utilidadLLCsinCCP: 0, factor: 0, pctCC: 1 - pctLLC, mpCalculo: 0, mpMetodo: 0, diferencia: 0, check: 0, optimizado: [], base: [] };
  const bloqueado = (msg: string, extra: Partial<ResultadoPyg> = {}): ResultadoPyg => ({ ...vacio, ...extra, estado: "bloqueado", bloqueos: [msg] });

  // ── 1 · Extracción Original ─────────────────────────────────────────
  const [enc, ...datos] = extraccion;
  const encT = (enc ?? []).slice(0, 6).map(texto);
  const ancho = Math.max(...extraccion.map((r) => r.filter((c) => c !== null && c !== "").length ? r.length : 0));
  if (encT.join("|") !== ENCABEZADOS.join("|") || ancho !== 6) return bloqueado(`Encabezados inesperados: ${encT.join(" | ")}. La extracción tiene que tener las 6 columnas de SAP.`);
  const filasDatos = datos.filter((r) => r.some((c) => c !== null && c !== ""));
  const anios = new Set<string>();
  let maxMes = 0;
  for (const r of filasDatos) { const m = texto(r[4]); anios.add(m.slice(0, 4)); if (Number(m) > maxMes) maxMes = Number(m); }
  if (anios.size !== 1) return bloqueado(`La extracción tiene más de un año: ${[...anios].join(", ")}.`);
  const anio = [...anios][0];
  const mesCierre = maxMes % 100;

  // ── 2 · Optimizado ──────────────────────────────────────────────────
  const optimizado: FilaOptimizada[] = [];
  let ceros = 0;
  for (const r of filasDatos) {
    const imp = Number(r[5] ?? 0);
    if (imp === 0) { ceros++; continue; }
    optimizado.push([cod(r[0]), texto(r[1]), texto(r[2]), texto(r[3]), Number(texto(r[4]).slice(4, 6)), imp]);
  }

  // ── 3 · La tabla dinámica Mes → CeBe → Cuenta ──────────────────────
  const piv = new Map<string, { mes: number; cebe: string; cuenta: string | number; valor: number }>();
  for (const [cuenta, , cebe, , mes, imp] of optimizado) {
    const k = `${mes}|${cebe}|${cuenta}`;
    const p = piv.get(k);
    if (p) p.valor += imp; else piv.set(k, { mes, cebe, cuenta, valor: imp });
  }
  const filasPiv = [...piv.values()].sort((a, b) => a.mes - b.mes || ordenExcel(a.cebe, b.cebe) || ordenExcel(a.cuenta, b.cuenta));

  // ── 4 · Completar la base ───────────────────────────────────────────
  const nomCebe = new Map<string, string>(), nomCta = new Map<string, string>();
  for (const [cuenta, nc, cebe, nb] of optimizado) { nomCta.set(String(cuenta), nc); nomCebe.set(cebe, nb); }
  const faltC = new Map<string, string>(), faltK = new Map<string, string>();
  for (const p of filasPiv) {
    if (!maestros.cebes.has(p.cebe)) faltC.set(p.cebe, nomCebe.get(p.cebe) ?? "");
    if (!maestros.cuentas.has(String(p.cuenta))) faltK.set(String(p.cuenta), nomCta.get(String(p.cuenta)) ?? "");
  }
  const cuentaSinDatos = { filasOriginales: filasDatos.length, filasCero: ceros, filasOptimizado: optimizado.length, filasBase: filasPiv.length, anio, mesCierre };
  if (faltC.size || faltK.size) {
    const faltantes = { cebes: [...faltC].map(([codigo, nombre]) => ({ codigo, nombre })), cuentas: [...faltK].map(([codigo, nombre]) => ({ codigo, nombre })) };
    return bloqueado(`Faltan en «Base de información para PyG.xlsx»: ${faltantes.cebes.length} CeBe y ${faltantes.cuentas.length} cuentas. Hay que agregarlos y volver a correr.`, { ...cuentaSinDatos, faltantes });
  }

  const base: FilaBase[] = filasPiv.map((p) => {
    const cebeM = maestros.cebes.get(p.cebe)!, cuentaM = maestros.cuentas.get(String(p.cuenta))!;
    return { ajuste: "Sin ajuste", tipo: `Real ${anio}`, sociedad: cebeM.sociedad, cebe: p.cebe, cebeM, cuenta: p.cuenta, cuentaM, mes: p.mes, valor: p.valor, ajustado: -p.valor, regla: "menos" };
  });
  const idxLLC = base.map((b, i) => (b.cuentaM.grupo === G660 && b.cebe === CEBE_LLC ? i : -1)).filter((i) => i >= 0);
  const idxCC = base.map((b, i) => (b.cuentaM.grupo === G660 && b.cebe === CEBE_CC ? i : -1)).filter((i) => i >= 0);
  if (!idxLLC.length || !idxCC.length) return bloqueado(`No hay filas del grupo 660 en ${CEBE_LLC} (${idxLLC.length}) o en ${CEBE_CC} (${idxCC.length}). Hay que preguntar cómo seguir.`, cuentaSinDatos);

  // ── 5 · Utilidad de CC Proyectos ────────────────────────────────────
  const sumaSoc = (s: string, campo: "valor" | "ajustado") => base.filter((b) => b.sociedad === s).reduce((a, b) => a + b[campo], 0);
  const utilidadCCP = -sumaSoc(SOC77, "valor");

  // ── 6A · CC Proyectos dentro de CC LLC ──────────────────────────────
  const utilidadLLC = -idxLLC.reduce((a, i) => a + base[i].valor, 0);
  const participacionLLC = pctLLC * utilidadCCP;
  const utilidadLLCsinCCP = utilidadLLC - participacionLLC;
  const factor = utilidadLLCsinCCP / utilidadLLC;
  for (const i of idxLLC) Object.assign(base[i], { ajuste: "Ajuste", ajustado: -base[i].valor * factor, regla: "factor" });

  // ── 6B · CC Proyectos dentro de Constructora Conconcreto ────────────
  const pctCC = 1 - pctLLC;
  const mpCalculo = pctCC * utilidadCCP;
  const mpMetodo = -idxCC.reduce((a, i) => a + base[i].valor, 0);
  const diferencia = mpMetodo - mpCalculo;
  for (const i of idxCC) Object.assign(base[i], { ajuste: "Ajuste", ajustado: 0, regla: "cero" });
  Object.assign(base[idxCC[idxCC.length - 1]], { ajustado: diferencia, regla: "diferencia" });

  // ── 7 · Check ───────────────────────────────────────────────────────
  const sociedades = [...new Set(base.map((b) => b.sociedad))].sort(ordenExcel);
  const porSociedad = sociedades.map((s) => ({ sociedad: s, valor: sumaSoc(s, "valor"), ajustado: sumaSoc(s, "ajustado") }));
  const totalAjustado = base.reduce((a, b) => a + b.ajustado, 0);
  const check = sumaSoc(SOC01, "valor") + totalAjustado;
  const cuadra = Math.abs(check) <= 1;

  return {
    estado: cuadra ? "cuadra" : "no_cuadra",
    bloqueos: cuadra ? [] : [`El check da ${check.toFixed(2)} y debería dar 0 (±1 peso). Revisa los cálculos de 6A y 6B antes de usar la base.`],
    faltantes: { cebes: [], cuentas: [] },
    ...cuentaSinDatos,
    ajustes: idxLLC.length + idxCC.length,
    porSociedad, utilidadCCP, utilidadLLC, pctLLC, participacionLLC, utilidadLLCsinCCP, factor, pctCC, mpCalculo, mpMetodo, diferencia, check, checkPesos: Math.round(check) + 0,
    optimizado, base,
  };
}

/** Los maestros desde «Base de información para PyG.xlsx» (hojas «Base Centros de Beneficio» y «Base Cuentas»).
 *  Se busca por la columna «Cuenta», no por «Cuenta (ESFS)». */
export function maestrosDesdeFilas(cebes: Valor[][], cuentas: Valor[][]): Maestros {
  const mc = new Map<string, MaestroCebe>();
  for (const r of cebes.slice(1)) {
    const k = texto(r[1]);
    if (k) mc.set(k, { sociedad: texto(r[0]), nombreLargo: texto(r[3]), negocio: r[4] ?? null, linea: r[5] ?? null, sublinea: r[6] ?? null, estado: r[7] ?? null, nombreComun: r[8] ?? null, subdcd: r[9] ?? null });
  }
  const mk = new Map<string, MaestroCuenta>();
  for (const r of cuentas.slice(1)) {
    const k = texto(r[1]);
    if (k) mk.set(k, { nombre: r[2] ?? null, grupo: texto(r[3]), subgrupo: r[4] ?? null, division: r[5] ?? null, costeo: r[6] ?? null });
  }
  return { cebes: mc, cuentas: mk };
}
