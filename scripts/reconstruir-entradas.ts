// Reconstruye las ENTRADAS de los motores a partir de lo que entregaron Laura y Felipe, y guarda sus
// RESULTADOS como lo esperado. Todo queda en datos-reales/ (fuera de git: son datos contables reales).
//
//   npx tsx scripts/reconstruir-entradas.ts
//
// Laura entregó sus salidas, no sus entradas (el TXT, el exporte de SAP y la homologación no venían):
//   · el TXT se rearma con la hoja «TXT ultima subcuenta», agregando las cuentas padre de cada rubro (sumadas)
//     para que el motor tenga que encontrar la última subcuenta él solo;
//   · el exporte de SAP sale de la hoja «Comparacion» (las cuentas con nombre, que son las que estaban en SAP),
//     más las dos PF y la fila Total del registro de consola, más filas de otro CEBE para probar el filtro;
//   · la homologación sale de la columna «Cuenta PUC» (39050001001 y 39200001001 homologan a P370505000, como
//     dicen sus notas: SAP usa P370505200 y el motor tiene que hacer el cambio).
// Felipe entregó la base procesada, que trae la hoja «Extracción Original» tal cual salió de SAP. Los maestros
// («Base de información para PyG.xlsx») se rearman desde las columnas de la hoja «Ajuste».
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { valor, texto } from "../src/lib/xlsx";

const RAIZ = path.join(__dirname, "..", "datos-reales");
const SAL = path.join(RAIZ, "entradas");
const ESP = path.join(RAIZ, "esperado");
fs.mkdirSync(path.join(SAL, "laura"), { recursive: true });
fs.mkdirSync(path.join(SAL, "felipe"), { recursive: true });
fs.mkdirSync(ESP, { recursive: true });

