# Casos de prueba — Mover el lanzador con A/D y modo de disparo (HU-10, HU-11)

**Módulo:** core loop (lanzador, tirada, HUD, tutorial) | **Ambiente:** local, Chromium (últimas 2 versiones), 1920×1080 | **Autor:** QA | **Fecha:** 2026-10-21
**Requisito / AC:** [`Design/hu-10-11-lanzador-y-modo-de-disparo.md`](../hu-10-11-lanzador-y-modo-de-disparo.md) — HU-10 AC1–AC12, HU-11 AC1–AC15 (decisiones D-10.1 a D-11.4, D-T.1)

**Supuestos:**
- S-QA1: las posiciones se leen con el hook de pruebas (`?test=1`, `window.__ANGLECRAFT__.snapshot().launcherX`) y en pantalla; tolerancia de ±2 px por la cuantización del paso fijo (1/120 s).
- S-QA2: "mantener pulsada X durante T s" se mide con el reloj de la página (`page.clock` en automatización) para que sea reproducible.
- S-QA3: el nombre del estado nuevo entre grupos de un mismo turno es `Aiming` (HU-11 AC3); si el desarrollo usa otro estado, se ajustan los pasos sin cambiar el resultado esperado.
- S-QA4: la indicación del tutorial (D-T.1) aún no tiene diseño; se verifica texto, teclas y momento de aparición/desaparición, no el estilo.

**Precondiciones generales:** juego servido con `npm` + Playwright (`scripts/static-server.mjs`), sesión nueva (almacenamiento vacío), clic en la pantalla de inicio para entrar al nivel 1 en `Aiming`, velocidad 1X, sin pausa.

**Datos de prueba:**
| Dato | Valor |
|---|---|
| Nivel 1 | `level1.json`: tirada inicial (`startBalls`) = 3, 10 turnos, 1 orbe +1 |
| Nivel 2 | `level2.json`: tirada inicial = 5, 12 turnos, 1 orbe |
| Nivel 6 | último nivel (para victoria sin "Siguiente nivel") |
| Límites del lanzador | x mín = 50, x máx = 1030 |
| Velocidad A/D | 480 px/s; paso por toque = 8 px |
| Ángulo de prueba | 90° (vertical) salvo que el caso indique otro |
| Semilla | `tests/fixtures/solutions.json` (`seed`) |

## Técnicas aplicadas
- **Valores límite:** posición del lanzador (49/50/51 y 1029/1030/1031), bolas restantes vs. modo (restantes = modo − 1, = modo, = modo + 1).
- **Partición de equivalencia:** teclas válidas (A, D, a, d) vs. teclas no asignadas; estados donde A/D/M actúan vs. donde se ignoran.
- **Tabla de decisión:** modo × bolas restantes → tamaño del grupo; resultado del grupo (sin núcleos destruidos / último núcleo destruido / última bola del último turno).
- **Transición de estados:** `Aiming → Firing → Simulating → Aiming` dentro del turno; `→ Resolving → Aiming/Victory/GameOver` al cerrar el turno.
- **Negativas:** teclas fuera de `Aiming`, A+D a la vez, cambio de modo con un grupo en vuelo, repetición automática del teclado.
- **Regresión:** velocidad 1/2/4 (HU-05), reiniciar (R), estrellas y puntos (A1, A5), orbes (HU-04), HUD.
- No aplican **permisos por rol** (un único rol: jugador) ni **idempotencia de integraciones** (no hay servicios externos).

## Matriz de cobertura

