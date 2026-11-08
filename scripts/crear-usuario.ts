// Crea un usuario (o le pone una clave temporal nueva si ya existe). Sirve para el primer administrador:
// después, los usuarios se manejan en /usuarios.
//
//   npx tsx scripts/crear-usuario.ts <correo> "<Nombre>" <admin|contabilidad|comite|consulta>
//
// Imprime la clave temporal UNA vez. Se cambia en el primer ingreso.
import "./_env";
import { db } from "../src/lib/db";
import { cifrarClave, claveTemporal } from "../src/lib/auth/clave";
import type { Rol } from "@prisma/client";

const [correoArg, nombre, rolArg] = process.argv.slice(2);
const ROLES = ["admin", "contabilidad", "comite", "consulta"];
if (!correoArg || !nombre || !ROLES.includes(rolArg)) {
  console.error('Uso: npx tsx scripts/crear-usuario.ts <correo> "<Nombre>" <admin|contabilidad|comite|consulta>');
  process.exit(1);
}
(async () => {
  const correo = correoArg.trim().toLowerCase();
  const clave = claveTemporal();
  const hash = await cifrarClave(clave);
  const u = await db.usuario.upsert({ where: { correo }, update: { nombre, rol: rolArg as Rol, hash, debeCambiarClave: true, activo: true }, create: { correo, nombre, rol: rolArg as Rol, hash } });
  await db.sesion.deleteMany({ where: { usuarioId: u.id } });
  console.log(`\n${u.nombre} <${u.correo}> · ${u.rol}\nClave temporal: ${clave}\n(se cambia en el primer ingreso; no se vuelve a mostrar)\n`);
})().finally(() => db.$disconnect());