const leer = async (f: string) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(f); return wb; };
const rows = (ws: ExcelJS.Worksheet) => { const out: ReturnType<typeof valor>[][] = []; ws.eachRow({ includeEmpty: true }, (r, i) => { const v = r.values as ExcelJS.CellValue[]; out[i - 1] = v.slice(1).map(valor); }); return out; };
const n2 = (x: number) => (x < 0 ? "-" : "") + Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function laura() {
  const base = path.join(RAIZ, "laura-s2", "prueba-castropol-2026.09");
  const wb = await leer(path.join(base, "Conciliacion Contree Castropol 2026.09.xlsx"));
  const txt = rows(wb.getWorksheet("TXT ultima subcuenta")!).slice(1).filter((r) => r && r[0]);
  const comp = rows(wb.getWorksheet("Comparacion")!).slice(1).filter((r) => r && r[0] && r[0] !== "TOTAL");
  const ajuste = rows(wb.getWorksheet("Ajuste")!).slice(1).filter((r) => r && r[0]);

  // ── TXT con sus cuentas padre ────────────────────────────────────────
  type H = { cuenta: string; desc: string; si: number; deb: number; cre: number; sf: number };
  const hojas: H[] = txt.map((r) => ({ cuenta: texto(r[0]), desc: texto(r[1]), si: Number(r[2]), deb: Number(r[3]), cre: Number(r[4]), sf: Number(r[5]) }));
  const padres = new Map<string, H>();
  for (const h of hojas) for (const n of [1, 2, 4, 6, 8]) {
    const k = h.cuenta.slice(0, n);
    const p = padres.get(k) ?? { cuenta: k, desc: `RUBRO ${k}`, si: 0, deb: 0, cre: 0, sf: 0 };
    p.si += h.si; p.deb += h.deb; p.cre += h.cre; p.sf += h.sf;
    padres.set(k, p);
  }
  const todas = [...padres.values(), ...hojas].sort((a, b) => (a.cuenta < b.cuenta ? -1 : 1));
  const lineasTxt = [
    "ALIANZA FIDUCIARIA S.A.",
    "BALANCE DE PRUEBA SIN TERCEROS",
    "FIDEICOMISO CONTREE CASTROPOL",
    "Periodo: 202609",
    ["Cuenta", "Tercero", "Descripcion", "Saldo inicial", "Debitos", "Creditos", "Saldo final"].join("\t"),
    ...todas.map((h) => [h.cuenta, "", h.desc, n2(h.si), n2(h.deb), n2(h.cre), n2(h.sf)].join("\t")),
  ];
  fs.writeFileSync(path.join(SAL, "laura", "297638-FIDEICOMISO CONTREE CASTROPOL Sin terceros.txt"), lineasTxt.join("\r\n"), "utf8");

  // ── Exporte de SAP ───────────────────────────────────────────────────
  const sap = new ExcelJS.Workbook();
  const s = sap.addWorksheet("Sheet1");
  s.addRow(["Centro de beneficio", "Centro de beneficio", "Cuenta de mayor", "Cuenta de mayor", "Saldo período", "Comparación saldo"]);
  for (const r of comp) if (texto(r[1])) s.addRow(["411PA119", "PA CONTREE CASTROPOL", texto(r[0]), texto(r[1]), Number(r[4] ?? 0), Number(r[6] ?? 0)]);
  s.addRow(["411PA119", "PA CONTREE CASTROPOL", "PF21000200", "DB(EFE) PAGOS OBLIGACIONES FINANCIERAS OTRAS", 22460544747, 10202030045]);
  s.addRow(["411PA119", "PA CONTREE CASTROPOL", "PF21000099", "DB(EFE) (PA)CIERRE PRESTMO REALIZ.Y PAG.CAP ARRD F", -22460544747, -10202030045]);
  // otro CEBE (sintético): el motor no lo debe tocar
  s.addRow(["411PA120", "PA OTRO PROYECTO", "P111005000", "(PA)CUENTAS BANCARIAS", 555555, 555555]);
  s.addRow(["411PA120", "PA OTRO PROYECTO", "P130505000", "PA-CLIENTES NACIONALES", 9999999, 9999999]);
  s.addRow(["411PA119", "PA CONTREE CASTROPOL", "Total", "", 0, 0]);
  await sap.xlsx.writeFile(path.join(SAL, "laura", "SAP Septiembre.xlsx"));

  // ── Homologación ─────────────────────────────────────────────────────
  const hom = new ExcelJS.Workbook();
  const hc = hom.addWorksheet("Homologación cuentas");
  hc.addRow(["Código fiducia", "Cuenta PUF", "Descripción PUF", "Cuenta PUC", "Descripción PUC"]);
  for (const r of txt) {
    const puf = texto(r[0]); let puc = texto(r[6]);
    if (puf === "39050001001" || puf === "39200001001") puc = "P370505000";
    if (puc) hc.addRow(["31", puf, texto(r[1]), puc, ""]);
  }
  hc.addRow(["32", "111505", "BANCOS", "P111005000", "(PA)CUENTAS BANCARIAS"]); // otra fiducia: no se debe usar
  const hp = hom.addWorksheet("Proyectos");
  hp.addRow(["CEBE", "Proyecto", "Fiduciaria", "Código fiducia", "Nombre patrimonio"]);
  hp.addRow(["411PA119", "PA Contree Castropol", "Alianza", "31", "FIDEICOMISO CONTREE CASTROPOL"]);
  hp.addRow(["411PA120", "PA Otro proyecto", "Alianza", "31", "FIDEICOMISO OTRO PROYECTO"]);
  await hom.xlsx.writeFile(path.join(SAL, "laura", "Homologación PUF – PUC.xlsx"));

  // ── Lo esperado: su comparación, su ajuste y sus dos journals ────────
  const journal = async (f: string) => {
    const j = await leer(path.join(base, f));
    const ws = j.getWorksheet("Data")!;
    const out: { cuenta: string; debe: number | null; haber: number | null; cebe: string; asociada: string }[] = [];
    for (let r = 12; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const cuenta = texto(valor(row.getCell(17).value));
      if (!cuenta) continue;
      out.push({ cuenta, debe: (valor(row.getCell(19).value) as number) ?? null, haber: (valor(row.getCell(20).value) as number) ?? null, cebe: texto(valor(row.getCell(26).value)), asociada: texto(valor(row.getCell(33).value)) });
    }
    const cab = ws.getRow(12);
    return { lineas: out, cabecera: [2, 3, 6, 7, 8, 9, 12].map((c) => texto(valor(cab.getCell(c).value))) };
  };
  const esperado = {
    comparacion: comp.map((r) => ({ cuenta: texto(r[0]), nombre: texto(r[1]), txt: Number(r[2]), txtRedondeado: Number(r[3]), l1: Number(r[4] ?? 0), dif1: Number(r[5] ?? 0), l2: Number(r[6] ?? 0), dif2: Number(r[7] ?? 0) })),
    ajuste: ajuste.map((r) => ({ libro: texto(r[0]), cuenta: texto(r[1]), debito: (r[3] as number) ?? null, credito: (r[4] as number) ?? null })),
    journal1: await journal("Journal Contree Castropol 2026.09 Libro1.xlsx"),
    journal2: await journal("Journal Contree Castropol 2026.09 Libro2.xlsx"),
  };
  fs.writeFileSync(path.join(ESP, "laura.json"), JSON.stringify(esperado, null, 1));
  console.log(`Laura · TXT ${todas.length} cuentas (${hojas.length} últimas subcuentas) · SAP ${s.rowCount - 1} filas · ${esperado.ajuste.length} líneas de ajuste esperadas`);
}

