// El archivo «… - Procesada.xlsx» de la base del PyG: hojas Extracción Original, Optimizado y Ajuste,
// como el de Felipe. Se escribe en flujo (son ~90 mil filas entre las tres hojas).
import ExcelJS from "exceljs";
import { PassThrough } from "node:stream";
import type { Valor } from "../xlsx";
import { CEBE_CC, CEBE_LLC, G660, type ResultadoPyg } from "./pyg";

const GRIS = "FFD0D0D0", VERDE = "FFDAF2D0", DURAZNO = "FFFBE2D5";

export async function basePygXlsx(r: ResultadoPyg, extraccion: Valor[][]): Promise<Buffer> {
  const salida = new PassThrough();
  const partes: Buffer[] = [];
  salida.on("data", (c: Buffer) => partes.push(c));
  const listo = new Promise<void>((ok, mal) => { salida.on("end", ok); salida.on("error", mal); });
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: salida, useStyles: true });

  // Extracción Original: tal cual salió de SAP
  const o = wb.addWorksheet("Extracción Original", { views: [{ showGridLines: false }] });
  for (const f of extraccion) o.addRow(f).commit();
  o.commit();

  // Optimizado
  const p = wb.addWorksheet("Optimizado", { views: [{ showGridLines: false }] });
  p.columns = [{ width: 14 }, { width: 44 }, { width: 16 }, { width: 36 }, { width: 12 }, { width: 22, style: { numFmt: "#,##0" } }];
  const ep = p.addRow(["Cuenta de mayor", "Nombre Cuenta de mayor", "Centro de beneficio", "Nombre Centro de beneficio", "Mes del año", "Importe actual en moneda sociedad"]);
  ep.font = { bold: true };
  ep.commit();
  p.autoFilter = `A1:F${r.optimizado.length + 1}`;
  for (const f of r.optimizado) p.addRow(f).commit();
  p.commit();

  // Ajuste: la base en F:Y y, a la derecha, los cálculos de control
  const a = wb.addWorksheet("Ajuste", { views: [{ showGridLines: false }] });
  a.columns = Array.from({ length: 32 }, (_, i) => ({ width: i < 4 ? 14 : i === 4 ? 3 : i >= 26 ? 30 : 16 }));
  const ult = r.base.length + 2;
  const filasCalc = calculos(r);
  const enc = ["Mes del año", "Centro de beneficio", "Cuenta de mayor", "Suma de Importe actual en moneda sociedad", null,
    "Ajuste", "Tipo", "Sociedad", "Centro de beneficio", "Nombre CeBe", "Negocio", "Línea de Negocio", "Sublínea de Negocio", "Estado proyecto vivienda", "Nombre Común Proy Cons", "subDCD",
    "Cuenta", "Nombre Cuenta", "Grupo de Cuentas", "Subgrupo de Cuentas", "División Subgrupo de Cuentas", "Costeo", "Mes", "Valor", "Valor ajustado"];
  const r1 = a.addRow(["Base SAP PyG · las tablas de control (columnas AA:AF) las calculó el tablero del cierre; los valores ajustados son fórmulas."]);
  r1.font = { italic: true, color: { argb: "FF1F4E79" } };
  r1.commit();
  const r2 = a.addRow(enc);
  r2.font = { bold: true };
  for (let c = 6; c <= 25; c++) r2.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: c === 8 || (c >= 10 && c <= 16) ? VERDE : c >= 18 && c <= 22 ? DURAZNO : GRIS } };
  calc(r2, filasCalc[2]);
  r2.commit();
  a.autoFilter = `F2:Y${ult}`;
  r.base.forEach((b, i) => {
    const f = i + 3;
    const ajustado = b.regla === "menos" ? { formula: `-X${f}`, result: b.ajustado }
      : b.regla === "factor" ? { formula: `-X${f}*$AF$18`, result: b.ajustado }
      : b.regla === "diferencia" ? { formula: "$AF$28", result: b.ajustado } : 0;
    const row = a.addRow([b.mes, b.cebe, b.cuenta, b.valor, null,
      b.ajuste, b.tipo, b.sociedad, b.cebe, b.cebeM.nombreLargo, b.cebeM.negocio, b.cebeM.linea, b.cebeM.sublinea, b.cebeM.estado, b.cebeM.nombreComun, b.cebeM.subdcd,
      b.cuenta, b.cuentaM.nombre, b.cuentaM.grupo, b.cuentaM.subgrupo, b.cuentaM.division, b.cuentaM.costeo, b.mes, b.valor, ajustado]);
    row.font = { name: "Calibri", size: 10 };
    row.getCell(4).numFmt = '#,##0 "COP"';
    row.getCell(24).numFmt = "#,##0";
    row.getCell(25).numFmt = "#,##0";
    calc(row, filasCalc[f]);
    row.commit();
  });
  // Si la base es más corta que el bloque de cálculos, se terminan de escribir.
  for (let f = ult + 1; f <= 45; f++) { const row = a.addRow([]); calc(row, filasCalc[f]); row.commit(); }
  a.commit();
  await wb.commit();
  await listo;
  return Buffer.concat(partes);
}

