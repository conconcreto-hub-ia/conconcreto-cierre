// Piezas del tablero del cierre. Usan el sistema de diseño de ui.tsx; la referencia viva es /sistema.
import Link from "next/link";
import type { Evento } from "@prisma/client";
import { Insignia } from "./ui";
import { IconoAgente, IconoPersona, IconoAlerta } from "./iconos";
import { ESTADO } from "@/lib/etiquetas";
import { haceCuanto, copCorto } from "@/lib/formato";
import type { Celda } from "@/lib/tablero";

/** Una celda del mapa sociedades × procesos. */
export function CeldaEstado({ celda, href }: { celda: Celda; href?: string }) {
  if (celda.estado === "no_aplica") return <span className="text-[13px] text-tinta-3" title="Este proceso no aplica a esta sociedad">—</span>;
  if (celda.estado === "por_correr") return <span className="inline-flex h-6 items-center rounded-full border border-dashed border-linea px-2.5 font-display text-[12px] font-semibold text-tinta-3" title="Todavía no vence">Por correr</span>;
  const e = ESTADO[celda.estado];
  const contenido = (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Insignia tono={e.tono} punto>{e.etiqueta}</Insignia>
      {celda.estado === "no_cuadra" && (
        <span className="text-[11.5px] text-tinta-3">
          {celda.diferencias} {celda.diferencias === 1 ? "diferencia" : "diferencias"}
          {celda.marcadas > 0 && <b className="ml-1 font-semibold text-rojo">· {celda.marcadas} para revisar</b>}
        </span>
      )}
    </span>
  );
  return href ? <Link href={href} className="rounded-ctl hover:opacity-80" title={celda.nota ?? e.detalle}>{contenido}</Link> : contenido;
}

/** La bitácora: cada paso del agente, del sistema y de las personas. */
export function Bitacora({ eventos }: { eventos: Evento[] }) {
  if (!eventos.length) return <p className="text-[14px] text-tinta-3">Todavía no hay movimientos.</p>;
  return (
    <ol className="m-0 list-none space-y-0 p-0">
      {eventos.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < eventos.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-linea" />}
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${e.actor === "agente" ? "bg-noche-2 text-oro" : e.tipo === "correo.instruccion_ignorada" ? "bg-rojo-suave text-rojo" : "bg-verde-suave text-verde-profundo"}`}>
            {e.tipo === "correo.instruccion_ignorada" ? <IconoAlerta className="size-4" /> : e.actor === "agente" ? <IconoAgente className="size-4" /> : <IconoPersona className="size-4" />}
          </span>
          <div className="min-w-0 pt-1">
            <p className="m-0 text-[14px] leading-snug text-tinta">{e.descripcion}</p>
            <p className="m-0 mt-0.5 text-[12px] text-tinta-3">{e.actor === "agente" ? "Agente" : e.actor === "sistema" ? "Sistema" : "Persona"} · {haceCuanto(e.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Una cifra de plata en una tabla: tabular, alineada a la derecha, en rojo si es negativa. */
export function Monto({ v, corto, className = "" }: { v: number | null | undefined; corto?: boolean; className?: string }) {
  if (v === null || v === undefined) return <span className="text-tinta-3">—</span>;
  const t = corto ? copCorto(v) : `${v < 0 ? "−" : ""}${Math.abs(Math.round(v)).toLocaleString("es-CO")}`;
  return <span className={`num tabular whitespace-nowrap ${v < 0 ? "text-rojo" : ""} ${className}`}>{t}</span>;
}

/** La etiqueta de «motor de demostración». */
export function AvisoDemo({ quien = "Tatiana" }: { quien?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-sup border border-oro/60 bg-oro-suave p-4 text-[14px] text-[#5c3d00]">
      <IconoAlerta className="mt-0.5 size-5 shrink-0" />
      <div><b className="font-display font-bold">Motor de demostración, falta validar con {quien}.</b> Corre con datos inventados. Los conceptos, las cuentas del ajuste y el umbral son supuestos.</div>
    </div>
  );
}
