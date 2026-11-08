// Cruces entre procesos: dos procesos que dicen cosas distintas de la misma sociedad.
//
// Cada resultado publica sus «salidas» ({ clave, etiqueta, valor }): la utilidad del ejercicio de una
// sociedad según el PyG, la misma según el balance que usó Tatiana, el método de participación reconocido…
// Si dos procesos publican la misma clave para la misma sociedad y no coinciden, hay un cruce.
// La diferencia la calcula esta función. La causa la propone el modelo después (src/lib/agente.ts).

export type Salida = { clave: string; etiqueta: string; valor: number };
export type ResultadoConSalidas = { resultadoId: string; proceso: string; sociedadId: string; salidas: Salida[] };
export type CruceCalculado = {
  sociedadId: string; clave: string; etiqueta: string;
  procesoA: string; valorA: number; resultadoA: string;
  procesoB: string; valorB: number; resultadoB: string;
  diferencia: number; // A − B
};

export const TOLERANCIA_CRUCE = 1; // un peso

/** Compara todas las parejas de procesos distintos que publican la misma salida para la misma sociedad.
 *  El orden A/B es estable (por clave de proceso) para que el mismo par no salga dos veces. */
export function calcularCruces(resultados: ResultadoConSalidas[]): CruceCalculado[] {
  const grupos = new Map<string, { r: ResultadoConSalidas; s: Salida }[]>();
  for (const r of resultados) for (const s of r.salidas) {
    const k = `${r.sociedadId}|${s.clave}`;
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push({ r, s });
  }
  const out: CruceCalculado[] = [];
  for (const lista of grupos.values()) {
    const orden = [...lista].sort((x, y) => (x.r.proceso < y.r.proceso ? -1 : x.r.proceso > y.r.proceso ? 1 : 0));
    for (let i = 0; i < orden.length; i++) for (let j = i + 1; j < orden.length; j++) {
      const a = orden[i], b = orden[j];
      if (a.r.proceso === b.r.proceso) continue;
      const diferencia = Math.round(a.s.valor) - Math.round(b.s.valor);
      if (Math.abs(diferencia) <= TOLERANCIA_CRUCE) continue;
      out.push({ sociedadId: a.r.sociedadId, clave: a.s.clave, etiqueta: a.s.etiqueta, procesoA: a.r.proceso, valorA: Math.round(a.s.valor), resultadoA: a.r.resultadoId,
        procesoB: b.r.proceso, valorB: Math.round(b.s.valor), resultadoB: b.r.resultadoId, diferencia });
    }
  }
  return out;
}

/** El modelo explica; no pone cifras. Si un texto trae plata, porcentajes o números con separador de miles,
 *  se rechaza: las cifras que lee una persona las calcula el código y se muestran al lado. */
export function traeCifras(texto: string): boolean {
  return /\$\s?\d|\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?\s*(?:%|por ciento|millones|millón|mil\b|pesos|billones|usd|cop)/i.test(texto);
}
