// La barra lateral con la persona conectada. Las páginas importan esta; la parte interactiva es BarraCliente.
// Lo que la página pase como children se muestra como la cabecera oscura de la página.
import type { ReactNode } from "react";
import { usuarioActual } from "@/lib/auth/sesion";
import { ROL } from "@/lib/auth/permisos";
import { BarraCliente } from "./barra-cliente";

export async function Barra({ agenteActivo = true, children }: { agenteActivo?: boolean; children?: ReactNode }) {
  const u = await usuarioActual();
  return (
    <BarraCliente agenteActivo={agenteActivo} panelUrl={process.env.PANEL_URL ?? null} usuario={u ? { nombre: u.nombre, rol: ROL[u.rol].etiqueta, esAdmin: u.rol === "admin" } : null}>
      {children}
    </BarraCliente>
  );
}
