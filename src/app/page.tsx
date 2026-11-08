// El mapa del cierre: sociedades × procesos con su estado, las diferencias grandes con su causa y lo que
// encontró el agente. Todas las cifras salen de src/lib/tablero.ts.
import Link from "next/link";
import { Barra } from "@/components/barra";
import { Aja, BotonLink, Cifra, Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta, Vacio, Chip } from "@/components/ui";
import { Bitacora, CeldaEstado, Monto } from "@/components/cierre";
import { BotonAccion } from "@/components/acciones";
import { IconoCalendario, IconoSubir, IconoFlecha } from "@/components/iconos";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { cierreActual, cifrasDelCierre } from "@/lib/tablero";
import { ESTADO, ESTADO_CRUCE, PROCESO_CORTO } from "@/lib/etiquetas";
import { fechaCorta } from "@/lib/calendario";
import { db } from "@/lib/db";
import { revisarCruce } from "./acciones";

export const dynamic = "force-dynamic";

const FILTROS = [
  { v: "", e: "Todas" }, { v: "no_cuadra", e: "Con diferencias" }, { v: "bloqueado", e: "Bloqueadas" }, { v: "pendiente", e: "Faltan" }, { v: "cuadra", e: "Cuadran" },
];

export default async function Mapa({ searchParams }: { searchParams: Promise<{ cierre?: string; estado?: string; proceso?: string; q?: string }> }) {
  const yo = await exigirSesion();
  const sp = await searchParams;
  const cierre = await cierreActual(sp.cierre);
  if (!cierre) {
    return (<><Barra /><Contenedor className="py-10"><Vacio icono={<IconoCalendario className="size-5" />} titulo="No hay ningún cierre abierto">Siembra el tablero con scripts/sembrar.ts.</Vacio></Contenedor></>);
  }
  const c = await cifrasDelCierre(cierre.id);
  const eventos = await db.evento.findMany({ where: { cierreId: cierre.id }, orderBy: { createdAt: "desc" }, take: 8 });
  const cruces = await db.cruce.findMany({ where: { cierreId: cierre.id, estado: { in: ["propuesto", "aceptado"] } }, include: { sociedad: true }, orderBy: { createdAt: "desc" } });

  const q = (sp.q ?? "").trim().toLowerCase();
  const filas = c.sociedades.filter((s) =>
    (!sp.estado || s.general === sp.estado || (sp.estado === "pendiente" && Object.values(s.celdas).some((x) => x.estado === "pendiente"))) &&
    (!sp.proceso || s.celdas[sp.proceso]?.estado !== "no_aplica") &&
    (!q || s.nombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q)));
  const procs = sp.proceso ? c.procesos.filter((p) => p.clave === sp.proceso) : c.procesos;
  const url = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries({ cierre: sp.cierre, estado: sp.estado, proceso: sp.proceso, q: sp.q, ...o })) if (v) u.set(k, v); const s = u.toString(); return s ? `/?${s}` : "/"; };
  const t = c.totales;

  return (
    <>
      <Barra>
        <Contenedor className="pb-8 pt-7">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="font-display text-[12px] font-bold uppercase tracking-[.12em] text-oro">Cierre de {c.cierre.nombre}</span>
              <h1 className="mt-2 text-[30px] font-extrabold leading-tight text-white sm:text-[36px]">
                {t.cuadran} de {t.sociedades} sociedades <span className="dorado">cuadran</span>
              </h1>
              <p className="mt-2 max-w-[640px] text-[15px] text-white/70">
                {c.cierre.diaHabilHoy === 0 ? "El cierre todavía no empieza." : c.cierre.diaHabilHoy <= Math.max(...c.procesos.map((p) => p.diaHabil)) ? `Hoy es el día hábil ${c.cierre.diaHabilHoy} del cierre.` : `Ya vencieron todos los días del calendario (hoy van ${c.cierre.diaHabilHoy} días hábiles).`} Cada proceso corre con su motor; el agente persigue lo que falta y propone la causa cuando dos procesos no cuadran entre sí.
              </p>
            </div>
            <div className="flex flex-wrap gap-8">
              <Cifra oscuro valor={t.conDiferencias} rotulo="Con diferencias" />
              <Cifra oscuro valor={t.bloqueadas + t.faltan} rotulo="Bloqueadas o faltan" />
              <Cifra oscuro valor={t.pendientes} rotulo="Pendientes abiertos" nota={`${t.avisados + t.respondidos} ya avisados`} />
            </div>
          </div>
        </Contenedor>
      </Barra>

      <Contenedor className="space-y-10 py-9">
        {/* Los procesos y su día */}
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {c.procesos.map((p) => (
            <Link key={p.id} href={url({ proceso: sp.proceso === p.clave ? undefined : p.clave })} className="block">
              <Tarjeta viva className={`h-full p-4 ${sp.proceso === p.clave ? "border-verde" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-tinta-3"><IconoCalendario className="size-3.5" />Día hábil {p.diaHabil} · {fechaCorta(p.vence)}</span>
                  {p.demo && <Insignia tono="oro">Demostración</Insignia>}
                </div>
                <h3 className="mt-1.5 text-[15.5px] font-bold leading-snug">{p.nombre}</h3>
                <p className="mt-0.5 text-[12.5px] text-tinta-3">{p.dueno}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
                  {p.cuadra > 0 && <Insignia tono="verde">{p.cuadra} cuadran</Insignia>}
                  {p.no_cuadra > 0 && <Insignia tono="oro">{p.no_cuadra} con diferencias</Insignia>}
                  {p.bloqueado > 0 && <Insignia tono="rojo">{p.bloqueado} bloqueadas</Insignia>}
                  {p.falta > 0 && <Insignia tono="neutro">{p.falta} faltan</Insignia>}
                  {p.porCorrer > 0 && <Insignia tono="neutro">{p.porCorrer} por correr</Insignia>}
                </div>
              </Tarjeta>
            </Link>
          ))}
        </section>

        {/* El mapa */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Encabezado et="Mapa del cierre" titulo="Sociedades por proceso" bajada="Cada celda es el último resultado del motor. Haz clic para ver la comparación línea a línea y los archivos." />
            {puede(yo.rol, "ejecuciones.cargar") && <BotonLink href="/cargar" variante="primario"><IconoSubir />Cargar el mes</BotonLink>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTROS.map((f) => (
              <Link key={f.v} href={url({ estado: f.v || undefined })} className={`inline-flex h-8 items-center rounded-full border px-3 font-display text-[13px] font-semibold ${(sp.estado ?? "") === f.v ? "border-verde bg-verde-suave text-verde-profundo" : "border-linea bg-papel text-tinta-2 hover:border-[#cfd8d1]"}`}>{f.e}</Link>
            ))}
            <form action="/" className="ml-auto flex items-center gap-2">
              {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
              {sp.proceso && <input type="hidden" name="proceso" value={sp.proceso} />}
              <input name="q" defaultValue={sp.q} placeholder="Buscar sociedad o código" className="h-9 w-[220px] rounded-ctl border border-linea bg-papel px-3 text-[13.5px] outline-none focus:border-verde" />
            </form>
            {sp.proceso && <Link href={url({ proceso: undefined })} className="text-[13px] font-semibold text-verde-profundo">Ver todos los procesos</Link>}
          </div>
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-tinta-3">
                  <th className="px-5 py-3 font-medium">Sociedad</th>
                  {procs.map((p) => <th key={p.id} className="px-3 py-3 font-medium">{p.corto}</th>)}
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr key={s.id} className="border-t border-linea-2 align-top">
                    <td className="px-5 py-3">
                      <div className="font-semibold leading-snug">{s.nombre}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-tinta-3">
                        <span className="font-mono">{s.codigo}</span>
                        {s.demo && <span>· demostración</span>}
                        {s.cruce && <span className="font-semibold text-naranja">· no cuadra entre procesos</span>}
                      </div>
                    </td>
                    {procs.map((p) => {
                      const celda = s.celdas[p.clave];
                      return <td key={p.id} className="px-3 py-3"><CeldaEstado celda={celda} href={celda.ejecucionId ? `/ejecuciones/${celda.ejecucionId}?sociedad=${s.id}` : celda.estado === "pendiente" ? "/pendientes" : undefined} /></td>;
                    })}
                  </tr>
                ))}
                {!filas.length && <tr><td colSpan={procs.length + 1} className="px-5 py-8 text-center text-tinta-3">Ninguna sociedad con ese filtro.</td></tr>}
              </tbody>
            </table>
          </Tarjeta>
          <div className="flex flex-wrap gap-3 text-[12.5px] text-tinta-3">
            {Object.values(ESTADO).map((e) => <span key={e.etiqueta}><b className="font-semibold text-tinta-2">{e.etiqueta}:</b> {e.detalle.toLowerCase()}</span>)}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Diferencias grandes */}
          <section className="min-w-0 space-y-4">
            <Encabezado et="Para revisar" titulo="Las diferencias grandes y su causa" bajada="Las que superan el umbral de cada proceso. La causa es la regla del motor o, cuando dos procesos no cuadran, la que propone el agente." />
            {c.grandes.length ? (
              <Tarjeta className="divide-y divide-linea-2">
                {c.grandes.slice(0, 12).map((g, i) => (
                  <Link key={i} href={g.ejecucionId ? `/ejecuciones/${g.ejecucionId}` : "/"} className="grid gap-2 px-5 py-4 hover:bg-fondo sm:grid-cols-[minmax(0,1fr)_150px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-tinta-3"><span className="font-semibold text-tinta-2">{g.sociedad}</span><span>· {PROCESO_CORTO[g.proceso]}</span>{g.origen === "agente" && <Insignia tono="noche">Causa del agente</Insignia>}</div>
                      <div className="mt-1 font-mono text-[13px] text-tinta">{g.titulo}</div>
                      <p className="mt-1 text-[13.5px] text-tinta-2">{g.causa}</p>
                    </div>
                    <div className="text-right"><Monto v={g.valor} corto className="text-[18px] font-extrabold" /><div className="text-[11.5px] text-tinta-3">diferencia</div></div>
                  </Link>
                ))}
              </Tarjeta>
            ) : <Vacio titulo="Ninguna diferencia supera el umbral">Cuando un motor encuentre una, aparece aquí con su causa.</Vacio>}
          </section>

          <aside className="space-y-6">
            {cruces.length > 0 && (
              <div className="space-y-3">
                {cruces.map((x) => {
                  const causa = x.causa as { causa: string; verificar: string[]; confianza: string } | null;
                  return (
                    <Aja key={x.id} etiqueta={`Dos procesos no cuadran · ${x.sociedad.nombre}`}>
                      <p className="m-0 text-[14px] text-white/80">{x.etiqueta}: <b className="text-white">{PROCESO_CORTO[x.procesoA]}</b> dice <Monto v={Number(x.valorA)} />, <b className="text-white">{PROCESO_CORTO[x.procesoB]}</b> dice <Monto v={Number(x.valorB)} />. Diferencia <b className="num text-oro"><Monto v={Number(x.diferencia)} /></b>.</p>
                      <p className="mb-0 mt-3">{causa?.causa ?? "El agente está proponiendo la causa."}</p>
                      {!!causa?.verificar?.length && <ul className="mb-0 mt-2 space-y-1 pl-4 text-[13.5px] text-white/75">{causa.verificar.map((v, i) => <li key={i}>{v}</li>)}</ul>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Insignia tono={ESTADO_CRUCE[x.estado].tono}>{ESTADO_CRUCE[x.estado].etiqueta}{causa ? ` · confianza ${causa.confianza}` : ""}</Insignia>
                        {x.estado === "propuesto" && puede(yo.rol, "cruces.revisar") && <>
                          <BotonAccion chico variante="primario" accion={revisarCruce.bind(null, x.id, "aceptado")}>Aceptar la causa</BotonAccion>
                          <BotonAccion chico variante="oscuro" accion={revisarCruce.bind(null, x.id, "descartado")}>Descartar</BotonAccion>
                        </>}
                      </div>
                    </Aja>
                  );
                })}
              </div>
            )}
            <Tarjeta className="p-5">
              <div className="flex items-center justify-between"><SeccionEt>Lo último</SeccionEt><Link href="/pendientes" className="inline-flex items-center gap-1 text-[13px] font-semibold text-verde-profundo">Pendientes <IconoFlecha className="size-3.5" /></Link></div>
              <div className="mt-4"><Bitacora eventos={eventos} /></div>
            </Tarjeta>
            <div className="flex flex-wrap gap-2"><Chip>Umbrales por proceso en Procesos</Chip><Chip>Nada se carga en SAP</Chip></div>
          </aside>
        </div>
      </Contenedor>
    </>
  );
}
