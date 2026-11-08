import "server-only";
// La entrada desde el panel de Conconcreto (conconcreto-panel). El panel firma un pase de 60 segundos,
// de un solo uso, con un secreto que solo comparten el panel y esta app (PANEL_PASE_SECRETO), dirigido
// a esta app (PANEL_APP). Aquí se verifica y se abre la sesión, sin clave.
//
// La persona que entra por el panel se crea o se actualiza con el rol que el panel le dio: el panel es la
// fuente de verdad de quién entra. No tiene clave propia en esta app (su hash no es válido), así que solo
// entra por el panel. Un retiro desde el panel la desactiva y le cierra las sesiones.
import { jwtVerify } from "jose";
import { Rol } from "@prisma/client";
import { db } from "../db";

export const EMISOR = "conconcreto-panel";
export const SIN_CLAVE = "pase:sin-clave-propia";

const llave = () => {
  const s = process.env.PANEL_PASE_SECRETO;
  if (!s || s.length < 32) throw new Error("Esta app no está conectada al panel (falta PANEL_PASE_SECRETO).");
  return new TextEncoder().encode(s);
};

export type Pase = { tipo: "entrada" | "retiro"; correo: string; nombre: string; rol: Rol | null; jti: string; exp: Date };

/** Verifica firma, emisor, destinatario, vigencia y que no se haya usado. Lo marca como usado. */
export async function leerPase(t: string | null | undefined, tipo: Pase["tipo"]): Promise<Pase> {
  if (!t) throw new Error("Falta el pase.");
  const app = process.env.PANEL_APP;
  if (!app) throw new Error("Esta app no está conectada al panel (falta PANEL_APP).");
  const { payload } = await jwtVerify(t, llave(), { algorithms: ["HS256"], issuer: EMISOR, audience: app, maxTokenAge: "90s" });
  if (payload.tipo !== tipo) throw new Error("El pase no es de este tipo.");
  if (!payload.jti || !payload.sub || !payload.exp) throw new Error("El pase está incompleto.");
  const roles = Object.values(Rol) as string[];
  const rol = typeof payload.rol === "string" && roles.includes(payload.rol) ? (payload.rol as Rol) : null;
  if (tipo === "entrada" && !rol) throw new Error("El rol del pase no existe en esta app.");
  try {
    await db.paseUsado.create({ data: { jti: payload.jti, expiraEn: new Date(payload.exp * 1000) } });
  } catch {
    throw new Error("Ese pase ya se usó.");
  }
  // Limpieza de los vencidos, de paso (no hay tareas de fondo).
  await db.paseUsado.deleteMany({ where: { expiraEn: { lt: new Date(Date.now() - 3600_000) } } });
  return { tipo, correo: payload.sub.toLowerCase(), nombre: String(payload.nombre ?? payload.sub), rol, jti: payload.jti, exp: new Date(payload.exp * 1000) };
}
