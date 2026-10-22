# Casos de prueba — Disparo simultáneo (HU-13)

**Módulo:** ciclo del turno (disparo, simulación, tope de tiempo, velocidad, HUD) | **Ambiente:** local, Chromium (últimas 2 versiones), 1920×1080 | **Autor:** QA | **Fecha:** 2026-10-21
**Requisito / AC:** [`Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md`](../hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md) — HU-13 AC1–AC11 (decisiones D-13.1 a D-13.4; supuestos S-13.1 y S-13.2 confirmados por el PO el 2026-10-21)
**Especificación:** `openspec/changes/archive/2026-10-22-anglecraft-v1-simultaneous-fire/` (archivado; especificaciones vigentes en `openspec/specs/`)

**Supuestos:**
- S-QA1 y S-QA2 de los casos de HU-10/11 siguen vigentes (estado con el hook `?test=1`, tiempos con el reloj de la página o pasos fijos).
- S-QA9: los tiempos de cadencia y del tope se miden en **tiempo de simulación** (escala con la velocidad); la cadencia es el intervalo entre bolas de un grupo, 1/12 s ≈ 0,083 s (el PO lo describió como 0,08 s).
- S-QA10: el modo de disparo sigue bloqueado mientras hay bolas en vuelo (HU-11, CP-30), confirmado por el PO (D-13.5).

**Precondiciones generales:** sesión nueva, nivel en `Aiming`, velocidad 1X, sin pausa, modo 1 salvo que el caso indique otro.

**Datos de prueba:**
| Dato | Valor |
|---|---|
| Nivel 2 | tirada de 5 bolas, 12 turnos |
| Cadencia | 1/12 s de simulación (10 pasos de 1/120 s a 1X) |
| Tope por turno | 45 s de simulación desde el primer disparo del turno |
| Tope de bolas | 50 por tirada (v1) |
| Soluciones | `tests/fixtures/solutions.json` (ángulos y `xs`) |

## Técnicas aplicadas
- **Transición de estados:** `Simulating → Firing` con bolas restantes; `Firing / Simulating → Resolving` por victoria inmediata o por el tope; vuelta a `Aiming` entre grupos y entre turnos.
- **Valores límite:** cadencia (0,05 s rechazado, 0,09 s aceptado), tope de 45 s, 0 bolas restantes, 50 bolas en vuelo.
- **Tabla de decisión:** bolas restantes × grupo terminado de salir × cadencia cumplida × pausa → disparo aceptado o ignorado.
- **Negativas:** disparar sin bolas, en pausa, con el grupo todavía saliendo, antes de la cadencia; cambiar de modo en vuelo.
- **Regresión:** soluciones de v1 en modo `'turn'` y en modo 1 con disparo rápido; estrellas y récords.

## Matriz de cobertura

| Criterio de aceptación | Casos que lo cubren |
|---|---|
| AC1 — Disparar con bolas en vuelo | CP-59 |
| AC2 — Apuntar mientras vuelan las bolas | CP-60 |
| AC3 — Sin bolas restantes no se dispara | CP-61 |
| AC4 — El turno termina cuando aterriza la última bola | CP-62 |
| AC5 — Victoria inmediata (D-13.1) | CP-63 |
| AC6 — Respeta el modo de disparo | CP-64 |
| AC7 — Pausa | CP-65 |
| AC8 — Límite de bolas en pantalla | CP-66 |
| AC9 — Mover el lanzador con bolas en el aire (D-13.2) | CP-67, CP-73 |
| AC10 — Tope de 45 s por turno (D-13.3, S-13.1) | CP-68 |
| AC11 — Cadencia mínima (D-13.4) | CP-69, CP-71 |
| S-13.2 — Velocidad durante el turno | CP-70 |
| HUD — LANZAR y estado del lanzador en vuelo | CP-61, CP-72 |
| Regresión — niveles 1–6 ganables en modo 1 | CP-74 |

## Casos

