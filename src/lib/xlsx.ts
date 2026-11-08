// Leer y escribir Excel con exceljs. Una sola forma de sacar el valor de una celda.
import ExcelJS from "exceljs";

export type Valor = string | number | boolean | Date | null;

/** El valor de una celda tal como lo vería una persona: el resultado de la fórmula, el texto enriquecido unido. */
export function valor(v: ExcelJS.CellValue): Valor {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("formula" in v || "sharedFormula" in v) {
      const r = (v as { result?: unknown }).result;
      if (r === undefined || r === null || typeof r === "object") return r instanceof Date ? r : null;
      return r as Valor;
    }
    if ("text" in v) return String((v as { text: unknown }).text);
    if ("error" in v) return null;
  }
  return null;
}

export async function abrir(contenido: Buffer | ArrayBuffer | Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const buf = Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido as ArrayBuffer);
  // exceljs tipa load con su propio Buffer; el de Node sirve.
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb;
}

/** Las filas de una hoja como arreglos, desde la columna A (índice 0). Incluye la fila 1. */
export function filas(ws: ExcelJS.Worksheet): Valor[][] {
  const out: Valor[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = row.values as ExcelJS.CellValue[];
    const f: Valor[] = [];
    for (let i = 1; i < vals.length; i++) f.push(valor(vals[i]));
    out.push(f);
  });
  return out;
}

export const texto = (v: Valor | undefined): string => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)).trim();

export const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Busca una hoja por nombre, sin importar tildes ni mayúsculas. */
export function hoja(wb: ExcelJS.Workbook, ...nombres: string[]): ExcelJS.Worksheet | undefined {
  const buscados = nombres.map(normal);
  return wb.worksheets.find((w) => buscados.includes(normal(w.name))) ?? wb.worksheets.find((w) => buscados.some((b) => normal(w.name).startsWith(b)));
}

export async function aBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer());
}
