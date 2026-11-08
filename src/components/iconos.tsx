// Íconos de línea, trazo 1.75. Sin emojis en la interfaz.

type P = { className?: string };
const base = (className?: string) => ({
  className: className && /(^|\s)size-/.test(className) ? className : `size-4 shrink-0 ${className ?? ""}`,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconoRadar = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12 19 5" /><circle cx="12" cy="12" r="1" /></svg>
);
export const IconoCorreo = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
export const IconoReenvio = ({ className }: P) => (
  <svg {...base(className)}><path d="M15 6l6 6-6 6" /><path d="M21 12H9a6 6 0 0 0-6 6v1" /></svg>
);
export const IconoComite = ({ className }: P) => (
  <svg {...base(className)}><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M14 14.2c.6-.1 1.3-.2 2-.2 3.3 0 6 2.7 6 6" /></svg>
);
export const IconoPaquete = ({ className }: P) => (
  <svg {...base(className)}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5" /><path d="M12 12v9" /></svg>
);
export const IconoProveedor = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></svg>
);
export const IconoCuadro = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></svg>
);
export const IconoAgente = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3v3" /><rect x="5" y="6" width="14" height="12" rx="3" /><circle cx="9.5" cy="12" r="1" /><circle cx="14.5" cy="12" r="1" /><path d="M9 21h6" /></svg>
);
export const IconoPersona = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
);
export const IconoReloj = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconoAlerta = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg>
);
export const IconoCheck = ({ className }: P) => (
  <svg {...base(className)}><path d="m5 12 5 5 9-10" /></svg>
);
export const IconoX = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconoFlecha = ({ className }: P) => (
  <svg {...base(className)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconoExterno = ({ className }: P) => (
  <svg {...base(className)}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
);
export const IconoMapa = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
);
export const IconoEdificio = ({ className }: P) => (
  <svg {...base(className)}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></svg>
);
export const IconoEscudo = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconoTendencia = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></svg>
);
export const IconoDocumento = ({ className }: P) => (
  <svg {...base(className)}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
);
/* Los del cierre */
export const IconoSubir = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
);
export const IconoDescargar = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
);
export const IconoCalendario = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconoBalanza = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 4v16M7 20h10M5 7h14" /><path d="m5 7-3 6a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z" /></svg>
);
export const IconoCruce = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 7h11l-3-3M20 17H9l3 3" /></svg>
);
export const IconoLista = ({ className }: P) => (
  <svg {...base(className)}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>
);
