# Plan: fidelidad visual de AngleCraft v1 (handoff al nuevo equipo)

**Fecha:** 2026-10-21
**Estado de partida:** el juego v1 es funcional y está verificado (451 pruebas, specs en `openspec/specs/`), pero **no respeta el diseño visual entregado**. Este documento explica por qué, qué fuentes de diseño usar y cómo corregirlo.

---

## 1. Diagnóstico

El diseño estaba disponible en el repositorio; no hubo bloqueo de acceso. Las causas fueron de proceso:

| Hallazgo | Evidencia |
|---|---|
| Los sprites del atlas casi no se usan | `src/js/system/Renderer.js:4` — "All drawing is placeholder/procedural". El atlas se carga (`src/js/main.js:122`) pero solo se usa para grietas (`Renderer.js:100-103`). Bloques, bola, orbes, mira y trayectoria se dibujan con primitivas. |
| Colores distintos a la maqueta | Fondo del tablero `#0B0F24` (`Renderer.js:120`) vs `#0E1117` en la maqueta. |
| Tipografías no cargadas | HUD y título usan `system-ui` (`HudView.js`, `TitleScreen.js:37`). IBM Plex Sans y JetBrains Mono solo se nombran en `styles.css`; no se incluyen los archivos de fuente. |
| Layout de paneles distinto | TELEMETRÍA y CONTROL se dibujan como texto en canvas, sin el layout, el blur ni los keycaps de la maqueta. |
| Logo no usado | `Design/Logo/` no se analizó (se confundió con un duplicado del kit de sprites). |

**Causas raíz:**
1. Los placeholders procedurales se pensaron solo para assets faltantes (partículas, destello, lanzador), pero se aplicaron a todo.
2. Ninguna spec exigía fidelidad visual; la verificación SDD solo mide comportamiento.
3. No existen pruebas de regresión visual contra la maqueta.

---

## 2. Fuentes de diseño (fuente de verdad visual)

| Fuente | Ubicación | Contenido |
|---|---|---|
| Maqueta interactiva | `Design/Game UI/Game UI (standalone) (1).html` | 3 pantallas a 1920×1080 (partida + pausa, victoria, derrota). Bundle autoextraíble con React, **fuentes woff2 incrustadas** y un generador `BBSprites`. |
| Impresión de pantallas | `Design/Game UI/pantallas-game-ui.pdf` | Las 3 pantallas de la maqueta. |
| Especificación del kit | `Design/Sprite Kit/especificacion-sprite-kit.pdf` | Spec de sprites (rangos de HP a actualizar según skills). |
| Logo | `Design/Logo/Kit de sprites puzzle brick breaker.pdf` | PDF de 1 página (1440×810). **Pendiente de analizar.** |
| Trailer (versión nueva) | `Design/Trailer/Gameplay Trailer.mp4` | Difiere de `assets/video/gameplay-trailer.mp4`; decidir cuál queda en `assets/`. |
| Proyecto Claude Design | `https://claude.ai/design/p/0d23aeda-8202-48ca-8943-1b7dc2b19de0` | Proyecto de la cuenta **bravosebas12**. Solo accesible desde esa cuenta; exportar lo relevante a `Design/`. Claude Design independiente cierra el 2026-12-14. |
| Atlas de sprites | `assets/sprites/spritesheet@{1,2,3}x.{png,json}` + `assets/sprites/svg/` | 14 frames listos para usar. |
| Tokens visuales | maqueta / `styles.css` | Fondo `#0E1117`, body `#080A0E`, grilla `#141923`, cian `#00F5D4`, ámbar `#FF9E00`, magenta `#F72585`, violeta `#7209B7`, acero `#2B2D42`, texto `#E7EAF0` / `#8A93A6`. |

Las reglas de juego siguen mandando desde las skills (`.claude/skills/`) y las specs (`openspec/specs/`). Este plan cambia **cómo se ve**, no **cómo se juega**.

---

## 3. Alcance del cambio `anglecraft-v1-visual-fidelity`

### Incluido
1. **Sprites reales** del atlas para bloques (`brick_low/mid/high/steel` → standard/reinforced/core/indestructible), grietas, bola, orbe (`orb_splitter` + etiqueta `+V`), cursor (`cursor_crosshair`) y trayectoria (`traj_dot`, `traj_bounce`, `traj_impact`). Escalado a celdas de 112×56 hasta que llegue el re-export.
2. **Tokens de color** de la maqueta en tablero, grilla, HUD y modales (una sola fuente de colores compartida entre CSS y canvas).
3. **Tipografías**: extraer IBM Plex Sans y JetBrains Mono (woff2) del HTML de la maqueta a `assets/fonts/`, cargarlas con `@font-face` y esperar `document.fonts.ready` antes de dibujar texto en canvas.
4. **Layout de la maqueta**: panel izquierdo TELEMETRÍA (340×1000 en (40,40)), tablero 1080×1000 en (420,40), panel derecho CONTROL (x=1500), con estilos de la maqueta (paneles translúcidos, keycaps, pips de bolas, barra de turnos ámbar/magenta). **Decisión de diseño pendiente:** HUD en DOM/CSS superpuesto (fiel a la maqueta) o en canvas (como hoy).
5. **Modales** de victoria y derrota con la composición de la maqueta (estrellas, métricas, botones con tecla).
6. **Pantalla de inicio** con el **logo** de `Design/Logo/` (o del proyecto Claude Design).
7. **Regresión visual**: capturas de referencia con `expect(page).toHaveScreenshot()` de Playwright para partida, pausa, victoria, derrota y título, con estado determinista vía `?test=1`.

