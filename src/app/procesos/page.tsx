// Los procesos del cierre y su calendario: qué corre qué día hábil, quién lo construyó, a quién le escribe
// el agente, el umbral de revisión y qué sociedades cubre.
import { Barra } from "@/components/barra";
import { Contenedor, Dato, Encabezado, Insignia, Tarjeta, Chip } from "@/components/ui";
import { AvisoDemo } from "@/components/cierre";
import { exigirSesion } from "@/lib/auth/sesion";
import { db } from "@/lib/db";
import { cierreActual } from "@/lib/tablero";
import { fechaCorta, fechaDiaHabil, nombrePeriodo } from "@/lib/calendario";
import { pesos } from "@/lib/formato";
import { QUE_SE_NECESITA } from "@/lib/agente";

export const dynamic = "force-dynamic";

export default async function Procesos() {
  await exigirSesion();
  const cierre = await cierreActual();
  const procesos = await db.proceso.findMany({ orderBy: { orden: "asc" }, include: { responsable: true, alcance: { include: { sociedad: true, responsable: true }, orderBy: { sociedad: { orden: "asc" } } } } });
  return (
    <>
      <Barra />
      <Contenedor className="space-y-6 py-10">
        <Encabezado et={cierre ? `Calendario del cierre de ${nombrePeriodo(cierre.periodo)}` : "Calendario"} titulo="Los procesos del cierre" bajada="Cada proceso corre con su motor, en su día hábil. Si el día pasó y no está, el agente lo pone en pendientes y redacta el aviso. Días hábiles: lunes a viernes sin festivos de Colombia." />
        {procesos.map((p) => (
          <Tarjeta key={p.id} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-[760px]">
                <div className="flex flex-wrap items-center gap-2"><Insignia tono="noche">Día hábil {p.diaHabil}</Insignia>{cierre && <span className="text-[13px] text-tinta-3">{fechaCorta(fechaDiaHabil(cierre.periodo, p.diaHabil))}</span>}{p.demo && <Insignia tono="oro">Demostración</Insignia>}</div>
                <h3 className="mt-2 text-[19px] font-bold">{p.nombre}</h3>
                <p className="mt-1 text-[14px] text-tinta-2">{p.descripcion}</p>
              </div>
            </div>
            {p.demo && <div className="mt-4"><AvisoDemo /></div>}
            <dl className="m-0 mt-4 grid gap-x-8 md:grid-cols-2">
              <Dato k="Lo construyó">{p.dueno}</Dato>
              <Dato k="Responde">{p.responsable.nombre}{p.responsable.cargo !== p.responsable.nombre ? ` · ${p.responsable.cargo}` : ""}</Dato>
              <Dato k="Umbral de revisión">{pesos(p.umbralRevision)}</Dato>
              <Dato k="Necesita">{QUE_SE_NECESITA[p.clave]}</Dato>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">{p.alcance.map((a) => <span key={a.sociedadId} title={a.responsable ? `Responde: ${a.responsable.nombre}` : undefined}><Chip>{a.sociedad.nombre}</Chip></span>)}</div>
          </Tarjeta>
        ))}
        <p className="text-[12.5px] text-tinta-3">El día de la intercompañía (día hábil 2) es un supuesto: no estaba en el calendario del cliente.</p>
      </Contenedor>
    </>
  );
}
