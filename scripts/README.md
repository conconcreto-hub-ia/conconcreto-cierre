# Scripts

| Script | Qué hace |
|---|---|
| `sembrar.ts [--correo …]` | Sociedades, responsables, procesos con su día hábil, alcance y el cierre 2026-09. Idempotente. |
| `crear-buzon.ts` | Crea `cierre-cc@agentmail.to` («Cierre · Conconcreto») si no existe. Uno solo. |
| `crear-usuario.ts <correo> "<Nombre>" <rol>` | Un usuario con clave temporal (el primer administrador). |
| `reconstruir-entradas.ts` | Rearma las entradas de Laura y Felipe y lo esperado, en `datos-reales/` (fuera de git). |
| `generar-demo-inversion.ts` | Los datos inventados de inversión contra patrimonio, en `datos-demo/`. |
| `escenario.ts` | Limpia el cierre de septiembre y lo deja en su día hábil 3 (los cuatro motores). No manda correos. |
| `e2e.ts` | La prueba de punta a punta con buzones reales (ver el README). Se puede volver a correr. |
| `usuarios-prueba.ts --claves <archivo>` / `--borrar` | Cuatro usuarios de prueba (uno por rol) para recorrer las pantallas. Las claves van a un archivo fuera del repositorio. **Al terminar, `--borrar`.** |
| `rutinas.ts` | Las rutinas en un computador: calendario a las 7:00 y buzón solo si hay correo nuevo. |

Los buzones de prueba los comparten varias sesiones: lo que se manda lleva una marca en el asunto y se filtra por ella.
