// Conciliación línea a línea del balance de la fiduciaria (TXT, PUF) contra SAP (PUC, dos libros).
//
// Portado de la skill `conciliacion-linea-linea` de Laura Bedoya (scripts concilia.ps1 y genera.ps1, S2).
// Las reglas son las suyas, en el mismo orden; lo nuevo está marcado con «AGREGADO»:
//   · TXT: la última subcuenta de cada rubro (cuenta sin hijas) y su saldo final.
//   · Se excluyen las cuentas PUF de la 59 en adelante y la 3915 / 3920 (resultado del ejercicio).
//   · Homologación PUF → PUC por código de fiducia. Si homologa a P370505000 y SAP usa P370505200, va P370505200.
//   · SAP: filas del CEBE, sin «Total» ni cuentas PF. Se compara contra los dos libros.
//   · Diferencia = TXT redondeado a pesos − SAP. Positiva = débito; negativa = crédito en valor absoluto.
//   · Todo se ajusta. El descuadre por redondeo va a P429581000 y no puede pasar de $10 (si pasa, se detiene).
//   · Journal: sociedad 4812, tipo BF, último día del mes, COP, CEBE del proyecto; sociedad asociada 4810 en las
//     cuentas que terminan en 0002.
//   · AGREGADO: un umbral que marca para revisión las diferencias grandes, y las que mueven una cuenta que no
//     tiene saldo en uno de los dos lados.
//   · AGREGADO: el lector del TXT se escoge por código de fiducia (LECTORES / FIDUCIAS).
//
// Todo en centavos enteros. Nada de esto pasa por un modelo.

import { aCentavos, redondearPesos, suma } from "./pesos";

export const SOCIEDAD_PA = "4812";
export const SOCIEDAD_ASOCIADA = "4810";
export const CUENTA_PESO = "P429581000";
export const MAX_DESCUADRE = 10 * 100; // $10, en centavos

/* ── El TXT ─────────────────────────────────────────────────────────── */

export type FilaTxt = { cuenta: string; descripcion: string; si: number; deb: number; cre: number; sf: number };

export type Lector = { nombre: string; leer: (texto: string) => FilaTxt[] };

const NUM = /^\s*-?[\d,]*\.\d+-?\s*$/;

/** Tabulado (Alianza, Credicorp, Aval): cuenta, tercero, descripción y luego SI, débito, crédito, SF.
 *  Se saltan las columnas no numéricas (como NAPL). */
const tabulado: Lector = {
  nombre: "Tabulado (Alianza)",
  leer(texto) {
    const out: FilaTxt[] = [];
    for (const l of texto.split(/\r?\n/)) {
      const f = l.split("\t");
      if (f.length >= 7 && /^\d+$/.test(f[0])) {
        const nums = f.slice(3).filter((x) => NUM.test(x));
        if (nums.length >= 4) out.push({ cuenta: f[0], descripcion: f[2].trim(), si: aCentavos(nums[0]), deb: aCentavos(nums[1]), cre: aCentavos(nums[2]), sf: aCentavos(nums[3]) });
      }
    }
    return out;
  },
};

/** Ancho fijo (Bancolombia): saldos en valor absoluto según la naturaleza de la cuenta; el sufijo DB/CR marca
 *  saldo contrario a la naturaleza. Portado tal cual de concilia.ps1; falta probarlo en una conciliación completa. */
