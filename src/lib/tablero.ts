// Lo que ve el tablero: el mapa sociedades × procesos, las diferencias grandes con su causa y los pendientes
// por responsable. Todas las cifras salen de aquí (código), nunca del modelo. Lo usan las pantallas y el reporte.
import type { ClaveProceso, Estado, EstadoPendiente } from "@prisma/client";
import { db } from "./db";
import { diaHabilDe, fechaDiaHabil, hoyBogota, nombrePeriodo } from "./calendario";
import { CONCEPTO, type SubsidiariaInv } from "./motores/inversion";
import { PROCESO_CORTO } from "./etiquetas";

export type Celda = { estado: Estado | "no_aplica" | "por_correr"; resultadoId?: string; ejecucionId?: string; marcadas: number; diferencias: number; valorAbs: number; nota?: string | null };
export type DiferenciaGrande = { sociedad: string; sociedadId: string; proceso: ClaveProceso; ejecucionId: string; titulo: string; valor: number; causa: string; origen: "regla" | "agente"; cruceId?: string; estadoCruce?: string };
export type PendienteVista = { id: string; titulo: string; tipo: string; estado: EstadoPendiente; sociedad: string | null; avisadoEn: Date | null; respondidoEn: Date | null; lectura: unknown; venceEn: Date | null };

const PESO: Record<string, number> = { bloqueado: 4, pendiente: 3, no_cuadra: 2, por_correr: 1, cuadra: 0, no_aplica: -1 };

