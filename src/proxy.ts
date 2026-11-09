// Todo está cerrado salvo lo que se lista aquí. Una ruta nueva nace protegida.
//
// El proxy hace la revisión rápida (la firma de la cookie, sin ir a la base). Quién es de verdad y qué
// puede hacer lo deciden las páginas y las acciones con src/lib/auth/sesion.ts.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, leer } from "@/lib/auth/cookie";

const PUBLICAS = [
  /^\/ingresar$/,
  /^\/api\/cron\//, // piden Authorization: Bearer $CRON_SECRET
  /^\/api\/webhooks\//, // piden ?token=$AGENTMAIL_WEBHOOK_TOKEN
];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLICAS.some((r) => r.test(pathname))) return NextResponse.next();

  const carga = await leer(req.cookies.get(COOKIE)?.value);
  if (carga) return NextResponse.next();

  if (pathname.startsWith("/api/")) return new NextResponse("No autorizado", { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/ingresar";
  url.search = pathname === "/" ? "" : `?siguiente=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Fuera: los archivos de Next, la marca y el ícono.
  matcher: ["/((?!_next/static|_next/image|marca/|favicon.ico).*)"],
};
