// Conciliación intercompañía: cruce DETERMINÍSTICO de las cuentas recíprocas entre las sociedades del grupo.
//
// Portado de la skill `conconcreto-conciliacion` (scripts/conciliar.py, paquete S2). Mismas diez reglas, en el
// mismo orden; la primera que se cumple gana. Ninguna usa un modelo. Lo que ninguna regla explica queda como
// SIN CLASIFICAR (no se adivina).
//
//   R0 CONCILIADA · R1 PAGO_OTRA_FACTURA · R2 DIF_CAMBIO · R3 CORTE · R4 NC_UN_LADO · R5 NO_CAUSADA ·
//   R6 DUPLICADO · R7 RETENCION · R8 TRANSPOSICION · R9 SIN_CLASIFICAR
//
// Signos: lado A (CxC 132005/132010) = débito − crédito. Lado B (CxP 231505 / obligaciones 212005) =
// crédito − débito. Diferencia = A − B. Sociedades en USD se pasan a pesos a la TRM de cierre.
import { createHash } from "node:crypto";
import type ExcelJS from "exceljs";
import { filas, hoja, texto, type Valor } from "../xlsx";

export const TOLERANCIA = 1.0;
const LADO_A: Record<string, "comercial" | "préstamo"> = { "132005": "comercial", "132010": "préstamo" };
const LADO_B: Record<string, "comercial" | "préstamo"> = { "231505": "comercial", "212005": "préstamo" };
const EVID_A = new Set(["135515"]);
const EVID_B = new Set(["236525", "236530", "236540"]);
const FACTURA = new Set(["DR", "KR"]);
const NOTA_CREDITO = new Set(["DG", "KG"]);
const PAGO = new Set(["DZ", "KZ"]);

export const REGLAS = [
  ["R0", "CONCILIADA", "La referencia existe en los dos lados y el saldo es igual (tolerancia ±$1)."],
  ["R1", "PAGO_OTRA_FACTURA", "Dos referencias del mismo par con diferencias opuestas e iguales, y un pago por ese mismo valor: el pago se aplicó a facturas distintas en cada lado."],
  ["R2", "DIF_CAMBIO", "Partida en USD: el valor en dólares es igual en los dos lados y la diferencia aparece solo en pesos. Se compara contra la TRM de cierre."],
  ["R3", "CORTE", "La referencia está en un solo lado al corte, y el otro lado la registró después del corte por el mismo valor."],
  ["R4", "NC_UN_LADO", "La referencia está en un solo lado y es una nota crédito."],
  ["R5", "NO_CAUSADA", "Factura emitida al corte que la contraparte no tiene registrada ni antes ni después del corte."],
  ["R6", "DUPLICADO", "Un lado tiene la misma factura dos veces (misma referencia, clase y valor) y la diferencia es exactamente la copia sobrante."],
  ["R7", "RETENCION", "La diferencia es igual a la retención que el pagador registró (cuenta 2365) y el emisor no tiene el anticipo (135515) de esa referencia."],
  ["R8", "TRANSPOSICION", "Una factura por lado, mismos dígitos en distinto orden y diferencia múltiplo de 9."],
  ["R9", "SIN_CLASIFICAR", "Ninguna regla explica la diferencia. Requiere revisión humana con soporte."],
] as const;
export type TipoDif = (typeof REGLAS)[number][1];
export const NOMBRE_TIPO: Record<string, string> = {
  PAGO_OTRA_FACTURA: "Pago aplicado a otra factura",
  DIF_CAMBIO: "Diferencia en cambio sin reconocer",
  CORTE: "Desfase de corte",
  NC_UN_LADO: "Nota crédito de un solo lado",
  NO_CAUSADA: "Factura no causada por la contraparte",
  DUPLICADO: "Registro duplicado",
  RETENCION: "Retención no registrada por el emisor",
  TRANSPOSICION: "Transposición de dígitos",
  SIN_CLASIFICAR: "Sin clasificar · revisión humana",
};

/** round(x, 2) de Python sobre los valores de estos auxiliares (enteros o con centavos). */
export const r2 = (x: number) => Math.round((x + (x >= 0 ? 1 : -1) * 1e-9) * 100) / 100 || 0;

