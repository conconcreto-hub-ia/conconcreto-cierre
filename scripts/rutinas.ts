// Las rutinas corriendo en un computador, mientras la app no esté desplegada.
//
//   npx tsx scripts/rutinas.ts
//
//   · Calendario del cierre: días hábiles, 7:00 (hora Colombia). Busca lo que venció y no está; si el cierre
//     tiene los avisos automáticos aprobados, los manda y recuerda a quien no contesta.
//   · Buzón: cada 3 minutos de 7:00 a 19:00 en días hábiles. Primero le pregunta a AgentMail si llegó algo
//     (eso no toca la base); solo si hay un correo nuevo revisa el buzón. Así Neon puede dormir.
import "./_env";
import { agentmail } from "../src/lib/agentmail";
import { rutinaBuzon, rutinaDiaria } from "../src/lib/rutinas";
import { esHabil, hoyBogota } from "../src/lib/calendario";

const hora = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
const log = (...x: unknown[]) => console.log(`[${hora().toLocaleString("es-CO")}]`, ...x);

let ultimoMensaje: string | null = null;
const hechoHoy = new Set<string>();

async function ciclo() {
  const ahora = hora();
  const hoy = hoyBogota();
  const dia = hoy.toISOString().slice(0, 10);
  if (!esHabil(hoy)) return;
  try {
    if (ahora.getHours() >= 7 && !hechoHoy.has(dia)) { hechoHoy.add(dia); log("calendario", JSON.stringify(await rutinaDiaria())); }
    if (ahora.getHours() >= 7 && ahora.getHours() < 19) {
      const { messages } = await agentmail.listar(1);
      const tope = messages[0]?.message_id ?? null;
      if (tope && tope !== ultimoMensaje) { ultimoMensaje = tope; log("buzón", JSON.stringify(await rutinaBuzon())); }
    }
  } catch (e) { log("falló:", e instanceof Error ? e.message : e); }
}

log("Rutinas encendidas. Ctrl+C para apagarlas.");
ciclo();
setInterval(ciclo, 3 * 60_000);
