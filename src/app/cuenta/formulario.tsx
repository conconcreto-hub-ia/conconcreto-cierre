"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui";
import { accionCambiarClave } from "@/app/acceso";

const campo = "mt-1.5 h-11 w-full rounded-ctl border border-linea bg-fondo px-3 text-[15px] outline-none focus:border-verde";

export function FormClave() {
  const [estado, accion, pendiente] = useActionState(accionCambiarClave, {});
  return (
    <form action={accion} className="space-y-4">
      <label className="block text-[13.5px] font-semibold">Clave actual
        <input name="actual" type="password" autoComplete="current-password" required className={campo} />
      </label>
      <label className="block text-[13.5px] font-semibold">Clave nueva
        <input name="nueva" type="password" autoComplete="new-password" required minLength={10} className={campo} />
      </label>
      <label className="block text-[13.5px] font-semibold">Repite la clave nueva
        <input name="repetida" type="password" autoComplete="new-password" required minLength={10} className={campo} />
      </label>
      {estado.error && <p role="alert" className="rounded-ctl bg-rojo-suave px-3 py-2 text-[13.5px] text-rojo">{estado.error}</p>}
      {estado.ok && <p className="rounded-ctl bg-verde-suave px-3 py-2 text-[13.5px] text-verde-profundo">Listo: tu clave quedó cambiada.</p>}
      <Boton type="submit" variante="primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Cambiar la clave"}</Boton>
    </form>
  );
}
