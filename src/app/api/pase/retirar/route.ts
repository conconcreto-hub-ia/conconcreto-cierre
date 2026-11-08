// Retiro desde el panel (servidor a servidor): la persona queda desactivada y sin sesiones.
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { leerPase } from "@/lib/auth/pase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { t } = (await req.json()) as { t?: string };
    const p = await leerPase(t, "retiro");
    const u = await db.usuario.findUnique({ where: { correo: p.correo } });
    if (u) await db.$transaction([db.usuario.update({ where: { id: u.id }, data: { activo: false } }), db.sesion.deleteMany({ where: { usuarioId: u.id } })]);
    return NextResponse.json({ ok: true, existia: !!u });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 401 });
  }
}
