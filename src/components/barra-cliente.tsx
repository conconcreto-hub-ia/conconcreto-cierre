"use client";
// La barra lateral: el logo, el menú, el estado del agente y la persona conectada. Es el mismo archivo en las
// cuatro apps; el menú de cada una vive en ./nav.ts. En el celular se vuelve una barra superior con un menú
// que se despliega. Si la página trae cabecera (children), va como una tarjeta oscura arriba del contenido.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { accionSalir } from "@/app/acceso";
import { ICONOS_MENU } from "./iconos-menu";
import { APP, NAV, type ItemNav } from "./nav";

type Usuario = { nombre: string; rol: string; esAdmin?: boolean };

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

function Contenido({ usuario, agenteActivo, panelUrl, visibles, alNavegar }: { usuario: Usuario | null; agenteActivo: boolean; panelUrl: string | null; visibles?: string[]; alNavegar?: () => void }) {
  const ruta = usePathname();
  const activo = (n: ItemNav) => (n.href === "/" ? ruta === "/" : ruta.startsWith(n.href)) || !!n.tambien?.some((t) => ruta.startsWith(t));
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6">
        <Link href="/" onClick={alNavegar} className="block" aria-label="Inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/conconcreto-blanco.svg" alt="Conconcreto" className="h-7 w-auto" />
        </Link>
        <div className="mt-5">
          <div className="font-display text-[19px] font-extrabold leading-tight text-white">{APP.nombre}</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-white/50">{APP.descripcion}</div>
        </div>
        {panelUrl && (
          <a href={panelUrl} className="mt-4 flex items-center gap-2 rounded-ctl border border-white/10 bg-white/[.04] px-3 py-2 text-[12.5px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white">
            {ICONOS_MENU.hub}<span className="flex-1">Hub de IA</span><span aria-hidden className="text-white/40">↗</span>
          </a>
        )}
      </div>

      <nav className="mt-6 flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Principal">
        <div className="px-3 pb-2 font-mono text-[10.5px] uppercase tracking-[.16em] text-white/35">Menú</div>
        {NAV.filter((n) => (visibles ? visibles.includes(n.href) : !n.soloAdmin || usuario?.esAdmin)).map((n) => {
          const a = activo(n);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={alNavegar}
              aria-current={a ? "page" : undefined}
              className={"group relative flex items-center gap-3 rounded-ctl px-3 py-2.5 font-display text-[14px] font-semibold transition-colors " + (a ? "bg-white/[.09] text-white" : "text-white/60 hover:bg-white/[.04] hover:text-white")}
            >
              {a && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full [background:var(--degradado)]" />}
              <span className={a ? "text-oro" : "text-white/45 group-hover:text-white/75"}>{ICONOS_MENU[n.icono]}</span>
              {n.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2.5 rounded-ctl border border-white/[.08] bg-white/[.03] px-3 py-2.5">
          {agenteActivo ? <span className="punto-vivo" /> : <span className="size-2 rounded-full bg-white/30" />}
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold text-white/85">{agenteActivo ? "Agente activo" : "Agente en pausa"}</div>
            <div className="text-[11px] text-white/40">Propone; una persona aprueba</div>
          </div>
        </div>
        {usuario && (
          <div className="flex items-center gap-1.5 px-1 py-1">
            <Link href="/cuenta" onClick={alNavegar} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-ctl p-1.5 hover:bg-white/[.05]">
              <span className="grid size-9 shrink-0 place-items-center rounded-full font-display text-[12.5px] font-bold text-[#1a1300] [background:var(--degradado)]">{iniciales(usuario.nombre)}</span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-white">{usuario.nombre}</span>
                <span className="block truncate text-[11.5px] text-white/45">{usuario.rol}</span>
              </span>
            </Link>
            <form action={accionSalir}>
              <button type="submit" title="Salir" aria-label="Salir" className="grid size-9 place-items-center rounded-ctl text-white/45 hover:bg-white/[.06] hover:text-white">{ICONOS_MENU.salir}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/** visibles: si la app filtra el menú por permisos en el servidor, la lista de rutas que esta persona ve. */
export function BarraCliente({ agenteActivo = true, children, usuario, panelUrl = null, visibles }: { agenteActivo?: boolean; children?: ReactNode; usuario: Usuario | null; panelUrl?: string | null; visibles?: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  useEffect(() => setAbierto(false), [ruta]);
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [abierto]);

  return (
    <>
      {/* Escritorio: fija a la izquierda */}
      <aside className="sidebar-app fixed inset-y-0 left-0 z-40 hidden w-[var(--ancho-lateral)] lg:block">
        <Contenido usuario={usuario} agenteActivo={agenteActivo} panelUrl={panelUrl} visibles={visibles} />
      </aside>

      {/* Celular: barra arriba y menú desplegable */}
      <header className="sidebar-app sticky top-0 z-40 flex h-14 items-center justify-between px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/conconcreto-blanco.svg" alt="Conconcreto" className="h-6 w-auto" />
          <span className="h-4 w-px bg-white/25" />
          <span className="font-display text-[14px] font-semibold text-white/85">{APP.nombre}</span>
        </Link>
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir el menú" className="grid size-10 place-items-center rounded-ctl text-white/80 hover:bg-white/[.06]">{ICONOS_MENU.menu}</button>
      </header>
      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar el menú" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="sidebar-app absolute inset-y-0 left-0 w-[min(300px,86vw)] shadow-2xl">
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar el menú" className="absolute right-3 top-4 z-10 grid size-9 place-items-center rounded-ctl text-white/60 hover:bg-white/[.06]">{ICONOS_MENU.cerrar}</button>
            <Contenido usuario={usuario} agenteActivo={agenteActivo} panelUrl={panelUrl} visibles={visibles} alNavegar={() => setAbierto(false)} />
          </div>
        </div>
      )}

      {children && <div className="cabecera banda">{children}</div>}
    </>
  );
}