const anchoFijo: Lector = {
  nombre: "Ancho fijo (Bancolombia)",
  leer(texto) {
    const out: FilaTxt[] = [];
    const rx = /^(\d+)\s+(.+?)\s+([\d,]+\.\d\d)(DB|CR)?\s+([\d,]+\.\d\d)\s+([\d,]+\.\d\d)\s+([\d,]+\.\d\d)(DB|CR)?\s*$/;
    for (const l of texto.split(/\r?\n/)) {
      const g = l.match(rx);
      if (!g) continue;
      const si = aCentavos(g[3]), db = aCentavos(g[5]), cr = aCentavos(g[6]), sf = aCentavos(g[7]);
      const mov = db !== cr && !g[4] && !g[8];
      const nat = mov && si + db - cr === sf ? 1
        : mov && si - db + cr === sf ? -1
        : /^(3510|3910|3920)/.test(g[1]) ? 1
        : /^(1\d(95|98|99)|152090)/.test(g[1]) ? -1
        : /^[234]/.test(g[1]) ? -1 : 1;
      const sSI = g[4] === "DB" ? 1 : g[4] === "CR" ? -1 : nat;
      const sSF = g[8] === "DB" ? 1 : g[8] === "CR" ? -1 : nat;
      out.push({ cuenta: g[1], descripcion: g[2], si: sSI * si, deb: db, cre: cr, sf: sSF * sf });
    }
    return out;
  },
};

export const LECTORES = { tabulado, ancho_fijo: anchoFijo } as const;
export type ClaveLector = keyof typeof LECTORES;

/** AGREGADO · Cada fiduciaria con su lector. Para sumar una: su código de la hoja Proyectos, su lector y si la
 *  homologación viene a menos dígitos que el TXT. Si el código no está, se prueba con los lectores en orden. */
export const FIDUCIAS: Record<string, { nombre: string; lector: ClaveLector; homologaPorPadre?: boolean; probada: boolean }> = {
  "31": { nombre: "Alianza Fiduciaria", lector: "tabulado", probada: true },
  "32": { nombre: "Fiduciaria Corficolombiana (Aval)", lector: "tabulado", homologaPorPadre: true, probada: false },
};

export function leerTxt(texto: string, fiducia: string): { filas: FilaTxt[]; lector: string } {
  const conocida = FIDUCIAS[fiducia];
  if (conocida) return { filas: LECTORES[conocida.lector].leer(texto), lector: LECTORES[conocida.lector].nombre };
  for (const l of Object.values(LECTORES)) {
    const filas = l.leer(texto);
    if (filas.length) return { filas, lector: l.nombre };
  }
  return { filas: [], lector: "ninguno" };
}

/** El periodo (AAAAMM) que dice el TXT por dentro. */
export function periodoTxt(texto: string): string | null {
  const m = texto.match(/Periodo:\s*(\d{6})/) ?? texto.match(/DEL LIBRO:\s*(\d{6})/);
  if (m) return m[1];
  const r = texto.match(/Rango de fechas\s*:\s*\S+\s*-\s*(\d{4})\/(\d{2})/);
  return r ? r[1] + r[2] : null;
}

/** El nombre del patrimonio a partir del nombre del archivo: «297638-FIDEICOMISO X Sin terceros.txt» → «FIDEICOMISO X». */
export function patrimonioDelArchivo(nombre: string): string {
  return nombre.replace(/\.txt$/i, "").replace(/^\d+[-_\s]+/, "")
    .replace(/\s*[-(]*\s*(balance\s*)?(sin\s*terceros?|sin\s*auxiliares|sin\s*ter|sin\s*t|st)\s*\)?\s*$/i, "")
    .replace(/\s*-?\s*\d{6}\s*-?\s*$/, "").trim().toUpperCase();
}

/* ── SAP y homologación ─────────────────────────────────────────────── */

export type FilaSap = { cebe: string; cuenta: string; nombre: string; l1: number; l2: number };
export type Homologacion = { fiducia: string; puf: string; puc: string };
export type ProyectoFiducia = { cebe: string; fiducia: string; nombre: string };

/* ── El resultado ───────────────────────────────────────────────────── */

export type Detalle = FilaTxt & { puc: string | null; estado: string };
export type Comparacion = { cuenta: string; nombre: string; txt: number; txtRedondeado: number; l1: number; dif1: number; l2: number; dif2: number; enSap: boolean };
export type LineaAjuste = { cuenta: string; nombre: string; valor: number };
export type Libro = { lineas: LineaAjuste[]; descuadre: number; debitos: number; creditos: number; ledger: string };
export type Marcada = { cuenta: string; nombre: string; dif1: number; dif2: number; motivo: string };

