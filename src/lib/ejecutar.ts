// De los archivos a la base: corre un motor, guarda la ejecución con sus archivos y un resultado por
// sociedad, y deja al día los pendientes y los cruces. Lo llama la acción «Cargar el mes» (una persona) y
// las pruebas. El motor no sabe nada de la base; esto no sabe nada de las reglas contables.
import { createHash } from "node:crypto";
import type { ClaveProceso, Estado, Prisma } from "@prisma/client";
import { db } from "./db";
import { abrir, filas, hoja } from "./xlsx";
import { conciliarFiducia } from "./motores/fiducia";
import { leerSap, leerHomologacion, libroConciliacion, journal } from "./motores/fiducia-archivos";
import { basePyg, maestrosDesdeFilas, MESES, SOC01, SOC77 } from "./motores/pyg";
import { basePygXlsx } from "./motores/pyg-archivos";
import { cruzar, leerAuxiliares } from "./motores/intercompania";
import { conciliarInversion, leerInversion, CONCEPTO } from "./motores/inversion";
import { pesos, porcentaje } from "./formato";
import { nombrePeriodo } from "./calendario";
import { despuesDeGuardar } from "./agente";
import type { Salida } from "./cruces";

export type ArchivoSubido = { nombre: string; contenido: Buffer };

type ResultadoSoc = { sociedad: string; estado: Estado; diferencias?: number; marcadas?: number; valorAbs?: number; salidas?: Salida[]; nota?: string };
type Guardar = {
  cierreId: string; clave: ClaveProceso; estado: Estado; titulo: string; entradas: ArchivoSubido[];
  resumen: unknown; detalle: unknown; mensajes: string[]; corridoPor: string;
  archivos: { nombre: string; tipo: string; contenido: Buffer }[]; resultados: ResultadoSoc[];
  /** Pendientes que el motor deja: bloqueos, diferencias para revisar. Se sincronizan con los existentes. */
  pendientes: PendienteMotor[];
};
export type PendienteMotor = { sociedad: string; clave: string; tipo: "bloqueo" | "revision" | "diferencia"; titulo: string; detalle: string };

const huella = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const json = (x: unknown) => JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;

/** Encuentra la sociedad por su código o por cualquiera de sus alias («01», «1000», «77»…). */
export async function sociedadPor(codigo: string) {
  const s = await db.sociedad.findFirst({ where: { OR: [{ codigo }, { alias: { has: codigo } }] } });
  if (!s) throw new Error(`La sociedad ${codigo} no está en el tablero.`);
  return s;
}

