// El reporte para el comité: «¿qué me falta para el comité?». Se genera al pedirlo.
// Las cifras son una foto de cifrasDelCierre (código). El modelo escribe la lectura, sin cifras.
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { cifrasDelCierre, type Cifras } from "./tablero";
import { pedirEstructurado } from "./claude";
import { traeCifras } from "./cruces";
import { ESTADO } from "./etiquetas";

export type Lectura = { titular: string; lectura: string; para_el_comite: string[] };

/** Lo que el modelo ve: nombres, estados y conteos. Los montos van como texto para que los cite por nombre. */
function contextoParaModelo(c: Cifras) {
  return {
    cierre: c.cierre.nombre, dia_habil_hoy: c.cierre.diaHabilHoy,
    procesos: c.procesos.map((p) => ({ proceso: p.nombre, dueno: p.dueno, dia_habil: p.diaHabil, vencido: p.vencido, demo: p.demo, cuadran: p.cuadra, con_diferencias: p.no_cuadra, bloqueadas: p.bloqueado, faltan: p.falta })),
    sociedades_que_cuadran: c.sociedades.filter((s) => s.general === "cuadra").map((s) => s.nombre),
    sociedades_con_problema: c.sociedades.filter((s) => s.general !== "cuadra").map((s) => ({ sociedad: s.nombre, estado: ESTADO[s.general as keyof typeof ESTADO]?.etiqueta ?? "Por correr" })),
    diferencias_grandes: c.grandes.slice(0, 12).map((g) => ({ sociedad: g.sociedad, que: g.titulo, causa: g.causa, causa_de: g.origen === "agente" ? "propuesta por el agente, sin confirmar" : "regla del motor" })),
    pendientes_por_responsable: c.responsables.map((r) => ({ responsable: `${r.nombre} (${r.cargo})`, pendientes: r.pendientes.map((p) => ({ que: p.titulo, estado: p.estado })) })),
  };
}

export async function generarReporte(cierreId: string, quien: string) {
  const cifras = await cifrasDelCierre(cierreId);
  const herramienta = {
    name: "lectura_del_cierre",
    description: "La lectura del estado del cierre para el comité directivo.",
    input_schema: {
      type: "object", required: ["titular", "lectura", "para_el_comite"],
      properties: {
        titular: { type: "string", description: "Una frase: cómo va el cierre. Sin cifras de plata ni porcentajes." },
        lectura: { type: "string", description: "Dos o tres frases para la gerente de planeación financiera: qué está listo, qué es lo grande que falta y de quién depende. Sin cifras de plata ni porcentajes." },
        para_el_comite: { type: "array", items: { type: "string" }, description: "Lo que falta para llevar el cierre al comité, ordenado por importancia, cada punto con el responsable. Máximo seis. Sin cifras de plata." },
      },
    },
  };
  const sistema = `Eres el agente del cierre contable del grupo Conconcreto. Escribes la lectura del estado del cierre para el comité directivo, que la lee la gerente de planeación financiera. Voz empresarial, directa, sin adornos. Español neutro con tuteo; nunca voseo.
Usa solo lo que viene en los datos. No escribas montos, ni porcentajes, ni cifras con separador de miles: el reporte los muestra al lado, calculados por el código. Puedes contar sociedades o pendientes. Lo que propuso el agente y nadie ha confirmado es una hipótesis: dilo así. Si un proceso es de demostración, menciónalo.`;
  let lectura: Lectura | null = null;
  for (let i = 0; i < 2 && !lectura; i++) {
    const r = await pedirEstructurado<Lectura>({ sistema: sistema + (i ? "\nTu respuesta anterior traía cifras de plata o porcentajes. Escríbela otra vez sin ninguna." : ""), usuario: JSON.stringify(contextoParaModelo(cifras), null, 1), herramienta });
    if (!traeCifras([r.titular, r.lectura, ...r.para_el_comite].join(" "))) lectura = r;
  }
  const rep = await db.reporte.create({ data: { cierreId, cifras: JSON.parse(JSON.stringify(cifras)) as Prisma.InputJsonValue, lectura: (lectura ?? undefined) as Prisma.InputJsonValue | undefined, generadoPor: quien } });
  await db.evento.create({ data: { cierreId, actor: "persona", tipo: "reporte.generado", descripcion: `${quien} pidió el reporte para el comité.${lectura ? "" : " El agente no logró escribir la lectura sin cifras: el reporte salió solo con los datos."}` } });
  return rep.id;
}

