# Casos de prueba — Posición libre del lanzador (HU-14)

**Módulo:** core loop (lanzador, turno, reinicio) | **Ambiente:** local, Chromium (últimas 2 versiones), 1920×1080 | **Autor:** QA | **Fecha:** 2026-10-21
**Requisito / AC:** [`Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md`](../hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md) — HU-14 AC1–AC6 (decisión D-14.1). Reemplaza a HU-10 AC1 y HU-11 AC4 (casos CP-01 y CP-22 de [`hu-10-11-casos-de-prueba.md`](hu-10-11-casos-de-prueba.md)).
**Especificación:** `openspec/changes/archive/2026-10-21-anglecraft-v1-free-launcher/` (archivado; especificaciones vigentes en `openspec/specs/`)

**Supuestos:**
- S-QA1 y S-QA2 de los casos de HU-10/11 siguen vigentes: posición leída con `snapshot().launcherX`, ±2 px de tolerancia, tiempos medidos con el reloj de la página.
- S-QA5: el disparo a 60° desde x = 300 en el nivel 1 aterriza lejos del lanzador (x ≈ 875, medido en la sesión de análisis); si cambia el nivel, se elige otro ángulo que aterrice a más de 100 px.
- S-QA6: el camino "Saltar nivel" de AC4 depende de HU-12; hasta entonces AC4 se prueba con "Siguiente nivel" y se agrega el salto cuando HU-12 exista.

**Precondiciones generales:** las de HU-10/11 (sesión nueva, nivel 1 en `Aiming`, velocidad 1X, sin pausa).

**Datos de prueba:**
| Dato | Valor |
|---|---|
| Posición inicial de los niveles 1–6 | `launcher.x` = 0,5 → x = 540 |
| Posición de prueba | x = 300 (mantener `A` 0,5 s desde 540) |
| Ángulo de prueba | 60° (aterriza lejos del lanzador) |
| Soluciones | `tests/fixtures/solutions.json` con `xs` y `solutions-mode1.json` con `x` en cada paso |

## Técnicas aplicadas
- **Transición de estados:** `Aiming → Firing → Simulating → Aiming` (entre grupos) y `→ Resolving → Aiming` (entre turnos), comprobando la posición en cada vuelta a `Aiming`.
- **Partición de equivalencia:** lo que cambia la posición (A / D, cargar nivel, reiniciar) vs. lo que no (aterrizajes, tope de tiempo, cambio de turno, cambio de modo).
- **Tabla de decisión:** modo 1 / 2 / 3 × fin de grupo / fin de turno → posición sin cambios.
- **Regresión:** soluciones de los niveles 1–6 y planes de modo 1; casos CP-01 y CP-22 reescritos.

## Matriz de cobertura

| Criterio de aceptación | Casos que lo cubren |
|---|---|
| HU-14 AC1 — La posición no cambia al caer las bolas | CP-36, CP-37, CP-43 |
| HU-14 AC2 — La posición se mantiene entre turnos | CP-38 |
| HU-14 AC3 — Solo A / D mueven el lanzador | CP-39 |
| HU-14 AC4 — Al cambiar de nivel vuelve a la posición inicial | CP-40 |
| HU-14 AC5 — Reiniciar devuelve el lanzador al centro (D-14.1) | CP-41 |
| HU-14 AC6 — Trayectoria estable | CP-42 |
| Regresión — niveles ganables con el lanzador fijo | CP-44 |

## Casos

### CP-36 — Tras un grupo, el lanzador sigue donde el jugador lo dejó
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 1 en `Aiming`, modo 1, lanzador movido a x = 300.
- **Pasos:**
  1. Disparar a 60°.
  2. Esperar a que la bola aterrice y el juego vuelva a `Aiming`.
- **Resultado esperado:** la bola aterriza a más de 100 px de 300 y `launcherX` es 300.

### CP-37 — En modo 2 y 3 el lanzador no se mueve entre los grupos del turno
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 2 (5 bolas por turno), lanzador en x = 300.
- **Pasos:**
  1. Con modo 2, disparar los grupos del turno a 60° (2, 2 y 1 bolas).
  2. Repetir en un turno nuevo con modo 3 (3 y 2 bolas).
