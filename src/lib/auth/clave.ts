// Contraseñas con scrypt (viene con Node). Se guarda «sal:hash» en hex.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const LARGO = 64;

function derivar(clave: string, sal: Buffer): Promise<Buffer> {
  return new Promise((ok, mal) => scrypt(clave, sal, LARGO, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? mal(e) : ok(k))));
}

export async function cifrarClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  return `${sal.toString("hex")}:${(await derivar(clave, sal)).toString("hex")}`;
}

export async function claveCorrecta(clave: string, guardada: string): Promise<boolean> {
  const [sal, hash] = guardada.split(":");
  if (!sal || !hash) return false;
  const calculado = await derivar(clave, Buffer.from(sal, "hex"));
  const esperado = Buffer.from(hash, "hex");
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

/** Mínimo 10 caracteres, con letras y números. Devuelve el problema o null. */
export function problemaDeClave(clave: string): string | null {
  if (clave.length < 10) return "La clave necesita al menos 10 caracteres.";
  if (!/[a-zA-Z]/.test(clave) || !/\d/.test(clave)) return "La clave necesita letras y números.";
  return null;
}

/** Clave temporal legible: se muestra una sola vez al crear el usuario. */
export function claveTemporal(): string {
  const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(14);
  return Array.from(b, (x) => a[x % a.length]).join("").replace(/^(.{4})(.{5})(.{5})$/, "$1-$2-$3");
}