async function guardar(g: Guardar): Promise<string> {
  const proceso = await db.proceso.findUniqueOrThrow({ where: { clave: g.clave } });
  const socs = new Map<string, string>();
  for (const r of [...g.resultados, ...g.pendientes]) if (!socs.has(r.sociedad)) socs.set(r.sociedad, (await sociedadPor(r.sociedad)).id);
  const h = huella({ clave: g.clave, resumen: g.resumen, detalle: g.detalle });

  const ejecucion = await db.$transaction(async (tx) => {
    const e = await tx.ejecucion.create({
      data: {
        cierreId: g.cierreId, procesoId: proceso.id, estado: g.estado, titulo: g.titulo, corridoPor: g.corridoPor, huella: h, mensajes: g.mensajes,
        entradas: json(g.entradas.map((a) => ({ nombre: a.nombre, tamano: a.contenido.length, huella: createHash("sha256").update(a.contenido).digest("hex") }))),
        resumen: json(g.resumen), detalle: json(g.detalle),
      },
    });
    const ids = [...new Set(g.resultados.map((r) => socs.get(r.sociedad)!))];
    await tx.resultado.updateMany({ where: { cierreId: g.cierreId, procesoId: proceso.id, sociedadId: { in: ids }, vigente: true }, data: { vigente: false } });
    for (const r of g.resultados) {
      await tx.resultado.create({
        data: {
          ejecucionId: e.id, sociedadId: socs.get(r.sociedad)!, procesoId: proceso.id, cierreId: g.cierreId, estado: r.estado,
          diferencias: r.diferencias ?? 0, marcadas: r.marcadas ?? 0, valorAbs: BigInt(Math.round(r.valorAbs ?? 0)), salidas: json(r.salidas ?? []), nota: r.nota ?? null,
        },
      });
    }
    for (const a of g.archivos) await tx.archivo.create({ data: { ejecucionId: e.id, nombre: a.nombre, tipo: a.tipo, contenido: new Uint8Array(a.contenido) } });
    await tx.evento.create({ data: { cierreId: g.cierreId, ejecucionId: e.id, actor: "persona", tipo: "ejecucion.cargada", descripcion: `${g.corridoPor} corrió ${proceso.nombre}: ${g.titulo}.`, datos: json({ estado: g.estado, huella: h.slice(0, 16) }) } });
    return e;
  }, { timeout: 60_000 });

  await despuesDeGuardar({
    cierreId: g.cierreId, ejecucionId: ejecucion.id, procesoId: proceso.id, quien: g.corridoPor,
    sociedades: [...new Set(g.resultados.map((r) => socs.get(r.sociedad)!))],
    pendientes: g.pendientes.map((p) => ({ ...p, sociedadId: socs.get(p.sociedad)! })),
  });
  return ejecucion.id;
}

/* ── Laura · fiduciaria contra SAP ──────────────────────────────────── */