| Criterio de aceptación | Casos que lo cubren |
|---|---|
| HU-10 AC1 — Reubicación automática se mantiene | CP-01 |
| HU-10 AC2 — Mover a la izquierda | CP-02, CP-04 |
| HU-10 AC3 — Mover a la derecha | CP-03, CP-04 |
| HU-10 AC4 — Movimiento libre desde la posición automática | CP-05 |
| HU-10 AC5 — Toque corto | CP-06, CP-07 |
| HU-10 AC6 — Se detiene en el borde | CP-08, CP-09 |
| HU-10 AC7 — Teclas ignoradas fuera de Aiming | CP-10, CP-11 |
| HU-10 AC8 — El tiro sale desde la posición elegida | CP-12 |
| HU-10 AC9 — Teclas opuestas a la vez | CP-13 |
| HU-10 AC10 — Reiniciar devuelve la posición del nivel | CP-14 |
| HU-10 AC11 — Mayúsculas y atajos visibles | CP-15, CP-16 |
| HU-10 AC12 — Tutorial A/D en el nivel 1 | CP-17, CP-18 |
| HU-11 AC1 — Modo por defecto | CP-19 |
| HU-11 AC2 — Un disparo lanza exactamente N bolas | CP-20 |
| HU-11 AC3 — Entre grupos se vuelve a apuntar | CP-21 |
| HU-11 AC4 — Reubicación después de cada grupo | CP-22 |
| HU-11 AC5 — Orbes para los turnos siguientes | CP-23 |
| HU-11 AC6 — Fin de turno con la última bola | CP-24, CP-25 |
| HU-11 AC7 — Menos bolas que el modo | CP-26 |
| HU-11 AC8 — Victoria a mitad de turno | CP-27 |
| HU-11 AC9 — Cambiar modo con M | CP-28 |
| HU-11 AC10 — Cambiar modo desde el panel | CP-29 |
| HU-11 AC11 — No se cambia el modo en vuelo | CP-30 |
| HU-11 AC12 — Sin ventaja por modo | CP-31 |
| HU-11 AC13 — Sin conflicto con teclas de velocidad | CP-32 |
| HU-11 AC14 — Modo y bolas restantes en el HUD | CP-33 |
| HU-11 AC15 — Tutorial del modo en el nivel 2 | CP-34, CP-35 |

## Casos — HU-10: mover el lanzador con A/D

### CP-01 — Tras un tiro, el lanzador aparece donde aterrizó la primera bola
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2 en `Aiming`, modo 1, sin mover el lanzador.
- **Pasos:**
  1. Disparar a 60°.
  2. Esperar a que la bola aterrice y el juego vuelva a `Aiming`.
  3. Anotar la x donde aterrizó la primera bola (evento de aterrizaje / `snapshot`).
- **Resultado esperado:** `launcherX` es igual a la x de aterrizaje (±2 px) y el anillo del lanzador se dibuja en esa posición.

### CP-02 — Mantener A 0,5 s mueve el lanzador 240 px a la izquierda
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 540.
- **Pasos:**
  1. Mantener pulsada `A` durante 0,5 s.
  2. Soltar `A`.
- **Resultado esperado:** `launcherX` = 300 (±2 px); el movimiento es continuo (sin saltos > 8 px entre cuadros a 60 FPS).

### CP-03 — Mantener D 0,5 s mueve el lanzador 240 px a la derecha
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 540.
- **Pasos:**
  1. Mantener pulsada `D` durante 0,5 s.
  2. Soltar `D`.
- **Resultado esperado:** `launcherX` = 780 (±2 px).

### CP-04 — La previsualización se recalcula desde la nueva posición en el mismo cuadro
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí (prueba visual o lectura del primer punto de la trayectoria)
- **Precondición:** nivel 1 en `Aiming`, cursor fijo en (540, 300) del tablero, lanzador en x = 540.
- **Pasos:**
  1. Mantener `D` 0,25 s sin mover el ratón.
  2. Capturar el cuadro siguiente.
- **Resultado esperado:** la línea punteada nace en x ≈ 660 (nueva posición), apunta al mismo punto del cursor y el ángulo mostrado cambia en consecuencia.

### CP-05 — Desde x = 1000 el lanzador cruza todo el ancho con A
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** valores límite · **Automatizable:** sí
- **Precondición:** nivel 2; un tiro previo dejó el lanzador en x ≈ 1000 (o colocarlo con el hook).
- **Pasos:**
  1. Mantener pulsada `A` 2,5 s.
- **Resultado esperado:** el lanzador pasa por toda la franja inferior sin detenerse en ningún punto intermedio y termina en x = 50.

### CP-06 — Un toque corto de D mueve exactamente 8 px
- **Tipo:** límite · **Prioridad:** Media · **Técnica:** valores límite · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 540.
- **Pasos:**
  1. Pulsar y soltar `D` en menos de 16 ms (un cuadro).
- **Resultado esperado:** `launcherX` = 548.

### CP-07 — Diez toques cortos de A mueven 80 px y la repetición automática del teclado no duplica pasos
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 540.
- **Pasos:**
  1. Pulsar y soltar `A` 10 veces, cada toque < 16 ms.
  2. Mantener `A` 0,5 s generando eventos `keydown` con `repeat = true`.
