// El calendario del cierre: qué día hábil es cada fecha. El cierre de un mes corre en el mes siguiente:
// el día hábil 1 del cierre de septiembre es el primer día hábil de octubre.
//
// Días hábiles = lunes a viernes que no son festivos en Colombia. Los festivos se calculan (Ley 51 de 1983,
// «Ley Emiliani»): unos fijos, otros que se corren al lunes, y los que dependen de la Pascua.

const DIA = 86_400_000;
const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
export function pascua(a: number): Date {
  const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3);
  const i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
  const mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
  return utc(a, mes, dia);
}

const alLunes = (d: Date) => { const w = d.getUTCDay(); return w === 1 ? d : new Date(d.getTime() + ((8 - w) % 7) * DIA); };
const mas = (d: Date, n: number) => new Date(d.getTime() + n * DIA);

const cache = new Map<number, Set<string>>();
export function festivos(a: number): Set<string> {
  const c = cache.get(a);
  if (c) return c;
  const p = pascua(a);
  const fijos = [utc(a, 1, 1), utc(a, 5, 1), utc(a, 7, 20), utc(a, 8, 7), utc(a, 12, 8), utc(a, 12, 25), mas(p, -3), mas(p, -2)];
  const lunes = [utc(a, 1, 6), utc(a, 3, 19), utc(a, 6, 29), utc(a, 8, 15), utc(a, 10, 12), utc(a, 11, 1), utc(a, 11, 11), mas(p, 39), mas(p, 60), mas(p, 68)].map(alLunes);
  const s = new Set([...fijos, ...lunes].map(iso));
  cache.set(a, s);
  return s;
}

export function esHabil(d: Date): boolean {
  const w = d.getUTCDay();
  return w !== 0 && w !== 6 && !festivos(d.getUTCFullYear()).has(iso(d));
}

/** La fecha (00:00 UTC) del día hábil n del cierre del periodo AAAA-MM. */
export function fechaDiaHabil(periodo: string, n: number): Date {
  const [a, m] = periodo.split("-").map(Number);
  let d = utc(a, m + 1, 1); // primer día del mes siguiente (Date.UTC corre el año solo)
  let cuenta = 0;
  for (;;) {
    if (esHabil(d)) { cuenta++; if (cuenta === n) return d; }
    d = mas(d, 1);
  }
}

/** Hoy en Bogotá, como fecha a las 00:00 UTC (para comparar con el calendario).
 *  FECHA_REFERENCIA=AAAA-MM-DD fija «hoy» para una demostración (por ejemplo, el día hábil 3 de un cierre pasado).
 *  En operación no se define. */
export function hoyBogota(ahora = new Date()): Date {
  const ref = process.env.FECHA_REFERENCIA;
  if (ref && /^\d{4}-\d{2}-\d{2}$/.test(ref)) return new Date(`${ref}T00:00:00Z`);
  const s = ahora.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return new Date(`${s}T00:00:00Z`);
}

/** Qué día hábil del cierre es `hoy` (0 si todavía no empieza; si ya pasó, el número sigue creciendo). */
export function diaHabilDe(periodo: string, hoy: Date): number {
  const [a, m] = periodo.split("-").map(Number);
  let d = utc(a, m + 1, 1);
  let n = 0;
  while (d.getTime() <= hoy.getTime()) { if (esHabil(d)) n++; d = mas(d, 1); }
  return n;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombrePeriodo = (periodo: string) => { const [a, m] = periodo.split("-").map(Number); return `${MESES[m - 1]} ${a}`; };
export const fechaCorta = (d: Date) => d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
