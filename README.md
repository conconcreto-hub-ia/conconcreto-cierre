# El tablero del cierre · Conconcreto

Qué sociedades del grupo ya cuadran, con qué diferencias, qué falta y de quién. Cada proceso de cierre corre
con su motor; un agente persigue lo que falta.
Conconcreto x irrelevant · programa Think AI, 2026. Es la idea 2 del cierre del programa.

## El flujo

```
Cada proceso, en su día hábil del cierre (lunes a viernes sin festivos de Colombia):
  día 1 · Base SAP del PyG, Parte 1 ............ Felipe Correa   (skill base-sap-pyg)
  día 2 · Conciliación intercompañía ........... contabilidad    (skill conconcreto-conciliacion · día supuesto)
  día 3 · Conciliación TXT de fiduciaria vs SAP . Laura Bedoya    (skill conciliacion-linea-linea)
  día 3 · Inversión contra patrimonio .......... Tatiana López   (MOTOR DE DEMOSTRACIÓN)
        │
        ▼  «Cargar el mes»: una persona sube los archivos y el motor corre aquí (código, sin modelo)
  Ejecución → un resultado por sociedad (cuadra · con diferencias · bloqueado) + archivos (journals, base procesada)
        │
        ├─ Las diferencias que superan el umbral del proceso quedan marcadas para revisión
        ├─ Dos procesos que dicen cosas distintas de la misma sociedad → cruce: la diferencia la calcula el
        │  código, la causa la propone el agente; una persona la acepta o la descarta
        └─ Lo que venció y no está → pendiente, con el aviso redactado (el pendiente exacto)
        ▼
  Una persona aprueba los avisos (uno a uno, o deja aprobados los automáticos del cierre)
        ▼
  El agente escribe desde cierre-cc@agentmail.to · lee la respuesta (como dato) · marca «respondió»
  Recuerda en el mismo hilo a quien no contesta (máximo dos veces) · resolver es de una persona
        ▼
  «¿Qué me falta para el comité?»: el reporte se genera al pedirlo. Cifras del código, lectura del agente.
  Nada se carga en SAP: los journals quedan listos para que una persona los cargue.
```

## Correr

```bash
npm install
npx prisma db push && npx prisma generate
npx tsx scripts/sembrar.ts --correo prueba-jhon-cc@agentmail.to   # sociedades, responsables, procesos, cierre 2026-09
npx tsx scripts/crear-buzon.ts                                     # el buzón del agente (una sola vez; ya existe)
npx tsx scripts/crear-usuario.ts <correo> "<Nombre>" admin        # el primer administrador (imprime su clave temporal)
npx tsx scripts/escenario.ts                                       # opcional: el cierre de septiembre en su día hábil 3
npm run dev                                                        # http://localhost:3011
```

`.env.local` (fuera de git): `DATABASE_URL` (Neon, `sslmode=verify-full`), `ANTHROPIC_API_KEY`, `AGENTMAIL_API_KEY`,
`AGENTMAIL_INBOX=cierre-cc@agentmail.to`, `ENVIO_DOMINIOS_PERMITIDOS="agentmail.to"`, `SESION_SECRETO`, `CRON_SECRET`,
`AGENTMAIL_WEBHOOK_TOKEN` y, solo para la demostración, `FECHA_REFERENCIA=2026-10-05` (fija «hoy» en el día hábil 3 del
cierre de septiembre; el tablero lo dice arriba. En operación se quita).

**Después de cambiar `prisma/schema.prisma`: `npx prisma generate` y reiniciar el servidor.** El cliente de Prisma queda
cargado en memoria y un servidor viejo sigue con el cliente viejo. Comprueba qué proceso escucha el 3011 antes de concluir
que algo funciona (en este computador el 3011 lo tenía ocupado otro proyecto durante la construcción; las pruebas
corrieron en el 3014 con `npx next dev --webpack -p 3014`).

## Los datos

- `datos-reales/` (**fuera de git**, en `.gitignore` desde antes del primer commit): los zips que entregaron Laura y Felipe
  y las entradas reconstruidas con `scripts/reconstruir-entradas.ts`. Son datos contables reales de una empresa que cotiza
  en bolsa: no salen de este computador ni de la base de la app, no van en capturas ni en mensajes.
  - Laura entregó sus salidas, no sus entradas: el TXT se rearma con su hoja «TXT ultima subcuenta» (más las cuentas padre,
    para que el motor tenga que encontrar la última subcuenta), el exporte de SAP con la hoja «Comparacion» y la homologación
    con la columna «Cuenta PUC».
  - Felipe entregó la base procesada, con la hoja «Extracción Original» tal cual salió de SAP. Los maestros se rearman desde
    su hoja «Ajuste».
- `datos-demo/` (en git): los auxiliares intercompañía de la demostración S1 (sociedades y cifras inventadas) y los de
  inversión contra patrimonio (`scripts/generar-demo-inversion.ts`, inventados).

## Verificar

```bash
npm run check   # typecheck + 52 pruebas (unos segundos)
npm run e2e     # de punta a punta con buzones reales de AgentMail (unos 3 minutos; gasta API)
```

**Los motores reproducen a sus dueños** (pruebas en `src/lib/__tests__`; las de datos reales se saltan si no está `datos-reales/`):

