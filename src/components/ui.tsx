// El sistema de diseño. Antes de escribir una cabecera, un botón, un estado o un vacío
// en una pantalla, se usa la pieza de aquí. La referencia visual viva es /sistema.

import Link from "next/link";
import type { ReactNode, ComponentProps } from "react";
import type { Tono } from "@/lib/etiquetas";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ── Marca ──────────────────────────────────────────────────────────── */

export function Marca({ fondo = "oscuro", compacta = false }: { fondo?: "oscuro" | "claro"; compacta?: boolean }) {
  const cc = fondo === "oscuro" ? "/marca/conconcreto-blanco.svg" : "/marca/conconcreto-oscuro.svg";
  const ir = fondo === "oscuro" ? "/marca/irrelevant-blanco.png" : "/marca/irrelevant-oscuro.png";
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cc} alt="Conconcreto" className={compacta ? "h-7 w-auto" : "h-9 w-auto"} />
      <span className={cx("font-display font-medium", compacta ? "text-base" : "text-lg", fondo === "oscuro" ? "text-white/50" : "text-tinta-3")}>x</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ir} alt="irrelevant" className={compacta ? "h-5 w-auto" : "h-6 w-auto"} />
    </div>
  );
}

/* ── Estructura de página ───────────────────────────────────────────── */

export function Contenedor({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-[1200px] px-4 sm:px-7", className)}>{children}</div>;
}

export function SeccionEt({ children }: { children: ReactNode }) {
  return <span className="seccion-et">{children}</span>;
}

export function Encabezado({ et, titulo, bajada, acciones }: { et?: string; titulo: ReactNode; bajada?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {et && <SeccionEt>{et}</SeccionEt>}
        <h2 className="mt-2 text-[26px] font-extrabold leading-tight sm:text-[30px]">{titulo}</h2>
        {bajada && <p className="mt-2 max-w-[720px] text-[15px] text-tinta-2">{bajada}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

/* ── Botones ────────────────────────────────────────────────────────── */

type Variante = "primario" | "secundario" | "fantasma" | "oscuro" | "peligro";

const ESTILO_BOTON: Record<Variante, string> = {
  primario: "text-[#1a1300] [background:var(--degradado)] hover:brightness-[1.04]",
  secundario: "border border-linea bg-papel text-tinta hover:border-[#cfd8d1] hover:bg-fondo",
  fantasma: "text-verde-profundo hover:bg-verde-suave",
  oscuro: "bg-noche-2 text-white hover:bg-noche",
  peligro: "border border-linea bg-papel text-rojo hover:border-rojo/40 hover:bg-rojo-suave",
};

const claseBoton = (v: Variante, chico?: boolean) =>
  cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-display font-semibold transition-[background,border-color,filter] duration-150 disabled:pointer-events-none disabled:opacity-50",
    chico ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px]",
    ESTILO_BOTON[v],
  );

export function Boton({ variante = "secundario", chico, className, ...p }: ComponentProps<"button"> & { variante?: Variante; chico?: boolean }) {
  return <button className={cx(claseBoton(variante, chico), className)} {...p} />;
}

export function BotonLink({ variante = "secundario", chico, className, ...p }: ComponentProps<typeof Link> & { variante?: Variante; chico?: boolean }) {
  return <Link className={cx(claseBoton(variante, chico), className)} {...p} />;
}

/* ── Superficies ────────────────────────────────────────────────────── */

export function Tarjeta({ children, className, viva }: { children: ReactNode; className?: string; viva?: boolean }) {
  return <div className={cx("rounded-sup border border-linea bg-papel", viva && "tarjeta-viva", className)}>{children}</div>;
}

export function Aja({ etiqueta = "Lo que encontró el agente", children, className }: { etiqueta?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("aja p-5", className)}>
      <div className="font-display text-[11.5px] font-bold uppercase tracking-[.12em] text-oro">{etiqueta}</div>
      <div className="mt-2 text-[15px] leading-relaxed text-white/90">{children}</div>
    </div>
  );
}

/* ── Chips y estados ────────────────────────────────────────────────── */

const ESTILO_TONO: Record<Tono, string> = {
  neutro: "bg-linea-2 text-tinta-2",
  verde: "bg-verde-suave text-verde-profundo",
  oro: "bg-oro-suave text-[#8a5a00]",
  rojo: "bg-rojo-suave text-rojo",
  noche: "bg-noche-2 text-white",
};

export function Insignia({ tono = "neutro", children, punto }: { tono?: Tono; children: ReactNode; punto?: boolean }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-display text-[12px] font-semibold", ESTILO_TONO[tono])}>
      {punto && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-6 items-center rounded-full border border-linea bg-papel px-2.5 text-[12.5px] font-medium text-tinta-2">{children}</span>;
}

/* ── Cifras ─────────────────────────────────────────────────────────── */

export function Cifra({ valor, rotulo, nota, oscuro }: { valor: ReactNode; rotulo: string; nota?: ReactNode; oscuro?: boolean }) {
  return (
    <div className={cx("border-l-2 pl-4", oscuro ? "border-oro/60" : "border-oro")}>
      <div className={cx("num text-[30px] font-extrabold leading-none", oscuro ? "text-white" : "text-tinta")}>{valor}</div>
      <div className={cx("mt-1.5 text-[13px]", oscuro ? "text-white/70" : "text-tinta-2")}>{rotulo}</div>
      {nota && <div className={cx("mt-0.5 text-[12px]", oscuro ? "text-white/45" : "text-tinta-3")}>{nota}</div>}
    </div>
  );
}

/** Medidor de encaje 0–100 con el degradado del logo. */
export function Encaje({ valor, ancho = "w-24" }: { valor: number | null | undefined; ancho?: string }) {
  if (valor === null || valor === undefined) return <span className="text-[13px] text-tinta-3">Sin ficha</span>;
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className="flex items-center gap-2" title={`Encaje ${v} de 100`}>
      <div className={cx("h-1.5 overflow-hidden rounded-full bg-linea-2", ancho)}>
        <div className="h-full rounded-full [background:var(--degradado)]" style={{ width: `${v}%` }} />
      </div>
      <span className="num w-7 text-right text-[13px] font-bold text-tinta">{v}</span>
    </div>
  );
}

/* ── Vacíos ─────────────────────────────────────────────────────────── */

export function Vacio({ icono, titulo, children, accion }: { icono?: ReactNode; titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-sup border border-dashed border-linea bg-papel px-6 py-12 text-center">
      {icono && <div className="mb-3 grid size-11 place-items-center rounded-ctl bg-verde-suave text-verde-profundo">{icono}</div>}
      <h3 className="text-[17px] font-bold">{titulo}</h3>
      {children && <p className="mt-1.5 max-w-[460px] text-[14px] text-tinta-2">{children}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/* ── Datos en filas ─────────────────────────────────────────────────── */

export function Dato({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[132px_1fr] gap-3 border-b border-dashed border-linea py-2.5 text-[14px] last:border-0">
      <dt className="text-tinta-3">{k}</dt>
      <dd className="m-0 min-w-0 text-tinta">{children}</dd>
    </div>
  );
}