export async function correrFiducia(a: { cierreId: string; sociedadId: string; txt: ArchivoSubido; sap: ArchivoSubido; homologacion: ArchivoSubido; ledger2?: string; quien: string }) {
  const [cierre, soc, proceso] = await Promise.all([
    db.cierre.findUniqueOrThrow({ where: { id: a.cierreId } }),
    db.sociedad.findUniqueOrThrow({ where: { id: a.sociedadId } }),
    db.proceso.findUniqueOrThrow({ where: { clave: "fiducia_txt" } }),
  ]);
  const mes = cierre.periodo.replace("-", ".");
  const r = conciliarFiducia({
    txtNombre: a.txt.nombre, txt: a.txt.contenido.toString("utf8"), mes,
    sap: await leerSap(a.sap.contenido), ...(await leerHomologacion(a.homologacion.contenido)),
    cebe: soc.cebe ?? undefined, fiducia: soc.fiducia ?? undefined, ledger2: a.ledger2 ?? "", umbral: Number(proceso.umbralRevision),
  });
  const proyecto = soc.nombre.replace(/^PA\s+/i, "");
  const archivos = [];
  if (r.libros) {
    archivos.push({ nombre: `Conciliacion ${proyecto} ${mes}.xlsx`, tipo: "libro", contenido: await libroConciliacion(r, proyecto) });
    archivos.push({ nombre: `Journal ${proyecto} ${mes} Libro1.xlsx`, tipo: "journal", contenido: await journal(r, r.libros.L1) });
    archivos.push({ nombre: `Journal ${proyecto} ${mes} Libro2.xlsx`, tipo: "journal", contenido: await journal(r, r.libros.L2) });
  }
  const conDif = r.comparacion.filter((c) => c.dif1 !== 0 || c.dif2 !== 0);
  const pendientes: PendienteMotor[] = [];
  if (r.estado === "bloqueado") pendientes.push({ sociedad: soc.codigo, clave: `bloqueo:fiducia_txt:${soc.codigo}`, tipo: "bloqueo", titulo: `La conciliación de ${soc.nombre} se detuvo`, detalle: r.bloqueos.join("\n") });
  if (r.marcadas.length) pendientes.push({
    sociedad: soc.codigo, clave: `revision:fiducia_txt:${soc.codigo}`, tipo: "revision",
    titulo: `${r.marcadas.length} ${r.marcadas.length === 1 ? "diferencia grande" : "diferencias grandes"} en ${soc.nombre} antes de cargar el ajuste`,
    detalle: r.marcadas.map((m) => `${m.cuenta} ${m.nombre.trim()} · Libro 1 ${pesos(m.dif1 / 100)} · Libro 2 ${pesos(m.dif2 / 100)} · ${m.motivo}`).join("\n"),
  });
  return guardar({
    cierreId: a.cierreId, clave: "fiducia_txt", estado: r.estado, titulo: `${soc.nombre} · ${nombrePeriodo(cierre.periodo)}`, entradas: [a.txt, a.sap, a.homologacion],
    resumen: {
      patrimonio: r.patrimonio, cebe: r.cebe, fiducia: r.fiducia, fiduciaria: r.fiduciaria, lector: r.lector, fecha: r.fecha,
      cuentasTxt: r.detalle.length, excluidas: r.excluidas.length, comparadas: r.comparacion.length, conDiferencia: conDif.length,
      libro1: r.libros && { lineas: r.libros.L1.lineas.length, debitos: r.libros.L1.debitos / 100, creditos: r.libros.L1.creditos / 100, descuadre: r.libros.L1.descuadre / 100, ledger: r.libros.L1.ledger },
      libro2: r.libros && { lineas: r.libros.L2.lineas.length, debitos: r.libros.L2.debitos / 100, creditos: r.libros.L2.creditos / 100, descuadre: r.libros.L2.descuadre / 100, ledger: r.libros.L2.ledger },
      umbral: Number(proceso.umbralRevision),
    },
    detalle: {
      comparacion: r.comparacion.map((c) => ({ ...c, txt: c.txt / 100, txtRedondeado: c.txtRedondeado / 100, l1: c.l1 / 100, dif1: c.dif1 / 100, l2: c.l2 / 100, dif2: c.dif2 / 100 })),
      marcadas: r.marcadas.map((m) => ({ ...m, dif1: m.dif1 / 100, dif2: m.dif2 / 100 })),
      excluidas: r.excluidas.map((d) => ({ cuenta: d.cuenta, descripcion: d.descripcion, sf: d.sf / 100, estado: d.estado })),
      sinHomologacion: r.sinHomologacion.map((d) => ({ cuenta: d.cuenta, descripcion: d.descripcion, sf: d.sf / 100 })),
      pf: r.pfExcluidas.map((p) => ({ cuenta: p.cuenta, nombre: p.nombre, l1: p.l1 / 100, l2: p.l2 / 100 })),
      libros: r.libros && { L1: r.libros.L1.lineas.map((l) => ({ ...l, valor: l.valor / 100 })), L2: r.libros.L2.lineas.map((l) => ({ ...l, valor: l.valor / 100 })) },
    },
    mensajes: [...r.bloqueos, ...r.observaciones], corridoPor: a.quien, archivos,
    resultados: [{ sociedad: soc.codigo, estado: r.estado, diferencias: conDif.length, marcadas: r.marcadas.length, valorAbs: conDif.reduce((s, c) => s + Math.abs(c.dif1), 0) / 100 }],
    pendientes,
  });
}

/* ── Felipe · base SAP del PyG ──────────────────────────────────────── */