export type ResultadoFiducia = {
  estado: "cuadra" | "no_cuadra" | "bloqueado";
  patrimonio: string;
  cebe: string;
  fiducia: string;
  fiduciaria: string;
  lector: string;
  periodo: string; // AAAA.MM
  fecha: string; // último día del mes, AAAA-MM-DD
  detalle: Detalle[];
  comparacion: Comparacion[];
  excluidas: Detalle[];
  sinHomologacion: Detalle[];
  pfExcluidas: FilaSap[];
  libros: { L1: Libro; L2: Libro } | null;
  marcadas: Marcada[];
  bloqueos: string[];
  observaciones: string[];
};

export type EntradaFiducia = {
  txtNombre: string;
  txt: string;
  sap: FilaSap[];
  homologacion: Homologacion[];
  proyectos: ProyectoFiducia[];
  mes: string; // AAAA.MM
  cebe?: string;
  fiducia?: string;
  ledger1?: string;
  ledger2?: string;
  /** AGREGADO · diferencias desde este valor (pesos) se marcan para revisión. */
  umbral?: number;
};

const ultimoDia = (mes: string) => {
  const [a, m] = mes.split(".").map(Number);
  const d = new Date(Date.UTC(a, m, 0));
  return d.toISOString().slice(0, 10);
};

/** Las líneas de ajuste de un libro, cuadradas con el ajuste al peso (genera.ps1, función Lineas). */
export function lineasDeLibro(comp: Comparacion[], libro: "dif1" | "dif2"): { lineas: LineaAjuste[]; descuadre: number } {
  const l = new Map<string, number>();
  const nombre = new Map(comp.map((c) => [c.cuenta, c.nombre]));
  for (const c of comp) if (c[libro] !== 0) l.set(c.cuenta, c[libro]);
  const s = suma([...l.values()]);
  if (Math.abs(s) > MAX_DESCUADRE) return { lineas: [], descuadre: s };
  if (s !== 0) l.set(CUENTA_PESO, (l.get(CUENTA_PESO) ?? 0) - s);
  const lineas = [...l.entries()].filter(([, v]) => v !== 0).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cuenta, valor]) => ({ cuenta, nombre: nombre.get(cuenta) ?? "", valor }));
  return { lineas, descuadre: s };
}

