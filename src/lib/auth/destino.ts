/** A dónde volver después de ingresar. Solo rutas internas: «/algo», nunca «//otro-sitio», «/\otro», ni «https://…». */
export function destinoSeguro(s: string | null | undefined): string {
  if (!s || !s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\") || s.startsWith("/ingresar")) return "/";
  return s;
}
