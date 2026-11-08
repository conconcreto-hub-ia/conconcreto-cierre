// AgentMail avisa aquí cuando llega un correo al buzón (evento message.received). En vez de preguntarle
// al buzón cada pocos minutos, se revisa solo cuando hay algo: así la base puede dormir.
// La URL lleva un token: https://<dominio>/api/webhooks/agentmail?token=<AGENTMAIL_WEBHOOK_TOKEN>
import { rutinaBuzon } from "@/lib/rutinas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.AGENTMAIL_WEBHOOK_TOKEN || token !== process.env.AGENTMAIL_WEBHOOK_TOKEN) return new Response("No autorizado", { status: 401 });
  // El contenido del aviso no se usa: se revisa el buzón entero, que es idempotente.
  return Response.json({ ok: true, ...(await rutinaBuzon()) });
}
