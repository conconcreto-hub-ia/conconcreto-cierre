// Usuarios de prueba, uno por rol, para recorrer las pantallas. Las claves se escriben en el archivo que se
// indique (fuera del repositorio) y no se imprimen. Al terminar las pruebas: --borrar.
//
//   npx tsx scripts/usuarios-prueba.ts --claves <archivo.json>
//   npx tsx scripts/usuarios-prueba.ts --borrar
import "./_env";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { cifrarClave } from "../src/lib/auth/clave";
import type { Rol } from "@prisma/client";

const DOMINIO = "@prueba.invalid";
const ROLES: Rol[] = ["admin", "contabilidad", "comite", "consulta"];
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };

(async () => {
  if (process.argv.includes("--borrar")) {
    const r = await db.usuario.deleteMany({ where: { correo: { endsWith: DOMINIO } } });
    await db.intentoIngreso.deleteMany({ where: { correo: { endsWith: DOMINIO } } });
    console.log(`Borrados ${r.count} usuarios de prueba (*${DOMINIO}).`);
    return;
  }
  const archivo = arg("claves");
  if (!archivo) throw new Error("Indica --claves <archivo.json> fuera del repositorio.");
  const claves: Record<string, { correo: string; clave: string }> = {};
  for (const rol of ROLES) {
    const correo = `prueba-${rol}${DOMINIO}`;
    const clave = `Pr${randomBytes(12).toString("base64url")}9`;
    const hash = await cifrarClave(clave);
    await db.usuario.upsert({ where: { correo }, update: { hash, rol, activo: true, debeCambiarClave: false }, create: { correo, nombre: `Prueba ${rol}`, rol, hash, debeCambiarClave: false } });
    claves[rol] = { correo, clave };
  }
  fs.writeFileSync(archivo, JSON.stringify(claves, null, 1));
  console.log(`Creados ${ROLES.length} usuarios de prueba. Claves en ${archivo}.`);
})().finally(() => db.$disconnect());
