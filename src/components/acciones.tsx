"use client";
// Botones que llaman acciones de servidor. La acción exige su permiso en el servidor: la pantalla solo
// decide si muestra el botón.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "./ui";

type Variante = "primario" | "secundario" | "fantasma" | "oscuro" | "peligro";

/** Qué decir cuando una acción termina. Viven aquí porque una función no puede viajar del servidor al cliente. */
const MENSAJES = {
  faltantes: (r: unknown) => `Listo: ${(r as { creados: number }).creados} pendientes nuevos.`,
  buzon: (r: unknown) => { const x = r as { leidos: number; sospechosos: number }; return `Listo: ${x.leidos} respuestas leídas${x.sospechosos ? `, ${x.sospechosos} con instrucciones que no se obedecieron` : ""}.`; },
  avisos: (r: unknown) => { const x = r as { enviados: number; retenidos: number; motivo?: string }; return x.motivo ?? `Salieron ${x.enviados} correos${x.retenidos ? ` · ${x.retenidos} quedaron en borrador (fuera del modo prueba)` : ""}.`; },
  aviso: (r: unknown) => ((r as { enviados: number }).enviados ? "Salió el aviso." : "Quedó en borrador: la dirección está fuera del modo prueba."),
  reporte: () => "Listo: el reporte nuevo está abajo.",
} as const;

export function BotonAccion({ accion, children, variante = "secundario", chico, confirmar, hecho }: {
  accion: () => Promise<unknown>; children: React.ReactNode; variante?: Variante; chico?: boolean; confirmar?: string;
  /** Qué decir cuando termina (ver MENSAJES). */
  hecho?: keyof typeof MENSAJES;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [preguntando, setPreguntando] = useState(false);
  const correr = () => empezar(async () => {
    setMsg(null); setPreguntando(false);
    try { const r = await accion(); if (hecho) setMsg({ ok: true, t: MENSAJES[hecho](r) }); router.refresh(); }
    catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) }); }
  });
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {preguntando ? (
        <span className="inline-flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-tinta-2">{confirmar}</span>
          <Boton chico variante="primario" onClick={correr} disabled={pendiente}>Sí</Boton>
          <Boton chico onClick={() => setPreguntando(false)}>No</Boton>
        </span>
      ) : (
        <Boton variante={variante} chico={chico} disabled={pendiente} onClick={() => (confirmar ? setPreguntando(true) : correr())}>{pendiente ? "Un momento…" : children}</Boton>
      )}
      {msg && <span role={msg.ok ? "status" : "alert"} className={`text-[12.5px] ${msg.ok ? "text-verde-profundo" : "text-rojo"}`}>{msg.t}</span>}
    </span>
  );
}

/** Resolver un pendiente con una nota opcional. */
export function ResolverPendiente({ accion }: { accion: (nota: string) => Promise<unknown> }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!abierto) return <Boton chico variante="fantasma" onClick={() => setAbierto(true)}>Dar por resuelto</Boton>;
  return (
    <div className="flex w-full flex-col gap-2 sm:w-[320px]">
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Nota (opcional): qué se hizo" className="w-full rounded-ctl border border-linea bg-fondo px-3 py-2 text-[13.5px] outline-none focus:border-verde" />
      <div className="flex gap-2">
        <Boton chico variante="primario" disabled={pendiente} onClick={() => empezar(async () => { try { await accion(nota); setAbierto(false); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } })}>{pendiente ? "Guardando…" : "Resuelto"}</Boton>
        <Boton chico onClick={() => setAbierto(false)}>Cancelar</Boton>
      </div>
      {error && <p role="alert" className="text-[12.5px] text-rojo">{error}</p>}
    </div>
  );
}