- **Resultado esperado:** tras el paso 1, x = 460; tras el paso 2, x = 220 (±2 px). Los eventos repetidos no suman 8 px adicionales cada uno.

### CP-08 — En el borde izquierdo el lanzador se queda en x = 50 con A mantenida
- **Tipo:** límite · **Prioridad:** Alta · **Técnica:** valores límite (49/50/51) · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 100.
- **Pasos:**
  1. Mantener `A` 2 s.
  2. Sin soltar, leer `launcherX` cada 100 ms durante 1 s más.
  3. Soltar y pulsar un toque de `D`.
- **Resultado esperado:** paso 1: x = 50; paso 2: x = 50 en todas las lecturas (nunca 49); paso 3: x = 58.

### CP-09 — En el borde derecho el lanzador se queda en x = 1030 con D mantenida
- **Tipo:** límite · **Prioridad:** Alta · **Técnica:** valores límite (1029/1030/1031) · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 980.
- **Pasos:**
  1. Mantener `D` 2 s.
  2. Leer `launcherX` cada 100 ms durante 1 s más sin soltar.
- **Resultado esperado:** x = 1030 en todas las lecturas (nunca 1031); la trayectoria sigue siendo válida (no atraviesa la pared derecha).

### CP-10 — A y D no mueven el lanzador con un grupo en vuelo ni en pausa
- **Tipo:** negativo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2 en `Aiming`, lanzador en x = 540, modo 3.
- **Pasos:**
  1. Disparar; durante `Firing`, mantener `A` 0,5 s.
  2. Durante `Simulating`, mantener `D` 0,5 s.
  3. Al volver a `Aiming`, pulsar `P` (pausa) y mantener `A` 0,5 s.
- **Resultado esperado:** en los pasos 1 y 2 `launcherX` no cambia por las teclas (solo por la reubicación automática al final del grupo); en el paso 3 no cambia mientras está en pausa.

### CP-11 — A y D se ignoran en Title, Victory y GameOver
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** partición de equivalencia (estados) · **Automatizable:** sí
- **Precondición:** sesión nueva.
- **Pasos:**
  1. En `Title`, pulsar `A` y `D`.
  2. Llegar a `Victory` en el nivel 1 (solución de `solutions.json`) y mantener `A` 0,5 s.
  3. Llegar a `GameOver` en el nivel 2 agotando los turnos y mantener `D` 0,5 s.
- **Resultado esperado:** el estado no cambia en ningún paso, no se carga ningún nivel en `Title` y `launcherX` no varía en los modales.

### CP-12 — Todas las bolas del grupo salen desde la posición elegida
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** nivel 2 en `Aiming`, lanzador en x = 540, modo 3.
- **Pasos:**
  1. Mantener `A` 0,5 s (x = 300).
  2. Disparar con clic izquierdo sobre el tablero.
  3. Leer la posición de cada bola en su primer paso de simulación.
- **Resultado esperado:** las 3 bolas parten de x = 300 con la misma dirección bloqueada; ninguna sale de x = 540.

### CP-13 — Con A y D pulsadas a la vez el lanzador no se mueve
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** tabla de decisión (A×D) · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 540.
- **Pasos:**
  1. Pulsar `A`, luego `D` sin soltar `A`; mantener ambas 0,5 s.
  2. Soltar `A` y mantener solo `D` 0,25 s.
- **Resultado esperado:** paso 1: x = 540; paso 2: x = 660 (el movimiento se reanuda con la tecla que queda).

### CP-14 — R devuelve el lanzador a la posición inicial del nivel
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2 en `Aiming`.
- **Pasos:**
  1. Mover el lanzador con `D` 1 s.
  2. Pulsar `R`.
- **Resultado esperado:** `launcherX` = `launcher.x × 1080` de `level2.json`, turnos usados = 0, modo = 1.

### CP-15 — Con Bloq Mayús, A y D funcionan igual
- **Tipo:** funcional positivo · **Prioridad:** Baja · **Técnica:** partición de equivalencia · **Automatizable:** sí (eventos con `key = 'A'` / `'D'`)
- **Precondición:** nivel 1 en `Aiming`, x = 540, Bloq Mayús activo.
- **Pasos:**
  1. Mantener `A` (mayúscula) 0,5 s.
