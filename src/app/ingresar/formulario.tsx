"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui";
import { accionIngresar } from "@/app/acceso";

const campo = "mt-1.5 h-11 w-full rounded-ctl border border-linea bg-fondo px-3 text-[15px] outline-none focus:border-verde";

export function FormIngresar({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState(accionIngresar, undefined);
  return (
    <form action={accion} className="mt-6 space-y-4">
      <input type="hidden" name="siguiente" value={siguiente} />
      <label className="block text-[13.5px] font-semibold">Correo
        <input name="correo" type="email" autoComplete="username" required autoFocus className={campo} />
      </label>
      <label className="block text-[13.5px] font-semibold">Clave
        <input name="clave" type="password" autoComplete="current-password" required className={campo} />
      </label>
      {estado?.error && <p role="alert" className="rounded-ctl bg-rojo-suave px-3 py-2 text-[13.5px] text-rojo">{estado.error}</p>}
      <Boton type="submit" variante="primario" disabled={pendiente} className="w-full">{pendiente ? "Ingresando…" : "Ingresar"}</Boton>
    </form>
  );
}
