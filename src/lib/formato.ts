// Formato de cifras y fechas. Todo en es-CO.

/** Pesos en millones, como se habla en una constructora: "$1.290 millones", "$12.435 millones". */
export function cop(valor: bigint | number | null | undefined): string {
  if (valor === null || valor === undefined) return "Sin valor";
  const n = typeof valor === "bigint" ? Number(valor) : valor;
  if (Math.abs(n) >= 1_000_000_000_000) {
    return `$${(n / 1_000_000_000_000).toLocaleString("es-CO", { maximumFractionDigits: 2 })} billones`;
  }
  if (Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m.toLocaleString("es-CO", { maximumFractionDigits: m >= 100 ? 0 : 1 })} millones`;
  }
  return `$${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

/** Cifra corta para tableros: "1.290 M". */
export function copCorto(valor: bigint | number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  const n = typeof valor === "bigint" ? Number(valor) : valor;
  if (Math.abs(n) >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} B`;
  return `${Math.round(n / 1_000_000).toLocaleString("es-CO")} M`;
}

const DIA = 86_400_000;

export function fecha(d: Date | string | null | undefined): string {
  if (!d) return "Sin fecha";
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });
}

export function fechaHora(d: Date | string | null | undefined): string {
  if (!d) return "Sin fecha";
  return new Date(d).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });
}

/** Días que faltan hasta una fecha (negativo si ya pasó). */
export function diasHasta(d: Date | string | null | undefined, ahora = new Date()): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - ahora.getTime()) / DIA);
}

export function haceCuanto(d: Date | string, ahora = new Date()): string {
  const ms = ahora.getTime() - new Date(d).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 30) return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
  return fecha(d);
}

/** "cierra en 3 días", "cierra hoy", "cerró hace 2 días". */
export function cierre(d: Date | string | null | undefined): string {
  const n = diasHasta(d);
  if (n === null) return "Sin fecha de cierre";
  if (n < 0) return `Cerró hace ${-n} ${-n === 1 ? "día" : "días"}`;
  if (n === 0) return "Cierra hoy";
  if (n === 1) return "Cierra mañana";
  return `Cierra en ${n} días`;
}
