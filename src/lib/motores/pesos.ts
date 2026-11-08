// Plata exacta. Los motores trabajan en centavos enteros (Number alcanza: 9 × 10^15 centavos son
// 90 billones de pesos) para que una suma de saldos no arrastre errores de coma flotante.

/** "1,234,567.89" · "1,234.56-" · "-12.5" · 1234.5 → centavos. Acepta el menos al final, como algunos TXT. */
export function aCentavos(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 100);
  let s = v.trim();
  let neg = false;
  if (s.endsWith("-")) { neg = true; s = s.slice(0, -1); }
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  s = s.replace(/,/g, "");
  if (!/^\d*(\.\d+)?$/.test(s)) throw new Error(`No es un número: «${v}»`);
  const [ent, dec = ""] = s.split(".");
  const dos = (dec + "00").slice(0, 2);
  let c = Number(ent || "0") * 100 + Number(dos);
  // más de dos decimales: se redondea al centavo, lejos de cero
  if (dec.length > 2 && Number(dec[2]) >= 5) c += 1;
  return neg ? -c : c;
}

/** Redondeo a pesos, lejos de cero (como [MidpointRounding]::AwayFromZero de PowerShell). Devuelve centavos. */
export function redondearPesos(centavos: number): number {
  const s = Math.sign(centavos);
  return s * Math.floor((Math.abs(centavos) + 50) / 100) * 100;
}

export const pesos = (centavos: number) => centavos / 100;

/** Redondeo a pesos de un valor en pesos con decimales (para resultados de multiplicar por un %). */
export function pesosRedondos(v: number): number {
  const s = Math.sign(v);
  return s * Math.floor(Math.abs(v) + 0.5);
}

export const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
