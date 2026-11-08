"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui";
import { accionCrearUsuario, accionCambiarRol, accionActivar, accionNuevaClave } from "@/app/acceso";
import type { Rol } from "@prisma/client";

const ROLES: { v: Rol; e: string }[] = [{ v: "contabilidad", e: "Contabilidad" }, { v: "comite", e: "Comité" }, { v: "consulta", e: "Consulta" }, { v: "admin", e: "Administrador" }];
const campo = "mt-1 h-10 w-full rounded-ctl border border-linea bg-fondo px-3 text-[14px] outline-none focus:border-verde";

/** La clave temporal se ve una sola vez: hay que copiarla y entregarla por un canal seguro. */
function ClaveUnaVez({ correo, clave }: { correo: string; clave: string }) {
  return (
    <div className="rounded-ctl border border-oro/60 bg-oro-suave p-3 text-[13px]">
      <div className="font-semibold">Clave temporal de {correo}</div>
      <div className="mt-1 select-all font-mono text-[16px] font-semibold tracking-wide">{clave}</div>
      <div className="mt-1 text-tinta-2">Cópiala ahora: no se vuelve a mostrar. Entrégala por un canal seguro, no por el mismo correo.</div>
    </div>
  );
}

export function FormNuevoUsuario() {
  const [estado, accion, pendiente] = useActionState(accionCrearUsuario, {});
  return (
    <form action={accion} className="mt-3 space-y-3">
      <label className="block text-[13px] font-semibold">Nombre<input name="nombre" required className={campo} /></label>
      <label className="block text-[13px] font-semibold">Correo<input name="correo" type="email" required className={campo} /></label>
      <label className="block text-[13px] font-semibold">Rol
        <select name="rol" defaultValue="contabilidad" className={campo}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.e}</option>)}</select>
      </label>
      {estado.error && <p role="alert" className="text-[13px] text-rojo">{estado.error}</p>}
      {estado.creado && <ClaveUnaVez {...estado.creado} />}
      <Boton type="submit" variante="primario" disabled={pendiente} className="w-full">{pendiente ? "Creando…" : "Crear usuario"}</Boton>
    </form>
  );
}

export function FilaAcciones({ id, rol, activo, soyYo, soloRol }: { id: string; rol: Rol; activo: boolean; soyYo: boolean; soloRol?: boolean }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [clave, setClave] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const correr = (fn: () => Promise<unknown>) => empezar(async () => { setError(null); try { await fn(); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } });

  if (soloRol) {
    return (
      <select value={rol} disabled={pendiente || soyYo} onChange={(e) => correr(() => accionCambiarRol(id, e.target.value as Rol))} className="h-8 rounded-ctl border border-linea bg-papel px-2 text-[13px] disabled:opacity-60" title={soyYo ? "No puedes cambiar tu propio rol" : ""}>
        {ROLES.map((r) => <option key={r.v} value={r.v}>{r.e}</option>)}
      </select>
    );
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Boton chico variante="secundario" disabled={pendiente} onClick={() => correr(async () => setClave((await accionNuevaClave(id)).clave))}>Nueva clave</Boton>
        {!soyYo && <Boton chico variante={activo ? "peligro" : "secundario"} disabled={pendiente} onClick={() => correr(() => accionActivar(id, !activo))}>{activo ? "Desactivar" : "Activar"}</Boton>}
      </div>
      {clave && <div className="max-w-[300px] text-left"><ClaveUnaVez correo="esta persona" clave={clave} /></div>}
      {error && <p className="text-[12.5px] text-rojo">{error}</p>}
    </div>
  );
}
