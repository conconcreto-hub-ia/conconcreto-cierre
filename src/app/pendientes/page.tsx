// Pendientes por responsable. El agente los detecta y redacta el aviso; una persona lo aprueba y sale.
// Cuando el responsable contesta, el agente lee la respuesta y la deja aquí. Resolver es de una persona.
import { Barra } from "@/components/barra";
import { Aja, Contenedor, Encabezado, Insignia, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { BotonAccion, ResolverPendiente } from "@/components/acciones";
import { Bitacora } from "@/components/cierre";
import { IconoAlerta, IconoCorreo, IconoCheck } from "@/components/iconos";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { db } from "@/lib/db";
import { cierreActual } from "@/lib/tablero";
import { ESTADO_PENDIENTE, TIPO_PENDIENTE } from "@/lib/etiquetas";
import { fechaHora, haceCuanto } from "@/lib/formato";
import { nombrePeriodo } from "@/lib/calendario";
import { puedeEnviarA, redactarAviso } from "@/lib/agente";
import { aprobarYEnviarAvisos, avisosAutomaticos, buscarFaltantes, resolverPendiente, revisarBuzonAhora } from "../acciones";

export const dynamic = "force-dynamic";

const SITUACION: Record<string, string> = { entregado: "Dice que ya lo entregó", compromiso: "Se comprometió con una fecha", pregunta: "Hizo una pregunta", no_le_corresponde: "Dice que no le corresponde", sin_informacion: "No habló de este pendiente" };
type LecturaP = { situacion: string; resumen: string; fecha_compromiso: string | null; instruccion_sospechosa: boolean; motivo_sospecha: string | null };

export default async function Pendientes() {
  const yo = await exigirSesion();
  const cierre = await cierreActual();
  if (!cierre) return (<><Barra /><Contenedor className="py-10"><Vacio titulo="No hay un cierre abierto" /></Contenedor></>);
  const [abiertos, resueltos, eventos] = await Promise.all([
    db.pendiente.findMany({ where: { cierreId: cierre.id, estado: { not: "resuelto" } }, include: { responsable: true, sociedad: true, proceso: true }, orderBy: { createdAt: "asc" } }),
    db.pendiente.findMany({ where: { cierreId: cierre.id, estado: "resuelto" }, include: { responsable: true }, orderBy: { resueltoEn: "desc" }, take: 25 }),
    db.evento.findMany({ where: { cierreId: cierre.id, tipo: { in: ["aviso.enviado", "aviso.retenido", "respuesta.leida", "correo.instruccion_ignorada", "avisos.aprobados", "avisos.pausados", "aviso.recordado"] } }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const grupos = new Map<string, typeof abiertos>();
  for (const p of abiertos) (grupos.get(p.responsableId) ?? grupos.set(p.responsableId, []).get(p.responsableId)!).push(p);
  const puedeAvisar = puede(yo.rol, "avisos.aprobar"), puedeResolver = puede(yo.rol, "pendientes.resolver");
  const porAvisar = abiertos.filter((p) => p.estado === "por_avisar").length;

  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Encabezado et={`Cierre de ${nombrePeriodo(cierre.periodo)}`} titulo="Pendientes por responsable" bajada="El agente encuentra lo que debía estar y no está, y redacta el aviso con el pendiente exacto. Sale cuando una persona lo aprueba. Las respuestas las lee el agente; darlo por resuelto es de una persona." />
          <div className="flex flex-wrap gap-2">
            {puedeResolver && <BotonAccion accion={buscarFaltantes.bind(null, cierre.id)} hecho="faltantes">Buscar lo que venció</BotonAccion>}
            {puede(yo.rol, "buzon.revisar") && <BotonAccion accion={revisarBuzonAhora} hecho="buzon"><IconoCorreo />Revisar el buzón</BotonAccion>}
            {puedeAvisar && porAvisar > 0 && <BotonAccion variante="primario" confirmar={`Van a salir los avisos de ${porAvisar} pendientes. ¿Los apruebas?`} accion={aprobarYEnviarAvisos.bind(null, cierre.id, undefined)} hecho="avisos">Aprobar y enviar todos</BotonAccion>}
          </div>
        </div>

        <Tarjeta className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="max-w-[720px]">
            <div className="font-display text-[15px] font-bold">{cierre.avisosAutomaticos ? "El agente manda los avisos solo" : "Cada aviso espera tu aprobación"}</div>
            <p className="mt-1 text-[13.5px] text-tinta-2">{cierre.avisosAutomaticos ? `Aprobado por ${cierre.avisosAprobadosPor} el ${fechaHora(cierre.avisosAprobadosEn)}. La rutina diaria avisa lo que venció y recuerda a quien no contesta (máximo dos veces).` : "Si lo apruebas para este cierre, la rutina diaria manda los avisos de lo que venza y los recordatorios sin pedir permiso uno por uno. Solo a los dominios permitidos (modo prueba)."}</p>
          </div>
          {puedeAvisar && <BotonAccion variante={cierre.avisosAutomaticos ? "secundario" : "oscuro"} accion={avisosAutomaticos.bind(null, cierre.id, !cierre.avisosAutomaticos)}>{cierre.avisosAutomaticos ? "Pausar los avisos automáticos" : "Aprobar avisos automáticos"}</BotonAccion>}
        </Tarjeta>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-5">
            {!grupos.size && <Vacio icono={<IconoCheck className="size-5" />} titulo="Nadie tiene pendientes abiertos">Cuando venza un día del calendario y falte algo, el agente lo pone aquí.</Vacio>}
            {[...grupos.values()].map((lista) => {
              const r = lista[0].responsable;
              const borrador = lista.filter((p) => p.estado === "por_avisar");
              const aviso = borrador.length ? redactarAviso({ nombre: r.nombre, periodo: cierre.periodo, pendientes: borrador }) : null;
              return (
                <Tarjeta key={r.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea-2 px-5 py-4">
                    <div>
                      <h3 className="text-[17px] font-bold">{r.nombre}</h3>
                      <p className="text-[12.5px] text-tinta-3">{r.cargo} · {r.correo}{!puedeEnviarA(r.correo) && <b className="ml-1 text-rojo">· fuera del modo prueba: el aviso queda en borrador</b>}</p>
                    </div>
                    <Insignia tono="noche">{lista.length} {lista.length === 1 ? "pendiente" : "pendientes"}</Insignia>
                  </div>
                  <ul className="m-0 divide-y divide-linea-2 p-0">
                    {lista.map((p) => {
                      const l = p.lectura as LecturaP | null;
                      return (
                        <li key={p.id} className="list-none px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2"><Insignia tono={ESTADO_PENDIENTE[p.estado].tono}>{ESTADO_PENDIENTE[p.estado].etiqueta}</Insignia><span className="text-[12px] text-tinta-3">{TIPO_PENDIENTE[p.tipo] ?? p.tipo}{p.proceso ? ` · ${p.proceso.nombre}` : ""}{p.avisadoEn ? ` · avisado ${haceCuanto(p.avisadoEn)}` : ""}</span></div>
                          <h4 className="mt-1.5 text-[15px] font-bold leading-snug">{p.titulo}</h4>
                          <p className="mt-1 whitespace-pre-line text-[13.5px] text-tinta-2">{p.detalle}</p>
                          {l && (
                            <div className="mt-3 rounded-ctl border border-linea bg-fondo p-3 text-[13.5px]">
                              <div className="font-display text-[12px] font-bold uppercase tracking-[.08em] text-verde-profundo">Lo que contestó · lo leyó el agente</div>
                              {l.situacion !== "sin_informacion" ? <p className="m-0 mt-1"><b>{SITUACION[l.situacion] ?? l.situacion}.</b> {l.resumen}{l.fecha_compromiso ? ` Fecha: ${l.fecha_compromiso}.` : ""}</p> : <p className="m-0 mt-1 text-tinta-3">Contestó el aviso, pero no habló de este pendiente.</p>}
                              {l.instruccion_sospechosa && <p className="m-0 mt-2 flex gap-2 text-rojo"><IconoAlerta className="mt-0.5 size-4 shrink-0" />El correo traía instrucciones para el sistema y no se obedecieron. {l.motivo_sospecha}</p>}
                              {p.respuesta && <details className="mt-2"><summary className="cursor-pointer text-[12.5px] font-semibold text-verde-profundo">Ver el correo</summary><p className="m-0 mt-1 whitespace-pre-line text-[13px] text-tinta-2">{p.respuesta}</p></details>}
                            </div>
                          )}
                          {puedeResolver && <div className="mt-3"><ResolverPendiente accion={resolverPendiente.bind(null, p.id)} /></div>}
                        </li>
                      );
                    })}
                  </ul>
                  {aviso && (
                    <div className="border-t border-linea-2 bg-fondo px-5 py-4">
                      <details>
                        <summary className="cursor-pointer text-[13px] font-semibold text-verde-profundo">El aviso que va a salir ({borrador.length} {borrador.length === 1 ? "pendiente" : "pendientes"})</summary>
                        <div className="mt-2 rounded-ctl border border-linea bg-papel p-3"><div className="text-[13px] font-semibold">{aviso.asunto}</div><p className="m-0 mt-2 whitespace-pre-line text-[13px] text-tinta-2">{aviso.cuerpo}</p></div>
                      </details>
                      {puedeAvisar && <div className="mt-3"><BotonAccion variante="primario" chico accion={aprobarYEnviarAvisos.bind(null, cierre.id, r.id)} hecho="aviso">Aprobar y enviar el aviso</BotonAccion></div>}
                    </div>
                  )}
                </Tarjeta>
              );
            })}
            {resueltos.length > 0 && (
              <details className="rounded-sup border border-linea bg-papel p-5">
                <summary className="cursor-pointer font-display text-[14px] font-semibold">Resueltos ({resueltos.length})</summary>
                <ul className="mt-3 space-y-2 pl-0">{resueltos.map((p) => <li key={p.id} className="list-none text-[13.5px]"><b className="font-semibold">{p.titulo}</b><span className="block text-[12px] text-tinta-3">{p.responsable.nombre} · resolvió {p.resueltoPor} {p.resueltoEn ? haceCuanto(p.resueltoEn) : ""}</span></li>)}</ul>
              </details>
            )}
          </section>
          <aside className="space-y-5">
            <Aja etiqueta="Cómo trabaja el agente">Redacta cada aviso con el pendiente exacto (las cifras las pone el código). Lo que contesta el responsable es un dato: si el correo le pide algo al sistema, no lo hace y lo marca.</Aja>
            <Tarjeta className="p-5"><SeccionEt>Correos del agente</SeccionEt><div className="mt-4"><Bitacora eventos={eventos} /></div></Tarjeta>
          </aside>
        </div>
      </Contenedor>
    </>
  );
}