export async function cifrasDelCierre(cierreId: string, hoy = hoyBogota()) {
  const cierre = await db.cierre.findUniqueOrThrow({ where: { id: cierreId } });
  const [procesos, sociedades, vigentes, pendientes, cruces] = await Promise.all([
    db.proceso.findMany({ orderBy: { orden: "asc" }, include: { responsable: true, alcance: true } }),
    db.sociedad.findMany({ orderBy: [{ orden: "asc" }, { codigo: "asc" }] }),
    db.resultado.findMany({ where: { cierreId, vigente: true }, include: { ejecucion: { select: { id: true, detalle: true, proceso: { select: { clave: true } } } } } }),
    db.pendiente.findMany({ where: { cierreId }, include: { responsable: true, sociedad: true }, orderBy: { createdAt: "asc" } }),
    db.cruce.findMany({ where: { cierreId, estado: { in: ["propuesto", "aceptado"] } }, include: { sociedad: true } }),
  ]);
  const diaHoy = diaHabilDe(cierre.periodo, hoy);
  const vigentePor = new Map(vigentes.map((r) => [`${r.procesoId}|${r.sociedadId}`, r]));

  const procs = procesos.map((p) => {
    const vence = fechaDiaHabil(cierre.periodo, p.diaHabil);
    return { id: p.id, clave: p.clave, nombre: p.nombre, corto: PROCESO_CORTO[p.clave], dueno: p.dueno, diaHabil: p.diaHabil, vence, vencido: hoy.getTime() >= vence.getTime(), demo: p.demo, responsable: p.responsable.nombre, alcance: new Set(p.alcance.map((a) => a.sociedadId)) };
  });

  const filas = sociedades.map((s) => {
    const celdas: Record<string, Celda> = {};
    for (const p of procs) {
      if (!p.alcance.has(s.id)) { celdas[p.clave] = { estado: "no_aplica", marcadas: 0, diferencias: 0, valorAbs: 0 }; continue; }
      const r = vigentePor.get(`${p.id}|${s.id}`);
      celdas[p.clave] = r ? { estado: r.estado, resultadoId: r.id, ejecucionId: r.ejecucionId, marcadas: r.marcadas, diferencias: r.diferencias, valorAbs: Number(r.valorAbs), nota: r.nota }
        : { estado: p.vencido ? "pendiente" : "por_correr", marcadas: 0, diferencias: 0, valorAbs: 0 };
    }
    const aplican = Object.values(celdas).filter((c) => c.estado !== "no_aplica");
    const peor = aplican.reduce<Celda["estado"]>((a, c) => (PESO[c.estado] > PESO[a] ? c.estado : a), "cuadra");
    const cruce = cruces.some((c) => c.sociedadId === s.id);
    return { id: s.id, codigo: s.codigo, nombre: s.nombre, tipo: s.tipo, demo: s.demo, celdas, general: cruce && peor === "cuadra" ? ("no_cuadra" as const) : peor, cruce, aplica: aplican.length > 0 };
  }).filter((f) => f.aplica);

  // Las diferencias grandes, con su causa: la de la regla del motor o la que propuso el agente
  const grandes: DiferenciaGrande[] = [];
  const nombreSoc = new Map(sociedades.map((s) => [s.id, s.nombre]));
  const codigoASoc = new Map<string, { id: string; nombre: string }>();
  for (const s of sociedades) for (const c of [s.codigo, ...s.alias]) codigoASoc.set(c, { id: s.id, nombre: s.nombre });
  const vistas = new Set<string>();
  for (const r of vigentes) {
    if (!r.marcadas || vistas.has(`${r.ejecucionId}|${r.sociedadId}`)) continue;
    vistas.add(`${r.ejecucionId}|${r.sociedadId}`);
    const clave = r.ejecucion.proceso.clave, d = r.ejecucion.detalle as Record<string, unknown>;
    const base = { sociedad: nombreSoc.get(r.sociedadId)!, sociedadId: r.sociedadId, proceso: clave, ejecucionId: r.ejecucionId, origen: "regla" as const };
    if (clave === "fiducia_txt") for (const m of (d.marcadas as { cuenta: string; nombre: string; dif1: number; dif2: number; motivo: string }[]) ?? [])
      grandes.push({ ...base, titulo: `${m.cuenta} ${m.nombre.trim()}`.trim(), valor: Math.abs(m.dif1) >= Math.abs(m.dif2) ? m.dif1 : m.dif2, causa: m.motivo[0].toUpperCase() + m.motivo.slice(1) + "." });
    if (clave === "inversion") for (const s of (d.subsidiarias as SubsidiariaInv[]) ?? []) {
      if (codigoASoc.get(s.codigo)?.id !== r.sociedadId) continue;
      for (const l of s.lineas.filter((x) => x.marcada)) grandes.push({ ...base, titulo: CONCEPTO[l.concepto], valor: l.dif, causa: "Lo registrado en la matriz no es el porcentaje de participación sobre el patrimonio de la subsidiaria." });
    }
    if (clave === "intercompania") for (const x of (d.diferencias as { marcada: boolean; responsable: string; deudor: string; acreedor: string; nombre_tipo: string; refs: string[]; monto: number; monto_abs: number; regla: string; tipo: string }[]) ?? []) {
      if (!x.marcada || codigoASoc.get(x.responsable)?.id !== r.sociedadId) continue;
      grandes.push({ ...base, titulo: `${x.refs.join(", ")} · ${codigoASoc.get(x.deudor)?.nombre ?? x.deudor} → ${codigoASoc.get(x.acreedor)?.nombre ?? x.acreedor}`, valor: x.tipo === "PAGO_OTRA_FACTURA" ? x.monto_abs : x.monto,
        causa: x.tipo === "SIN_CLASIFICAR" ? "Ninguna regla la explica: hace falta el soporte de las dos sociedades." : `${x.nombre_tipo} (regla ${x.regla}).` });
    }
  }
  for (const c of cruces) {
    const causa = (c.causa as { causa?: string } | null)?.causa ?? "El agente está proponiendo la causa.";
    grandes.push({ sociedad: c.sociedad.nombre, sociedadId: c.sociedadId, proceso: c.procesoA, ejecucionId: vigentes.find((v) => v.id === c.resultadoA)?.ejecucionId ?? "", titulo: `${c.etiqueta}: ${PROCESO_CORTO[c.procesoA]} contra ${PROCESO_CORTO[c.procesoB]}`, valor: Number(c.diferencia), causa, origen: "agente", cruceId: c.id, estadoCruce: c.estado });
  }
  // Primero lo que propuso el agente; después, intercaladas por proceso (la más grande de cada uno, luego la
  // segunda…), para que un proceso con muchas diferencias no tape a los demás.
  grandes.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
  const porProc = new Map<string, DiferenciaGrande[]>();
  for (const g of grandes.filter((x) => x.origen === "regla")) (porProc.get(g.proceso) ?? porProc.set(g.proceso, []).get(g.proceso)!).push(g);
  const intercaladas: DiferenciaGrande[] = [];
  for (let i = 0; intercaladas.length < grandes.filter((x) => x.origen === "regla").length; i++) for (const l of porProc.values()) if (l[i]) intercaladas.push(l[i]);
  grandes.splice(0, grandes.length, ...grandes.filter((x) => x.origen === "agente"), ...intercaladas);

  // Pendientes por responsable
  const abiertos = pendientes.filter((p) => p.estado !== "resuelto");
  const porResp = new Map<string, { id: string; nombre: string; cargo: string; correo: string; pendientes: PendienteVista[] }>();
  for (const p of abiertos) {
    const g = porResp.get(p.responsableId) ?? porResp.set(p.responsableId, { id: p.responsableId, nombre: p.responsable.nombre, cargo: p.responsable.cargo, correo: p.responsable.correo, pendientes: [] }).get(p.responsableId)!;
    g.pendientes.push({ id: p.id, titulo: p.titulo, tipo: p.tipo, estado: p.estado, sociedad: p.sociedad?.nombre ?? null, avisadoEn: p.avisadoEn, respondidoEn: p.respondidoEn, lectura: p.lectura, venceEn: p.venceEn });
  }

  const cuenta = (e: string) => filas.filter((f) => f.general === e).length;
  return {
    cierre: { id: cierre.id, periodo: cierre.periodo, nombre: nombrePeriodo(cierre.periodo), diaHabilHoy: diaHoy, avisosAutomaticos: cierre.avisosAutomaticos, avisosAprobadosPor: cierre.avisosAprobadosPor },
    procesos: procs.map((p) => {
      const celdas = filas.map((f) => f.celdas[p.clave]).filter((c) => c.estado !== "no_aplica");
      const n = (e: string) => celdas.filter((c) => c.estado === e).length;
      return { ...p, alcance: undefined, total: celdas.length, cuadra: n("cuadra"), no_cuadra: n("no_cuadra"), bloqueado: n("bloqueado"), falta: n("pendiente"), porCorrer: n("por_correr") };
    }),
    sociedades: filas,
    grandes,
    responsables: [...porResp.values()].sort((a, b) => b.pendientes.length - a.pendientes.length),
    totales: {
      sociedades: filas.length, cuadran: cuenta("cuadra"), conDiferencias: cuenta("no_cuadra"), bloqueadas: cuenta("bloqueado"), faltan: cuenta("pendiente"), porCorrer: cuenta("por_correr"),
      pendientes: abiertos.length, porAvisar: abiertos.filter((p) => p.estado === "por_avisar").length, avisados: abiertos.filter((p) => p.estado === "avisado").length, respondidos: abiertos.filter((p) => p.estado === "respondido").length,
      resueltos: pendientes.length - abiertos.length, cruces: cruces.length,
    },
  };
}

export type Cifras = Awaited<ReturnType<typeof cifrasDelCierre>>;

/** El cierre que se muestra: el pedido, o el abierto más reciente. */
export async function cierreActual(periodo?: string) {
  if (periodo) { const c = await db.cierre.findUnique({ where: { periodo } }); if (c) return c; }
  return (await db.cierre.findFirst({ where: { abierto: true }, orderBy: { periodo: "desc" } })) ?? (await db.cierre.findFirst({ orderBy: { periodo: "desc" } }));
}
