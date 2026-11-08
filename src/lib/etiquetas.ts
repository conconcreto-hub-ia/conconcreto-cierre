// Etiquetas y tonos de los enums. Un solo lugar: ninguna pantalla escribe su propia versión.

import type { Estado, EstadoPendiente, EstadoCruce, Actor, ClaveProceso } from "@prisma/client";

export type Tono = "neutro" | "verde" | "oro" | "rojo" | "noche";

export const ESTADO: Record<Estado, { etiqueta: string; tono: Tono; detalle: string }> = {
  cuadra: { etiqueta: "Cuadra", tono: "verde", detalle: "Sin diferencias, o solo redondeo" },
  no_cuadra: { etiqueta: "Con diferencias", tono: "oro", detalle: "El motor encontró diferencias: el ajuste está listo para revisar" },
  bloqueado: { etiqueta: "Bloqueado", tono: "rojo", detalle: "El motor se detuvo: falta algo para poder conciliar" },
  pendiente: { etiqueta: "Falta", tono: "neutro", detalle: "Todavía no se ha corrido" },
};

export const ESTADO_PENDIENTE: Record<EstadoPendiente, { etiqueta: string; tono: Tono }> = {
  por_avisar: { etiqueta: "Aviso por aprobar", tono: "oro" },
  avisado: { etiqueta: "Avisado", tono: "neutro" },
  respondido: { etiqueta: "Respondió", tono: "verde" },
  resuelto: { etiqueta: "Resuelto", tono: "verde" },
};

export const ESTADO_CRUCE: Record<EstadoCruce, { etiqueta: string; tono: Tono }> = {
  propuesto: { etiqueta: "Causa propuesta", tono: "oro" },
  aceptado: { etiqueta: "Causa aceptada", tono: "verde" },
  descartado: { etiqueta: "Descartada", tono: "neutro" },
};

export const TIPO_PENDIENTE: Record<string, string> = {
  falta: "Falta",
  bloqueo: "Bloqueado",
  revision: "Para revisar",
  diferencia: "Diferencia",
  cruce: "Cruce entre procesos",
  manual: "Manual",
};

export const PROCESO_CORTO: Record<ClaveProceso, string> = {
  pyg_base: "Base PyG",
  fiducia_txt: "Fiduciaria vs SAP",
  inversion: "Inversión vs patrimonio",
  intercompania: "Intercompañía",
};

export const ACTOR: Record<Actor, string> = {
  agente: "Agente",
  persona: "Persona",
  sistema: "Sistema",
};