- **Resultado esperado:** x = 300, igual que en CP-02.

### CP-16 — El panel CONTROL lista "Mover lanzador" con las teclas A y D
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí (DOM)
- **Precondición:** nivel 1 en `Aiming`.
- **Pasos:**
  1. Leer la sección ATAJOS del panel CONTROL.
- **Resultado esperado:** existe la fila "Mover lanzador" con dos keycaps `A` y `D`; las filas de v1 siguen presentes; no aparecen `Esc` ni "Clic der.".

### CP-17 — La indicación de A/D aparece al entrar por primera vez al nivel 1 y se va al mover
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** transición de estados · **Automatizable:** sí (DOM)
- **Precondición:** sesión nueva.
- **Pasos:**
  1. Hacer clic en la pantalla de inicio (entra al nivel 1 en `Aiming`).
  2. Verificar la indicación.
  3. Pulsar un toque de `D`.
- **Resultado esperado:** paso 2: se ve "Mueve el lanzador con A / D" con keycaps `A` y `D` sobre el tablero; paso 3: la indicación desaparece en ese mismo cuadro.

### CP-18 — La indicación de A/D se va al disparar y no vuelve en la sesión
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** sesión nueva, nivel 1 con la indicación visible.
- **Pasos:**
  1. Disparar sin mover el lanzador.
  2. Pulsar `R` para reiniciar el nivel 1.
  3. Ganar el nivel 1, ir al nivel 2 y volver a jugar el nivel 1 (Repetir) en la misma sesión.
- **Resultado esperado:** la indicación desaparece en el paso 1 y no vuelve a mostrarse en los pasos 2 y 3. En una sesión nueva (recarga de la página) vuelve a aparecer.

## Casos — HU-11: modo de disparo 1, 2 o 3 bolas

### CP-19 — Al iniciar o reiniciar un nivel el modo activo es 1
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** sesión nueva.
- **Pasos:**
  1. Entrar al nivel 1 y leer el selector MODO.
  2. Cambiar a modo 3 con `M` `M`.
  3. Pulsar `R`.
  4. Ganar el nivel 1 y pulsar "Siguiente nivel".
- **Resultado esperado:** modo 1 resaltado en los pasos 1, 3 y 4.

### CP-20 — Un disparo lanza exactamente 1, 2 o 3 bolas según el modo
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** partición de equivalencia (modo) · **Automatizable:** sí
- **Precondición:** nivel 2 (tirada de 5 bolas), turno sin disparos.
- **Pasos (repetir por modo 1, 2 y 3, reiniciando el nivel entre cada uno):**
  1. Seleccionar el modo.
  2. Disparar a 90°.
  3. Contar las bolas emitidas (`volley.emitted`) al terminar `Firing`.
- **Resultado esperado:**

  | Modo | Bolas emitidas | Bolas restantes en el turno |
  |---|---|---|
  | 1 | 1 | 4 |
  | 2 | 2 | 3 |
  | 3 | 3 | 2 |

  Las bolas salen una tras otra con el intervalo de v1 (1/12 s) y la misma dirección.

### CP-21 — Al aterrizar el grupo se vuelve a Aiming sin gastar un turno
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2, modo 2, turnos usados = 0 de 12.
- **Pasos:**
  1. Disparar el primer grupo.
  2. Esperar a que aterricen las 2 bolas.
- **Resultado esperado:** estado `Aiming`; bolas restantes en el turno = 3; TURNOS sigue mostrando 12 restantes (no 11); se puede volver a apuntar y disparar.

### CP-22 — El lanzador se reubica después de cada grupo y se puede ajustar antes del siguiente
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2, modo 2, lanzador en x = 540.
- **Pasos:**
  1. Disparar el primer grupo a 60°; anotar la x de aterrizaje de la primera bola (x₁).
  2. Al volver a `Aiming`, leer `launcherX`.
  3. Mantener `A` 0,25 s y disparar el segundo grupo.
- **Resultado esperado:** paso 2: `launcherX` = x₁ (±2 px); paso 3: el segundo grupo sale desde x₁ − 120.

### CP-23 — Un orbe capturado a mitad de turno suma bolas solo a los turnos siguientes
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 2 (tirada de 5), modo 1; ángulo conocido que capture el orbe (+V) con la primera bola.
- **Pasos:**
  1. Disparar la primera bola capturando el orbe.
  2. Disparar las 4 bolas restantes del turno (4 disparos en modo 1).
  3. Al empezar el turno siguiente, leer el tamaño de la tirada.
