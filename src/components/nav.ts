// El menú de esta app: vive aquí y en ningún otro sitio. La barra lateral (barra-cliente.tsx) es la misma
// en las cuatro apps; lo que cambia es esto.
import type { IconoMenu } from "./iconos-menu";
export const APP = { nombre: "Tablero del cierre", descripcion: "Qué sociedades cuadran, qué falta y de quién" };

export type ItemNav = { href: string; etiqueta: string; icono: IconoMenu; soloAdmin?: boolean; tambien?: string[] };

export const NAV: ItemNav[] = [
  { href: "/", etiqueta: "Mapa del cierre", icono: "mapa", tambien: ["/ejecuciones"] },
  { href: "/cargar", etiqueta: "Cargar el mes", icono: "cargar" },
  { href: "/pendientes", etiqueta: "Pendientes", icono: "pendientes" },
  { href: "/comite", etiqueta: "Reporte para el comité", icono: "reporte" },
  { href: "/procesos", etiqueta: "Procesos", icono: "procesos" },
  { href: "/usuarios", etiqueta: "Usuarios", icono: "usuarios", soloAdmin: true },
];
