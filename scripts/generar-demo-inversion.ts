// Genera los datos de DEMOSTRACIÓN de inversión contra patrimonio (Tatiana no entregó archivos).
//
//   npx tsx scripts/generar-demo-inversion.ts   → datos-demo/Inversion_Patrimonio_2026-09.xlsx
//
// Cifras inventadas. Las sociedades son las de la demostración intercompañía (inventadas) más CCC Proyectos,
// con la participación real que usa Felipe (51,485 % de Constructora). Están armadas para que pase lo que
// tiene que verse en el tablero:
//   · CCC Proyectos: el balance trae un resultado del ejercicio mayor que el del PyG de Felipe (un ajuste
//     posterior a la extracción V3), así que el método de participación queda corto y los dos procesos no
//     cuadran entre sí.
//   · Inmobiliaria: el ORI de la subsidiaria no se reconoció en la matriz (diferencia grande).
//   · Prefabricados: una diferencia chica en el patrimonio base (bajo el umbral).
//   · Andes Builders USA: no llegó su balance.
//   · Las demás cuadran.
import path from "node:path";
import ExcelJS from "exceljs";

const TRM = 3912.45;
const r = (x: number) => Math.sign(x) * Math.floor(Math.abs(x) + 0.5);

type S = { codigo: string; nombre: string; moneda: string; pct: number; capital: number; reservas: number; acumulados: number; resultado: number; ori: number; ajuste?: Partial<Record<"resultado" | "ori" | "base", number>>; sinBalance?: boolean };
const SOCIEDADES: S[] = [
  { codigo: "4811", nombre: "CCC Proyectos S.A.S.", moneda: "COP", pct: 0.51485, capital: 18_500_000_000, reservas: 2_310_000_000, acumulados: 6_874_215_330, resultado: 842_579_259, ori: 0,
    // la matriz reconoció el método sobre la utilidad del PyG (790.179.259), no sobre la del balance
    ajuste: { resultado: r(0.51485 * 790_179_259) - 16_557 - r(0.51485 * 842_579_259) } },
  { codigo: "1100", nombre: "Concesión Vial del Norte", moneda: "COP", pct: 0.6, capital: 45_000_000_000, reservas: 4_120_500_000, acumulados: 11_806_442_100, resultado: 3_418_772_400, ori: -215_400_000 },
  { codigo: "1200", nombre: "Inmobiliaria Conconcreto", moneda: "COP", pct: 1, capital: 22_000_000_000, reservas: 1_870_000_000, acumulados: 5_402_113_800, resultado: 1_224_890_150, ori: 85_300_000, ajuste: { ori: -85_300_000 } },
  { codigo: "1300", nombre: "Prefabricados del Valle", moneda: "COP", pct: 0.7, capital: 9_800_000_000, reservas: 640_000_000, acumulados: 2_118_904_500, resultado: 512_336_870, ori: 0, ajuste: { base: -1_240_000 } },
  { codigo: "1400", nombre: "Alquiler de Equipos de Obra", moneda: "COP", pct: 1, capital: 7_250_000_000, reservas: 512_000_000, acumulados: 1_930_448_200, resultado: 688_105_430, ori: 0 },
  { codigo: "2000", nombre: "Constructora Istmo S.A.", moneda: "USD", pct: 1, capital: 4_500_000, reservas: 210_000, acumulados: 1_384_220.4, resultado: 318_640.15, ori: -42_100 },
  { codigo: "3000", nombre: "Andes Builders USA LLC", moneda: "USD", pct: 1, capital: 2_000_000, reservas: 0, acumulados: 412_900, resultado: 96_310, ori: 0, sinBalance: true },
];

(async () => {
  const wb = new ExcelJS.Workbook();
  const p = wb.addWorksheet("Parámetros");
  p.addRow(["Inversión contra patrimonio · DATOS DE DEMOSTRACIÓN", "Cifras inventadas: falta validar el proceso con Tatiana López"]);
  p.addRow(["Fecha de corte", new Date(Date.UTC(2026, 8, 30))]);
  p.addRow(["TRM de cierre (COP por USD)", TRM]);
  p.addRow(["Sociedad inversora", "4810"]);

  const hp = wb.addWorksheet("Patrimonio subsidiarias");
  hp.addRow(["Código", "Sociedad", "Moneda funcional", "Capital y prima", "Reservas", "Resultados acumulados", "Resultado del ejercicio", "Otro resultado integral"]);
  for (const s of SOCIEDADES) if (!s.sinBalance) hp.addRow([s.codigo, s.nombre, s.moneda, s.capital, s.reservas, s.acumulados, s.resultado, s.ori]);

  const hi = wb.addWorksheet("Inversiones matriz");
  hi.addRow(["Código", "Subsidiaria", "% participación", "Saldo de la inversión (COP)", "MP del ejercicio registrado (COP)", "MP ORI registrado (COP)"]);
  for (const s of SOCIEDADES) {
    const k = s.moneda === "USD" ? TRM : 1;
    const mpRes = r(s.pct * s.resultado * k) + (s.ajuste?.resultado ?? 0);
    const mpOri = r(s.pct * s.ori * k) + (s.ajuste?.ori ?? 0);
    const base = r(s.pct * (s.capital + s.reservas + s.acumulados) * k) + (s.ajuste?.base ?? 0);
    hi.addRow([s.codigo, s.nombre, s.pct, base + mpRes + mpOri, mpRes, mpOri]);
  }
  for (const ws of wb.worksheets) { ws.getRow(1).font = { bold: true }; ws.columns.forEach((c) => (c.width = 24)); }
  const f = path.join(__dirname, "..", "datos-demo", "Inversion_Patrimonio_2026-09.xlsx");
  await wb.xlsx.writeFile(f);
  console.log("→", f);
})();
