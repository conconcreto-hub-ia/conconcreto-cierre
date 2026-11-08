// Deja el cierre de septiembre de 2026 como estaría el día hábil 3: Felipe corrió la base del PyG, Laura
// concilió Contree Castropol (le faltan los otros cinco patrimonios), corrió la intercompañía y Tatiana su
// conciliación de inversiones (demostración). Después el agente busca lo que venció y no está.
//
//   npx tsx scripts/escenario.ts            limpia el cierre de septiembre y lo vuelve a cargar
//
// Usa los datos reales de datos-reales/entradas (fuera de git; si no están, corre primero
// scripts/reconstruir-entradas.ts) y los de demostración de datos-demo/. No manda correos.
import "./_env";
import fs from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { correrFiducia, correrIntercompania, correrInversion, correrPyg } from "../src/lib/ejecutar";
import { detectarFaltantes } from "../src/lib/agente";
import { fechaDiaHabil } from "../src/lib/calendario";

const R = path.join(__dirname, "..", "datos-reales", "entradas"), D = path.join(__dirname, "..", "datos-demo");
const leer = (...p: string[]) => ({ nombre: path.basename(p[p.length - 1]), contenido: fs.readFileSync(path.join(...p)) });
const QUIEN = "Carga del escenario";

export async function limpiarCierre(cierreId: string) {
  await db.pendiente.deleteMany({ where: { cierreId } });
  await db.cruce.deleteMany({ where: { cierreId } });
  await db.reporte.deleteMany({ where: { cierreId } });
  await db.evento.deleteMany({ where: { cierreId } });
  await db.resultado.deleteMany({ where: { cierreId } });
  await db.ejecucion.deleteMany({ where: { cierreId } });
  await db.correo.deleteMany({});
}

export async function cargarEscenario() {
  const cierre = await db.cierre.findUniqueOrThrow({ where: { periodo: "2026-09" } });
  await limpiarCierre(cierre.id);
  await db.cierre.update({ where: { id: cierre.id }, data: { avisosAutomaticos: false, avisosAprobadosPor: null, avisosAprobadosEn: null } });
  const reales = fs.existsSync(path.join(R, "laura")) && fs.existsSync(path.join(R, "felipe"));
  const t = Date.now();
  if (reales) {
    await correrPyg({ cierreId: cierre.id, extraccion: leer(R, "felipe", "Base SAP PyG septiembre 2026 V3.xlsx"), maestros: leer(R, "felipe", "Base de información para PyG.xlsx"), pctLLC: 0.48515, quien: QUIEN });
    console.log(`  base del PyG · ${Date.now() - t} ms`);
  }
  await correrIntercompania({ cierreId: cierre.id, auxiliares: leer(D, "Auxiliares_Intercompania_2026-09.xlsx"), quien: QUIEN });
  console.log(`  intercompañía · ${Date.now() - t} ms`);
  if (reales) {
    const pa = await db.sociedad.findUniqueOrThrow({ where: { codigo: "4812-411PA119" } });
    await correrFiducia({ cierreId: cierre.id, sociedadId: pa.id, txt: leer(R, "laura", "297638-FIDEICOMISO CONTREE CASTROPOL Sin terceros.txt"), sap: leer(R, "laura", "SAP Septiembre.xlsx"), homologacion: leer(R, "laura", "Homologación PUF – PUC.xlsx"), quien: QUIEN });
    console.log(`  Contree Castropol · ${Date.now() - t} ms`);
  }
  await correrInversion({ cierreId: cierre.id, archivo: leer(D, "Inversion_Patrimonio_2026-09.xlsx"), quien: QUIEN });
  console.log(`  inversiones (demostración) · ${Date.now() - t} ms`);
  const f = await detectarFaltantes(cierre.id, fechaDiaHabil("2026-09", 3));
  console.log(`  el agente encontró ${f.creados} cosas que vencieron y no están`);
  return { cierreId: cierre.id, reales };
}

if (require.main === module) {
  cargarEscenario().then((r) => console.log(r.reales ? "Listo." : "Listo, sin los datos reales de Laura y Felipe (no están en datos-reales/)."))
    .catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
}