export type SociedadIC = { codigo: string; nombre: string; pais: string; moneda: string; responsable: string };
export type Linea = { soc: string; cuenta: string; socio: string; clase: string; doc: string; ref: string; fecha: string; texto: string; moneda_doc: string; md: number; ml: number; hoja: string; fila: number };
export type Auxiliares = { corte: string; trm: number; sociedades: SociedadIC[]; lineas: Linea[] };

const fechaIso = (v: Valor) => (v instanceof Date ? v.toISOString().slice(0, 10) : texto(v).slice(0, 10));

/** Lee el Excel de auxiliares: hoja «Parámetros» (corte, TRM, tabla de sociedades) y una hoja por sociedad. */
export function leerAuxiliares(wb: ExcelJS.Workbook): Auxiliares {
  const p = hoja(wb, "Parámetros", "Parametros");
  if (!p) throw new Error("El archivo de auxiliares no tiene la hoja «Parámetros».");
  const params: Record<string, Valor> = {};
  const sociedades: SociedadIC[] = [];
  let enTabla = false;
  for (const f of filas(p)) {
    if (!f.length || f[0] === null) continue;
    if (f[0] === "Código") { enTabla = true; continue; }
    if (enTabla) sociedades.push({ codigo: texto(f[0]), nombre: texto(f[1]), pais: texto(f[2]), moneda: texto(f[3]), responsable: texto(f[4]) });
    else params[texto(f[0])] = f[1] ?? null;
  }
  const corte = fechaIso(params["Fecha de corte"]);
  const trm = Number(params["TRM de cierre (COP por USD)"]);
  if (!corte || !trm) throw new Error("La hoja «Parámetros» no trae la fecha de corte o la TRM de cierre.");
  const lineas: Linea[] = [];
  for (const h of wb.worksheets.slice(1)) {
    filas(h).slice(1).forEach((f, i) => {
      if (!f.length || f[0] === null || f[0] === undefined) return;
      const deb = Number(f[13] ?? 0) || 0, cre = Number(f[14] ?? 0) || 0;
      lineas.push({
        soc: texto(f[0]), cuenta: texto(f[1]), socio: texto(f[3]), clase: texto(f[4]), doc: texto(f[5]), ref: texto(f[6]), fecha: fechaIso(f[7]),
        texto: texto(f[8]), moneda_doc: texto(f[9]), md: r2(Number(f[10] ?? 0) || 0), ml: r2(deb - cre), hoja: h.name, fila: i + 2,
      });
    });
  }
  return { corte, trm, sociedades, lineas };
}

export type Diferencia = {
  id: string; tipo: TipoDif; nombre_tipo: string; regla: string; deudor: string; acreedor: string; refs: string[];
  monto: number; monto_abs: number; responsable: string | null; detalle: Record<string, unknown>; evidencia: Linea[];
};
export type Referencia = { ref: string; deudor: string; acreedor: string; tipo: string; saldo_a: number; saldo_b: number; dif: number; usd_a: number | null; usd_b: number | null; n_a: number; n_b: number; estado: string | null; regla: string | null; dif_id: string | null };
export type Par = { deudor: string; acreedor: string; tipo: string; saldo_a: number; saldo_b: number; dif: number; refs: number; refs_ok: number; dif_abs: number };
export type CruceIC = {
  corte: string; trm: number; sociedades: SociedadIC[]; pares: Par[]; diferencias: Diferencia[]; referencias: Referencia[];
  cuadre: { dif_neta_pares: number; dif_neta_explicada: number; valor_abs_referencias: number; valor_abs_diferencias: number; cuadra: boolean };
  kpis: { sociedades: number; partidas: number; partidas_reciprocas: number; referencias: number; referencias_ok: number; pct_auto: number; lineas_ok: number; diferencias: number; sin_clasificar: number; dif_neta: number; valor_por_conciliar: number };
  huella: string;
};

type Grupo = { A: Linea[]; B: Linea[]; A_post: Linea[]; B_post: Linea[]; evA: Linea[]; evB: Linea[] };
const nuevoGrupo = (): Grupo => ({ A: [], B: [], A_post: [], B_post: [], evA: [], evB: [] });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const cmpTupla = (a: string[], b: string[]) => { for (let i = 0; i < a.length; i++) { const c = cmp(a[i], b[i]); if (c) return c; } return 0; };

