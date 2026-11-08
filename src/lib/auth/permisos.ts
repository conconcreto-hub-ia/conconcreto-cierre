// Qué puede hacer cada rol. Un solo lugar: las acciones lo exigen y las pantallas lo consultan.
import type { Rol } from "@prisma/client";

export const PERMISOS = {
  ver: ["admin", "contabilidad", "comite", "consulta"],
  "ejecuciones.cargar": ["admin", "contabilidad"], // subir archivos y correr los motores
  "pendientes.resolver": ["admin", "contabilidad"], // dar por resuelto, crear, reasignar
  "avisos.aprobar": ["admin", "contabilidad"], // aprobar los correos del agente a los responsables
  "cruces.revisar": ["admin", "contabilidad"], // aceptar o descartar la causa que propone el agente
  "buzon.revisar": ["admin", "contabilidad"],
  "reporte.generar": ["admin", "contabilidad", "comite"],
  "usuarios.administrar": ["admin"],
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof PERMISOS;

export const puede = (rol: Rol | null | undefined, p: Permiso) => !!rol && (PERMISOS[p] as readonly Rol[]).includes(rol);

export const ROL: Record<Rol, { etiqueta: string; detalle: string }> = {
  admin: { etiqueta: "Administrador", detalle: "Todo, y maneja los usuarios" },
  contabilidad: { etiqueta: "Contabilidad", detalle: "Carga archivos, corre los motores y resuelve pendientes" },
  comite: { etiqueta: "Comité", detalle: "Ve el tablero y pide el reporte para el comité" },
  consulta: { etiqueta: "Consulta", detalle: "Ve todo, no cambia nada" },
};
