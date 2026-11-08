import { autorizado, rutinaDiaria } from "@/lib/rutinas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!autorizado(req)) return new Response("No autorizado", { status: 401 });
  try {
    return Response.json({ ok: true, cierres: await rutinaDiaria() });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
