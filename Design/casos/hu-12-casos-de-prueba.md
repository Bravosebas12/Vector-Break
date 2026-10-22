# Casos de prueba — Saltar nivel sin clasificación (HU-12)

**Módulo:** progresión de niveles (entrada, sesión, récords, HUD) | **Ambiente:** local, Chromium (últimas 2 versiones), 1920×1080 | **Autor:** QA | **Fecha:** 2026-10-21
**Requisito / AC:** [`Design/hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md`](../hu-12-14-saltar-nivel-disparo-simultaneo-lanzador-libre.md) — HU-12 AC1–AC11 (decisiones D-12.1 a D-12.5)
**Especificación:** `openspec/changes/archive/2026-10-21-anglecraft-v1-skip-level/` (archivado; especificaciones vigentes en `openspec/specs/`)

**Supuestos:**
- S-QA1 y S-QA2 de los casos de HU-10/11 siguen vigentes (estado leído con el hook `?test=1`, tiempos con el reloj de la página).
- S-QA7: la marca "sin resolver" no se muestra en v1 (el selector es HU-07); se verifica en `localStorage` (`anglecraft.v1.skipped`) y con `status(nivel)` del módulo de progresión.
- S-QA8: la ubicación del botón "Saltar nivel" (cabecera de CONTROL) es una propuesta pendiente de revisión de diseño; los casos verifican presencia, tecla y estado, no la posición exacta.

**Precondiciones generales:** sesión nueva (almacenamiento vacío salvo que el caso indique otro), clic en la pantalla de inicio, velocidad 1X, sin pausa.

**Datos de prueba:**
| Dato | Valor |
|---|---|
| Niveles | 6 (`level1.json` … `level6.json`); el nivel 6 es el último |
| Nivel 2 | 12 turnos, tirada inicial 5 |
| Nivel 3 | 12 turnos, tirada inicial 8 |
| Récord de prueba | nivel 2: `{ stars: 2, score: 900, shots: 5 }` |
| Claves de almacenamiento | `anglecraft.v1.records`, `anglecraft.v1.skipped` |

## Técnicas aplicadas
- **Transición de estados:** `SKIP` desde `Aiming`, `Firing`, `Simulating`, `Resolving`, `GameOver` y en pausa → `Aiming` del nivel siguiente; ignorado en `Loading`, `Title` y `Victory`.
- **Valores límite:** nivel 5 → 6 (último salto válido) y nivel 6 (sin siguiente).
- **Tabla de decisión:** nivel con o sin récord × saltar / ganar → récord y estado (`resolved`, `unsolved`, `unplayed`).
- **Negativas:** `N` mantenida (repetición), `N` en victoria, en la pantalla de inicio, en el último nivel; ninguna forma de volver atrás.
- **Regresión:** "Siguiente nivel" sigue exigiendo ganar; récords intactos; lanzador al centro (HU-14 AC4).

## Matriz de cobertura

| Criterio de aceptación | Casos que lo cubren |
|---|---|
| AC1 — Saltar desde la partida | CP-45 |
| AC2 — Saltar con bolas en vuelo o en pausa | CP-46, CP-47 |
| AC3 — Saltar desde la derrota | CP-48, CP-49 |
| AC4 — Sin clasificación | CP-50 |
| AC5 — El récord anterior se conserva | CP-51 |
| AC6 — Último nivel | CP-52 |
| AC7 — Visible en el HUD | CP-53 |
| AC8 — Ignorado fuera de los niveles | CP-54 |
| AC9 — El nivel saltado queda "sin resolver" | CP-55 |
| AC10 — El modal de victoria no ofrece saltar | CP-56 |
| AC11 — Solo avanzar | CP-57 |
| Regresión — "Siguiente nivel" y lanzador tras un salto | CP-58 |

## Casos

### CP-45 — N en Aiming carga el nivel siguiente con sus valores iniciales
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2 en `Aiming`, 3 turnos usados, lanzador en x = 300, modo 2.
- **Pasos:**
  1. Pulsar `N`.
- **Resultado esperado:** nivel 3 en `Aiming`, 0 turnos usados de 12, tirada de 8 bolas, lanzador en x = 540, modo 1; se oye `sfx_ui_confirm`.

### CP-46 — N con bolas en vuelo las quita y carga el nivel siguiente
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2 en `Simulating` con bolas activas.
- **Pasos:**
  1. Pulsar `N`.
- **Resultado esperado:** 0 bolas activas, nivel 3 en `Aiming`; ningún golpe del tiro anterior se aplica al nivel 3.

### CP-47 — N en pausa salta y quita la pausa
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 2 en pausa (`P`).
- **Pasos:**
  1. Pulsar `N`.
- **Resultado esperado:** nivel 3 en `Aiming`, sin pausa ni capa de pausa visible.

### CP-48 — El botón "Saltar nivel" del modal de derrota carga el nivel siguiente
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí (e2e)
- **Precondición:** derrota del nivel 4 (modal "Puzzle no resuelto" visible).
- **Pasos:**
  1. Hacer clic en "Saltar nivel".
- **Resultado esperado:** nivel 5 en `Aiming`; se oyen `sfx_ui_click` y `sfx_ui_confirm`; el modal desaparece.

### CP-49 — N con el modal de derrota visible carga el nivel siguiente
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** derrota del nivel 4.
- **Pasos:**
  1. Pulsar `N`.
- **Resultado esperado:** nivel 5 en `Aiming`. `Enter` y `R` siguen reiniciando el nivel 4 (regresión).