export async function correrPyg(a: { cierreId: string; extraccion: ArchivoSubido; maestros: ArchivoSubido; pctLLC: number; quien: string }) {
  const cierre = await db.cierre.findUniqueOrThrow({ where: { id: a.cierreId } });
  const ex = await abrir(a.extraccion.contenido);
  if (ex.worksheets.length !== 1) throw new Error(`«${a.extraccion.nombre}» tiene ${ex.worksheets.length} hojas: una extracción sin procesar tiene una sola. ¿Subiste una base ya procesada?`);
  const ma = await abrir(a.maestros.contenido);
  const hc = hoja(ma, "Base Centros de Beneficio"), hk = hoja(ma, "Base Cuentas");
  if (!hc || !hk) throw new Error("Los maestros tienen que traer las hojas «Base Centros de Beneficio» y «Base Cuentas».");
  const ext = filas(ex.worksheets[0]);
  const r = basePyg(ext, maestrosDesdeFilas(filas(hc), filas(hk)), a.pctLLC);
  const archivos = r.estado === "bloqueado" ? [] : [{ nombre: a.extraccion.nombre.replace(/\.xlsx$/i, "") + " - Procesada.xlsx", tipo: "base", contenido: await basePygXlsx(r, ext) }];
  const periodoExt = r.anio && r.mesCierre ? `${r.anio}-${String(r.mesCierre).padStart(2, "0")}` : null;
  const mensajes = [...r.bloqueos];
  if (periodoExt && periodoExt !== cierre.periodo) mensajes.push(`La extracción llega hasta ${MESES[r.mesCierre]} ${r.anio} y el cierre es de ${nombrePeriodo(cierre.periodo)}.`);
  const resumen = {
    filasOriginales: r.filasOriginales, filasCero: r.filasCero, filasOptimizado: r.filasOptimizado, filasBase: r.filasBase, ajustes: r.ajustes, anio: r.anio, mesCierre: r.mesCierre,
    utilidadCCP: r.utilidadCCP, utilidadLLC: r.utilidadLLC, pctLLC: r.pctLLC, participacionLLC: r.participacionLLC, utilidadLLCsinCCP: r.utilidadLLCsinCCP, factor: r.factor,
    pctCC: r.pctCC, mpCalculo: r.mpCalculo, mpMetodo: r.mpMetodo, diferencia: r.diferencia, check: r.check, checkPesos: r.checkPesos, porSociedad: r.porSociedad,
  };
  const pendientes: PendienteMotor[] = [];
  if (r.estado !== "cuadra") pendientes.push({
    sociedad: "4810", clave: "bloqueo:pyg_base:4810", tipo: "bloqueo", titulo: r.estado === "bloqueado" ? "La base del PyG se detuvo" : "El check de la base del PyG no da cero",
    detalle: [...r.bloqueos, ...r.faltantes.cebes.map((c) => `CeBe faltante: ${c.codigo} ${c.nombre}`), ...r.faltantes.cuentas.map((c) => `Cuenta faltante: ${c.codigo} ${c.nombre}`)].join("\n"),
  });
  const notaDif = r.estado === "bloqueado" ? undefined : `Método de participación en 01I1OI0205: ${pesos(r.mpMetodo)} según SAP contra ${pesos(r.mpCalculo)} según el cálculo (${porcentaje(r.pctCC)}). La diferencia de ${pesos(r.diferencia)} va a la última fila.`;
  return guardar({
    cierreId: a.cierreId, clave: "pyg_base", estado: r.estado, titulo: `Base SAP PyG · ${nombrePeriodo(cierre.periodo)}`, entradas: [a.extraccion, a.maestros],
    resumen, detalle: { ajustes: r.base.filter((b) => b.ajuste === "Ajuste").map((b) => ({ mes: b.mes, cebe: b.cebe, cuenta: b.cuenta, grupo: b.cuentaM.grupo, valor: b.valor, ajustado: b.ajustado, regla: b.regla })), faltantes: r.faltantes },
    mensajes, corridoPor: a.quien, archivos,
    resultados: r.estado === "bloqueado" ? [{ sociedad: "4810", estado: "bloqueado", nota: r.bloqueos.join(" ") }] : [
      { sociedad: "4810", estado: r.estado, nota: notaDif },
      { sociedad: "4811", estado: r.estado, salidas: [
        { clave: "utilidad_ejercicio", etiqueta: "Utilidad del ejercicio de CCC Proyectos", valor: r.utilidadCCP },
        { clave: "mp_reconocido", etiqueta: "Método de participación reconocido por Constructora sobre CCC Proyectos", valor: r.mpMetodo },
      ], nota: `Utilidad según la sociedad ${SOC77.split(" ")[0]} en SAP. Valor de ${SOC01}: ${pesos(r.porSociedad.find((s) => s.sociedad === SOC01)?.valor ?? 0)}.` },
    ],
    pendientes,
  });
}