### Fuera de alcance (otras specs)
Menú principal (HU-07), selector de niveles, ajustes, pantalla de pausa completa, niveles 7–10, nuevos assets de diseño todavía no entregados (ver `Design/solicitud-pendientes-diseno.md`).

### Criterios de aceptación
- [ ] Ninguna entidad con sprite disponible en el atlas se dibuja con primitivas.
- [ ] Colores y tipografías coinciden con la maqueta.
- [ ] Layout de paneles, modales y título coincide con la maqueta a 1920×1080 (comparación visual aprobada por diseño).
- [ ] Pruebas de captura en verde y estables (`--repeat-each=5`).
- [ ] Las 451 pruebas existentes siguen en verde; sin dependencias de runtime nuevas.

---

## 4. Pasos para el nuevo equipo

### 4.1 Preparar el equipo
1. Clonar el repositorio y usar la rama `main` (después de integrar el PR #19).
2. Instalar Node.js 22/24/26 y seguir el `README.md`: `npm ci`, `npx playwright install chromium`, `npx playwright test` (debe dar 451 pruebas en verde).
3. **Trabajar fuera de carpetas sincronizadas** (OneDrive/Dropbox): `node_modules/` es pesado y se sincroniza.
4. Iniciar sesión en Claude con la cuenta **bravosebas12** para acceder al proyecto de Claude Design y exportar a `Design/` lo que no esté en la carpeta (logo final, pantallas nuevas).

### 4.2 Analizar el diseño (antes de proponer)
1. Abrir la maqueta HTML en un navegador y capturar las 3 pantallas a 1920×1080 como referencia.
2. Renderizar los PDF (`pantallas-game-ui.pdf`, `especificacion-sprite-kit.pdf`, `Design/Logo/...pdf`); en Windows instalar poppler si se usará Claude para leerlos.
3. Extraer las fuentes woff2 incrustadas de la maqueta.
4. Confirmar con diseño la decisión DOM vs canvas para el HUD.

### 4.3 Ejecutar con SDD
1. `/gentle-sdd-new anglecraft-v1-visual-fidelity` (preflight usado en v1: automático, OpenSpec, PRs encadenados automáticos, 800 líneas).
2. Usar este documento como entrada de la exploración y las specs existentes de `openspec/specs/rendering`, `hud` y `start-screen` como base de los deltas.
3. Agregar a las specs requisitos **visuales verificables** (capturas de referencia), no solo de comportamiento.

### 4.4 Reglas aprendidas en v1 (obligatorias)
- **PRs encadenados:** antes de integrar cada PR, re-apuntarlo a la rama de feature, o integrar del último al primero. En v1 se integraron en ramas ya integradas y solo el primero llegó a la rama de feature (se corrigió con un PR de consolidación).
- **Verificación:** decidir por el código de salida de `npx playwright test` (3 corridas) y no publicar si alguna falla. No verificar mientras otro proceso esté corriendo pruebas (comparten el puerto 4173).
- **`page.clock`:** pausar relativo al tiempo actual (`pauseAt(Date.now() + 50)` evaluado en la página), nunca a un instante fijo.
- **Presupuesto:** ≤ 800 líneas por PR incluyendo pruebas; dividir si se excede.
- **Placeholders:** solo para assets que no existen; nunca reemplazar un sprite disponible.
- **Sin dependencias de runtime**: Playwright es la única dependencia y es de desarrollo.

---

## 5. Pendientes heredados

- Assets de diseño por entregar: partículas, destello de impacto, indicador del lanzador, colores por HP definitivos, re-export de bricks a 112×56, 13 sonidos de pantalla, música OGG, poster del video (`Design/solicitud-pendientes-diseno.md`).
- Sugerencias técnicas del verify de v1: reemplazar `waitForTimeout(200)` en `tests/e2e/modal-click.spec.js`; identificar una prueba inestable vista ocasionalmente; la solución del nivel 5 depende de la semilla.
- Historial completo de v1: `openspec/changes/archive/2026-10-21-anglecraft-v1-core/` (incluye `archive-report.md`).