- **Resultado esperado:** en cada vuelta a `Aiming`, `launcherX` es 300.

### CP-38 — La posición se mantiene al empezar el turno siguiente
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 1, modo 1, lanzador en x = 300, último grupo del turno.
- **Pasos:**
  1. Disparar la última bola del turno a 60°.
  2. Esperar a `Resolving` y al `Aiming` del turno siguiente.
- **Resultado esperado:** los turnos usados aumentan en 1 y `launcherX` es 300.

### CP-39 — Mantener D 0,5 s desde la posición conservada lleva el lanzador a 540
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** situación final de CP-38 (x = 300 conservada de un turno anterior).
- **Pasos:**
  1. Mantener `D` 0,5 s.
- **Resultado esperado:** `launcherX` es 540 (±2 px); ninguna otra acción del caso cambió la posición.

### CP-40 — Al cargar el nivel siguiente el lanzador empieza en su posición inicial
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 1 con el lanzador en x = 300, ganado con la solución sembrada.
- **Pasos:**
  1. En el modal de victoria, pulsar "Siguiente nivel".
- **Resultado esperado:** el nivel 2 está en `Aiming` con `launcherX` = 540. Cuando exista HU-12, se repite con "Saltar nivel" (S-QA6).

### CP-41 — R devuelve el lanzador a la posición inicial del nivel
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** nivel 2 en `Aiming`, lanzador en x = 300 después de al menos un turno.
- **Pasos:**
  1. Pulsar `R`.
- **Resultado esperado:** `launcherX` es 540, el turno vuelve a 0 y el modo a 1 (regresión de CP-14 y CP-19).

### CP-42 — La trayectoria mostrada no cambia al caer las bolas
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** transición de estados · **Automatizable:** sí (e2e)
- **Precondición:** nivel 1 en `Aiming`, lanzador en x = 300, puntero fijo en un punto P del tablero.
- **Pasos:**
  1. Anotar el origen y la dirección de la trayectoria.
  2. Disparar sin mover el ratón y esperar a que el juego vuelva a `Aiming`.
- **Resultado esperado:** la trayectoria sale de x = 300 hacia P con la misma dirección que en el paso 1.

### CP-43 — El tope de 45 s no mueve el lanzador
- **Tipo:** límite · **Prioridad:** Media · **Técnica:** valores límite · **Automatizable:** sí (unidad, tope reducido)
- **Precondición:** lanzador en x = 540, un grupo cuya primera bola aterriza antes del tope y las demás quedan en bucle.
- **Pasos:**
  1. Disparar y esperar a que el tope termine el grupo.
- **Resultado esperado:** se registra `VOLLEY_CAPPED` y `launcherX` es 540.

### CP-44 — Los niveles se siguen ganando con el lanzador fijo
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** regresión · **Automatizable:** sí
- **Precondición:** soluciones con posición por tiro (`xs` / `x`).
- **Pasos:**
  1. Reproducir las soluciones de los niveles 1–6 en modo `'turn'`, colocando el lanzador antes de cada tiro.
  2. Reproducir los planes de modo 1 de los niveles 1–3.
- **Resultado esperado:** todos terminan en `Victory`, con los mismos turnos que antes de HU-14.

## Huecos de cobertura

| Hueco | Motivo |
|---|---|
| "Saltar nivel" en AC4 | Depende de HU-12 (S-QA6); se agrega a CP-40 cuando exista. |
| Dificultad percibida sin reubicación | Pregunta abierta del PO (balance); CP-44 solo prueba que los niveles se pueden ganar. |
| Niveles 4–6 en modo 1 | Siguen como pendiente conocido (`test.fixme`) hasta HU-13 o un rebalanceo. |

## Orden de ejecución sugerido

1. **Regresión de soluciones:** CP-44 (si falla, los demás casos que usan soluciones no son fiables).
2. **Regla nueva:** CP-36, CP-37, CP-38, CP-43.
3. **Movimiento y reinicio:** CP-39, CP-41, CP-40.
4. **Trayectoria:** CP-42.

**Candidatos a automatización:** los 9 casos (CP-36 a CP-44), con el hook `?test=1`, `page.keyboard` y `page.clock`.
