// Los archivos de la conciliación de fiduciaria: leer el exporte de SAP y la homologación, y escribir el
// libro de conciliación y los dos journals con la plantilla de carga de SAP (hoja «Data», datos desde la fila 12).
import ExcelJS from "exceljs";
import { abrir, filas, hoja, normal, texto, aBuffer, type Valor } from "../xlsx";
import { aCentavos } from "./pesos";
import plantilla from "./plantilla-journal.json";
import { SOCIEDAD_PA, SOCIEDAD_ASOCIADA, type FilaSap, type Homologacion, type ProyectoFiducia, type ResultadoFiducia, type Libro } from "./fiducia";

const num = (v: Valor) => (typeof v === "number" ? Math.round(v * 100) : aCentavos(texto(v) || "0"));

/** Encuentra la fila de encabezados y la columna de cada nombre (la primera vez que aparece, o la n-ésima). */
function columnas(rows: Valor[][], buscados: Record<string, { nombres: string[]; vez?: number; defecto: number }>) {
  const idx = rows.findIndex((r) => r.filter((c) => typeof c === "string").length >= 3 && Object.values(buscados).some((b) => r.some((c) => b.nombres.includes(normal(texto(c))))));
  const enc = idx >= 0 ? rows[idx].map((c) => normal(texto(c))) : [];
  const col: Record<string, number> = {};
  for (const [k, b] of Object.entries(buscados)) {
    const pos = enc.map((c, i) => (b.nombres.includes(c) ? i : -1)).filter((i) => i >= 0);
    col[k] = pos[(b.vez ?? 1) - 1] ?? b.defecto;
  }
  return { desde: idx + 1, col };
}

/** Exporte de SAP: Centro de beneficio, Cuenta de mayor, nombre, Saldo período (Libro 1), Comparación saldo (Libro 2). */
export async function leerSap(contenido: Buffer): Promise<FilaSap[]> {
  const wb = await abrir(contenido);
  const ws = wb.worksheets[0];
  const rows = filas(ws);
  const { desde, col } = columnas(rows, {
    cebe: { nombres: ["centro de beneficio"], defecto: 0 },
    cuenta: { nombres: ["cuenta de mayor"], defecto: 2 },
    nombre: { nombres: ["cuenta de mayor"], vez: 2, defecto: 3 },
    l1: { nombres: ["saldo periodo", "saldo del periodo"], defecto: 4 },
    l2: { nombres: ["comparacion saldo", "saldo comparacion"], defecto: 5 },
  });
  return rows.slice(desde).filter((r) => texto(r[col.cuenta])).map((r) => ({
    cebe: texto(r[col.cebe]), cuenta: texto(r[col.cuenta]), nombre: texto(r[col.nombre]), l1: num(r[col.l1]), l2: num(r[col.l2]),
  }));
}

/** Homologación PUF – PUC: hojas «Homologación cuentas» (fiducia, PUF, descripción, PUC) y «Proyectos» (CEBE, …, fiducia, nombre). */
export async function leerHomologacion(contenido: Buffer): Promise<{ homologacion: Homologacion[]; proyectos: ProyectoFiducia[] }> {
  const wb = await abrir(contenido);
  const hc = hoja(wb, "Homologación cuentas", "Homologacion cuentas");
  const hp = hoja(wb, "Proyectos");
  if (!hc) throw new Error("La homologación no tiene la hoja «Homologación cuentas».");
  const rc = filas(hc);
  const a = columnas(rc, {
    fiducia: { nombres: ["codigo fiducia", "fiducia", "cod fiducia"], defecto: 0 },
    puf: { nombres: ["cuenta puf", "puf"], defecto: 1 },
    puc: { nombres: ["cuenta puc", "puc"], defecto: 3 },
  });
  const homologacion = rc.slice(a.desde).filter((r) => texto(r[a.col.puf])).map((r) => ({ fiducia: texto(r[a.col.fiducia]), puf: texto(r[a.col.puf]), puc: texto(r[a.col.puc]) }));
  const proyectos: ProyectoFiducia[] = [];
  if (hp) {
    const rp = filas(hp);
    const b = columnas(rp, {
      cebe: { nombres: ["cebe", "centro de beneficio"], defecto: 0 },
      fiducia: { nombres: ["codigo fiducia", "fiducia", "cod fiducia"], defecto: 3 },
      nombre: { nombres: ["nombre patrimonio", "patrimonio", "nombre"], defecto: 4 },
    });
    for (const r of rp.slice(b.desde)) if (texto(r[b.col.nombre])) proyectos.push({ cebe: texto(r[b.col.cebe]), fiducia: texto(r[b.col.fiducia]), nombre: texto(r[b.col.nombre]) });
  }
  return { homologacion, proyectos };
}

/* ── Salidas ────────────────────────────────────────────────────────── */

const p = (c: number) => c / 100;

