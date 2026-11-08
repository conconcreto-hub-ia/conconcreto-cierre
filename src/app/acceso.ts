"use server";
// Ingresar, salir, cambiar la clave y administrar usuarios.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ingresar, salir, exigir, usuarioActual } from "@/lib/auth/sesion";
import { cifrarClave, claveCorrecta, claveTemporal, problemaDeClave } from "@/lib/auth/clave";
import type { Rol } from "@prisma/client";
import { destinoSeguro } from "@/lib/auth/destino";


export async function accionIngresar(_: unknown, f: FormData): Promise<{ error: string } | undefined> {
  const r = await ingresar(String(f.get("correo") ?? ""), String(f.get("clave") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect(r.debeCambiarClave ? "/cuenta?primera=1" : destinoSeguro(String(f.get("siguiente") ?? "")));
}

export async function accionSalir() {
  await salir();
  redirect("/ingresar");
}

export async function accionCambiarClave(_: unknown, f: FormData): Promise<{ error?: string; ok?: boolean }> {
  const u = await usuarioActual();
  if (!u) redirect("/ingresar");
  const actual = String(f.get("actual") ?? ""), nueva = String(f.get("nueva") ?? ""), repetida = String(f.get("repetida") ?? "");
  const guardado = await db.usuario.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await claveCorrecta(actual, guardado.hash))) return { error: "La clave actual no es correcta." };
  const problema = problemaDeClave(nueva);
  if (problema) return { error: problema };
  if (nueva !== repetida) return { error: "Las dos claves nuevas no coinciden." };
  if (nueva === actual) return { error: "La clave nueva tiene que ser distinta de la actual." };
  await db.usuario.update({ where: { id: u.id }, data: { hash: await cifrarClave(nueva), debeCambiarClave: false } });
  if (u.debeCambiarClave) redirect("/");
  return { ok: true };
}

/* ── Usuarios (solo administrador) ─────────────────────────────────── */

const ROLES: Rol[] = ["admin", "contabilidad", "comite", "consulta"];

export async function accionCrearUsuario(_: unknown, f: FormData): Promise<{ error?: string; creado?: { correo: string; clave: string } }> {
  await exigir("usuarios.administrar");
  const nombre = String(f.get("nombre") ?? "").trim();
  const correo = String(f.get("correo") ?? "").trim().toLowerCase();
  const rol = String(f.get("rol") ?? "") as Rol;
  if (!nombre) return { error: "Falta el nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "El correo no es válido." };
  if (!ROLES.includes(rol)) return { error: "Rol no válido." };
  if (await db.usuario.findUnique({ where: { correo } })) return { error: "Ya hay un usuario con ese correo." };
  const clave = claveTemporal();
  await db.usuario.create({ data: { nombre, correo, rol, hash: await cifrarClave(clave), debeCambiarClave: true } });
  revalidatePath("/usuarios");
  return { creado: { correo, clave } };
}

export async function accionCambiarRol(id: string, rol: Rol) {
  const yo = await exigir("usuarios.administrar");
  if (!ROLES.includes(rol)) throw new Error("Rol no válido.");
  if (id === yo.id && rol !== "admin") throw new Error("No puedes quitarte el rol de administrador a ti mismo.");
  await db.usuario.update({ where: { id }, data: { rol } });
  revalidatePath("/usuarios");
}

export async function accionActivar(id: string, activo: boolean) {
  const yo = await exigir("usuarios.administrar");
  if (id === yo.id && !activo) throw new Error("No puedes desactivarte a ti mismo.");
  await db.$transaction([
    db.usuario.update({ where: { id }, data: { activo } }),
    // Desactivar cierra sus sesiones de inmediato.
    ...(activo ? [] : [db.sesion.deleteMany({ where: { usuarioId: id } })]),
  ]);
  revalidatePath("/usuarios");
}

export async function accionNuevaClave(id: string): Promise<{ clave: string }> {
  await exigir("usuarios.administrar");
  const clave = claveTemporal();
  await db.$transaction([
    db.usuario.update({ where: { id }, data: { hash: await cifrarClave(clave), debeCambiarClave: true } }),
    db.sesion.deleteMany({ where: { usuarioId: id } }),
  ]);
  revalidatePath("/usuarios");
  return { clave };
}
