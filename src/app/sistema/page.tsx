// La referencia viva del sistema de diseño. Si una pieza no está aquí, todavía no existe.

import { exigirSesion } from "@/lib/auth/sesion";
import { Barra } from "@/components/barra";
import { Aja, Boton, Chip, Cifra, Contenedor, Dato, Encabezado, Insignia, Marca, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { IconoCorreo, IconoAgente, IconoEscudo, IconoFlecha, IconoSubir, IconoDescargar, IconoCalendario, IconoBalanza, IconoCruce, IconoLista, IconoMapa, IconoAlerta } from "@/components/iconos";
import { ESTADO, ESTADO_PENDIENTE, ESTADO_CRUCE } from "@/lib/etiquetas";
import { CeldaEstado } from "@/components/cierre";

const COLORES = [
  ["noche", "#07130c"], ["noche-2", "#0d2216"], ["verde-profundo", "#07582b"], ["verde", "#3dae2b"], ["verde-suave", "#eaf6e7"],
  ["oro", "#efbf01"], ["naranja", "#d8800d"], ["tinta", "#141a16"], ["tinta-2", "#48514b"], ["tinta-3", "#7b847e"], ["linea", "#e2e7e3"], ["fondo", "#f6f8f5"],
];

export default async function Sistema() {
  await exigirSesion();
  return (
    <>
      <Barra />
      <Contenedor className="space-y-14 py-10">
        <Encabezado et="Sistema de diseño" titulo="Conconcreto x irrelevant" bajada="Sale del material de la sesión 1: noche y verde Conconcreto, con el degradado oro del logo para lo que importa. Borde antes que sombra, un solo radio, Montserrat para títulos y cifras." />

        <section className="space-y-4">
          <SeccionEt>Marca</SeccionEt>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="banda rounded-sup p-8"><Marca /></div>
            <Tarjeta className="p-8"><Marca fondo="claro" /></Tarjeta>
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Color</SeccionEt>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {COLORES.map(([n, h]) => (
              <div key={n}>
                <div className="h-14 rounded-ctl border border-linea" style={{ background: h }} />
                <div className="mt-1.5 font-display text-[12.5px] font-semibold">{n}</div>
                <div className="font-mono text-[11.5px] text-tinta-3">{h}</div>
              </div>
            ))}
          </div>
          <div className="h-3 rounded-full [background:var(--degradado)]" />
        </section>

        <section className="space-y-4">
          <SeccionEt>Tipografía</SeccionEt>
          <Tarjeta className="space-y-3 p-6">
            <h1 className="text-[44px] font-extrabold leading-none">Qué cuadra, qué falta <span className="dorado">y de quién</span></h1>
            <h2 className="text-[26px] font-extrabold">Título de sección · Montserrat 800</h2>
            <h3 className="text-[18px] font-bold">Título de tarjeta · Montserrat 700</h3>
            <p className="max-w-[640px] text-tinta-2">Texto corrido en Work Sans. Cada motor concilia con reglas escritas; el agente persigue lo que falta y propone causas. Una persona aprueba antes de que algo salga.</p>
            <p className="font-mono text-[13px] text-tinta-2">P145010000 · 411PA119 · JetBrains Mono para códigos</p>
          </Tarjeta>
        </section>

        <section className="space-y-4">
          <SeccionEt>Botones</SeccionEt>
          <div className="flex flex-wrap gap-3">
            <Boton variante="primario">Aprobar y enviar avisos <IconoFlecha /></Boton>
            <Boton>Secundario</Boton>
            <Boton variante="oscuro">Oscuro</Boton>
            <Boton variante="fantasma">Fantasma</Boton>
            <Boton variante="peligro">Descartar</Boton>
            <Boton variante="primario" chico>Chico</Boton>
            <Boton disabled>Deshabilitado</Boton>
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Estados</SeccionEt>
          <div className="flex flex-wrap gap-2">
            {Object.values(ESTADO).map((e) => <Insignia key={e.etiqueta} tono={e.tono} punto>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(ESTADO_PENDIENTE).map((e) => <Insignia key={e.etiqueta} tono={e.tono}>{e.etiqueta}</Insignia>)}
            {Object.values(ESTADO_CRUCE).map((e) => <Insignia key={e.etiqueta} tono={e.tono}>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["cuadra", "no_cuadra", "bloqueado", "pendiente", "por_correr", "no_aplica"] as const).map((e) => <CeldaEstado key={e} celda={{ estado: e, marcadas: e === "no_cuadra" ? 2 : 0, diferencias: 3, valorAbs: 0 }} />)}
          </div>
          <div className="flex flex-wrap gap-2"><Chip>4810</Chip><Chip>Día hábil 3</Chip><Chip>Demostración</Chip></div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Cifras</SeccionEt>
          <Tarjeta className="flex flex-wrap gap-10 p-6">
            <Cifra valor="9" rotulo="Sociedades que cuadran" nota="de 15" />
            <Cifra valor="12.435 M" rotulo="Diferencia más grande" />
            <Cifra valor="11" rotulo="Pendientes abiertos" />
          </Tarjeta>
          <div className="banda flex flex-wrap gap-10 rounded-sup p-6">
            <Cifra oscuro valor="3" rotulo="Día hábil del cierre" />
            <Cifra oscuro valor="4" rotulo="Procesos" />
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Bloques</SeccionEt>
          <div className="grid gap-4 md:grid-cols-2">
            <Aja>La utilidad de CCC Proyectos en el PyG no es la del balance que usó la conciliación de inversiones. Lo más probable: el balance se tomó después de un ajuste posterior a la extracción V3.</Aja>
            <Tarjeta className="p-5">
              <dl className="m-0">
                <Dato k="Sociedad">PA Contree Castropol</Dato>
                <Dato k="CEBE">411PA119</Dato>
                <Dato k="Ajuste">$12.435 millones en P145010000</Dato>
              </dl>
            </Tarjeta>
          </div>
          <Vacio icono={<IconoSubir className="size-5" />} titulo="Todavía no se ha cargado nada este mes" accion={<Boton variante="primario">Cargar el mes</Boton>}>
            Cuando cada proceso corra su motor, aquí aparecen las sociedades con su estado.
          </Vacio>
        </section>

        <section className="space-y-4">
          <SeccionEt>Íconos</SeccionEt>
          <div className="flex flex-wrap gap-4 text-tinta-2">
            {[IconoMapa, IconoSubir, IconoDescargar, IconoCalendario, IconoBalanza, IconoCruce, IconoLista, IconoCorreo, IconoAgente, IconoEscudo, IconoAlerta].map((I, i) => (
              <div key={i} className="grid size-11 place-items-center rounded-ctl border border-linea bg-papel"><I className="size-5" /></div>
            ))}
          </div>
        </section>
      </Contenedor>
    </>
  );
}
