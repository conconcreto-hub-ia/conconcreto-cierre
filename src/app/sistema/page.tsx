// La referencia viva del sistema de diseño. Si una pieza no está aquí, todavía no existe.

import { exigirSesion } from "@/lib/auth/sesion";
import { Barra } from "@/components/barra";
import { Aja, Boton, Chip, Cifra, Contenedor, Dato, Encabezado, Encaje, Insignia, Marca, SeccionEt, Tarjeta, Vacio } from "@/components/ui";
import { IconoRadar, IconoCorreo, IconoComite, IconoPaquete, IconoProveedor, IconoCuadro, IconoAgente, IconoEscudo, IconoTendencia, IconoFlecha } from "@/components/iconos";
import { ESTADO_OPORTUNIDAD, RECOMENDACION, ESTADO_INVITACION } from "@/lib/etiquetas";

const COLORES = [
  ["noche", "#07130c"], ["noche-2", "#0d2216"], ["verde-profundo", "#07582b"], ["verde", "#3dae2b"], ["verde-suave", "#eaf6e7"],
  ["oro", "#efbf01"], ["naranja", "#d8800d"], ["tinta", "#141a16"], ["tinta-2", "#48514b"], ["tinta-3", "#7b847e"], ["linea", "#e2e7e3"], ["fondo", "#f6f8f5"],
];

export default async function Sistema() {
  const yo = await exigirSesion();
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
            <h1 className="text-[44px] font-extrabold leading-none">De la invitación al <span className="dorado">cuadro comparativo</span></h1>
            <h2 className="text-[26px] font-extrabold">Título de sección · Montserrat 800</h2>
            <h3 className="text-[18px] font-bold">Título de tarjeta · Montserrat 700</h3>
            <p className="max-w-[640px] text-tinta-2">Texto corrido en Work Sans. El agente lee la invitación, arma los paquetes y le escribe a los proveedores; una persona aprueba antes de que algo salga.</p>
            <p className="font-mono text-[13px] text-tinta-2">CO1.NTC.8123456 · JetBrains Mono para códigos</p>
          </Tarjeta>
        </section>

        <section className="space-y-4">
          <SeccionEt>Botones</SeccionEt>
          <div className="flex flex-wrap gap-3">
            <Boton variante="primario">Aprobar en comité <IconoFlecha /></Boton>
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
            {Object.values(ESTADO_OPORTUNIDAD).map((e) => <Insignia key={e.etiqueta} tono={e.tono}>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(RECOMENDACION).map((e) => <Insignia key={e.etiqueta} tono={e.tono} punto>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(ESTADO_INVITACION).map((e) => <Insignia key={e.etiqueta} tono={e.tono}>{e.etiqueta}</Insignia>)}
          </div>
          <div className="flex flex-wrap gap-2"><Chip>Antioquia</Chip><Chip>Licitación pública</Chip><Chip>Vías</Chip></div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Cifras y encaje</SeccionEt>
          <Tarjeta className="flex flex-wrap gap-10 p-6">
            <Cifra valor="14" rotulo="Oportunidades abiertas" nota="3 nuevas hoy" />
            <Cifra valor="$48.200 M" rotulo="Valor en estudio" />
            <Cifra valor="6" rotulo="En comité" />
            <div className="space-y-2 pt-1"><Encaje valor={86} /><Encaje valor={54} /><Encaje valor={null} /></div>
          </Tarjeta>
          <div className="banda flex flex-wrap gap-10 rounded-sup p-6">
            <Cifra oscuro valor="55" rotulo="Procesos revisados hoy" />
            <Cifra oscuro valor="16" rotulo="Con encaje" />
          </div>
        </section>

        <section className="space-y-4">
          <SeccionEt>Bloques</SeccionEt>
          <div className="grid gap-4 md:grid-cols-2">
            <Aja>En los últimos 3 años esta entidad adjudicó 8 contratos de alcantarillado. Ganaron siempre 3 oferentes, con un descuento promedio del 7,4 % sobre el presupuesto oficial.</Aja>
            <Tarjeta className="p-5">
              <dl className="m-0">
                <Dato k="Entidad">Empresas Públicas de Medellín</Dato>
                <Dato k="Modalidad">Licitación pública</Dato>
                <Dato k="Presupuesto">$12.435 millones</Dato>
              </dl>
            </Tarjeta>
          </div>
          <Vacio icono={<IconoRadar className="size-5" />} titulo="El radar todavía no ha corrido" accion={<Boton variante="primario">Correr el radar</Boton>}>
            Cuando corra, aquí aparecen los procesos del SECOP que encajan con los criterios de Conconcreto.
          </Vacio>
        </section>

        <section className="space-y-4">
          <SeccionEt>Íconos</SeccionEt>
          <div className="flex flex-wrap gap-4 text-tinta-2">
            {[IconoRadar, IconoCorreo, IconoComite, IconoPaquete, IconoProveedor, IconoCuadro, IconoAgente, IconoEscudo, IconoTendencia].map((I, i) => (
              <div key={i} className="grid size-11 place-items-center rounded-ctl border border-linea bg-papel"><I className="size-5" /></div>
            ))}
          </div>
        </section>
      </Contenedor>
    </>
  );
}
