import { Barra } from "@/components/barra";
import { Contenedor, Encabezado, Tarjeta, Dato } from "@/components/ui";
import { exigirSesion } from "@/lib/auth/sesion";
import { ROL } from "@/lib/auth/permisos";
import { FormClave } from "./formulario";

export const dynamic = "force-dynamic";

export default async function Cuenta({ searchParams }: { searchParams: Promise<{ primera?: string }> }) {
  const u = await exigirSesion({ permitirClaveTemporal: true });
  const { primera } = await searchParams;
  return (
    <>
      <Barra />
      <Contenedor className="grid gap-8 py-10 md:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <Encabezado et="Tu cuenta" titulo={u.debeCambiarClave || primera ? "Cambia tu clave temporal" : "Cambiar la clave"} bajada={u.debeCambiarClave ? "Antes de seguir, reemplaza la clave que te dio el administrador por una tuya. Mínimo 10 caracteres, con letras y números." : "Mínimo 10 caracteres, con letras y números. Al cambiarla, tus otras sesiones siguen abiertas hasta que venzan."} />
          <Tarjeta className="max-w-[460px] p-6"><FormClave /></Tarjeta>
        </section>
        <aside>
          <Tarjeta className="p-5">
            <dl className="m-0">
              <Dato k="Nombre">{u.nombre}</Dato>
              <Dato k="Correo">{u.correo}</Dato>
              <Dato k="Rol">{ROL[u.rol].etiqueta}<div className="text-[12.5px] text-tinta-3">{ROL[u.rol].detalle}</div></Dato>
            </dl>
          </Tarjeta>
        </aside>
      </Contenedor>
    </>
  );
}
