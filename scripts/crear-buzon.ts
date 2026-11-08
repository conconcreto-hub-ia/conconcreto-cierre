// Crea el buzón del agente en AgentMail (una sola vez). El nombre visible lleva «·»: se manda desde Node,
// no desde la terminal de Windows, que lo daña. Si el buzón ya existe, no hace nada.
//
//   npx tsx scripts/crear-buzon.ts
import "./_env";

const K = process.env.AGENTMAIL_API_KEY!, BUZON = process.env.AGENTMAIL_INBOX!;
const API = "https://api.agentmail.to/v0";
const h = { Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

(async () => {
  const ya = await fetch(`${API}/inboxes/${encodeURIComponent(BUZON)}`, { headers: h });
  if (ya.ok) { const b = await ya.json(); console.log(`Ya existe: ${b.inbox_id} · «${b.display_name}»`); return; }
  const [usuario, dominio] = BUZON.split("@");
  const r = await fetch(`${API}/inboxes`, { method: "POST", headers: h, body: JSON.stringify({ username: usuario, domain: dominio, display_name: "Cierre · Conconcreto" }) });
  if (!r.ok) throw new Error(`AgentMail respondió ${r.status}: ${await r.text()}`);
  const b = await r.json();
  console.log(`Creado: ${b.inbox_id} · «${b.display_name}»`);
})();
