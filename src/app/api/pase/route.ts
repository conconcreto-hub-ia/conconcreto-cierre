// Entrada desde el panel: <app>/api/pase?t=<pase>. Abre la sesión y lleva al inicio.
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE, DURACION_MS, firmar } from "@/lib/auth/cookie";
import { leerPase, SIN_CLAVE } from "@/lib/auth/pase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let p;
  try {
    p = await leerPase(req.nextUrl.searchParams.get("t"), "entrada");
  } catch (e) {
    const url = new URL("/ingresar", req.url);
    url.searchParams.set("error", e instanceof Error ? e.message : "El pase no es válido.");
    return NextResponse.redirect(url);
  }
  const u = await db.usuario.upsert({
    where: { correo: p.correo },
    update: { nombre: p.nombre, rol: p.rol!, activo: true, debeCambiarClave: false, ultimoIngreso: new Date() },
    create: { correo: p.correo, nombre: p.nombre, rol: p.rol!, hash: SIN_CLAVE, debeCambiarClave: false, ultimoIngreso: new Date() },
  });
  const expira = new Date(Date.now() + DURACION_MS);
  const s = await db.sesion.create({ data: { usuarioId: u.id, expiraEn: expira } });
  (await cookies()).set(COOKIE, await firmar({ sid: s.id, uid: u.id, rol: u.rol }, expira), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expira,
  });
  return NextResponse.redirect(new URL("/", req.url));
}
