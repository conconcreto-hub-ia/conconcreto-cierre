// Etiquetas y tonos de los enums. Un solo lugar: ninguna pantalla escribe su propia versión.

import type { EstadoOportunidad, Recomendacion, Origen, TipoPaquete, EstadoInvitacion, Actor } from "@prisma/client";

export type Tono = "neutro" | "verde" | "oro" | "rojo" | "noche";

export const ESTADO_OPORTUNIDAD: Record<EstadoOportunidad, { etiqueta: string; tono: Tono }> = {
  nueva: { etiqueta: "Nueva", tono: "noche" },
  analizada: { etiqueta: "Con ficha", tono: "neutro" },
  en_comite: { etiqueta: "En comité", tono: "oro" },
  aprobada: { etiqueta: "Aprobada", tono: "verde" },
  descartada: { etiqueta: "Descartada", tono: "neutro" },
  en_cotizacion: { etiqueta: "Cotizando", tono: "verde" },
  cerrada: { etiqueta: "Cerrada", tono: "neutro" },
};

export const RECOMENDACION: Record<Recomendacion, { etiqueta: string; tono: Tono; corta: string }> = {
  go: { etiqueta: "Presentarse", corta: "Go", tono: "verde" },
  revisar: { etiqueta: "Revisar en comité", corta: "Revisar", tono: "oro" },
  no_go: { etiqueta: "No presentarse", corta: "No go", tono: "rojo" },
};

export const ORIGEN: Record<Origen, { etiqueta: string; detalle: string }> = {
  invitacion: { etiqueta: "Invitación", detalle: "Llegó por correo de un cliente privado" },
  secop: { etiqueta: "SECOP", detalle: "La encontró el radar en el SECOP" },
};

export const TIPO_PAQUETE: Record<TipoPaquete, string> = {
  suministro: "Suministro",
  servicio: "Servicio",
  mano_de_obra: "Mano de obra",
};

export const ESTADO_INVITACION: Record<EstadoInvitacion, { etiqueta: string; tono: Tono }> = {
  borrador: { etiqueta: "Por aprobar", tono: "oro" },
  aprobada: { etiqueta: "Aprobada", tono: "neutro" },
  enviada: { etiqueta: "Enviada", tono: "neutro" },
  recordada: { etiqueta: "Recordada", tono: "oro" },
  respondida: { etiqueta: "Respondió", tono: "verde" },
  cotizo: { etiqueta: "Cotizó", tono: "verde" },
  declino: { etiqueta: "Declinó", tono: "rojo" },
};

export const ACTOR: Record<Actor, string> = {
  agente: "Agente",
  persona: "Persona",
  sistema: "Sistema",
};