export function conciliarFiducia(e: EntradaFiducia): ResultadoFiducia {
  const bloqueos: string[] = [];
  const observaciones: string[] = [];
  const periodo = e.mes;
  const fecha = ultimoDia(e.mes);
  const umbral = (e.umbral ?? 1_000_000_000) * 100;

  // El periodo interno del TXT tiene que ser el del mes (descarta el archivo del mes anterior).
  const p = periodoTxt(e.txt);
  if (p && p !== e.mes.replace(".", "")) bloqueos.push(`El TXT es del periodo ${p}, no de ${e.mes.replace(".", "")}. Revisa que sea el archivo del mes.`);
  if (!p) observaciones.push("El TXT no dice su periodo por dentro: no se pudo confirmar que sea el del mes.");

  // CEBE y fiducia: de la hoja Proyectos, por el nombre del patrimonio en el archivo.
  const patrimonio = patrimonioDelArchivo(e.txtNombre);
  let cebe = e.cebe, fiducia = e.fiducia;
  if (!cebe || !fiducia) {
    const pros = e.proyectos.filter((x) => x.nombre.trim());
    let hit = pros.find((x) => x.nombre.trim().toUpperCase() === patrimonio);
    if (!hit) {
      const parecidos = pros.filter((x) => { const n = x.nombre.trim().toUpperCase(); return n.includes(patrimonio) || patrimonio.includes(n); });
      if (parecidos.length === 1) hit = parecidos[0];
    }
    if (hit) { cebe ??= hit.cebe.trim(); fiducia ??= hit.fiducia.trim(); }
  }
  if (!cebe || !fiducia) {
    bloqueos.push(`No se encontró «${patrimonio}» en la hoja Proyectos de la homologación: indica el CEBE y el código de fiducia.`);
    cebe ??= ""; fiducia ??= "";
  }
  const conf = FIDUCIAS[fiducia];
  if (conf && !conf.probada) observaciones.push(`El formato de ${conf.nombre} no se ha probado todavía en una conciliación completa: revisa el resultado con cuidado.`);

  // 1 · TXT y su última subcuenta
  const { filas, lector } = leerTxt(e.txt, fiducia);
  if (!filas.length) bloqueos.push("No se reconoció el formato del TXT (ni tabulado ni de ancho fijo).");
  const cuentas = filas.map((r) => r.cuenta);
  const hojas = filas.filter((r) => !cuentas.some((c) => c.length > r.cuenta.length && c.startsWith(r.cuenta)));

  // 2 · Homologación de esta fiducia
  const hom = new Map<string, string>();
  for (const h of e.homologacion) if (h.fiducia.trim() === fiducia) hom.set(h.puf.trim(), h.puc.trim());

  // 3 · SAP del CEBE, sin Total
  const sap = new Map<string, FilaSap>();
  for (const s of e.sap) if (s.cebe === cebe && s.cuenta !== "Total" && s.cuenta) sap.set(s.cuenta, s);
  if (cebe && !sap.size) bloqueos.push(`El exporte de SAP no trae filas del CEBE ${cebe}.`);

  const detalle: Detalle[] = hojas.map((r) => {
    const dos = Number(r.cuenta.slice(0, 2));
    let excl = "";
    if (dos >= 59) excl = "Excluida (59 en adelante)";
    else if (/^39(15|20)/.test(r.cuenta)) excl = "Excluida (resultado del ejercicio)";
    let puc = hom.get(r.cuenta) ?? null;
    // fiducia 32 (Aval/Corficolombiana) homologa a 8 dígitos y el TXT trae subcuentas de 10: se busca por cuenta padre
    if (!puc && conf?.homologaPorPadre) {
      for (let n = r.cuenta.length - 1; n >= 6 && !puc; n--) puc = hom.get(r.cuenta.slice(0, n)) ?? null;
    }
    if (puc === "P370505000" && !sap.has("P370505000") && sap.has("P370505200")) puc = "P370505200";
    return { ...r, puc, estado: excl || (!puc ? "SIN HOMOLOGACION" : "Incluida") };
  });

  const sinHomologacion = detalle.filter((d) => d.estado === "SIN HOMOLOGACION");
  if (sinHomologacion.length) bloqueos.push(`${sinHomologacion.length} ${sinHomologacion.length === 1 ? "cuenta queda" : "cuentas quedan"} sin homologación: ${sinHomologacion.map((d) => d.cuenta).join(", ")}. Hay que pedir la cuenta PUC antes de cargar.`);

  const txtPuc = new Map<string, number>();
  for (const d of detalle) if (d.estado === "Incluida" && d.puc) txtPuc.set(d.puc, (txtPuc.get(d.puc) ?? 0) + d.sf);

  const llaves = [...new Set([...txtPuc.keys(), ...[...sap.keys()].filter((k) => !/^PF/.test(k))])].sort();
  const comparacion: Comparacion[] = llaves.map((k) => {
    const t = txtPuc.get(k) ?? 0;
    const s = sap.get(k);
    const l1 = s?.l1 ?? 0, l2 = s?.l2 ?? 0;
    const tr = redondearPesos(t);
    return { cuenta: k, nombre: s?.nombre ?? "", txt: t, txtRedondeado: tr, l1, dif1: tr - l1, l2, dif2: tr - l2, enSap: !!s };
  });

  // AGREGADO · lo que una persona tiene que mirar antes de cargar
  const marcadas: Marcada[] = [];
  for (const c of comparacion) {
    const grande = Math.max(Math.abs(c.dif1), Math.abs(c.dif2));
    if (grande === 0) continue;
    const motivos: string[] = [];
    if (grande >= umbral) motivos.push("supera el umbral de revisión");
    if (grande >= umbral && !c.enSap) motivos.push("la cuenta no tiene saldo en SAP");
    else if (grande >= umbral && c.l1 === 0 && c.l2 === 0) motivos.push("la cuenta está en cero en los dos libros de SAP");
    if (grande >= umbral && c.txtRedondeado === 0) motivos.push("la cuenta está en cero en el TXT");
    if (motivos.length) marcadas.push({ cuenta: c.cuenta, nombre: c.nombre, dif1: c.dif1, dif2: c.dif2, motivo: motivos.join("; ") });
  }

  // AGREGADO · la regla de la sociedad asociada es por terminación: si una cuenta dice «partes relacionadas»
  // y no termina en 0002, el journal no lleva 4810. Se avisa, no se cambia la regla.
  for (const c of comparacion) {
    if (/PARTES\s+RELACIONADAS/i.test(c.nombre) && !/0002$/.test(c.cuenta) && (c.dif1 !== 0 || c.dif2 !== 0)) {
      observaciones.push(`${c.cuenta} se llama «${c.nombre.trim()}» pero no termina en 0002: la regla no le pone sociedad asociada ${SOCIEDAD_ASOCIADA}. Confírmalo con Laura antes de cargar.`);
    }
  }

  let libros: ResultadoFiducia["libros"] = null;
  const ledger1 = e.ledger1 ?? "0L", ledger2 = e.ledger2 ?? "";
  const a = lineasDeLibro(comparacion, "dif1"), b = lineasDeLibro(comparacion, "dif2");
  for (const [n, x] of [["Libro 1", a], ["Libro 2", b]] as const) {
    if (Math.abs(x.descuadre) > MAX_DESCUADRE) bloqueos.push(`Descuadre de ${(x.descuadre / 100).toLocaleString("es-CO")} pesos en el ${n}: supera el máximo de $10 permitido para ajuste al peso.`);
  }
  if (!bloqueos.length) {
    const libro = (x: typeof a, ledger: string): Libro => ({
      ...x, ledger,
      debitos: suma(x.lineas.filter((l) => l.valor > 0).map((l) => l.valor)),
      creditos: suma(x.lineas.filter((l) => l.valor < 0).map((l) => -l.valor)),
    });
    libros = { L1: libro(a, ledger1), L2: libro(b, ledger2) };
    if (!ledger2) observaciones.push("El grupo de ledgers del Libro 2 está vacío: queda resaltado en el journal hasta que contabilidad lo defina.");
  }

  const hayDif = comparacion.some((c) => c.dif1 !== 0 || c.dif2 !== 0);
  const soloRedondeo = libros && Math.abs(a.descuadre) <= MAX_DESCUADRE && comparacion.every((c) => Math.abs(c.dif1) <= MAX_DESCUADRE && Math.abs(c.dif2) <= MAX_DESCUADRE);
  const estado = bloqueos.length ? "bloqueado" : !hayDif || soloRedondeo ? "cuadra" : "no_cuadra";

  return {
    estado, patrimonio, cebe, fiducia, fiduciaria: conf?.nombre ?? `Fiducia ${fiducia}`, lector, periodo, fecha,
    detalle, comparacion,
    excluidas: detalle.filter((d) => d.estado.startsWith("Excluida")),
    sinHomologacion,
    pfExcluidas: [...sap.values()].filter((s) => /^PF/.test(s.cuenta)),
    libros, marcadas, bloqueos, observaciones,
  };
}
