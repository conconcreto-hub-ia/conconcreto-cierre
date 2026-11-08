import "server-only";
// La sesión de verdad. Toda página y toda acción pasan por aquí: el proxy solo hace la revisión rápida.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";
import { COOKIE, DURACION_MS, firmar, leer } from "./cookie";
import { claveCorrecta } from "./clave";
import { puede, type Permiso } from "./permisos";
import type { Usuario } from "@prisma/client";

export type UsuarioSesion = Pick<Usuario, "id" | "correo" | "nombre" | "rol" | "debeCambiarClave">;

const VENTANA_MS = 15 * 60 * 1000;
const MAX_FALLOS = 5;

/** El usuario conectado, o null. Una consulta por request (cache de React). */
export const usuarioActual = cache(async (): Promise<UsuarioSesion | null> => {
  const carga = await leer((await cookies()).get(COOKIE)?.value);
  if (!carga) return null;
  const s = await db.sesion.findUnique({ where: { id: carga.sid }, include: { usuario: true } });
  if (!s || s.expiraEn < new Date() || !s.usuario.activo || s.usuarioId !== carga.uid) return null;
  const { id, correo, nombre, rol, debeCambiarClave } = s.usuario;
  return { id, correo, nombre, rol, debeCambiarClave };
});

/** Para páginas: si no hay sesión, al ingreso; si debe cambiar la clave, a su cuenta. */
export async function exigirSesion(opciones?: { permitirClaveTemporal?: boolean }): Promise<UsuarioSesion> {
  const u = await usuarioActual();
  if (!u) redirect("/ingresar");
  if (u.debeCambiarClave && !opciones?.permitirClaveTemporal) redirect("/cuenta?primera=1");
  return u;
}

/** Para acciones y rutas: sin sesión o sin permiso, error. Nunca confiar en que la pantalla escondió el botón. */
export async function exigir(p: Permiso): Promise<UsuarioSesion> {
  const u = await usuarioActual();
  if (!u) throw new Error("Tu sesión terminó. Vuelve a ingresar.");
  if (u.debeCambiarClave) throw new Error("Primero cambia tu clave temporal.");
  if (!puede(u.rol, p)) throw new Error("Tu rol no permite hacer esto.");
  return u;
}

export async function ingresar(correo: string, clave: string): Promise<{ ok: true; debeCambiarClave: boolean } | { ok: false; error: string }> {
  correo = correo.trim().toLowerCase();
  const fallos = await db.intentoIngreso.count({ where: { correo, exito: false, createdAt: { gte: new Date(Date.now() - VENTANA_MS) } } });
  if (fallos >= MAX_FALLOS) return { ok: false, error: "Demasiados intentos. Espera 15 minutos y vuelve a probar." };

  const u = await db.usuario.findUnique({ where: { correo } });
  const bien = !!u && u.activo && (await claveCorrecta(clave, u.hash));
  await db.intentoIngreso.create({ data: { correo, exito: bien } });
  // El mismo mensaje si el correo no existe o la clave está mal: no se le dice a nadie qué correos hay.
  if (!bien || !u) return { ok: false, error: "Correo o clave incorrectos." };

  const expira = new Date(Date.now() + DURACION_MS);
  const s = await db.sesion.create({ data: { usuarioId: u.id, expiraEn: expira } });
  await db.usuario.update({ where: { id: u.id }, data: { ultimoIngreso: new Date() } });
  (await cookies()).set(COOKIE, await firmar({ sid: s.id, uid: u.id, rol: u.rol }, expira), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expira,
  });
  return { ok: true, debeCambiarClave: u.debeCambiarClave };
}

export async function salir() {
  const jar = await cookies();
  const carga = await leer(jar.get(COOKIE)?.value);
  if (carga) await db.sesion.deleteMany({ where: { id: carga.sid } });
  jar.delete(COOKIE);
}
