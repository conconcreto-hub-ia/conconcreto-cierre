// Íconos de la barra lateral. Línea de 1.75, como los demás; sin emojis.
// Es el mismo archivo en las cuatro apps: cada una elige los suyos en src/components/nav.ts.
import type { ReactNode } from "react";

const S = ({ children, className = "size-[18px] shrink-0" }: { children: ReactNode; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

export const ICONOS_MENU = {
  inicio: <S><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>,
  radar: <S><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12 19 5" /></S>,
  buzon: <S><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2-8Z" /></S>,
  proveedores: <S><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></S>,
  criterios: <S><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></S>,
  usuarios: <S><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5c1.9.8 3 2.7 3 5.5" /></S>,
  cargar: <S><path d="M12 15V4M7 9l5-5 5 5" /><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></S>,
  pendientes: <S><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2" /><circle cx="5" cy="18" r="1.2" /></S>,
  reporte: <S><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" /><path d="M14 3v5h5M9 17v-3M12 17v-6M15 17v-2" /></S>,
  procesos: <S><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="12" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.5 6H13a2 2 0 0 1 2 2v1.5M8.5 18H13a2 2 0 0 0 2-2v-1.5" /></S>,
  rastrear: <S><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></S>,
  reclamos: <S><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z" /><path d="M12 8v4M12 15.5h0" /></S>,
  causacion: <S><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h3M14 15h2M8 18h3M14 18h2" /></S>,
  pagos: <S><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M2.5 10h19M6.5 14.5h3" /></S>,
  mapa: <S><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></S>,
  bitacora: <S><path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Z" /><path d="M18 8h2v12a2 2 0 0 1-2 2H6M8 8h6M8 12h6" /></S>,
  confirmaciones: <S><path d="M21 12a9 9 0 1 1-6.2-8.6" /><path d="m8 12 3 3 9-9" /></S>,
  facturacion: <S><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></S>,
  caja: <S><path d="M3 7h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" /><path d="M3 7l2-3h14l2 3M12 11v6M9.5 13.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5" /></S>,
  conversar: <S><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10Z" /><path d="M8 9h8M8 12.5h5" /></S>,
  junta: <S><path d="M3 21h18M5 21V10M19 21V10M9 21v-6M15 21v-6M2 10l10-6 10 6" /></S>,
  proyecto: <S><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 11h4M10 15h4" /></S>,
  datos: <S><ellipse cx="12" cy="5.5" rx="8" ry="2.5" /><path d="M4 5.5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6M4 11.5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6" /></S>,
  hub: <S><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z" /><circle cx="12" cy="12" r="2.5" /><path d="M12 9.5V5M14.2 13.2l3.8 2.2M9.8 13.2 6 15.4" /></S>,
  salir: <S><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></S>,
  menu: <S><path d="M4 7h16M4 12h16M4 17h16" /></S>,
  cerrar: <S><path d="M6 6l12 12M18 6 6 18" /></S>,
};

export type IconoMenu = keyof typeof ICONOS_MENU;
