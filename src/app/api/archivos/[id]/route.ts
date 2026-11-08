import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth/sesion";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioActual())) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const a = await db.archivo.findUnique({ where: { id } });
  if (!a) return new Response("No existe", { status: 404 });
  return new Response(Buffer.from(a.contenido), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.nombre)}`,
    },
  });
}
