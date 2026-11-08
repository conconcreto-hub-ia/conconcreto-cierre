// Cliente de AgentMail. El buzón del agente es AGENTMAIL_INBOX (cierre-cc@agentmail.to).

const BASE = "https://api.agentmail.to/v0";

export type AdjuntoAM = { attachment_id: string; filename?: string; content_type?: string; size?: number; inline?: boolean };

export type MensajeAM = {
  message_id: string;
  thread_id: string;
  labels: string[];
  timestamp: string;
  from: string; // "Nombre <correo>"
  to: string[];
  subject?: string;
  preview?: string;
  text?: string;
  extracted_text?: string;
  html?: string;
  attachments?: AdjuntoAM[];
};

const buzon = () => {
  const b = process.env.AGENTMAIL_INBOX;
  if (!b) throw new Error("Falta AGENTMAIL_INBOX en .env.local");
  return b;
};

async function llamar<T>(ruta: string, init?: RequestInit): Promise<T> {
  const llave = process.env.AGENTMAIL_API_KEY;
  if (!llave) throw new Error("Falta AGENTMAIL_API_KEY en .env.local");
  const res = await fetch(`${BASE}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AgentMail ${ruta} respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

const enc = encodeURIComponent;

export const agentmail = {
  buzon,
  listar: (limit = 50, pageToken?: string) => llamar<{ count: number; next_page_token?: string; messages: MensajeAM[] }>(`/inboxes/${enc(buzon())}/messages?limit=${limit}${pageToken ? `&page_token=${enc(pageToken)}` : ""}`),
  leer: (messageId: string) => llamar<MensajeAM>(`/inboxes/${enc(buzon())}/messages/${enc(messageId)}`),
  adjunto: (messageId: string, attachmentId: string) =>
    llamar<{ download_url?: string; url?: string } & Record<string, unknown>>(`/inboxes/${enc(buzon())}/messages/${enc(messageId)}/attachments/${enc(attachmentId)}`),
  /** Responde en el mismo hilo. OJO: responder a un correo PROPIO (un recordatorio sobre nuestra invitación)
   *  sin `to` se lo manda al mismo buzón. Ahí hay que decir a quién va. */
  responder: (messageId: string, cuerpo: { text: string; html?: string; to?: string[] }) =>
    llamar<{ message_id: string; thread_id: string }>(`/inboxes/${enc(buzon())}/messages/${enc(messageId)}/reply`, { method: "POST", body: JSON.stringify(cuerpo) }),
  enviar: (cuerpo: { to: string[]; subject: string; text: string; html?: string; attachments?: { filename: string; content_type: string; content: string }[] }) =>
    llamar<{ message_id: string; thread_id: string }>(`/inboxes/${enc(buzon())}/messages/send`, { method: "POST", body: JSON.stringify(cuerpo) }),
};

/** "Jhon Bedoya <jbedoyag@conconcreto.com>" → { nombre, correo } */
export function partirRemitente(de: string): { nombre: string | null; correo: string } {
  const m = de.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { nombre: m[1].trim() || null, correo: m[2].trim().toLowerCase() };
  return { nombre: null, correo: de.trim().toLowerCase() };
}

/** ¿Es un reenvío? Outlook en español e inglés, Gmail. */
export function esReenvio(asunto: string, texto: string): boolean {
  return /^\s*(rv|re?env|fw|fwd)\s*:/i.test(asunto) || /(mensaje reenviado|forwarded message|-----\s*(mensaje original|original message))/i.test(texto) || /^\s*(de|from):\s.+\n.*(enviado|sent|date|fecha):/im.test(texto);
}

/** El remitente original dentro del cuerpo de un reenvío ("De: Pedro <p@x.com>"). */
export function remitenteOriginal(texto: string): string | null {
  const m = texto.match(/^\s*(?:\*\*)?(?:de|from)(?:\*\*)?\s*:\s*(.+)$/im);
  return m ? m[1].replace(/\*\*/g, "").trim() : null;
}
