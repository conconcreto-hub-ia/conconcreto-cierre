import { Barra } from "@/components/barra";
import { Contenedor, Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { IconoEscudo } from "@/components/iconos";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { db } from "@/lib/db";
import { cierreActual } from "@/lib/tablero";
import { fechaHora } from "@/lib/formato";
import { ESTADO } from "@/lib/etiquetas";
import { Insignia } from "@/components/ui";
import Link from "next/link";
import { FormCargar } from "./formulario";

export const dynamic = "force-dynamic";

export default async function Cargar({ searchParams }: { searchParams: Promise<{ proceso?: string }> }) {
  const yo = await exigirSesion();
  const { proceso } = await searchParams;
  const cierre = await cierreActual();
  const [procesos, patrimonios, recientes] = await Promise.all([
    db.proceso.findMany({ orderBy: { orden: "asc" } }),
    db.sociedad.findMany({ where: { tipo: "patrimonio" }, orderBy: { orden: "asc" } }),
    cierre ? db.ejecucion.findMany({ where: { cierreId: cierre.id }, orderBy: { createdAt: "desc" }, take: 8, include: { proceso: true } }) : [],
  ]);
  return (
    <>
      <Barra />
      <Contenedor className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <Encabezado et={cierre ? `Cierre de ${cierre.periodo}` : "Cargar"} titulo="Cargar el mes" bajada="Sube los archivos de un proceso y su motor corre aquí mismo: las mismas reglas que en el skill de quien lo construyó. Los números los calcula el código; nada se carga en SAP." />
          {!puede(yo.rol, "ejecuciones.cargar") ? (
            <Vacio icono={<IconoEscudo className="size-5" />} titulo="Tu rol no carga archivos">Cargan contabilidad y el administrador. Tú puedes ver todos los resultados en el mapa del cierre.</Vacio>
          ) : !cierre ? <Vacio titulo="No hay un cierre abierto" /> : (
            <Tarjeta className="p-6"><FormCargar cierreId={cierre.id} inicial={proceso} procesos={procesos.map((p) => ({ clave: p.clave, nombre: p.nombre, dueno: p.dueno, demo: p.demo }))} patrimonios={patrimonios.map((p) => ({ id: p.id, nombre: p.nombre }))} /></Tarjeta>
          )}
        </section>
        <aside>
          <Tarjeta className="p-5">
            <span className="seccion-et">Lo último que corrió</span>
            {recientes.length ? (
              <ul className="mt-3 space-y-3 pl-0">
                {recientes.map((e) => (
                  <li key={e.id} className="list-none">
                    <Link href={`/ejecuciones/${e.id}`} className="block rounded-ctl p-2 hover:bg-fondo">
                      <div className="flex items-center justify-between gap-2"><span className="text-[13.5px] font-semibold">{e.titulo}</span><Insignia tono={ESTADO[e.estado].tono}>{ESTADO[e.estado].etiqueta}</Insignia></div>
                      <div className="text-[12px] text-tinta-3">{e.proceso.nombre} · {e.corridoPor} · {fechaHora(e.createdAt)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-[13.5px] text-tinta-3">Nada todavía en este cierre.</p>}
          </Tarjeta>
        </aside>
      </Contenedor>
    </>
  );
}
