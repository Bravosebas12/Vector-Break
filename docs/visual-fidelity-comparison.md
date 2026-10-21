# Comparación visual: juego vs. diseño (AngleCraft v1)

**Fecha:** 2026-10-21
**Cambio:** `openspec/changes/anglecraft-v1-visual-fidelity/`
**Estado:** pendiente de aprobación de diseño

Este documento pone cada captura de referencia del juego (pruebas visuales de Playwright, 1920×1080, DPR 1, Chromium) junto a la pantalla equivalente de la maqueta o del Key Art. Cuando diseño apruebe, estas capturas quedan como referencia: cualquier cambio visual futuro hará fallar `npx playwright test --project=visual` hasta que se apruebe y se regeneren.

Las reglas del juego mandan sobre la maqueta: todas las diferencias intencionales están listadas abajo con la regla que las justifica.

## 1. Partida en curso

| Maqueta (pantalla 01) | Juego (`aiming`) |
|---|---|
| ![Maqueta 01](visual-fidelity/mockup-01.png) | ![Juego apuntando](../tests/visual/screens.spec.js-snapshots/aiming-visual-win32.png) |

Coincide: fondo, tablero, sprites de bloques/bola/orbe, números de HP, trayectoria punteada con marcador, mira, lanzador, paneles TELEMETRÍA y CONTROL, keycaps, indicadores de bolas y barra de turnos.

## 2. Pausa

| Maqueta (pantalla 01 con pausa) | Juego (`paused`) |
|---|---|
| ![Maqueta 01](visual-fidelity/mockup-01.png) | ![Juego en pausa](../tests/visual/screens.spec.js-snapshots/paused-visual-win32.png) |

La maqueta muestra la pausa como un interruptor sobre la pantalla 01: desenfoque solo sobre el tablero, píldora "PAUSA [P]", estado ámbar en TELEMETRÍA y botón "Seguir".

## 3. Victoria

| Maqueta (pantalla 02) | Juego (`victory`, 2 estrellas) |
|---|---|
| ![Maqueta 02](visual-fidelity/mockup-02.png) | ![Juego victoria](../tests/visual/screens.spec.js-snapshots/victory-visual-win32.png) |

## 4. Derrota

| Maqueta (pantalla 03) | Juego (`defeat`) |
|---|---|
| ![Maqueta 03](visual-fidelity/mockup-03.png) | ![Juego derrota](../tests/visual/screens.spec.js-snapshots/defeat-visual-win32.png) |

## 5. Pantalla de inicio

| Key Art | Juego (`title`) |
|---|---|
| ![Key Art](../assets/art/key-art.webp) | ![Juego título](../tests/visual/screens.spec.js-snapshots/title-visual-win32.png) |

El Key Art se exporta sin su texto (`scripts/export-key-art.mjs`) y el juego dibuja encima el nombre, el lema y la carga.

## 6. Diferencias intencionales

| Diferencia | Maqueta / Key Art | Juego | Regla |
|---|---|---|---|
| Métrica PRECISIÓN | Panel TELEMETRÍA y modal de victoria | Se reemplaza por TIEMPO (panel) y PUNTOS (modal) | A6: precisión eliminada de v1 |
| Atajo "Menú — Esc" | Listado en ATAJOS | No aparece; se listan Velocidad, Pausa y Reiniciar | C2: sin menú `Esc` en v1 |
| Atajo "Cancelar tiro — Clic der." | Listado en ATAJOS | No aparece | C3: sin cancelar con clic derecho en v1 |
| Tablero | 8 columnas de bloques 128×64 | 9×12 celdas de 112×56 (sprites escalados) | B1 |
| `PUZZLE 01 / 24` | 24 puzzles | `PUZZLE 01 / 06` | D3_count: 6 niveles en v1 |
| Récord en TIEMPO del modal | "récord 01:38.0" | Sin récord de tiempo; el récord va en PUNTOS ("récord N pts" o "nuevo récord") | A5: los récords guardan estrellas, puntos y tiros |
| Rangos de HP en los números | 1–10 / 20–100 / 200–500 | 1–15 / 20–80 / 100–500 | Skills del proyecto (pendiente 2.1 de diseño) |
| Posición del nombre en el inicio | Abajo a la izquierda ("STAGE 27", "×72 BOLAS", "136.5°") | Centrado en x = 960, sin datos de etapa | HU-09: título centrado |
| Lema | "Un ángulo. Setenta y dos bolas. Cero margen de error." | "Un ángulo. Cero margen de error." | A10_v1_cap: tope de 50 bolas (OI-1, a confirmar) |
| Etiqueta del orbe | Solo el símbolo `+` | `+V` arriba a la derecha del orbe | A11: mostrar el valor del orbe |
| Daño del bloque | Grietas | Grietas (sin variación de color por HP) | Pendiente 2.5 de diseño |
| Destello, partículas, chispas | No especificados | Procedurales con los colores del tema | Pendientes 2.3 y 2.4 de diseño |

## 7. Pendientes de diseño que afectan lo visual

- **OI-1:** confirmar el lema del título (72 bolas vs. tope de 50).
- **OI-2:** colores por nivel de HP para cada tipo de bloque (pendiente 2.5).
- **OI-3:** reexportar bricks y grietas a 112×56 (pendiente 2.2).
- **OI-4:** sprite del lanzador (pendiente 2.6); hoy se dibuja con el estilo del Key Art.

## 8. Cómo actualizar las referencias

1. Hacer el cambio visual y revisarlo con diseño.
2. Regenerar: `npx playwright test --project=visual --update-snapshots`.
3. Verificar estabilidad: `npx playwright test --project=visual --repeat-each=5`.
4. Actualizar las capturas de este documento si cambia la maqueta (`docs/visual-fidelity/mockup-0N.png`).

Las referencias tienen sufijo de plataforma (`-win32`): se generaron en Windows. Para correrlas en otro sistema operativo hay que generar las suyas en ese sistema.
