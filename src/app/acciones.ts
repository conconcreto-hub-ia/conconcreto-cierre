"use server";
// Cada acción exige su permiso con la sesión de la base: no basta con que la pantalla esconda el botón,
// porque una acción de servidor se puede llamar directamente. Y firma con el nombre de quien la hizo.

import { revalidatePath } from "next/cache";
import type { ClaveProceso } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/auth/sesion";

const archivo = async (f: FormData, campo: string) => {
  const v = f.get(campo);
  if (!(v instanceof File) || !v.size) return null;
  return { nombre: v.name, contenido: Buffer.from(await v.arrayBuffer()) };
};

const refrescar = () => { revalidatePath("/"); revalidatePath("/pendientes"); revalidatePath("/comite"); };

export type EstadoCarga = { error?: string; ejecucionId?: string } | undefined;

/** «Cargar el mes»: sube los archivos de un proceso y corre su motor. */
export async function cargarMes(_: EstadoCarga, f: FormData): Promise<EstadoCarga> {
  const yo = await exigir("ejecuciones.cargar");
  const cierreId = String(f.get("cierreId") ?? "");
  const proceso = String(f.get("proceso") ?? "") as ClaveProceso;
  if (!(await db.cierre.findUnique({ where: { id: cierreId } }))) return { error: "Escoge el cierre." };
  try {
    const m = await import("@/lib/ejecutar");
    let id: string;
    if (proceso === "fiducia_txt") {
      const [txt, sap, hom] = await Promise.all([archivo(f, "txt"), archivo(f, "sap"), archivo(f, "homologacion")]);
      const sociedadId = String(f.get("sociedadId") ?? "");
      if (!sociedadId) return { error: "Escoge el patrimonio autónomo." };
      if (!txt || !sap || !hom) return { error: "Faltan archivos: el TXT, el exporte de SAP y la homologación." };
      if (!/\.txt$/i.test(txt.nombre)) return { error: "El balance de la fiduciaria tiene que ser el TXT." };
      id = await m.correrFiducia({ cierreId, sociedadId, txt, sap, homologacion: hom, ledger2: String(f.get("ledger2") ?? "").trim(), quien: yo.nombre });
    } else if (proceso === "pyg_base") {
      const [ext, ma] = await Promise.all([archivo(f, "extraccion"), archivo(f, "maestros")]);
      if (!ext || !ma) return { error: "Faltan archivos: la extracción de SAP y los maestros." };
      const pct = Number(String(f.get("pctLLC") ?? "").replace(",", ".")) / 100;
      if (!(pct > 0 && pct < 1)) return { error: "El % de participación de CC LLC en CC Proyectos tiene que estar entre 0 y 100." };
      id = await m.correrPyg({ cierreId, extraccion: ext, maestros: ma, pctLLC: pct, quien: yo.nombre });
    } else if (proceso === "intercompania") {
      const aux = await archivo(f, "auxiliares");
      if (!aux) return { error: "Falta el archivo de auxiliares." };
      id = await m.correrIntercompania({ cierreId, auxiliares: aux, quien: yo.nombre });
    } else if (proceso === "inversion") {
      const a = await archivo(f, "inversion");
      if (!a) return { error: "Falta el archivo de inversiones y patrimonios." };
      id = await m.correrInversion({ cierreId, archivo: a, quien: yo.nombre });
    } else return { error: "Escoge el proceso." };
    refrescar();
    return { ejecucionId: id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Una persona aprueba los avisos por aprobar (de todos, o de un responsable) y salen. */
export async function aprobarYEnviarAvisos(cierreId: string, responsableId?: string) {
  const yo = await exigir("avisos.aprobar");
  const { enviarAvisos } = await import("@/lib/agente");
  const r = await enviarAvisos(cierreId, { aprobadoPor: yo.nombre, responsableId });
  refrescar();
  return r;
}

/** Deja aprobado que el agente mande los avisos de este cierre sin pedir permiso uno por uno. */
export async function avisosAutomaticos(cierreId: string, activar: boolean) {
  const yo = await exigir("avisos.aprobar");
  const { aprobarAvisosAutomaticos } = await import("@/lib/agente");
  await aprobarAvisosAutomaticos(cierreId, yo.nombre, activar);
  refrescar();
}

/** El agente busca lo que venció y no está (lo mismo que la rutina diaria, sin esperarla). */
export async function buscarFaltantes(cierreId: string) {
  await exigir("pendientes.resolver");
  const { detectarFaltantes } = await import("@/lib/agente");
  const r = await detectarFaltantes(cierreId);
  refrescar();
  return r;
}

export async function resolverPendiente(id: string, nota: string) {
  const yo = await exigir("pendientes.resolver");
  const p = await db.pendiente.update({ where: { id }, data: { estado: "resuelto", resueltoPor: yo.nombre, resueltoEn: new Date() } });
  await db.evento.create({ data: { cierreId: p.cierreId, pendienteId: id, actor: "persona", tipo: "pendiente.resuelto", descripcion: `${yo.nombre} dio por resuelto «${p.titulo}».${nota.trim() ? ` Nota: ${nota.trim().slice(0, 500)}` : ""}` } });
  refrescar();
}

export async function revisarCruce(id: string, decision: "aceptado" | "descartado") {
  const yo = await exigir("cruces.revisar");
  if (decision !== "aceptado" && decision !== "descartado") throw new Error("Decisión no válida.");
  const c = await db.cruce.update({ where: { id }, data: { estado: decision, revisadoPor: yo.nombre, revisadoEn: new Date() } });
  await db.evento.create({ data: { cierreId: c.cierreId, actor: "persona", tipo: `cruce.${decision}`, descripcion: `${yo.nombre} ${decision === "aceptado" ? "aceptó" : "descartó"} la causa que propuso el agente para «${c.etiqueta}».` } });
  refrescar();
}

export async function revisarBuzonAhora() {
  await exigir("buzon.revisar");
  const { revisarBuzon } = await import("@/lib/agente");
  const r = await revisarBuzon();
  refrescar();
  return r;
}

export async function generarReporteAhora(cierreId: string) {
  const yo = await exigir("reporte.generar");
  const { generarReporte } = await import("@/lib/comite");
  const id = await generarReporte(cierreId, yo.nombre);
  revalidatePath("/comite");
  return id;
}
