"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Boton } from "@/components/ui";
import { cargarMes, type EstadoCarga } from "@/app/acciones";

const campo = "mt-1.5 h-11 w-full rounded-ctl border border-linea bg-fondo px-3 text-[14.5px] outline-none focus:border-verde";
const archivo = "mt-1.5 block w-full rounded-ctl border border-dashed border-linea bg-fondo px-3 py-2.5 text-[13.5px] file:mr-3 file:rounded-ctl file:border-0 file:bg-verde-suave file:px-3 file:py-1.5 file:font-display file:text-[13px] file:font-semibold file:text-verde-profundo";

type Proc = { clave: string; nombre: string; dueno: string; demo: boolean };

export function FormCargar({ cierreId, procesos, patrimonios, inicial }: { cierreId: string; procesos: Proc[]; patrimonios: { id: string; nombre: string }[]; inicial?: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoCarga, FormData>(cargarMes, undefined);
  const [proceso, setProceso] = useState(inicial ?? procesos[0]?.clave);
  return (
    <form action={accion} className="space-y-5">
      <input type="hidden" name="cierreId" value={cierreId} />
      <fieldset className="space-y-2">
        <legend className="text-[13.5px] font-semibold">Proceso</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {procesos.map((p) => (
            <label key={p.clave} className={`flex cursor-pointer items-start gap-3 rounded-ctl border p-3 ${proceso === p.clave ? "border-verde bg-verde-suave" : "border-linea bg-papel hover:border-[#cfd8d1]"}`}>
              <input type="radio" name="proceso" value={p.clave} checked={proceso === p.clave} onChange={() => setProceso(p.clave)} className="mt-1 accent-[var(--verde-profundo)]" />
              <span><span className="block font-display text-[14px] font-semibold">{p.nombre}</span><span className="text-[12.5px] text-tinta-3">{p.dueno}{p.demo ? " · demostración" : ""}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {proceso === "fiducia_txt" && (
        <div className="space-y-4">
          <label className="block text-[13.5px] font-semibold">Patrimonio autónomo
            <select name="sociedadId" className={campo} defaultValue="">{[<option key="" value="" disabled>Escoge el patrimonio</option>, ...patrimonios.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)]}</select>
          </label>
          <label className="block text-[13.5px] font-semibold">Balance de la fiduciaria (TXT sin terceros)<input type="file" name="txt" accept=".txt" required className={archivo} /></label>
          <label className="block text-[13.5px] font-semibold">Exporte de SAP del mes<input type="file" name="sap" accept=".xlsx" required className={archivo} /></label>
          <label className="block text-[13.5px] font-semibold">Homologación PUF – PUC (hojas «Homologación cuentas» y «Proyectos»)<input type="file" name="homologacion" accept=".xlsx" required className={archivo} /></label>
          <label className="block text-[13.5px] font-semibold">Grupo de ledgers del Libro 2 <span className="font-normal text-tinta-3">(opcional; si no lo sabes, queda vacío y resaltado)</span><input name="ledger2" className={campo} /></label>
        </div>
      )}
      {proceso === "pyg_base" && (
        <div className="space-y-4">
          <label className="block text-[13.5px] font-semibold">Extracción de SAP sin procesar («Base SAP PyG &lt;mes&gt; &lt;año&gt; [Vn].xlsx», una sola hoja)<input type="file" name="extraccion" accept=".xlsx" required className={archivo} /></label>
          <label className="block text-[13.5px] font-semibold">Maestros («Base de información para PyG.xlsx»)<input type="file" name="maestros" accept=".xlsx" required className={archivo} /></label>
          <label className="block text-[13.5px] font-semibold">% de participación de CC LLC en CC Proyectos <span className="font-normal text-tinta-3">(confírmalo cada mes; el último usado fue 48,515 %)</span><input name="pctLLC" defaultValue="48,515" inputMode="decimal" required className={campo} /></label>
        </div>
      )}
      {proceso === "intercompania" && (
        <label className="block text-[13.5px] font-semibold">Auxiliares de las cuentas recíprocas (hoja «Parámetros» y una hoja por sociedad)<input type="file" name="auxiliares" accept=".xlsx" required className={archivo} /></label>
      )}
      {proceso === "inversion" && (
        <label className="block text-[13.5px] font-semibold">Patrimonios e inversiones (hojas «Parámetros», «Patrimonio subsidiarias» e «Inversiones matriz»)<input type="file" name="inversion" accept=".xlsx" required className={archivo} /></label>
      )}

      {estado?.error && <p role="alert" className="rounded-ctl bg-rojo-suave px-3 py-2 text-[13.5px] text-rojo">{estado.error}</p>}
      {estado?.ejecucionId && <p role="status" className="rounded-ctl bg-verde-suave px-3 py-2 text-[13.5px] text-verde-profundo">Listo: el motor corrió. <Link href={`/ejecuciones/${estado.ejecucionId}`} className="font-semibold underline">Ver el resultado</Link></p>}
      <Boton type="submit" variante="primario" disabled={pendiente}>{pendiente ? "Corriendo el motor…" : "Subir y correr el motor"}</Boton>
      {pendiente && proceso === "pyg_base" && <p className="text-[13px] text-tinta-3">La base del PyG tiene decenas de miles de filas: tarda alrededor de medio minuto.</p>}
    </form>
  );
}