export function cruzar(aux: Auxiliares): CruceIC {
  const { corte, trm, sociedades: socs, lineas } = aux;
  const moneda = Object.fromEntries(socs.map((s) => [s.codigo, s.moneda]));
  const cop = (l: Linea) => (moneda[l.soc] === "USD" ? l.ml * trm : l.ml);

  // ── Agrupar por (deudor, acreedor, tipo) y referencia ────────────────
  const grupos = new Map<string, Map<string, Grupo>>();
  const claveG = (d: string, a: string, t: string) => JSON.stringify([d, a, t]);
  const ref = (k: string, r: string) => { let g = grupos.get(k); if (!g) { g = new Map(); grupos.set(k, g); } let x = g.get(r); if (!x) { x = nuevoGrupo(); g.set(r, x); } return x; };
  for (const l of lineas) {
    const post = l.fecha > corte;
    if (LADO_A[l.cuenta]) ref(claveG(l.soc, l.socio, LADO_A[l.cuenta]), l.ref)[post ? "A_post" : "A"].push(l);
    else if (LADO_B[l.cuenta]) ref(claveG(l.socio, l.soc, LADO_B[l.cuenta]), l.ref)[post ? "B_post" : "B"].push(l);
  }
  for (const l of lineas) {
    if (l.fecha > corte) continue;
    if (EVID_A.has(l.cuenta)) { const k = claveG(l.soc, l.socio, "comercial"); if (grupos.has(k)) ref(k, l.ref).evA.push(l); }
    else if (EVID_B.has(l.cuenta)) { const k = claveG(l.socio, l.soc, "comercial"); if (grupos.has(k)) ref(k, l.ref).evB.push(l); }
  }

  const usd = (ls: Linea[]) => (ls.length && ls.every((x) => x.moneda_doc === "USD") ? r2(sum(ls.map((x) => (moneda[x.soc] === "COP" ? x.md : x.ml)))) : null);

  const referencias: Referencia[] = [], diferencias: Omit<Diferencia, "id" | "nombre_tipo">[] = [], pares: Par[] = [];
  const llaves = [...grupos.keys()].map((k) => JSON.parse(k) as string[]).sort(cmpTupla);
  for (const [deudor, acreedor, tipo] of llaves) {
    const refs = grupos.get(claveG(deudor, acreedor, tipo))!;
    const filasR = new Map<string, Referencia>();
    for (const r of [...refs.keys()].sort(cmp)) {
      const g = refs.get(r)!;
      if (!(g.A.length || g.B.length || g.A_post.length || g.B_post.length)) continue; // solo evidencia
      const a = r2(sum(g.A.map(cop))), b = r2(-sum(g.B.map(cop)));
      const ub = usd(g.B);
      filasR.set(r, { ref: r, deudor, acreedor, tipo, saldo_a: a, saldo_b: b, dif: r2(a - b), usd_a: usd(g.A), usd_b: ub === null ? null : -ub || 0, n_a: g.A.length, n_b: g.B.length, estado: null, regla: null, dif_id: null });
    }
    const abiertas = [...filasR.keys()].filter((r) => Math.abs(filasR.get(r)!.dif) > TOLERANCIA);
    for (const [r, f] of filasR) if (!abiertas.includes(r)) Object.assign(f, { estado: "CONCILIADA", regla: "R0" });

    // R1 · pago aplicado a otra factura (primero: necesita ver dos referencias)
    const usadas = new Set<string>();
    abiertas.forEach((x, i) => {
      for (const y of abiertas.slice(i + 1)) {
        if (usadas.has(x) || usadas.has(y)) continue;
        const dx = filasR.get(x)!.dif, dy = filasR.get(y)!.dif;
        if (Math.abs(dx + dy) > TOLERANCIA) continue;
        const pagos = [x, y].flatMap((rr) => (["A", "B"] as const).flatMap((lado) => refs.get(rr)![lado])).filter((l) => PAGO.has(l.clase) && Math.abs(Math.abs(cop(l)) - Math.abs(dx)) <= TOLERANCIA);
        if (pagos.length) {
          usadas.add(x); usadas.add(y);
          const gx = refs.get(x)!, gy = refs.get(y)!;
          diferencias.push({ tipo: "PAGO_OTRA_FACTURA", regla: "R1", deudor, acreedor, refs: [x, y], monto: 0, monto_abs: r2(Math.abs(dx)), responsable: deudor,
            detalle: { valor_pago: r2(Math.abs(dx)), dif_por_ref: { [x]: dx, [y]: dy } }, evidencia: [...pagos, ...gx.A, ...gx.B, ...gy.A, ...gy.B] });
          for (const rr of [x, y]) Object.assign(filasR.get(rr)!, { estado: "DIFERENCIA", regla: "R1" });
        }
      }
    });

    for (const r of abiertas) {
      if (usadas.has(r)) continue;
      const f = filasR.get(r)!, g = refs.get(r)!;
      const d = f.dif;
      let tipoD: TipoDif = "SIN_CLASIFICAR", regla = "R9", resp: string | null = null, det: Record<string, unknown> = {};
      const factA = g.A.filter((l) => FACTURA.has(l.clase)), factB = g.B.filter((l) => FACTURA.has(l.clase));
      if (f.usd_a !== null && f.usd_b !== null && Math.abs(f.usd_a - f.usd_b) <= 0.01) {
        const ladoCop = moneda[deudor] === "COP" ? deudor : acreedor;
        const usdV = f.usd_a;
        const copLibros = ladoCop === deudor ? f.saldo_a : f.saldo_b;
        det = { usd: usdV, trm_cierre: trm, trm_libros: r2(copLibros / usdV), cop_libros: copLibros, cop_a_trm_cierre: r2(usdV * trm) };
        tipoD = "DIF_CAMBIO"; regla = "R2"; resp = ladoCop;
      } else if ((g.A.length && !g.B.length && g.B_post.length && Math.abs(-sum(g.B_post.map(cop)) - f.saldo_a) <= TOLERANCIA) ||
                 (g.B.length && !g.A.length && g.A_post.length && Math.abs(sum(g.A_post.map(cop)) - f.saldo_b) <= TOLERANCIA)) {
        const post = g.B_post.length ? g.B_post : g.A_post;
        det = { fecha_otro_lado: post.map((x) => x.fecha).sort()[0], corte };
        tipoD = "CORTE"; regla = "R3"; resp = g.B_post.length ? acreedor : deudor;
      } else if (!!g.A.length !== !!g.B.length && (g.A.length ? g.A : g.B).every((l) => NOTA_CREDITO.has(l.clase))) {
        tipoD = "NC_UN_LADO"; regla = "R4"; resp = g.A.length ? acreedor : deudor;
      } else if (g.A.length && !g.B.length && !g.B_post.length && factA.length) {
        tipoD = "NO_CAUSADA"; regla = "R5"; resp = acreedor;
      } else {
        for (const [fs, quien] of [[factA, deudor], [factB, acreedor]] as const) {
          const cuenta = new Map<string, { cl: string; v: number; n: number }>();
          for (const l of fs) { const k = `${l.clase}|${l.ml}`; const c = cuenta.get(k); if (c) c.n++; else cuenta.set(k, { cl: l.clase, v: l.ml, n: 1 }); }
          for (const { v, n } of cuenta.values()) {
            if (n >= 2 && Math.abs(Math.abs(d) - (n - 1) * Math.abs(v)) <= TOLERANCIA) { tipoD = "DUPLICADO"; regla = "R6"; resp = quien; det = { veces: n, valor: Math.abs(v) }; }
          }
        }
        if (tipoD === "SIN_CLASIFICAR") {
          const retB = g.evB.filter((l) => Math.abs(Math.abs(l.ml) - Math.abs(d)) <= TOLERANCIA);
          if (retB.length && !g.evA.length && d > 0) {
            const base = factA.length ? Math.abs(factA[0].ml) : null;
            det = { retencion: Math.abs(d), base, tasa: base ? r2((Math.abs(d) / base) * 100) : null, cuenta_pagador: retB[0].cuenta };
            tipoD = "RETENCION"; regla = "R7"; resp = deudor;
          } else if (factA.length === 1 && factB.length === 1) {
            // valores BRUTOS: la factura del emisor contra la CxP neta del receptor + la retención que causó con ella
            const va = Math.round(Math.abs(factA[0].ml));
            const vb = Math.round(Math.abs(factB[0].ml) + sum(g.evB.filter((l) => FACTURA.has(l.clase)).map((l) => Math.abs(l.ml))));
            if (va !== vb && Math.abs(va - vb) % 9 === 0 && [...String(va)].sort().join("") === [...String(vb)].sort().join("")) {
              det = { valor_emisor: va, valor_receptor: vb }; tipoD = "TRANSPOSICION"; regla = "R8"; resp = acreedor;
            }
          }
        }
      }
      diferencias.push({ tipo: tipoD, regla, deudor, acreedor, refs: [r], monto: d, monto_abs: r2(Math.abs(d)), responsable: resp, detalle: det, evidencia: [...g.A, ...g.B, ...g.A_post, ...g.B_post, ...g.evA, ...g.evB] });
      Object.assign(f, { estado: "DIFERENCIA", regla });
    }

    const valores = [...filasR.values()];
    const sa = r2(sum(valores.map((x) => x.saldo_a))), sb = r2(sum(valores.map((x) => x.saldo_b)));
    pares.push({ deudor, acreedor, tipo, saldo_a: sa, saldo_b: sb, dif: r2(sa - sb), refs: valores.length, refs_ok: valores.filter((x) => x.estado === "CONCILIADA").length,
      dif_abs: r2(sum(valores.filter((x) => x.estado !== "CONCILIADA").map((x) => Math.abs(x.dif)))) });
    referencias.push(...valores);
  }

  const orden = Object.fromEntries(REGLAS.map(([, t], i) => [t, i]));
  diferencias.sort((a, b) => orden[a.tipo] - orden[b.tipo] || cmp(a.deudor, b.deudor) || cmp(a.acreedor, b.acreedor) || cmp(a.refs[0], b.refs[0]));
  const finales: Diferencia[] = diferencias.map((d, i) => {
    const vistos = new Set<string>();
    const unicas = d.evidencia.filter((l) => { const k = `${l.soc}|${l.doc}|${l.cuenta}`; if (vistos.has(k)) return false; vistos.add(k); return true; })
      .sort((a, b) => cmp(a.fecha, b.fecha) || cmp(a.soc, b.soc) || cmp(a.doc, b.doc));
    const id = `D${String(i + 1).padStart(2, "0")}`;
    const x: Diferencia = { ...d, id, nombre_tipo: NOMBRE_TIPO[d.tipo], evidencia: unicas };
    if (d.tipo === "SIN_CLASIFICAR") { x.responsable = d.deudor; x.detalle = { ...d.detalle, tambien: d.acreedor }; }
    for (const rr of d.refs) for (const f of referencias) if (f.ref === rr && f.deudor === d.deudor && f.acreedor === d.acreedor) f.dif_id = id;
    return x;
  });

  // ── Cuadre: lo explicado tiene que sumar exactamente lo descuadrado ───
  const difPares = r2(sum(pares.map((p) => p.dif)));
  const difExplicada = r2(sum(finales.map((d) => d.monto)));
  const absRefs = r2(sum(referencias.filter((f) => f.estado !== "CONCILIADA").map((f) => Math.abs(f.dif))));
  const absDif = r2(sum(finales.map((d) => d.monto_abs * (d.tipo === "PAGO_OTRA_FACTURA" ? 2 : 1))));
  const cuadre = { dif_neta_pares: difPares, dif_neta_explicada: difExplicada, valor_abs_referencias: absRefs, valor_abs_diferencias: absDif,
    cuadra: Math.abs(difPares - difExplicada) <= 0.01 && Math.abs(absRefs - absDif) <= 0.01 };

  const refsOk = referencias.filter((f) => f.estado === "CONCILIADA").length;
  const kpis = {
    sociedades: socs.length, partidas: lineas.length, partidas_reciprocas: lineas.filter((l) => LADO_A[l.cuenta] || LADO_B[l.cuenta]).length,
    referencias: referencias.length, referencias_ok: refsOk, pct_auto: r2((refsOk / referencias.length) * 100),
    lineas_ok: sum(referencias.filter((f) => f.estado === "CONCILIADA").map((f) => f.n_a + f.n_b)),
    diferencias: finales.length, sin_clasificar: finales.filter((d) => d.tipo === "SIN_CLASIFICAR").length, dif_neta: difPares, valor_por_conciliar: absRefs,
  };
  const refsOrden = [...referencias].sort((a, b) => cmpTupla([a.deudor, a.acreedor, a.tipo, a.ref], [b.deudor, b.acreedor, b.tipo, b.ref]));
  const huella = createHash("sha256").update(JSON.stringify({ corte, trm, pares, diferencias: finales, referencias: refsOrden })).digest("hex");
  return { corte, trm, sociedades: socs, pares, diferencias: finales, referencias: refsOrden, cuadre, kpis, huella };
}
