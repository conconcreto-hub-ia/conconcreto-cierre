// Siembra el tablero: sociedades, responsables, procesos con su día hábil, qué sociedades cubre cada uno y el
// cierre de septiembre de 2026. Idempotente: se puede correr de nuevo sin duplicar.
//
//   npx tsx scripts/sembrar.ts [--correo prueba-jhon-cc@agentmail.to]
//
// --correo: a dónde le escribe el agente a TODOS los responsables. En pruebas es el buzón de pruebas; con
// las direcciones reales, los avisos quedan en borrador mientras ENVIO_DOMINIOS_PERMITIDOS sea agentmail.to.
import "./_env";
import { db } from "../src/lib/db";
import type { ClaveProceso } from "@prisma/client";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const CORREO = arg("correo") ?? "prueba-jhon-cc@agentmail.to";

const SOCIEDADES = [
  { codigo: "4810", nombre: "Constructora Conconcreto S.A.", tipo: "matriz", alias: ["01", "1000"], orden: 1 },
  { codigo: "4811", nombre: "CCC Proyectos S.A.S.", tipo: "filial", alias: ["77"], orden: 2 },
  // Las de la demostración intercompañía (sociedades y cifras inventadas)
  { codigo: "1100", nombre: "Concesión Vial del Norte S.A.S.", tipo: "filial", alias: [], demo: true, orden: 10 },
  { codigo: "1200", nombre: "Inmobiliaria Conconcreto Inversiones S.A.S.", tipo: "filial", alias: [], demo: true, orden: 11 },
  { codigo: "1300", nombre: "Prefabricados del Valle de Aburrá S.A.S.", tipo: "filial", alias: [], demo: true, orden: 12 },
  { codigo: "1400", nombre: "Alquiler de Equipos de Obra S.A.S.", tipo: "filial", alias: [], demo: true, orden: 13 },
  { codigo: "2000", nombre: "Constructora Istmo S.A.", tipo: "filial", alias: [], demo: true, orden: 14 },
  { codigo: "3000", nombre: "Andes Builders USA LLC", tipo: "filial", alias: [], demo: true, orden: 15 },
  // Los patrimonios autónomos de Laura (sociedad 4812). El CEBE de los demás sale de la hoja Proyectos.
  { codigo: "4812-411PA119", nombre: "PA Contree Castropol", tipo: "patrimonio", alias: [], cebe: "411PA119", fiducia: "31", orden: 20 },
  { codigo: "4812-BAENA", nombre: "PA Nuevo Poblado Baena", tipo: "patrimonio", alias: [], orden: 21 },
  { codigo: "4812-TREEBAL", nombre: "PA Treebal", tipo: "patrimonio", alias: [], orden: 22 },
  { codigo: "4812-PORTOROSSO", nombre: "PA Porto Rosso", tipo: "patrimonio", alias: [], orden: 23 },
  { codigo: "4812-MONTEBIANCO", nombre: "PA Montebianco", tipo: "patrimonio", alias: [], orden: 24 },
  { codigo: "4812-RENTAVIVIENDA", nombre: "PA Renta Vivienda", tipo: "patrimonio", alias: [], orden: 25 },
];

const RESPONSABLES = [
  { clave: "laura", nombre: "Laura Bedoya", cargo: "Contadora Senior" },
  { clave: "felipe", nombre: "Felipe Correa", cargo: "Analista Financiero" },
  { clave: "tatiana", nombre: "Tatiana López", cargo: "Contadora Senior" },
  // Intercompañía: por cargo, como en la hoja Parámetros de los auxiliares
  { clave: "1000", nombre: "Contador(a) senior · Matriz", cargo: "Contador(a) senior · Matriz" },
  { clave: "1100", nombre: "Analista contable · Concesiones", cargo: "Analista contable · Concesiones" },
  { clave: "1200", nombre: "Contador(a) · Inmobiliaria", cargo: "Contador(a) · Inmobiliaria" },
  { clave: "1300", nombre: "Contador(a) · Prefabricados", cargo: "Contador(a) · Prefabricados" },
  { clave: "1400", nombre: "Auxiliar contable · Equipos", cargo: "Auxiliar contable · Equipos" },
  { clave: "2000", nombre: "Contador(a) · Filial Panamá", cargo: "Contador(a) · Filial Panamá" },
  { clave: "3000", nombre: "Controller · Filial EE. UU.", cargo: "Controller · Filial EE. UU." },
];