/* ── Intercompañía ──────────────────────────────────────────────────── */

export async function correrIntercompania(a: { cierreId: string; auxiliares: ArchivoSubido; quien: string }) {
  const [cierre, proceso] = await Promise.all([db.cierre.findUniqueOrThrow({ where: { id: a.cierreId } }), db.proceso.findUniqueOrThrow({ where: { clave: "intercompania" }, include: { alcance: { include: { sociedad: true } } } })]);
  const r = cruzar(leerAuxiliares(await abrir(a.auxiliares.contenido)));
  const umbral = Number(proceso.umbralRevision);
  const mensajes: string[] = [];
  if (r.corte.slice(0, 7) !== cierre.periodo) mensajes.push(`Los auxiliares tienen corte ${r.corte} y el cierre es de ${nombrePeriodo(cierre.periodo)}.`);
  if (!r.cuadre.cuadra) mensajes.push("NO CUADRA: lo explicado no suma la diferencia total. No se explica un cruce que no cuadra.");
  const toca = (d: (typeof r.diferencias)[number], c: string) => d.responsable === c || d.detalle.tambien === c;
  const marcada = (d: (typeof r.diferencias)[number]) => d.tipo === "SIN_CLASIFICAR" || d.monto_abs >= umbral;
  const resultados: ResultadoSoc[] = proceso.alcance.map(({ sociedad: s }): ResultadoSoc => {
    const codigoIC = [s.codigo, ...s.alias].find((c) => r.sociedades.some((x) => x.codigo === c));
    if (!codigoIC) return { sociedad: s.codigo, estado: "pendiente" as Estado, nota: "No viene en el archivo de auxiliares." };
    const ds = r.diferencias.filter((d) => toca(d, codigoIC));
    return { sociedad: s.codigo, estado: !r.cuadre.cuadra ? "bloqueado" : ds.length ? "no_cuadra" : "cuadra", diferencias: ds.length, marcadas: ds.filter(marcada).length, valorAbs: ds.reduce((x, d) => x + d.monto_abs, 0) };
  }).filter((x) => x.estado !== "pendiente");
  const nombre = Object.fromEntries(r.sociedades.map((s) => [s.codigo, s.nombre]));
  const pendientes: PendienteMotor[] = r.diferencias.flatMap((d) => {
    const quienes = [d.responsable!, ...(d.detalle.tambien ? [String(d.detalle.tambien)] : [])];
    return quienes.map((q) => ({
      sociedad: q, clave: `ic:${d.deudor}-${d.acreedor}:${d.refs.join(",")}:${q}`, tipo: "diferencia" as const,
      titulo: `${d.nombre_tipo} · ${d.refs.join(", ")} · ${nombre[d.deudor] ?? d.deudor} → ${nombre[d.acreedor] ?? d.acreedor}`,
      detalle: `${d.regla} · ${d.tipo === "PAGO_OTRA_FACTURA" ? `pago de ${pesos(d.monto_abs)} aplicado a facturas distintas en cada lado` : `diferencia de ${pesos(d.monto)} (CxC de ${d.deudor} menos CxP de ${d.acreedor})`}. ` +
        `Soporte: ${d.evidencia.map((e) => `${e.soc} ${e.cuenta} ${e.clase} ${e.doc} del ${e.fecha} por ${pesos(e.ml)}`).join("; ")}.` +
        (d.tipo === "SIN_CLASIFICAR" ? " Ninguna regla la explica: hace falta el soporte de las dos sociedades." : ""),
    }));
  });
  return guardar({
    cierreId: a.cierreId, clave: "intercompania", estado: !r.cuadre.cuadra ? "bloqueado" : r.diferencias.length ? "no_cuadra" : "cuadra",
    titulo: `Cuentas recíprocas del grupo · corte ${r.corte}`, entradas: [a.auxiliares],
    resumen: { ...r.kpis, cuadre: r.cuadre, trm: r.trm, corte: r.corte, huellaCruce: r.huella.slice(0, 16), umbral },
    detalle: { pares: r.pares, diferencias: r.diferencias.map((d) => ({ ...d, marcada: marcada(d) })), sociedades: r.sociedades },
    mensajes, corridoPor: a.quien, archivos: [], resultados, pendientes,
  });
}

