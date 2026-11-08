// «¿Qué me falta para el comité?». El reporte se genera al pedirlo: una foto de las cifras del tablero
// (código) y la lectura del agente (sin cifras).
import Link from "next/link";
import { Barra } from "@/components/barra";
import { Aja, Cifra, Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { BotonAccion } from "@/components/acciones";
import { Monto } from "@/components/cierre";
import { IconoDocumento } from "@/components/iconos";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { db } from "@/lib/db";
import { cierreActual, type Cifras } from "@/lib/tablero";
import { ESTADO, ESTADO_PENDIENTE, PROCESO_CORTO } from "@/lib/etiquetas";
import { fechaHora } from "@/lib/formato";
import type { Lectura } from "@/lib/comite";
import { generarReporteAhora } from "../acciones";

export const dynamic = "force-dynamic";

export default async function Comite({ searchParams }: { searchParams: Promise<{ reporte?: string }> }) {
  const yo = await exigirSesion();
  const sp = await searchParams;
  const cierre = await cierreActual();
  if (!cierre) return (<><Barra /><Contenedor className="py-10"><Vacio titulo="No hay un cierre abierto" /></Contenedor></>);
  const reporte = sp.reporte ? await db.reporte.findUnique({ where: { id: sp.reporte } }) : await db.reporte.findFirst({ where: { cierreId: cierre.id }, orderBy: { createdAt: "desc" } });
  const anteriores = await db.reporte.findMany({ where: { cierreId: cierre.id }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, createdAt: true, generadoPor: true } });
  const c = reporte?.cifras as unknown as Cifras | undefined;
  const l = reporte?.lectura as Lectura | null;

  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Encabezado et="Reporte para el comité" titulo="¿Qué me falta para el comité?" bajada="Una foto del cierre en el momento en que lo pides: qué sociedades cuadran, cuáles tienen diferencias grandes y su causa, y qué tiene pendiente cada responsable. Las cifras las calcula el código; la lectura la escribe el agente." />
          {puede(yo.rol, "reporte.generar") && <BotonAccion variante="primario" accion={generarReporteAhora.bind(null, cierre.id)} hecho="reporte"><IconoDocumento />{reporte ? "Generar uno nuevo" : "Generar el reporte"}</BotonAccion>}
        </div>

        {!reporte || !c ? (
          <Vacio icono={<IconoDocumento className="size-5" />} titulo="Todavía no se ha pedido el reporte de este cierre">Cuando lo pidas, queda guardado con la hora y quién lo pidió.</Vacio>
        ) : (
          <article className="space-y-8">
            <div className="banda rounded-sup p-7">
              <span className="font-display text-[12px] font-bold uppercase tracking-[.12em] text-oro">Cierre de {c.cierre.nombre} · día hábil {c.cierre.diaHabilHoy}</span>
              <h2 className="mt-2 text-[26px] font-extrabold leading-tight text-white">{l?.titular ?? `${c.totales.cuadran} de ${c.totales.sociedades} sociedades cuadran`}</h2>
              {l?.lectura && <p className="mt-2 max-w-[760px] text-[15px] text-white/75">{l.lectura}</p>}
              <div className="mt-6 flex flex-wrap gap-10">
                <Cifra oscuro valor={`${c.totales.cuadran}/${c.totales.sociedades}`} rotulo="Sociedades que cuadran" />
                <Cifra oscuro valor={c.totales.conDiferencias} rotulo="Con diferencias" />
                <Cifra oscuro valor={c.totales.bloqueadas + c.totales.faltan} rotulo="Bloqueadas o faltan" />
                <Cifra oscuro valor={c.totales.pendientes} rotulo="Pendientes abiertos" nota={`${c.totales.avisados + c.totales.respondidos} avisados`} />
              </div>
              <p className="mt-5 text-[12px] text-white/50">Generado por {reporte.generadoPor} · {fechaHora(reporte.createdAt)}</p>
            </div>

            {l?.para_el_comite?.length ? (
              <Aja etiqueta="Lo que falta para el comité · lectura del agente">
                <ol className="m-0 space-y-1.5 pl-5">{l.para_el_comite.map((x, i) => <li key={i}>{x}</li>)}</ol>
              </Aja>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <Tarjeta className="p-5">
                <SeccionEt>Cuadran</SeccionEt>
                <ul className="mt-3 flex flex-wrap gap-2 pl-0">{c.sociedades.filter((s) => s.general === "cuadra").map((s) => <li key={s.id} className="list-none"><Insignia tono="verde">{s.nombre}</Insignia></li>)}</ul>
                {!c.sociedades.some((s) => s.general === "cuadra") && <p className="mt-2 text-[13.5px] text-tinta-3">Ninguna todavía.</p>}
                <div className="mt-5"><SeccionEt>Con diferencias, bloqueadas o por correr</SeccionEt></div>
                <div className="mt-3 space-y-2">
                  {c.sociedades.filter((s) => s.general !== "cuadra").map((s) => {
                    const e = ESTADO[s.general as keyof typeof ESTADO];
                    return <div key={s.id} className="flex items-center justify-between gap-2 text-[13.5px]"><span>{s.nombre}</span><Insignia tono={e?.tono ?? "neutro"}>{e?.etiqueta ?? "Por correr"}</Insignia></div>;
                  })}
                </div>
              </Tarjeta>
              <Tarjeta className="p-5">
                <SeccionEt>Por proceso</SeccionEt>
                <table className="mt-3 w-full text-[13.5px]">
                  <thead><tr className="text-left text-[12px] text-tinta-3"><th className="py-1.5 font-medium">Proceso</th><th className="py-1.5 font-medium">Día</th><th className="py-1.5 text-right font-medium">Cuadran</th><th className="py-1.5 text-right font-medium">Dif.</th><th className="py-1.5 text-right font-medium">Bloq.</th><th className="py-1.5 text-right font-medium">Faltan</th></tr></thead>
                  <tbody>{c.procesos.map((p) => <tr key={p.id} className="border-t border-linea-2"><td className="py-2">{p.nombre}{p.demo && <span className="ml-1 text-[11.5px] text-naranja">(demostración)</span>}</td><td className="py-2">{p.diaHabil}</td><td className="py-2 text-right num">{p.cuadra}</td><td className="py-2 text-right num">{p.no_cuadra}</td><td className="py-2 text-right num">{p.bloqueado}</td><td className="py-2 text-right num">{p.falta}</td></tr>)}</tbody>
                </table>
              </Tarjeta>
            </div>

            <section className="space-y-3">
              <SeccionEt>Diferencias grandes y su causa</SeccionEt>
              <Tarjeta className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13.5px]">
                  <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-4 py-2.5 font-medium">Sociedad</th><th className="px-3 py-2.5 font-medium">Qué</th><th className="px-3 py-2.5 text-right font-medium">Diferencia</th><th className="px-4 py-2.5 font-medium">Causa</th></tr></thead>
                  <tbody>{c.grandes.map((g, i) => <tr key={i} className="border-t border-linea-2 align-top"><td className="px-4 py-2.5"><div className="font-semibold">{g.sociedad}</div><div className="text-[12px] text-tinta-3">{PROCESO_CORTO[g.proceso]}</div></td><td className="px-3 py-2.5 font-mono text-[12.5px]">{g.titulo}</td><td className="px-3 py-2.5 text-right"><Monto v={g.valor} /></td><td className="px-4 py-2.5 text-tinta-2">{g.causa}{g.origen === "agente" && <span className="mt-1 block text-[12px] font-semibold text-naranja">Propuesta del agente{g.estadoCruce === "aceptado" ? ", aceptada" : ", sin confirmar"}</span>}</td></tr>)}</tbody>
                </table>
                {!c.grandes.length && <p className="px-5 py-6 text-center text-[13.5px] text-tinta-3">Ninguna diferencia supera el umbral.</p>}
              </Tarjeta>
            </section>

            <section className="space-y-3">
              <SeccionEt>Pendientes por responsable</SeccionEt>
              <div className="grid gap-4 md:grid-cols-2">
                {c.responsables.map((r) => (
                  <Tarjeta key={r.id} className="p-5">
                    <div className="flex items-center justify-between gap-2"><h3 className="text-[15px] font-bold">{r.nombre}</h3><Insignia tono="noche">{r.pendientes.length}</Insignia></div>
                    {r.cargo !== r.nombre && <p className="text-[12px] text-tinta-3">{r.cargo}</p>}
                    <ul className="mt-3 space-y-2 pl-0">{r.pendientes.map((p) => <li key={p.id} className="list-none text-[13.5px]"><span className="leading-snug">{p.titulo}</span><span className="ml-1.5 inline-block align-middle"><Insignia tono={ESTADO_PENDIENTE[p.estado].tono}>{ESTADO_PENDIENTE[p.estado].etiqueta}</Insignia></span></li>)}</ul>
                  </Tarjeta>
                ))}
              </div>
              {!c.responsables.length && <p className="text-[13.5px] text-tinta-3">Nadie tiene pendientes abiertos.</p>}
            </section>
          </article>
        )}
        {anteriores.length > 1 && (
          <p className="text-[13px] text-tinta-3">Reportes anteriores: {anteriores.map((a, i) => <span key={a.id}>{i ? " · " : ""}<Link href={`/comite?reporte=${a.id}`} className="font-semibold text-verde-profundo">{fechaHora(a.createdAt)}</Link></span>)}</p>
        )}
      </Contenedor>
    </>
  );
}
