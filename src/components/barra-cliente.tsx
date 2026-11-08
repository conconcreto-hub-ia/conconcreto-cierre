"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Marca, Contenedor } from "./ui";
import { accionSalir } from "@/app/acceso";

// El menú vive aquí y en ningún otro sitio.
export const NAV = [
  { href: "/", etiqueta: "Oportunidades" },
  { href: "/radar", etiqueta: "Radar SECOP" },
  { href: "/buzon", etiqueta: "Buzón" },
  { href: "/proveedores", etiqueta: "Proveedores" },
  { href: "/criterios", etiqueta: "Criterios" },
  { href: "/usuarios", etiqueta: "Usuarios", soloAdmin: true },
] as const;

export function BarraCliente({ agenteActivo = true, children, usuario }: { agenteActivo?: boolean; children?: ReactNode; usuario: { nombre: string; rol: string; esAdmin: boolean } | null }) {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/" ? ruta === "/" || ruta.startsWith("/oportunidades") : ruta.startsWith(href));

  return (
    <header className="banda">
      <Contenedor className="flex flex-wrap items-center justify-between gap-4 pt-5">
        <Link href="/" aria-label="Inicio">
          <Marca compacta />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 rounded-full border border-white/15 bg-white/[.06] px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 sm:flex">
            {agenteActivo ? <span className="punto-vivo" /> : <span className="size-2 rounded-full bg-white/30" />}
            {agenteActivo ? "Agente activo" : "Agente en pausa"}
          </div>
          {usuario && (
            <div className="flex items-center gap-1">
              <Link href="/cuenta" className="rounded-ctl px-2.5 py-1.5 text-right leading-tight hover:bg-white/[.06]">
                <div className="text-[13px] font-semibold text-white">{usuario.nombre}</div>
                <div className="text-[11.5px] text-white/55">{usuario.rol}</div>
              </Link>
              <form action={accionSalir}>
                <button type="submit" className="rounded-ctl px-2.5 py-2 font-display text-[12.5px] font-semibold text-white/60 hover:bg-white/[.06] hover:text-white">Salir</button>
              </form>
            </div>
          )}
        </div>
      </Contenedor>
      <Contenedor>
        <nav className={"mt-5 flex gap-1 overflow-x-auto " + (children ? "border-b border-white/10" : "pb-[3px]")} aria-label="Principal">
          {NAV.filter((n) => !("soloAdmin" in n) || usuario?.esAdmin).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                "relative whitespace-nowrap px-3.5 py-3 font-display text-[14px] font-semibold transition-colors " +
                (activo(n.href) ? "text-white" : "text-white/55 hover:text-white/85")
              }
            >
              {n.etiqueta}
              {activo(n.href) && <span className="absolute inset-x-3.5 bottom-0 h-[2px] rounded-t-full bg-oro" />}
            </Link>
          ))}
        </nav>
      </Contenedor>
      {children}
    </header>
  );
}