- **Resultado esperado:** paso 2: el turno en curso termina tras 5 bolas en total (no 5 + V); paso 3: tirada = 5 + V; BOLAS en TELEMETRÍA muestra 5 + V restantes.

### CP-24 — El turno se resuelve al aterrizar la última bola de la tirada
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** valores límite (última bola) · **Automatizable:** sí
- **Precondición:** nivel 2, turnos usados = 3 de 12, al turno le queda 1 bola por disparar, modo 1.
- **Pasos:**
  1. Disparar la última bola y esperar a que aterrice.
- **Resultado esperado:** el juego pasa por `Resolving` y vuelve a `Aiming` con turnos usados = 4 de 12, una tirada completa nueva y el lanzador reubicado.

### CP-25 — Se pierde al recoger la última bola del último turno sin destruir los núcleos
- **Tipo:** funcional negativo · **Prioridad:** Alta · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 2 con `shots` = 1 (nivel servido con el parche de pruebas), tirada de 5, modo 2, ángulo que no destruye el núcleo.
- **Pasos:**
  1. Disparar 3 grupos (2 + 2 + 1 bolas).
- **Resultado esperado:** tras los dos primeros grupos el juego vuelve a `Aiming`; tras el tercero pasa a `GameOver` y aparece el modal "SIN TURNOS". No hay `GameOver` antes de la última bola.

### CP-26 — Con menos bolas restantes que el modo sale solo lo que queda
- **Tipo:** límite · **Prioridad:** Alta · **Técnica:** valores límite (restantes = modo − 1, = modo, = modo + 1) · **Automatizable:** sí
- **Precondición:** nivel 2 (tirada de 5), modo 3.
- **Pasos:**
  1. Disparar el primer grupo (quedan 2).
  2. Disparar el segundo grupo con el modo todavía en 3.
  3. Repetir en un turno nuevo con modo 2: grupos de 2, 2 y 1.
- **Resultado esperado:** paso 1: salen 3; paso 2: salen 2 y el selector indica que el grupo quedó limitado a 2; paso 3: salen 2, 2 y 1. Nunca sale una bola de más ni queda una sin disparar.

### CP-27 — Si un grupo destruye el último núcleo se gana sin disparar las bolas restantes
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 1 con el núcleo a 1 HP (parche de pruebas), tirada de 3, modo 1.
- **Pasos:**
  1. Disparar una bola que impacte el núcleo.
- **Resultado esperado:** al aterrizar la bola el juego pasa a `Victory` con 2 bolas sin disparar; el modal muestra estrellas y puntos con la regla de v1 (A1, A5).

### CP-28 — M recorre los modos 1 → 2 → 3 → 1
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, modo 1.
- **Pasos:**
  1. Pulsar `M` tres veces, leyendo el modo después de cada pulsación.
  2. Mantener `M` pulsada 1 s (repetición automática).
- **Resultado esperado:** paso 1: 2, 3, 1 y el selector MODO resalta cada uno; paso 2: avanza un solo modo (la repetición automática no recorre los modos).

### CP-29 — El selector MODO del panel cambia el modo con un clic
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí (DOM)
- **Precondición:** nivel 2 en `Aiming`, modo 1.
- **Pasos:**
  1. Hacer clic en el botón "3" del selector MODO.
  2. Disparar.
- **Resultado esperado:** el modo 3 queda resaltado; salen 3 bolas; el clic en el panel no dispara ni mueve la mira.

### CP-30 — El modo no cambia con un grupo en vuelo
- **Tipo:** negativo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2, modo 2.
- **Pasos:**
  1. Disparar; durante `Firing`, pulsar `M`.
  2. Durante `Simulating`, hacer clic en el botón "1" del selector.
  3. Al volver a `Aiming`, leer el modo.
- **Resultado esperado:** el selector se ve deshabilitado en los pasos 1 y 2; el modo sigue en 2 en el paso 3.

### CP-31 — Con los mismos ángulos, el modo 1 y el modo 3 dan las mismas estrellas y la misma regla de puntos
- **Tipo:** regresión · **Prioridad:** Media · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 1, semilla de `solutions.json`.
- **Pasos:**
  1. Resolver el nivel en modo 1 disparando cada grupo con los ángulos de la solución.
  2. Recargar y repetir en modo 3.
