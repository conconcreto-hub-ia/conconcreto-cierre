// El detalle de una ejecución: qué entró, qué salió, la comparación línea a línea, lo marcado para revisión
// y los archivos para descargar (journals listos para que una persona los cargue en SAP).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Barra } from "@/components/barra";
import { Cifra, Contenedor, Dato, Insignia, SeccionEt, Tarjeta } from "@/components/ui";
import { AvisoDemo, Bitacora, Monto } from "@/components/cierre";
import { IconoAlerta, IconoDescargar, IconoDocumento } from "@/components/iconos";
import { exigirSesion } from "@/lib/auth/sesion";
import { db } from "@/lib/db";
import { ESTADO, PROCESO_CORTO } from "@/lib/etiquetas";
import { fechaHora, pesos, porcentaje } from "@/lib/formato";
import { CONCEPTO, type SubsidiariaInv } from "@/lib/motores/inversion";
import type { Diferencia } from "@/lib/motores/intercompania";

export const dynamic = "force-dynamic";

type R = Record<string, unknown>;
const th = "px-3 py-2.5 text-left text-[12px] font-medium text-tinta-3";
const td = "px-3 py-2 align-top";

export default async function DetalleEjecucion({ params }: { params: Promise<{ id: string }> }) {
  await exigirSesion();
  const { id } = await params;
  const e = await db.ejecucion.findUnique({
    where: { id },
    include: { proceso: true, cierre: true, archivos: { select: { id: true, nombre: true, tipo: true, createdAt: true } }, resultados: { include: { sociedad: true } }, eventos: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!e) notFound();
  const vigente = e.resultados.some((r) => r.vigente);
  const resumen = e.resumen as R, detalle = e.detalle as R;
  const est = ESTADO[e.estado];
  const entradas = e.entradas as { nombre: string; tamano: number; huella: string }[];

  return (
    <>
      <Barra />
      <Contenedor className="space-y-8 py-9">
        <div>
          <Link href="/" className="text-[13px] font-semibold text-verde-profundo">← Mapa del cierre</Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="seccion-et">{e.proceso.nombre}</span>
            <Insignia tono={est.tono} punto>{est.etiqueta}</Insignia>
            {!vigente && <Insignia tono="neutro">Corrida anterior: hay una más nueva</Insignia>}
          </div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight">{e.titulo}</h1>
          <p className="mt-1.5 text-[14px] text-tinta-2">Corrió {e.corridoPor} · {fechaHora(e.createdAt)} · huella <span className="font-mono text-[12.5px]">{e.huella.slice(0, 16)}</span> (mismo archivo, misma huella)</p>
        </div>

        {e.proceso.demo && <AvisoDemo />}
        {e.mensajes.filter((m) => !m.startsWith("Motor de demostración")).length > 0 && (
          <Tarjeta className="space-y-2 p-5">
            {e.mensajes.filter((m) => !m.startsWith("Motor de demostración")).map((m, i) => <p key={i} className="m-0 flex gap-2 text-[14px]"><IconoAlerta className={`mt-0.5 size-4 shrink-0 ${e.estado === "bloqueado" && i === 0 ? "text-rojo" : "text-naranja"}`} />{m}</p>)}
          </Tarjeta>
        )}

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 min-w-0 space-y-8 2xl:order-1">
            {e.proceso.clave === "fiducia_txt" && <Fiducia resumen={resumen} detalle={detalle} />}
            {e.proceso.clave === "pyg_base" && <Pyg resumen={resumen} detalle={detalle} />}
            {e.proceso.clave === "intercompania" && <Intercompania resumen={resumen} detalle={detalle} />}
            {e.proceso.clave === "inversion" && <Inversion detalle={detalle} />}
          </div>
          <aside className="order-1 grid content-start gap-5 md:grid-cols-2 2xl:order-2 2xl:grid-cols-1">
            <Tarjeta className="p-5">
              <SeccionEt>Archivos que generó</SeccionEt>
              {e.archivos.length ? (
                <ul className="mt-3 space-y-2 pl-0">
                  {e.archivos.map((a) => (
                    <li key={a.id} className="list-none">
                      <a href={`/api/archivos/${a.id}`} className="flex items-center gap-2 rounded-ctl border border-linea px-3 py-2 text-[13.5px] font-semibold hover:bg-fondo"><IconoDescargar className="size-4 text-verde-profundo" /><span className="min-w-0 truncate">{a.nombre}</span></a>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-[13.5px] text-tinta-3">{!["fiducia_txt", "pyg_base"].includes(e.proceso.clave) ? "Este proceso no genera archivos: el resultado está aquí." : "Ninguno: el motor se detuvo."}</p>}
              {e.proceso.clave === "fiducia_txt" && e.archivos.length > 0 && <p className="mt-3 text-[12.5px] text-tinta-3">Los journals quedan listos para que una persona los cargue en SAP. La app no toca SAP.</p>}
            </Tarjeta>
            <Tarjeta className="p-5">
              <SeccionEt>Lo que entró</SeccionEt>
              <ul className="mt-3 space-y-2 pl-0">{entradas.map((a) => <li key={a.huella} className="flex list-none gap-2 text-[13px]"><IconoDocumento className="mt-0.5 size-4 shrink-0 text-tinta-3" /><span className="min-w-0"><span className="block truncate font-semibold">{a.nombre}</span><span className="text-[12px] text-tinta-3">{(a.tamano / 1024).toLocaleString("es-CO", { maximumFractionDigits: 0 })} KB · {a.huella.slice(0, 12)}</span></span></li>)}</ul>
            </Tarjeta>
            <Tarjeta className="p-5">
              <SeccionEt>Por sociedad</SeccionEt>
              <ul className="mt-3 space-y-2.5 pl-0">{e.resultados.map((r) => <li key={r.id} className="list-none text-[13.5px]"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{r.sociedad.nombre}</span><Insignia tono={ESTADO[r.estado].tono}>{ESTADO[r.estado].etiqueta}</Insignia></div>{r.nota && <p className="mt-0.5 text-[12.5px] text-tinta-3">{r.nota}</p>}</li>)}</ul>
            </Tarjeta>
            <Tarjeta className="p-5"><SeccionEt>Bitácora</SeccionEt><div className="mt-4"><Bitacora eventos={e.eventos} /></div></Tarjeta>
          </aside>
        </div>
      </Contenedor>
    </>
  );
}

/* ── Laura ──────────────────────────────────────────────────────────── */

type Comp = { cuenta: string; nombre: string; txt: number; txtRedondeado: number; l1: number; dif1: number; l2: number; dif2: number; enSap: boolean };
type Marc = { cuenta: string; nombre: string; dif1: number; dif2: number; motivo: string };
type Libro = { lineas: number; debitos: number; creditos: number; descuadre: number; ledger: string } | null;

function Fiducia({ resumen: r, detalle: d }: { resumen: R; detalle: R }) {
  const comp = (d.comparacion as Comp[]) ?? [], marc = (d.marcadas as Marc[]) ?? [];
  const mset = new Map(marc.map((m) => [m.cuenta, m.motivo]));
  const l1 = r.libro1 as Libro, l2 = r.libro2 as Libro;
  return (
    <>
      <Tarjeta className="grid gap-6 p-6 sm:grid-cols-4">
        <Cifra valor={String(r.comparadas)} rotulo="Cuentas comparadas" nota={`${r.cuentasTxt} últimas subcuentas del TXT`} />
        <Cifra valor={String(r.conDiferencia)} rotulo="Con diferencia" />
        <Cifra valor={String(marc.length)} rotulo="Para revisar" nota={`umbral ${pesos(Number(r.umbral))}`} />
        <Cifra valor={l1 ? pesos(l1.descuadre) : "—"} rotulo="Redondeo Libro 1" nota="a P429581000 · máximo $10" />
      </Tarjeta>
      <Tarjeta className="p-5">
        <dl className="m-0 grid gap-x-8 sm:grid-cols-2">
          <Dato k="Patrimonio">{String(r.patrimonio)}</Dato>
          <Dato k="CEBE · fiducia"><span className="font-mono">{String(r.cebe)}</span> · {String(r.fiduciaria)}</Dato>
          <Dato k="Lector del TXT">{String(r.lector)}</Dato>
          <Dato k="Fecha del ajuste">{String(r.fecha)}</Dato>
          {l1 && <Dato k="Journal Libro 1">{l1.lineas} líneas · débitos = créditos = {pesos(l1.debitos)} · ledger {l1.ledger}</Dato>}
          {l2 && <Dato k="Journal Libro 2">{l2.lineas} líneas · débitos = créditos = {pesos(l2.debitos)} · ledger {l2.ledger || <b className="text-rojo">vacío (resaltado)</b>}</Dato>}
        </dl>
      </Tarjeta>
      <section className="space-y-3">
        <SeccionEt>Comparación línea a línea</SeccionEt>
        <p className="m-0 text-[13.5px] text-tinta-2">Diferencia = TXT redondeado a pesos − SAP. Positiva va al débito, negativa al crédito. Las filas marcadas superan el umbral o mueven una cuenta que no tiene saldo en un lado.</p>
        <Tarjeta className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13.5px]">
            <thead><tr><th className={th}>Cuenta PUC</th><th className={th}>Nombre</th><th className={`${th} text-right`}>TXT redondeado</th><th className={`${th} text-right`}>SAP Libro 1</th><th className={`${th} text-right`}>Dif. Libro 1</th><th className={`${th} text-right`}>SAP Libro 2</th><th className={`${th} text-right`}>Dif. Libro 2</th></tr></thead>
            <tbody>
              {comp.map((c) => {
                const m = mset.get(c.cuenta);
                return (
                  <tr key={c.cuenta} className={`border-t border-linea-2 ${m ? "bg-rojo-suave/60" : ""}`}>
                    <td className={`${td} font-mono text-[12.5px]`}>{c.cuenta}</td>
                    <td className={td}>{c.nombre || <span className="text-tinta-3">No está en SAP</span>}{m && <div className="mt-0.5 text-[12px] font-semibold text-rojo">{m[0].toUpperCase() + m.slice(1)}</div>}</td>
                    <td className={`${td} text-right`}><Monto v={c.txtRedondeado} /></td>
                    <td className={`${td} text-right`}><Monto v={c.l1} /></td>
                    <td className={`${td} text-right font-semibold`}>{c.dif1 ? <Monto v={c.dif1} /> : <span className="text-tinta-3">0</span>}</td>
                    <td className={`${td} text-right`}><Monto v={c.l2} /></td>
                    <td className={`${td} text-right font-semibold`}>{c.dif2 ? <Monto v={c.dif2} /> : <span className="text-tinta-3">0</span>}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-linea font-bold"><td className={td} colSpan={2}>Total</td><td className={`${td} text-right`}><Monto v={comp.reduce((a, c) => a + c.txtRedondeado, 0)} /></td><td className={`${td} text-right`}><Monto v={comp.reduce((a, c) => a + c.l1, 0)} /></td><td className={`${td} text-right`}><Monto v={comp.reduce((a, c) => a + c.dif1, 0)} /></td><td className={`${td} text-right`}><Monto v={comp.reduce((a, c) => a + c.l2, 0)} /></td><td className={`${td} text-right`}><Monto v={comp.reduce((a, c) => a + c.dif2, 0)} /></td></tr>
            </tbody>
          </table>
        </Tarjeta>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta className="p-5">
          <SeccionEt>Excluidas del TXT</SeccionEt>
          <ul className="mt-3 space-y-1.5 pl-0 text-[13px]">{((d.excluidas as { cuenta: string; descripcion: string; sf: number; estado: string }[]) ?? []).map((x) => <li key={x.cuenta} className="flex list-none justify-between gap-3"><span><span className="font-mono">{x.cuenta}</span> {x.descripcion}<span className="block text-[12px] text-tinta-3">{x.estado}</span></span><Monto v={x.sf} /></li>)}</ul>
        </Tarjeta>
        <Tarjeta className="p-5">
          <SeccionEt>PF excluidas de SAP</SeccionEt>
          <ul className="mt-3 space-y-1.5 pl-0 text-[13px]">{((d.pf as { cuenta: string; nombre: string; l1: number }[]) ?? []).map((x) => <li key={x.cuenta} className="flex list-none justify-between gap-3"><span><span className="font-mono">{x.cuenta}</span> {x.nombre}</span><Monto v={x.l1} /></li>)}</ul>
        </Tarjeta>
      </div>
    </>
  );
}

/* ── Felipe ─────────────────────────────────────────────────────────── */

function Pyg({ resumen: r, detalle: d }: { resumen: R; detalle: R }) {
  const n = (k: string) => Number(r[k]);
  const ajustes = (d.ajustes as { mes: number; cebe: string; cuenta: string | number; valor: number; ajustado: number; regla: string }[]) ?? [];
  const falt = d.faltantes as { cebes: { codigo: string; nombre: string }[]; cuentas: { codigo: string; nombre: string }[] };
  return (
    <>
      <Tarjeta className="grid gap-6 p-6 sm:grid-cols-4">
        <Cifra valor={n("filasOriginales").toLocaleString("es-CO")} rotulo="Filas originales" nota={`${n("filasCero").toLocaleString("es-CO")} en cero`} />
        <Cifra valor={n("filasOptimizado").toLocaleString("es-CO")} rotulo="Filas finales" />
        <Cifra valor={String(n("ajustes"))} rotulo="Filas «Ajuste»" />
        <Cifra valor={String(n("checkPesos"))} rotulo="Check" nota="debe dar 0 (±1 peso)" />
      </Tarjeta>
      {(falt?.cebes?.length > 0 || falt?.cuentas?.length > 0) && (
        <Tarjeta className="p-5">
          <SeccionEt>Faltan en los maestros</SeccionEt>
          <ul className="mt-3 space-y-1 pl-4 text-[13.5px]">{[...falt.cebes.map((c) => `CeBe ${c.codigo} · ${c.nombre}`), ...falt.cuentas.map((c) => `Cuenta ${c.codigo} · ${c.nombre}`)].map((x) => <li key={x}>{x}</li>)}</ul>
        </Tarjeta>
      )}
      {r.factor !== undefined && n("filasBase") > 0 && n("ajustes") > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Tarjeta className="p-5">
            <SeccionEt>6A · CC Proyectos en CC LLC</SeccionEt>
            <dl className="m-0 mt-2">
              <Dato k="Utilidad CC LLC">{pesos(n("utilidadLLC"))}</Dato>
              <Dato k="Utilidad CC Proyectos">{pesos(n("utilidadCCP"))}</Dato>
              <Dato k="% de LLC">{porcentaje(n("pctLLC"))}</Dato>
              <Dato k="$ participación">{pesos(n("participacionLLC"))}</Dato>
              <Dato k="LLC sin CC Proyectos">{pesos(n("utilidadLLCsinCCP"))}</Dato>
              <Dato k="Factor"><b className="num">{n("factor").toLocaleString("es-CO", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</b></Dato>
            </dl>
          </Tarjeta>
          <Tarjeta className="p-5">
            <SeccionEt>6B · CC Proyectos en Constructora</SeccionEt>
            <dl className="m-0 mt-2">
              <Dato k="% de Constructora">{porcentaje(n("pctCC"))}</Dato>
              <Dato k="Según cálculo">{pesos(n("mpCalculo"))}</Dato>
              <Dato k="Según método">{pesos(n("mpMetodo"))}</Dato>
              <Dato k="Diferencia"><b className="num">{pesos(n("diferencia"))}</b><div className="text-[12px] text-tinta-3">va a la última fila del grupo 660 en 01I1OI0205</div></Dato>
            </dl>
          </Tarjeta>
        </div>
      )}
      {ajustes.length > 0 && (
        <section className="space-y-3">
          <SeccionEt>Las filas «Ajuste»</SeccionEt>
          <Tarjeta className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13.5px]">
              <thead><tr><th className={th}>Mes</th><th className={th}>CeBe</th><th className={th}>Cuenta</th><th className={`${th} text-right`}>Valor</th><th className={`${th} text-right`}>Valor ajustado</th><th className={th}>Regla</th></tr></thead>
              <tbody>{ajustes.map((a, i) => <tr key={i} className="border-t border-linea-2"><td className={td}>{a.mes}</td><td className={`${td} font-mono text-[12.5px]`}>{a.cebe}</td><td className={`${td} font-mono text-[12.5px]`}>{a.cuenta}</td><td className={`${td} text-right`}><Monto v={a.valor} /></td><td className={`${td} text-right`}><Monto v={a.ajustado} /></td><td className={`${td} text-[12.5px] text-tinta-2`}>{{ factor: "−Valor × factor", cero: "0", diferencia: "La diferencia de 6B", menos: "−Valor" }[a.regla]}</td></tr>)}</tbody>
            </table>
          </Tarjeta>
        </section>
      )}
    </>
  );
}

/* ── Intercompañía ──────────────────────────────────────────────────── */

function Intercompania({ resumen: r, detalle: d }: { resumen: R; detalle: R }) {
  const difs = (d.diferencias as (Diferencia & { marcada: boolean })[]) ?? [];
  const cuadre = r.cuadre as { cuadra: boolean; dif_neta_pares: number; dif_neta_explicada: number };
  const nombre = Object.fromEntries(((d.sociedades as { codigo: string; nombre: string }[]) ?? []).map((s) => [s.codigo, s.nombre]));
  return (
    <>
      <Tarjeta className="grid gap-6 p-6 sm:grid-cols-4">
        <Cifra valor={String(r.partidas)} rotulo="Partidas" nota={`${r.sociedades} sociedades`} />
        <Cifra valor={`${Math.round(Number(r.pct_auto))} %`} rotulo="Casaron solas" nota={`${r.referencias_ok} de ${r.referencias} referencias`} />
        <Cifra valor={String(r.diferencias)} rotulo="Diferencias" nota={`${r.sin_clasificar} sin clasificar`} />
        <Cifra valor={pesos(Number(r.valor_por_conciliar))} rotulo="Por conciliar" />
      </Tarjeta>
      <p className={`m-0 -mt-3 text-[14px] font-semibold ${cuadre.cuadra ? "text-verde-profundo" : "text-rojo"}`}>{cuadre.cuadra ? "Cuadra" : "No cuadra"}: diferencia neta de los pares {pesos(cuadre.dif_neta_pares)} = explicada {pesos(cuadre.dif_neta_explicada)} · huella del cruce <span className="font-mono">{String(r.huellaCruce)}</span></p>
      <section className="space-y-3">
        <SeccionEt>Las diferencias, con su regla</SeccionEt>
        {difs.map((x) => (
          <Tarjeta key={x.id} className={`p-5 ${x.marcada ? "border-oro/70" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-tinta-3"><span className="font-mono font-semibold text-tinta-2">{x.id} · {x.regla}</span>{x.marcada && <Insignia tono="oro">Para revisar</Insignia>}</div>
                <h3 className="mt-1 text-[16px] font-bold">{x.nombre_tipo}</h3>
                <p className="mt-0.5 text-[13.5px] text-tinta-2">{nombre[x.deudor] ?? x.deudor} (CxC) → {nombre[x.acreedor] ?? x.acreedor} (CxP) · {x.refs.join(", ")} · responde {nombre[x.responsable ?? ""] ?? x.responsable}</p>
              </div>
              <div className="shrink-0 text-right"><Monto v={x.tipo === "PAGO_OTRA_FACTURA" ? x.monto_abs : x.monto} className="text-[18px] font-extrabold" /><div className="text-[11.5px] text-tinta-3">{x.tipo === "PAGO_OTRA_FACTURA" ? "pago mal aplicado (neto cero)" : "diferencia"}</div></div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] font-semibold text-verde-profundo">Soporte ({x.evidencia.length} partidas)</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-[12.5px]"><tbody>{x.evidencia.map((v, i) => <tr key={i} className="border-t border-linea-2"><td className="py-1.5 pr-3 font-mono">{v.soc} {v.cuenta} {v.clase}</td><td className="py-1.5 pr-3 font-mono">{v.doc}</td><td className="py-1.5 pr-3">{v.fecha}</td><td className="py-1.5 pr-3">{v.texto}</td><td className="py-1.5 text-right"><Monto v={v.ml} /></td></tr>)}</tbody></table>
              </div>
            </details>
          </Tarjeta>
        ))}
      </section>
    </>
  );
}

/* ── Tatiana ────────────────────────────────────────────────────────── */

function Inversion({ detalle: d }: { detalle: R }) {
  const subs = (d.subsidiarias as SubsidiariaInv[]) ?? [];
  return (
    <section className="space-y-4">
      <SeccionEt>Inversión contra patrimonio, por subsidiaria</SeccionEt>
      {subs.map((s) => (
        <Tarjeta key={s.codigo} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold">{s.nombre} <span className="font-mono text-[12.5px] font-normal text-tinta-3">{s.codigo} · {porcentaje(s.pct)}{s.moneda === "USD" ? " · en USD a la TRM de cierre" : ""}</span></h3>
            <Insignia tono={ESTADO[s.estado].tono} punto>{ESTADO[s.estado].etiqueta}</Insignia>
          </div>
          {s.mensaje ? <p className="mt-2 text-[14px] text-rojo">{s.mensaje}</p> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13.5px]">
                <thead><tr><th className={th}>Concepto</th><th className={`${th} text-right`}>Patrimonio</th><th className={`${th} text-right`}>Esperado</th><th className={`${th} text-right`}>Registrado</th><th className={`${th} text-right`}>Diferencia</th></tr></thead>
                <tbody>
                  {s.lineas.map((l) => <tr key={l.concepto} className={`border-t border-linea-2 ${l.marcada ? "bg-rojo-suave/60" : ""}`}><td className={td}>{CONCEPTO[l.concepto]}{l.marcada && <div className="text-[12px] font-semibold text-rojo">Supera el umbral</div>}</td><td className={`${td} text-right`}><Monto v={l.base} /></td><td className={`${td} text-right`}><Monto v={l.esperado} /></td><td className={`${td} text-right`}><Monto v={l.registrado} /></td><td className={`${td} text-right font-semibold`}>{l.dif ? <Monto v={l.dif} /> : <span className="text-tinta-3">0</span>}</td></tr>)}
                  <tr className="border-t-2 border-linea font-bold"><td className={td}>Total de la inversión</td><td /><td className={`${td} text-right`}><Monto v={s.total.esperado} /></td><td className={`${td} text-right`}><Monto v={s.total.registrado} /></td><td className={`${td} text-right`}><Monto v={s.total.dif} /></td></tr>
                </tbody>
              </table>
              {s.asiento.length > 0 && (
                <div className="mt-3 rounded-ctl bg-fondo p-3">
                  <div className="text-[12px] font-semibold text-tinta-3">Ajuste propuesto en la matriz (cuentas por confirmar con Tatiana)</div>
                  <table className="mt-1 w-full text-[12.5px]"><tbody>{s.asiento.map((a, i) => <tr key={i}><td className="py-0.5 pr-3 font-mono">{a.cuenta}</td><td className="py-0.5 pr-3">{a.nombre}</td><td className="py-0.5 text-right">{a.debito ? <Monto v={a.debito} /> : ""}</td><td className="py-0.5 text-right">{a.credito ? <Monto v={a.credito} /> : ""}</td></tr>)}</tbody></table>
                </div>
              )}
            </div>
          )}
        </Tarjeta>
      ))}
      <p className="text-[12.5px] text-tinta-3">{PROCESO_CORTO.inversion}: esperado = % de participación × el componente del patrimonio; diferencia = esperado − registrado.</p>
    </section>
  );
}