### CP-59 — Con una bola en vuelo, un clic dispara la siguiente de inmediato
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2, modo 1, primera bola disparada y en vuelo.
- **Pasos:**
  1. Esperar 0,1 s de simulación y hacer clic (o pulsar Espacio).
- **Resultado esperado:** sale la segunda bola sin que la primera haya aterrizado; BOLAS muestra `03 / 05` por disparar y 2 en vuelo.

### CP-60 — La mira y la trayectoria siguen al ratón con bolas en vuelo
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** bolas en vuelo y bolas por disparar en el turno.
- **Pasos:**
  1. Mover el ratón a otro punto del tablero.
  2. Disparar.
- **Resultado esperado:** la trayectoria se redibuja hacia el nuevo punto y la bola sale en esa dirección.

### CP-61 — Sin bolas restantes no sale ninguna y LANZAR queda deshabilitado
- **Tipo:** negativo · **Prioridad:** Alta · **Técnica:** valores límite · **Automatizable:** sí
- **Precondición:** las 5 bolas del turno disparadas, algunas en vuelo.
- **Pasos:**
  1. Hacer clic y pulsar Espacio.
- **Resultado esperado:** no sale ninguna bola, el estado no cambia, LANZAR se ve deshabilitado y el lanzador se dibuja deshabilitado.

### CP-62 — El turno se resuelve al aterrizar la última bola en vuelo
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** todas las bolas del turno disparadas de forma simultánea.
- **Pasos:**
  1. Esperar a que aterrice la última.
- **Resultado esperado:** el turno se resuelve una sola vez (orbes aplicados, victoria o derrota) y los turnos usados suben en 1.

### CP-63 — Al destruir el último núcleo se gana en ese momento
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** 3 bolas en vuelo, 2 por disparar y el último núcleo con 1 HP.
- **Pasos:**
  1. Dejar que una bola destruya el núcleo.
- **Resultado esperado:** en el mismo paso no queda ninguna bola en vuelo, se muestra la victoria, las 2 bolas restantes no se disparan y las estrellas dependen solo de los turnos usados.

### CP-64 — Cada disparo en vuelo respeta el modo
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 2, modo 2, un grupo de 2 en vuelo.
- **Pasos:**
  1. Disparar; luego disparar otra vez.
- **Resultado esperado:** salen 2 bolas y después 1 (las que quedan).

### CP-65 — En pausa no se dispara aunque haya bolas restantes
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** bolas en vuelo, bolas restantes, pausa activa.
- **Pasos:**
  1. Hacer clic y pulsar Espacio.
- **Resultado esperado:** no sale ninguna bola; al quitar la pausa se puede disparar.

### CP-66 — Nunca hay más de 50 bolas en vuelo
- **Tipo:** límite · **Prioridad:** Media · **Técnica:** valores límite · **Automatizable:** sí
- **Precondición:** tirada de 50 bolas (tope de v1), modo 3, suelo sellado para que no aterricen.
- **Pasos:**
  1. Disparar en vuelo hasta agotar las bolas del turno e intentar uno más.
- **Resultado esperado:** hay 50 bolas en vuelo como máximo y el disparo extra se ignora.

### CP-67 — Mover el lanzador con bolas en el aire
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** bolas en vuelo, lanzador en x = 540, bolas restantes.
- **Pasos:**
  1. Mantener D 0,5 s.
  2. Disparar.
- **Resultado esperado:** el lanzador queda en x = 780 (±2); la bola nueva sale desde 780; las bolas que ya volaban siguen la misma trayectoria que tendrían sin mover el lanzador.

### CP-68 — El tope de 45 s por turno resuelve el turno y pierde las bolas sin disparar
- **Tipo:** límite · **Prioridad:** Alta · **Técnica:** valores límite · **Automatizable:** sí (unidad, tope reducido)
- **Precondición:** turno de 5 bolas, 2 disparadas en bucle, primer disparo hace 45 s de simulación (el último hace menos).
- **Pasos:**
  1. Avanzar hasta el tope.