async function felipe() {
  const wb = await leer(path.join(RAIZ, "felipe-s2", "Base SAP PyG septiembre 2026 V3 - Procesada.xlsx"));
  const orig = wb.getWorksheet("Extracción Original")!;
  const ex = new ExcelJS.Workbook();
  const s = ex.addWorksheet("Sheet1");
  orig.eachRow({ includeEmpty: false }, (r) => { s.addRow((r.values as ExcelJS.CellValue[]).slice(1).map(valor)); });
  await ex.xlsx.writeFile(path.join(SAL, "felipe", "Base SAP PyG septiembre 2026 V3.xlsx"));

  const aj = wb.getWorksheet("Ajuste")!;
  const cebes = new Map<string, unknown[]>(), cuentas = new Map<string, unknown[]>();
  const base: { mes: number; cebe: string; cuenta: string; valor: number; ajustado: number; marca: string }[] = [];
  const nombreSap = new Map<string, string>();
  orig.eachRow({ includeEmpty: false }, (r, i) => { if (i > 1) nombreSap.set(texto(valor(r.getCell(3).value)), texto(valor(r.getCell(4).value))); });
  for (let i = 3; i <= aj.rowCount; i++) {
    const r = aj.getRow(i);
    const v = (c: number) => valor(r.getCell(c).value);
    const cebe = texto(v(9));
    if (!cebe) continue;
    const cuenta = texto(v(17));
    if (!cebes.has(cebe)) cebes.set(cebe, [v(8), cebe, nombreSap.get(cebe) ?? "", v(10), v(11), v(12), v(13), v(14), v(15), v(16)]);
    if (!cuentas.has(cuenta)) cuentas.set(cuenta, [cuenta, typeof v(17) === "number" ? v(17) : cuenta, v(18), v(19), v(20), v(21), v(22)]);
    base.push({ mes: Number(v(23)), cebe, cuenta, valor: Number(v(24)), ajustado: Number(v(25)), marca: texto(v(6)) });
  }
  const m = new ExcelJS.Workbook();
  const hc = m.addWorksheet("Base Centros de Beneficio");
  hc.addRow(["Sociedad", "Centro de beneficio", "Nombre corto", "Nombre largo", "Negocio", "Línea de Negocio", "Sublínea de Negocio", "Estado proyecto vivienda", "Nombre Común Proy Cons", "subDCD"]);
  for (const x of cebes.values()) hc.addRow(x);
  const ht = m.addWorksheet("Base Cuentas");
  ht.addRow(["Cuenta (ESFS)", "Cuenta", "Nombre Cuenta", "Grupo de Cuentas", "Subgrupo de Cuentas", "División Subgrupo de Cuentas", "Costeo"]);
  for (const x of cuentas.values()) ht.addRow(x);
  await m.xlsx.writeFile(path.join(SAL, "felipe", "Base de información para PyG.xlsx"));

  const c = (ref: string) => valor(aj.getCell(ref).value);
  const esperado = {
    filasOriginales: orig.rowCount - 1, filasOptimizado: wb.getWorksheet("Optimizado")!.rowCount - 1,
    utilidadCCP: c("AF14"), utilidadLLC: c("AF13"), factor: c("AF18"), mpCC: c("AF27"), diferencia: c("AF28"),
    porSociedad: [[c("AA3"), c("AB3"), c("AC3")], [c("AA4"), c("AB4"), c("AC4")], [c("AA5"), c("AB5"), c("AC5")]],
    base,
  };
  fs.writeFileSync(path.join(ESP, "felipe.json"), JSON.stringify(esperado));
  console.log(`Felipe · extracción ${orig.rowCount - 1} filas · maestros ${cebes.size} CeBe y ${cuentas.size} cuentas · base esperada ${base.length} filas`);
}

(async () => { await laura(); await felipe(); })();