const PROCESOS: { clave: ClaveProceso; nombre: string; dueno: string; diaHabil: number; responsable: string; umbral: number; demo?: boolean; descripcion: string; alcance: { soc: string; resp?: string }[]; orden: number }[] = [
  { clave: "pyg_base", nombre: "Base SAP del PyG (Parte 1)", dueno: "Felipe Correa", diaHabil: 1, responsable: "felipe", umbral: 1_000_000_000, orden: 1,
    descripcion: "De la extracción acumulada de SAP a la base de datos reales del PyG: optimizado, maestros, ajustes por método de participación de CC Proyectos y check en cero. Skill base-sap-pyg.",
    alcance: [{ soc: "4810" }, { soc: "4811" }] },
  { clave: "intercompania", nombre: "Conciliación intercompañía", dueno: "Contabilidad · cuentas recíprocas", diaHabil: 2, responsable: "1000", umbral: 50_000_000, orden: 2,
    descripcion: "Cruce factura por factura de las cuentas recíprocas entre las sociedades del grupo, con diez reglas fijas. Skill conconcreto-conciliacion (datos de demostración).",
    alcance: ["1000", "1100", "1200", "1300", "1400", "2000", "3000"].map((c) => ({ soc: c === "1000" ? "4810" : c, resp: c })) },
  { clave: "fiducia_txt", nombre: "Conciliación TXT de fiduciaria contra SAP", dueno: "Laura Bedoya", diaHabil: 3, responsable: "laura", umbral: 1_000_000_000, orden: 3,
    descripcion: "El balance de la fiduciaria (TXT, PUF) contra los dos libros de SAP (PUC) para cada patrimonio autónomo, con el ajuste en formato journal. Skill conciliacion-linea-linea.",
    alcance: SOCIEDADES.filter((s) => s.tipo === "patrimonio").map((s) => ({ soc: s.codigo })) },
  { clave: "inversion", nombre: "Inversión contra patrimonio", dueno: "Tatiana López", diaHabil: 3, responsable: "tatiana", umbral: 20_000_000, demo: true, orden: 4,
    descripcion: "El patrimonio de cada subsidiaria por el porcentaje de participación contra lo registrado como inversión en la matriz. Motor de demostración: falta validar con Tatiana.",
    alcance: ["4811", "1100", "1200", "1300", "1400", "2000", "3000"].map((soc) => ({ soc })) },
];

(async () => {
  const soc = new Map<string, string>();
  for (const s of SOCIEDADES) {
    const data = { nombre: s.nombre, tipo: s.tipo, alias: s.alias, cebe: s.cebe ?? null, fiducia: s.fiducia ?? null, demo: s.demo ?? false, orden: s.orden };
    soc.set(s.codigo, (await db.sociedad.upsert({ where: { codigo: s.codigo }, update: data, create: { codigo: s.codigo, ...data } })).id);
  }
  const resp = new Map<string, string>();
  for (const r of RESPONSABLES) {
    const existe = await db.responsable.findFirst({ where: { nombre: r.nombre } });
    const x = existe ? await db.responsable.update({ where: { id: existe.id }, data: { cargo: r.cargo, correo: CORREO } }) : await db.responsable.create({ data: { nombre: r.nombre, cargo: r.cargo, correo: CORREO } });
    resp.set(r.clave, x.id);
  }
  for (const p of PROCESOS) {
    const data = { nombre: p.nombre, dueno: p.dueno, diaHabil: p.diaHabil, descripcion: p.descripcion, demo: p.demo ?? false, umbralRevision: BigInt(p.umbral), responsableId: resp.get(p.responsable)!, orden: p.orden };
    const pr = await db.proceso.upsert({ where: { clave: p.clave }, update: data, create: { clave: p.clave, ...data } });
    for (const a of p.alcance) {
      const responsableId = a.resp ? resp.get(a.resp)! : null;
      await db.alcance.upsert({ where: { procesoId_sociedadId: { procesoId: pr.id, sociedadId: soc.get(a.soc)! } }, update: { responsableId }, create: { procesoId: pr.id, sociedadId: soc.get(a.soc)!, responsableId } });
    }
  }
  await db.cierre.upsert({ where: { periodo: "2026-09" }, update: {}, create: { periodo: "2026-09" } });
  console.log(`Sembrado: ${SOCIEDADES.length} sociedades, ${RESPONSABLES.length} responsables (todos a ${CORREO}), ${PROCESOS.length} procesos, cierre 2026-09.`);
})().finally(() => db.$disconnect());