- **Resultado esperado:** 0 bolas en vuelo, el daño hecho se conserva, las 3 bolas sin disparar se pierden, el turno se resuelve y se registra `VOLLEY_CAPPED`.

### CP-69 — Un segundo disparo antes de la cadencia se ignora
- **Tipo:** límite · **Prioridad:** Media · **Técnica:** valores límite · **Automatizable:** sí
- **Precondición:** un grupo recién disparado y bolas restantes.
- **Pasos:**
  1. Disparar 0,05 s de simulación después.
  2. Disparar 0,09 s después del primero.
- **Resultado esperado:** paso 1 ignorado; paso 2 sale el siguiente grupo.

### CP-70 — La velocidad se mantiene durante el turno y vuelve a 1X en el siguiente
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** modo 1, turno de 5 bolas.
- **Pasos:**
  1. Con la primera bola en vuelo, pulsar 4.
  2. Dejar que aterrice (vuelta a `Aiming` con bolas restantes) y disparar otra.
  3. Terminar el turno.
- **Resultado esperado:** paso 2: la velocidad sigue en 4X; paso 3: al empezar el turno siguiente vuelve a 1X.

### CP-71 — Con el grupo todavía saliendo, disparar se ignora y el grupo conserva su origen
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** modo 3, grupo disparado desde x = 540 que ha sacado 2 de sus 3 bolas.
- **Pasos:**
  1. Disparar y mantener D.
- **Resultado esperado:** el disparo se ignora; las 3 bolas del grupo salen desde x = 540; el siguiente grupo saldrá desde la nueva posición.

### CP-72 — El lanzador se ve listo en vuelo mientras quedan bolas y deshabilitado al agotarlas
- **Tipo:** funcional positivo · **Prioridad:** Baja · **Técnica:** partición de equivalencia · **Automatizable:** sí (navegador)
- **Precondición:** bolas en vuelo.
- **Pasos:**
  1. Observar el lanzador con bolas restantes y después de disparar la última.
- **Resultado esperado:** anillo cian con chevrones mientras quedan bolas; anillo gris sin brillo cuando ya no quedan.

### CP-73 — En pausa A / D no mueven el lanzador aunque haya bolas en vuelo
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** bolas en vuelo, lanzador en x = 540, pausa activa.
- **Pasos:**
  1. Mantener A 0,5 s.
- **Resultado esperado:** el lanzador sigue en x = 540. (Reemplaza la parte "con un grupo en vuelo" de CP-10.)

### CP-74 — Los niveles 1 a 6 se ganan en modo 1 disparando a la cadencia
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** regresión · **Automatizable:** sí
- **Precondición:** soluciones de v1 con posición por tiro.
- **Pasos:**
  1. En cada nivel, en modo 1, disparar las bolas de cada turno una por disparo, cada 1/12 s, al ángulo de la solución.
- **Resultado esperado:** los 6 niveles terminan en victoria con los mismos turnos que en modo `'turn'`.

## Huecos de cobertura

| Hueco | Motivo |
|---|---|
| Cambiar de modo con bolas en vuelo | Fuera de alcance: el PO lo mantiene bloqueado (D-13.5). |
| Rendimiento a 60 FPS con 50 bolas disparadas en vuelo | Lo cubre la prueba de estrés de v1 (`&stress=1`); no se agrega caso propio. |
| Firefox, Edge y Opera | Automatización solo en Chromium (E1). |

## Orden de ejecución sugerido

1. **Sesión:** CP-59, CP-61, CP-64, CP-65, CP-69, CP-71, CP-66.
2. **Fin de turno:** CP-62, CP-63, CP-68, CP-70.
3. **Lanzador:** CP-67, CP-73, CP-72.
4. **Regresión:** CP-74, y luego CP-60 en el juego real.

**Candidatos a automatización:** los 16 casos (CP-59 a CP-74).