/** El libro de conciliación: hojas TXT ultima subcuenta, Comparacion, Ajuste y Notas (como genera.ps1). */
export async function libroConciliacion(r: ResultadoFiducia, proyecto: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const negrita = (ws: ExcelJS.Worksheet) => { ws.getRow(1).font = { bold: true }; };

  const t = wb.addWorksheet("TXT ultima subcuenta");
  t.addRow(["Cuenta PUF", "Descripcion", "Saldo inicial", "Debito", "Credito", "Saldo final", "Cuenta PUC", "Estado"]);
  for (const d of r.detalle) t.addRow([d.cuenta, d.descripcion, p(d.si), p(d.deb), p(d.cre), p(d.sf), d.puc ?? "", d.estado]);
  ["C", "D", "E", "F"].forEach((c) => (t.getColumn(c).numFmt = "#,##0.00"));
  negrita(t);

  const c = wb.addWorksheet("Comparacion");
  c.addRow(["Cuenta PUC", "Nombre", "TXT", "TXT redondeado", "SAP Libro 1 (Saldo periodo)", "Diferencia Libro 1", "SAP Libro 2 (Comparacion saldo)", "Diferencia Libro 2"]);
  r.comparacion.forEach((x, i) => {
    const f = i + 2;
    c.addRow([x.cuenta, x.nombre, p(x.txt), p(x.txtRedondeado), p(x.l1), { formula: `D${f}-E${f}`, result: p(x.dif1) }, p(x.l2), { formula: `D${f}-G${f}`, result: p(x.dif2) }]);
  });
  const n = r.comparacion.length + 1;
  const tot = c.addRow(["TOTAL"]);
  ["C", "D", "E", "F", "G", "H"].forEach((col, j) => {
    const campo = (["txt", "txtRedondeado", "l1", "dif1", "l2", "dif2"] as const)[j];
    tot.getCell(col).value = { formula: `SUM(${col}2:${col}${n})`, result: p(r.comparacion.reduce((a, x) => a + x[campo], 0)) };
  });
  tot.font = { bold: true };
  ["C", "D", "E", "F", "G", "H"].forEach((col) => (c.getColumn(col).numFmt = "#,##0"));
  negrita(c);

  const a = wb.addWorksheet("Ajuste");
  a.addRow(["Libro", "Cuenta", "Nombre", "Debito", "Credito", "Centro de beneficio"]);
  if (r.libros) for (const [nombre, l] of [["Libro 1", r.libros.L1], ["Libro 2", r.libros.L2]] as const) {
    for (const x of l.lineas) a.addRow([nombre, x.cuenta, x.nombre, x.valor > 0 ? p(x.valor) : null, x.valor < 0 ? p(-x.valor) : null, r.cebe]);
  }
  ["D", "E"].forEach((col) => (a.getColumn(col).numFmt = "#,##0"));
  negrita(a);

  const no = wb.addWorksheet("Notas");
  [
    `Proyecto: ${proyecto} | CEBE ${r.cebe} | Periodo ${r.periodo}`,
    "Diferencia = Saldo final TXT (redondeado a pesos) - Saldo SAP. Positiva = debito, negativa = credito (valor absoluto).",
    "Excluidas: cuentas PUF 59 en adelante y 3915/3920 (resultado del ejercicio; ya esta en cuentas 4 y 5).",
    "SAP: se excluyen cuentas PF (flujo de efectivo).",
    "Si la homologacion da P370505000 y SAP usa P370505200 para el CEBE, se toma P370505200.",
    "Descuadre por redondeo llevado a P429581000 (ajuste al peso).",
    ...r.marcadas.map((m) => `Para revisar: ${m.cuenta} ${m.nombre} · ${m.motivo}.`),
    ...r.observaciones,
    "Generado por el tablero del cierre (Conconcreto). No se cargó nada en SAP.",
  ].forEach((x) => no.addRow([x]));
  negrita(no);
  for (const ws of wb.worksheets) ws.columns.forEach((col) => (col.width = 18));
  return aBuffer(wb);
}

/** Un journal listo para la carga de SAP. Una persona lo carga: la app no toca SAP. */
export async function journal(r: ResultadoFiducia, libro: Libro): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(plantilla.hoja);
  for (const [fila, col, v] of plantilla.celdas as [number, number, string | number][]) ws.getCell(fila, col).value = v;
  ws.getRow(10).font = { bold: true };
  const [a, m] = r.periodo.split(".");
  const fecha = new Date(`${r.fecha}T00:00:00Z`);
  let fila = 12;
  for (const l of libro.lineas) {
    const row = ws.getRow(fila);
    if (fila === 12) {
      row.getCell(1).value = 1;
      row.getCell(2).value = Number(SOCIEDAD_PA);
      row.getCell(3).value = "BF";
      row.getCell(4).value = fecha;
      row.getCell(5).value = fecha;
      row.getCell(6).value = Number(m);
      row.getCell(7).value = `AJ CONCIL ${m}.${a}`;
      row.getCell(8).value = "COP";
      row.getCell(9).value = libro.ledger || null;
      row.getCell(12).value = "CONCILIACION";
      if (!libro.ledger) row.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      row.getCell(4).numFmt = "dd/mm/yyyy";
      row.getCell(5).numFmt = "dd/mm/yyyy";
    }
    row.getCell(16).value = Number(SOCIEDAD_PA);
    row.getCell(17).value = l.cuenta;
    row.getCell(18).value = `AJUSTE CONCILIACION TXT VS SAP ${r.periodo}`;
    if (l.valor > 0) row.getCell(19).value = p(l.valor);
    else row.getCell(20).value = p(-l.valor);
    row.getCell(26).value = r.cebe;
    if (/0002$/.test(l.cuenta)) row.getCell(33).value = Number(SOCIEDAD_ASOCIADA);
    fila++;
  }
  ws.getColumn(19).numFmt = "#,##0";
  ws.getColumn(20).numFmt = "#,##0";
  return aBuffer(wb);
}