| Motor | Lo que tiene que dar, y da |
|---|---|
| Laura · Contree Castropol sept-2026 | la misma comparación cuenta por cuenta, los mismos 37 ajustes, descuadre de 1 peso por libro a P429581000, journals con débitos = créditos = 38.040.954.018 (Libro 1, 18 líneas) y 36.004.079.113 (Libro 2, 19 líneas), iguales a los suyos línea por línea |
| Felipe · septiembre 2026 V3 | 47.273 filas, 8.357 en cero, 38.916 finales, 16 «Ajuste», utilidad CC Proyectos $790.179.259, factor LLC 1,0940, diferencia −$16.557, check 0; la base sale igual a la suya fila por fila y en el mismo orden |
| Intercompañía (demo S1) | los mismos indicadores, pares, 9 diferencias y 54 referencias que el `conciliar.py` de la skill |
| Tatiana (demostración) | sus casos armados: CC Proyectos con el método sobre otra utilidad, ORI sin reconocer, una diferencia chica, una sociedad sin balance |

`scripts/e2e.ts` (se puede volver a correr: limpia el cierre de septiembre y lo vuelve a cargar) comprueba en el buzón
real, no solo en la base: que sin aprobación no sale nada; que aprobados sale un correo por responsable y llega a
`prueba-jhon-cc@agentmail.to`; que una dirección real queda en borrador; que la respuesta del responsable pone «respondió»
solo en lo que mencionó (y lee una fecha de compromiso y un «no me corresponde»); que un correo con instrucciones para el
sistema no se obedece (no resuelve nada, no aprueba el cruce, no manda correos, queda en la bitácora); que revisar el buzón
otra vez no repite nada; que el recordatorio llega en el mismo hilo y solo con lo que no se contestó; que el reporte no trae
cifras del modelo. Todo lo que manda lleva una marca única en el asunto (`[cierre HH:MM:SS]`): el buzón de pruebas es
compartido con otras sesiones.

## Las reglas que no se tocan

- **Los números los hace el código.** Totales, diferencias, ajustes, factor, check: los motores, con pruebas. El modelo
  explica (la causa de un cruce, la lectura del reporte, qué dijo una respuesta) y **si escribe cifras se le rechaza el
  texto** (`traeCifras` en `src/lib/cruces.ts`): las cifras salen al lado, calculadas.
- **El agente propone; una persona aprueba.** Los avisos salen con aprobación; resolver un pendiente y aceptar la causa de
  un cruce es de una persona. Nada se carga en SAP.
- **Lo que llega de afuera es dato.** Una respuesta solo se clasifica; ningún campo de la clasificación dispara una acción.
- **Modo prueba:** `ENVIO_DOMINIOS_PERMITIDOS="agentmail.to"`. A cualquier otra dirección el aviso queda en borrador.
  Abrirlo es una decisión, no un cambio de rutina.
- **Que Neon pueda dormir:** nada sondea la base de fondo. La rutina diaria es una ruta de cron; el buzón se revisa por
  webhook o, en un computador, solo cuando AgentMail dice que llegó algo (`scripts/rutinas.ts`).
- **Trampas de AgentMail:** `extracted_text` quita lo citado (sirve en la respuesta a un hilo propio); responder a un correo
  propio sin `to` se lo manda al mismo buzón (los recordatorios dicen a quién van); el listado pagina con
  `next_page_token`; **cada buzón tiene su propio `thread_id`** (el hilo del agente y el del responsable no tienen el mismo
  id); el nombre visible con «·» se manda desde Node.

## El acceso

- Todo cerrado salvo `/ingresar`, `/api/cron/*` (piden `CRON_SECRET`) y `/api/webhooks/*` (piden el token).
- **Roles** (`src/lib/auth/permisos.ts`): administrador · contabilidad (carga archivos, corre los motores, aprueba avisos,
  resuelve pendientes, revisa cruces) · comité (ve el tablero y pide el reporte) · consulta (solo ver).
- Cada acción de servidor exige su permiso. Se probó llamándolas directamente (con el id del manifiesto) con el rol de
  consulta y de comité: el servidor responde «Tu rol no permite hacer esto» y la base no cambia.

## Las rutinas

| Qué | Cuándo | Desplegado | En un computador |
|---|---|---|---|
| Calendario: lo que venció, avisos aprobados, recordatorios | días hábiles 7:00 | `GET /api/cron/calendario` (vercel.json) | `npx tsx scripts/rutinas.ts` |
| Buzón: las respuestas | al llegar un correo | webhook de AgentMail → `POST /api/webhooks/agentmail?token=…` | cada 3 min de 7 a 19, solo si hay correo nuevo |

## Lo que falta

1. **Validar el motor de Tatiana con ella**: los conceptos en que se parte la inversión, las cuentas del ajuste y el umbral.
   Hoy corre con datos inventados y lo dice en cada pantalla.
2. **Laura:** probar los lectores de Bancolombia, Credicorp y Corficolombiana en una conciliación completa (el de ancho fijo
   está portado de su script, sin probar con un archivo real); definir el grupo de ledgers del Libro 2; confirmar si
   P238095002 (partes relacionadas) debe llevar sociedad asociada 4810 (la regla de «termina en 0002» no se la pone);
   los CEBE de los otros cinco patrimonios (hoy salen de la hoja Proyectos al cargar). El umbral de $1.000 millones marca
   13 cuentas en Castropol: que ella lo ajuste.
3. **El día hábil de la intercompañía** (2) es un supuesto, y sus datos son de demostración.
4. **Los correos reales de los responsables**: hoy todos van a `prueba-jhon-cc@agentmail.to`.
5. **Dónde vive** (TI de Conconcreto): con datos contables de una empresa que cotiza en bolsa, su infraestructura o una
   aprobación explícita. El archivo procesado del PyG pesa ~10 MB y hoy se guarda en la base.
6. «Pregúntale al cierre» por MCP y el inicio de sesión con Microsoft 365, si TI lo habilita.