/* ── Tatiana · inversión contra patrimonio (demostración) ──────────── */

export async function correrInversion(a: { cierreId: string; archivo: ArchivoSubido; quien: string }) {
  const [cierre, proceso] = await Promise.all([db.cierre.findUniqueOrThrow({ where: { id: a.cierreId } }), db.proceso.findUniqueOrThrow({ where: { clave: "inversion" } })]);
  const r = conciliarInversion({ ...leerInversion(await abrir(a.archivo.contenido)), umbral: Number(proceso.umbralRevision) });
  const pendientes: PendienteMotor[] = [];
  for (const s of r.subsidiarias) {
    if (s.estado === "bloqueado") pendientes.push({ sociedad: s.codigo, clave: `bloqueo:inversion:${s.codigo}`, tipo: "bloqueo", titulo: `Falta el balance de ${s.nombre}`, detalle: s.mensaje ?? "" });
    const m = s.lineas.filter((l) => l.marcada);
    if (m.length) pendientes.push({ sociedad: s.codigo, clave: `revision:inversion:${s.codigo}`, tipo: "revision", titulo: `Inversión en ${s.nombre} no cuadra con su patrimonio`,
      detalle: m.map((l) => `${CONCEPTO[l.concepto]}: esperado ${pesos(l.esperado)} (${porcentaje(s.pct)} de ${pesos(l.base)}), registrado ${pesos(l.registrado)}, diferencia ${pesos(l.dif)}.`).join("\n") });
  }
  const est: Estado = r.subsidiarias.some((s) => s.estado === "bloqueado") ? "bloqueado" : r.subsidiarias.some((s) => s.estado === "no_cuadra") ? "no_cuadra" : "cuadra";
  return guardar({
    cierreId: a.cierreId, clave: "inversion", estado: est, titulo: `Inversiones de Constructora en subsidiarias · ${nombrePeriodo(cierre.periodo)}`, entradas: [a.archivo],
    resumen: { demo: true, corte: r.corte, trm: r.trm, umbral: r.umbral, subsidiarias: r.subsidiarias.length, marcadas: r.marcadas, cuadran: r.subsidiarias.filter((s) => s.estado === "cuadra").length },
    detalle: { subsidiarias: r.subsidiarias },
    mensajes: ["Motor de demostración: falta validar con Tatiana los conceptos, las cuentas del ajuste y el umbral."], corridoPor: a.quien, archivos: [],
    resultados: r.subsidiarias.map((s) => ({
      sociedad: s.codigo, estado: s.estado, diferencias: s.lineas.filter((l) => l.dif !== 0).length, marcadas: s.lineas.filter((l) => l.marcada).length,
      valorAbs: s.lineas.reduce((x, l) => x + Math.abs(l.dif), 0), nota: s.mensaje ?? undefined,
      salidas: s.estado === "bloqueado" ? [] : [
        { clave: "utilidad_ejercicio", etiqueta: `Utilidad del ejercicio de ${s.nombre}`, valor: s.resultadoCop },
        { clave: "mp_reconocido", etiqueta: `Método de participación reconocido por Constructora sobre ${s.nombre}`, valor: s.lineas.find((l) => l.concepto === "resultado")!.registrado },
      ],
    })),
    pendientes,
  });
}