type Celda = { c: number; v: ExcelJS.CellValue; fmt?: string; bold?: boolean };

function calc(row: ExcelJS.Row, celdas: Celda[] | undefined) {
  for (const x of celdas ?? []) {
    const cell = row.getCell(x.c);
    cell.value = x.v;
    if (x.fmt) cell.numFmt = x.fmt;
    if (x.bold) cell.font = { bold: true };
  }
}

/** Las tablas de control y los cálculos de 6A, 6B y el check, en las mismas celdas que el archivo de Felipe. */
function calculos(r: ResultadoPyg): Record<number, Celda[]> {
  const AA = 27, AB = 28, AC = 29, AE = 31, AF = 32;
  const out: Record<number, Celda[]> = {};
  const put = (f: number, c: number, v: ExcelJS.CellValue, fmt?: string, bold?: boolean) => (out[f] ??= []).push({ c, v, fmt, bold });
  put(2, AA, "Etiquetas de fila", undefined, true); put(2, AB, "Suma de Valor", undefined, true); put(2, AC, "Suma de Valor Ajustado", undefined, true);
  let f = 3;
  for (const s of r.porSociedad) { put(f, AA, s.sociedad); put(f, AB, s.valor, "#,##0"); put(f, AC, s.ajustado, "#,##0"); f++; }
  const total = r.porSociedad.reduce((a, s) => ({ v: a.v + s.valor, j: a.j + s.ajustado }), { v: 0, j: 0 });
  put(f, AA, "Total general", undefined, true); put(f, AB, total.v, "#,##0"); put(f, AC, total.j, "#,##0");
  put(f + 1, AA, "Check: Suma de Valor de 01 - Constructora Conconcreto debe ser igual a Suma de Valor Ajustado de ambas sociedades (invertido)");
  put(f + 2, AB, "Check", undefined, true); put(f + 2, AC, r.check, "#,##0", true);

  const pct = "0.000%";
  put(11, AE, `Ajuste CC Proyectos en CC LLC (CeBe ${CEBE_LLC}, grupo ${G660})`, undefined, true);
  put(13, AE, "Utilidad CC LLC"); put(13, AF, r.utilidadLLC, "#,##0");
  put(14, AE, "Utilidad CC Proyectos (según sociedad 4811 en SAP)"); put(14, AF, r.utilidadCCP, "#,##0");
  put(15, AE, "% participación de CC LLC en CC Proyectos"); put(15, AF, r.pctLLC, pct);
  put(16, AE, "$ participación de CC LLC en CC Proyectos"); put(16, AF, { formula: "AF15*AF14", result: r.participacionLLC }, "#,##0");
  put(17, AE, "Utilidad CC LLC sin CC Proyectos"); put(17, AF, { formula: "AF13-AF16", result: r.utilidadLLCsinCCP }, "#,##0");
  put(18, AE, "Factor para método de CC LLC", undefined, true); put(18, AF, { formula: "AF17/AF13", result: r.factor }, "0.0000", true);
  put(23, AE, `Ajuste CC Proyectos en Constructora Conconcreto (CeBe ${CEBE_CC})`, undefined, true);
  put(24, AE, "Utilidad CC Proyectos (según sociedad 4811 en SAP)"); put(24, AF, r.utilidadCCP, "#,##0");
  put(25, AE, "% participación de CC en CC Proyectos"); put(25, AF, { formula: "1-AF15", result: r.pctCC }, pct);
  put(26, AE, "$ participación de CC en CC Proyectos (según cálculo)"); put(26, AF, { formula: "AF25*AF24", result: r.mpCalculo }, "#,##0");
  put(27, AE, "$ participación de CC en CC Proyectos (según método de participación)"); put(27, AF, r.mpMetodo, "#,##0");
  put(28, AE, "Diferencia", undefined, true); put(28, AF, { formula: "AF27-AF26", result: r.diferencia }, "#,##0", true);
  put(29, AE, `En un principio, el valor ajustado del método de participación del CeBe ${CEBE_CC} es igual a 0. La diferencia va a la última línea para que cuadre el ajuste.`);
  return out;
}
