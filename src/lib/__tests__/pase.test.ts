import { describe, it, expect, vi, beforeAll } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));
const usados = new Set<string>();
vi.mock("../db", () => ({
  db: {
    paseUsado: {
      create: async ({ data }: { data: { jti: string } }) => { if (usados.has(data.jti)) throw new Error("unique"); usados.add(data.jti); return data; },
      deleteMany: async () => ({ count: 0 }),
    },
  },
}));
const { leerPase } = await import("../auth/pase");

const SECRETO = "p".repeat(48);
const firmar = (o: { secreto?: string; aud?: string; iss?: string; tipo?: string; rol?: string; jti?: string; exp?: string } = {}) =>
  new SignJWT({ tipo: o.tipo ?? "entrada", nombre: "Persona", rol: o.rol ?? "admin" })
    .setProtectedHeader({ alg: "HS256" }).setIssuer(o.iss ?? "conconcreto-panel").setAudience(o.aud ?? "esta-app")
    .setSubject("Persona@Conconcreto.com").setJti(o.jti ?? crypto.randomUUID()).setIssuedAt().setExpirationTime(o.exp ?? "60s")
    .sign(new TextEncoder().encode(o.secreto ?? SECRETO));

describe("el pase del panel", () => {
  beforeAll(() => { process.env.PANEL_PASE_SECRETO = SECRETO; process.env.PANEL_APP = "esta-app"; });
  it("uno bueno entra, con el correo en minúsculas y el rol", async () => {
    const p = await leerPase(await firmar(), "entrada");
    expect(p.correo).toBe("persona@conconcreto.com");
    expect(p.rol).toBe("admin");
  });
  it("no se puede usar dos veces", async () => {
    const t = await firmar({ jti: "fijo-1" });
    await leerPase(t, "entrada");
    await expect(leerPase(t, "entrada")).rejects.toThrow(/ya se usó/);
  });
  it("uno para otra app no entra", async () => expect(leerPase(await firmar({ aud: "otra-app" }), "entrada")).rejects.toThrow());
  it("uno firmado con otro secreto no entra", async () => expect(leerPase(await firmar({ secreto: "x".repeat(48) }), "entrada")).rejects.toThrow());
  it("uno que no emitió el panel no entra", async () => expect(leerPase(await firmar({ iss: "otro" }), "entrada")).rejects.toThrow());
  it("uno vencido no entra", async () => expect(leerPase(await firmar({ exp: "-10s" }), "entrada")).rejects.toThrow());
  it("un retiro no sirve para entrar", async () => expect(leerPase(await firmar({ tipo: "retiro" }), "entrada")).rejects.toThrow(/tipo/));
  it("un rol que no existe en la app no entra", async () => expect(leerPase(await firmar({ rol: "superusuario" }), "entrada")).rejects.toThrow(/rol/));
  it("sin pase, nada", async () => expect(leerPase("", "entrada")).rejects.toThrow(/Falta/));
});