- **Resultado esperado:** ambos modales muestran la misma cantidad de estrellas para los mismos turnos usados; los puntos se calculan con daño total + 100 por turno no usado en los dos casos; ningún texto menciona un bonus por modo.

### CP-32 — Las teclas 1, 2 y 4 siguen cambiando la velocidad y no el modo
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** nivel 2, modo 3.
- **Pasos:**
  1. Disparar; durante `Simulating`, pulsar `2` y luego `4`.
  2. Al volver a `Aiming`, pulsar `1`.
- **Resultado esperado:** la velocidad pasa a 2X y 4X (VELOCIDAD lo muestra); el modo sigue en 3 en todo momento; en `Aiming` la tecla `1` no cambia el modo.

### CP-33 — El HUD muestra el selector MODO, el atajo M y las bolas restantes del turno
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí (DOM y prueba visual)
- **Precondición:** nivel 2 en `Aiming`, modo 2.
- **Pasos:**
  1. Leer el panel CONTROL.
  2. Disparar un grupo y, al volver a `Aiming`, leer BOLAS en TELEMETRÍA.
- **Resultado esperado:** CONTROL muestra MODO con 1, 2 y 3 (2 resaltado) y ATAJOS incluye `M`; BOLAS muestra 3 bolas restantes del turno (de 5).

### CP-34 — La indicación del modo aparece al entrar por primera vez al nivel 2 y se va al cambiar de modo
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** transición de estados · **Automatizable:** sí (DOM)
- **Precondición:** sesión nueva, nivel 1 superado.
- **Pasos:**
  1. Pulsar "Siguiente nivel" para entrar al nivel 2.
  2. Verificar la indicación y el selector.
  3. Pulsar `M`.
- **Resultado esperado:** paso 2: se ve "Elige cuántas bolas lanzar por tiro con M (1, 2 o 3)" con keycap `M` y el selector MODO resaltado; paso 3: la indicación desaparece. La indicación de A/D del nivel 1 no aparece en el nivel 2.

### CP-35 — La indicación del modo se va al disparar y no vuelve en la sesión
- **Tipo:** negativo · **Prioridad:** Baja · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** sesión nueva, nivel 2 con la indicación visible.
- **Pasos:**
  1. Disparar sin cambiar el modo.
  2. Pulsar `R`.
- **Resultado esperado:** la indicación desaparece en el paso 1 y no vuelve tras reiniciar.

## Huecos de cobertura

| Hueco | Motivo |
|---|---|
| Estilo visual de la indicación del tutorial | No hay diseño del componente (S-QA4); se agregará una prueba visual cuando diseño lo entregue. |
| Teclados AZERTY y otras distribuciones | Fuera del alcance de las HU (riesgo listado en el documento de HU); requiere decisión del PO sobre teclas alternativas. |
| Firefox, Edge y Opera | La automatización de v1 cubre solo Chromium (E1); la verificación en otros navegadores es manual. |
| Rebalanceo de los 6 niveles | Depende de rediseño de niveles; CP-31 solo comprueba la regla de puntuación, no la dificultad. |
| Rendimiento a 60 FPS moviendo el lanzador | No se define un caso propio: lo cubre la prueba de estrés de v1 si se agrega el movimiento al escenario. |

## Orden de ejecución sugerido

1. **Base del lanzador:** CP-02, CP-03, CP-06, CP-08, CP-09 (sin ellos fallan los demás de HU-10).
2. **Integración del lanzador:** CP-04, CP-05, CP-07, CP-12, CP-13, CP-15, CP-01, CP-14.
3. **Estados ignorados:** CP-10, CP-11.
4. **Modo de disparo:** CP-19, CP-28, CP-20, CP-29, CP-30, CP-32.
5. **Turno en grupos:** CP-21, CP-22, CP-26, CP-24, CP-25, CP-27, CP-23.
6. **Regresión y HUD:** CP-31, CP-16, CP-33.
7. **Tutorial (sesión nueva por caso):** CP-17, CP-18, CP-34, CP-35.

**Candidatos a automatización:** todos los casos (35 de 35) pueden automatizarse con Playwright usando el hook `?test=1`, `page.keyboard` y `page.clock`; CP-04 y CP-33 conviene cubrirlos además con capturas de referencia del proyecto `visual`.
