import { redirect } from "next/navigation";
import { Marca } from "@/components/ui";
import { usuarioActual } from "@/lib/auth/sesion";
import { FormIngresar } from "./formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ingresar · Cierre Conconcreto" };

export default async function Ingresar({ searchParams }: { searchParams: Promise<{ siguiente?: string; error?: string }> }) {
  if (await usuarioActual()) redirect("/");
  const { siguiente, error } = await searchParams;
  return (
    <main className="banda grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center"><Marca /></div>
        <div className="mt-8 rounded-sup border border-white/10 bg-white p-7 text-tinta">
          <span className="seccion-et">Tablero del cierre</span>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight">Ingresar</h1>
          <p className="mt-1.5 text-[14px] text-tinta-2">Con el correo y la clave que te dio el administrador.</p>
          {error && <p role="alert" className="mt-4 rounded-ctl bg-rojo-suave px-3 py-2 text-[13px] text-rojo">No se pudo entrar desde el panel: {error} Vuelve al panel e inténtalo otra vez.</p>}
          <FormIngresar siguiente={siguiente ?? ""} />
        </div>
        <p className="mt-6 text-center text-[12.5px] text-white/55">¿No tienes acceso o perdiste la clave? Pídesela al administrador de la herramienta.</p>
      </div>
    </main>
  );
}