### CP-50 — Saltar no clasifica: sin récord, estrellas, puntos ni sonido de victoria
- **Tipo:** negativo · **Prioridad:** Alta · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 2 sin récord; daño causado en el nivel (puntos > 0).
- **Pasos:**
  1. Pulsar `N`.
- **Resultado esperado:** `anglecraft.v1.records` no tiene entrada para el nivel 2; no se emitieron `STARS` ni el estado `Victory`; no sonaron `sfx_victory` ni `sfx_star_*`; no se mostró ningún modal.

### CP-51 — Saltar un nivel ya resuelto conserva su récord
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** récord del nivel 2 = 2 estrellas, 900 puntos.
- **Pasos:**
  1. Jugar el nivel 2 y pulsar `N` a mitad.
- **Resultado esperado:** el récord sigue siendo 2 estrellas y 900 puntos; el estado del nivel 2 es `resolved`.

### CP-52 — En el último nivel saltar no hace nada y los botones se ven deshabilitados
- **Tipo:** límite · **Prioridad:** Alta · **Técnica:** valores límite · **Automatizable:** sí
- **Precondición:** nivel 6 en `Aiming`; luego, derrota del nivel 6.
- **Pasos:**
  1. Pulsar `N`; hacer clic en "Saltar nivel" del panel CONTROL.
  2. Con la derrota, hacer clic en "Saltar nivel" del modal.
- **Resultado esperado:** el nivel 6 sigue activo en ambos pasos; los dos botones se muestran deshabilitados (45 % de opacidad); "Reiniciar puzzle" sigue siendo el principal.
- **Contraste (límite):** en el nivel 5, `N` carga el nivel 6.

### CP-53 — El panel CONTROL muestra "Saltar nivel" con la tecla N y la fila de ATAJOS
- **Tipo:** funcional positivo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí (navegador)
- **Precondición:** nivel 2 en `Aiming`.
- **Pasos:**
  1. Leer la cabecera y la lista ATAJOS del panel CONTROL.
- **Resultado esperado:** botón "Saltar nivel" con tecla `N` habilitado; la última fila de ATAJOS es "Saltar nivel" `N`; el panel cabe en sus 1000 px sin barra de desplazamiento.

### CP-54 — N se ignora en la carga y en la pantalla de inicio
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** página recién abierta.
- **Pasos:**
  1. Pulsar `N` durante `Loading`.
  2. Pulsar `N` en `Title`.
- **Resultado esperado:** el estado no cambia en ninguno de los dos pasos; al hacer clic, la partida empieza en el nivel 1.

### CP-55 — El nivel saltado queda "sin resolver" y deja de estarlo al ganarlo
- **Tipo:** funcional positivo · **Prioridad:** Alta · **Técnica:** tabla de decisión · **Automatizable:** sí
- **Precondición:** nivel 3 sin récord.
- **Pasos:**
  1. Saltar el nivel 3 con `N`.
  2. Recargar la página y leer el estado del nivel 3.
  3. Jugar de nuevo hasta el nivel 3 y ganarlo.
- **Resultado esperado:** paso 2: `anglecraft.v1.skipped` incluye el nivel 3 y su estado es `unsolved`; paso 3: se guarda su récord y su estado es `resolved`.

### CP-56 — El modal de victoria no ofrece saltar y N no hace nada en victoria
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** victoria del nivel 2.
- **Pasos:**
  1. Leer los botones del modal.
  2. Pulsar `N`.
- **Resultado esperado:** solo "Repetir" y "Siguiente nivel"; tras `N` sigue la victoria del nivel 2; "Saltar nivel" del panel CONTROL se muestra deshabilitado.

### CP-57 — No existe forma de volver al nivel anterior
- **Tipo:** negativo · **Prioridad:** Media · **Técnica:** partición de equivalencia · **Automatizable:** sí
- **Precondición:** nivel 3 alcanzado saltando el nivel 2.
- **Pasos:**
  1. Probar cada tecla mapeada y cada acción de los botones (Reiniciar, Repetir, Siguiente nivel, Saltar nivel).
- **Resultado esperado:** el índice de nivel nunca baja de 3; solo recargar la página vuelve al nivel 1.

### CP-58 — Tras un salto, "Siguiente nivel" sigue exigiendo ganar y el lanzador empieza en el centro
- **Tipo:** regresión · **Prioridad:** Alta · **Técnica:** transición de estados · **Automatizable:** sí
- **Precondición:** nivel 1 con el lanzador en x = 300.
- **Pasos:**
  1. Pulsar `N`.
  2. En el nivel 2, ganar y usar "Siguiente nivel".
- **Resultado esperado:** paso 1: nivel 2 con el lanzador en x = 540 (HU-14 AC4, CP-40); paso 2: carga el nivel 3; el nivel 1 sigue sin récord.

## Huecos de cobertura

| Hueco | Motivo |
|---|---|
| Posición y estilo final del botón "Saltar nivel" | Pendiente de revisión de diseño (S-QA8); las capturas de referencia se regeneran si cambia. |
| Mostrar "sin resolver" en un selector | El selector de niveles es HU-07, fuera de alcance; aquí solo se guarda la marca. |
| Firefox, Edge y Opera | Automatización solo en Chromium (E1). |

## Orden de ejecución sugerido

1. **Sesión:** CP-45, CP-46, CP-47, CP-49, CP-52, CP-54, CP-56, CP-57.
2. **Progresión:** CP-50, CP-51, CP-55, CP-58.
3. **HUD y flujo real:** CP-53, CP-48.

**Candidatos a automatización:** los 14 casos (CP-45 a CP-58) con el hook `?test=1`, `page.keyboard` y la inspección de `localStorage`.
