// La cookie de sesión: el id de la sesión firmado (JWT con jose). La usa el proxy para decidir rápido,
// sin ir a la base, si alguien está conectado. Quién es de verdad lo dice la base (sesion.ts).
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "cie_sesion"; // un nombre por app: en localhost las cookies no distinguen puerto
export const DURACION_MS = 12 * 60 * 60 * 1000; // una jornada

const llave = () => {
  const s = process.env.SESION_SECRETO;
  if (!s || s.length < 32) throw new Error("Falta SESION_SECRETO (mínimo 32 caracteres) en el entorno.");
  return new TextEncoder().encode(s);
};

export type Carga = { sid: string; uid: string; rol: string };

export async function firmar(c: Carga, expira: Date): Promise<string> {
  return new SignJWT(c).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expira).sign(llave());
}

export async function leer(token: string | undefined): Promise<Carga | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, llave(), { algorithms: ["HS256"] });
    return typeof payload.sid === "string" && typeof payload.uid === "string" ? { sid: payload.sid, uid: payload.uid, rol: String(payload.rol) } : null;
  } catch {
    return null;
  }
}
