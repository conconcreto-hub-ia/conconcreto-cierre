import { redirect } from "next/navigation";
import { Barra } from "@/components/barra";
import { Contenedor, Encabezado, Insignia, Tarjeta } from "@/components/ui";
import { exigirSesion } from "@/lib/auth/sesion";
import { puede, ROL } from "@/lib/auth/permisos";
import { db } from "@/lib/db";
import { haceCuanto } from "@/lib/formato";
import { FormNuevoUsuario, FilaAcciones } from "./controles";

export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const yo = await exigirSesion();
  if (!puede(yo.rol, "usuarios.administrar")) redirect("/");
  const usuarios = await db.usuario.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }], include: { _count: { select: { sesiones: true } } } });

  return (
    <>
      <Barra />
      <Contenedor className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <Encabezado et="Usuarios" titulo="Quién entra y qué puede hacer" bajada="Cada persona entra con su correo. La clave temporal se muestra una sola vez y se cambia en el primer ingreso. Desactivar a alguien cierra sus sesiones de inmediato." />
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead><tr className="text-left text-[12px] text-tinta-3"><th className="px-5 py-3 font-medium">Persona</th><th className="px-3 py-3 font-medium">Rol</th><th className="px-3 py-3 font-medium">Último ingreso</th><th className="px-5 py-3 font-medium" /></tr></thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className={`border-t border-linea-2 align-top ${u.activo ? "" : "opacity-55"}`}>
                    <td className="px-5 py-3">
                      <div className="font-semibold">{u.nombre}{u.id === yo.id && <span className="ml-1.5 text-[12px] font-normal text-tinta-3">(tú)</span>}</div>
                      <div className="text-[12.5px] text-tinta-3">{u.correo}</div>
                      <div className="mt-1 flex gap-1.5">{!u.activo && <Insignia tono="neutro">Desactivado</Insignia>}{u.debeCambiarClave && u.activo && <Insignia tono="oro">Clave temporal</Insignia>}</div>
                    </td>
                    <td className="px-3 py-3"><FilaAcciones id={u.id} rol={u.rol} activo={u.activo} soyYo={u.id === yo.id} soloRol /></td>
                    <td className="px-3 py-3 text-[13px] text-tinta-2">{u.ultimoIngreso ? haceCuanto(u.ultimoIngreso) : "Nunca"}<div className="text-[12px] text-tinta-3">{u._count.sesiones} {u._count.sesiones === 1 ? "sesión abierta" : "sesiones abiertas"}</div></td>
                    <td className="px-5 py-3"><FilaAcciones id={u.id} rol={u.rol} activo={u.activo} soyYo={u.id === yo.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tarjeta>
        </section>
        <aside className="space-y-4">
          <Tarjeta className="p-5">
            <h3 className="text-[16px] font-bold">Agregar a alguien</h3>
            <FormNuevoUsuario />
          </Tarjeta>
          <Tarjeta className="p-5">
            <h3 className="text-[15px] font-bold">Los roles</h3>
            <ul className="mt-2 space-y-2 pl-0">
              {Object.values(ROL).map((r) => <li key={r.etiqueta} className="list-none text-[13.5px]"><b className="font-display font-semibold">{r.etiqueta}</b> <span className="text-tinta-2">· {r.detalle}</span></li>)}
            </ul>
          </Tarjeta>
        </aside>
      </Contenedor>
    </>
  );
}
