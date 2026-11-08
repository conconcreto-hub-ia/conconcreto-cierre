// Lo que corre solo. Cada rutina es una función: la llaman las rutas de cron (si se despliega), el webhook de
// AgentMail y scripts/rutinas.ts (un computador). Todas dejan su rastro en la bitácora.
import { rutinaCalendario, revisarBuzon } from "./agente";

/** Lo que venció, los avisos aprobados y los recordatorios. Una vez al día hábil, temprano. */
export const rutinaDiaria = () => rutinaCalendario();

/** Las respuestas de los responsables. Al llegar un correo (webhook) o cuando el computador ve algo nuevo. */
export const rutinaBuzon = () => revisarBuzon();

/** Las rutas de cron solo responden con el secreto (Vercel lo manda como Bearer). */
export function autorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  return !!secreto && req.headers.get("authorization") === `Bearer ${secreto}`;
}
