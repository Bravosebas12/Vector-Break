# AngleCraft — Solicitud de pendientes de diseño

**Fecha:** 2026-10-20
**Alcance:** pantallas ya diseñadas (Partida, Victoria, Derrota). El menú principal, el selector de nivel, los ajustes y la pantalla de pausa completa quedan fuera; irán en otra especificación.
**Fuente de verdad:** cuando el diseño y las reglas técnicas del juego (skills del proyecto) no coinciden, mandan las reglas técnicas.

---

## 1. Resumen

| # | Pendiente | Tipo | Prioridad | Historia relacionada |
|---|-----------|------|-----------|----------------------|
| 1 | Ajustar los rangos de HP del kit | Especificación | Alta | HU-02 |
| 2 | Redimensionar el tablero a 9 columnas | Layout + sprites | Alta | HU-01, HU-02 |
| 3 | Partículas de destrucción | Sprites | Alta | HU-02 (Esc. 2) |
| 4 | Destello de impacto | Sprites | Alta | HU-02 (Esc. 1) |
| 5 | Transición de color según el HP restante | Especificación | Media | HU-02 (Esc. 1) |
| 6 | Indicador del lanzador | Sprite | Media | HU-01 |
| 7 | Sonidos de las pantallas diseñadas | Audio | Alta | HU-03, HU-05 |
| 8 | Poster del video y música optimizada para web | Archivos | Media | — |

---

## 2. Detalle

### 2.1 Rangos de HP del kit

El kit actual define 1–10, 20–100 y 200–500. Deben quedar así:

| Sprite actual | Tipo en el juego | HP |
|---------------|------------------|----|
| `brick_low` | standard | 1–15 |
| `brick_mid` | reinforced | 20–80 |
| `brick_high` | core | 100–500 |
| `brick_steel` | indestructible | sin HP |

**Entregable:** `especificacion-sprite-kit.pdf` y las pantallas actualizadas con estos rangos. No hacen falta sprites nuevos.

### 2.2 Tablero de 9 columnas × 12 filas

El tablero mide 1080 × 1000 px y hoy aloja 8 columnas de bloques de 128 × 64. Con 9 columnas, los bloques de 128 px no caben (9 × 128 = 1152 px).

**Se solicita:**
- Un nuevo tamaño de bloque (sugerido: **112 × 56**, proporción 2:1; 9 × 112 = 1008 px más márgenes).
- Que los bloques, los overlays `crack_*`, el destello (2.4) y el flash del acero se reexporten a ese tamaño.
- El layout del tablero con 12 filas y la posición de la línea de lanzamiento.

### 2.3 Partículas de destrucción

Cuando el HP de un bloque llega a 0, este "se pulveriza con partículas expansivas".

**Se solicita:**
- 3 o 4 formas de partícula (fragmento, chispa, polvo) de 8 a 16 px, en blanco o escala de grises para teñirlas por código.
- Una variante de color por tipo de bloque: cian (standard), ámbar (reinforced) y gradiente magenta/violeta (core).
- Una referencia de movimiento: cantidad sugerida, duración (unos 400 ms), dispersión y desvanecimiento.
- Opcional: una explosión mayor solo para los núcleos.

### 2.4 Destello de impacto

Cada golpe debe producir una reacción visual inmediata en el bloque.

**Se solicita:**
- `hit_flash`: un overlay del tamaño del bloque, blanco con alfa, que se aplica durante unos 60 ms.
- `hit_flash_steel`: una variante metálica para el acero, que no recibe daño pero rebota.
- `spark`: una chispa de 16 × 16 que se dibuja en el punto exacto de contacto.

### 2.5 Transición de color según el HP restante

HU-02 pide que el color de cada bloque cambie según la vida que le queda.

**Se solicita:** de 3 a 5 colores por tipo de bloque (standard, reinforced, core) ordenados de HP lleno a HP casi agotado, y los colores del texto de HP para cada uno. Debe ser compatible con los overlays `crack_30`, `crack_60` y `crack_90`.

### 2.6 Indicador del lanzador

Hoy el lanzador solo se representa con la bola de origen.

**Se solicita:** un marcador de la posición de lanzamiento, que cambia de una tirada a otra según dónde cae la primera bola, y su estado deshabilitado mientras corre la simulación.

### 2.7 Sonidos de las pantallas diseñadas

Formato: WAV de 48 kHz, 24 bits, estéreo, con pico a −3 dBFS, sin silencio inicial y nombres exactos.

| Archivo | Duración | Evento |
|---------|----------|--------|
| `sfx_ui_pause_in.wav` | ~150 ms | Pausa (`P`) |
| `sfx_ui_pause_out.wav` | ~150 ms | Reanudar (`P`) |
| `sfx_speed_x1.wav` / `x2` / `x4` | ~80 ms | Cambio de velocidad (`1`, `2`, `4`) |
| `sfx_aim_cancel.wav` | ~120 ms | Cancelar tiro (clic derecho) |
| `sfx_turns_warning.wav` | ~250 ms | Quedan 3 turnos (estado ámbar) |
| `sfx_turns_critical.wav` | ~300 ms | Queda 1 turno (estado magenta) |
| `sfx_victory.wav` | ~1,5 s | Aparición del modal de victoria |
| `sfx_star_1.wav` / `_2` / `_3` | ~300 ms | Cada estrella obtenida |
| `sfx_defeat.wav` | ~1,2 s | Aparición del modal de derrota |

Los sonidos que ya existen se reutilizan: `sfx_burst_launch` para lanzar, `sfx_ui_click` y `sfx_ui_confirm` para los botones Repetir, Siguiente y Reiniciar.

**Prompt de referencia para producirlos:**

```
Create a set of game UI sound effects for "AngleCraft", a minimalist sci-fi physics puzzle
(brick breaker) for PC. Visual style: dark terminal UI (#0E1117 background) with neon cyan
(#00F5D4), amber (#FF9E00) and magenta (#F72585) accents; clean, precise, "analytical lab" mood.
Sonic palette: clean synthesized tones, soft digital transients, subtle glassy/metallic
character, no voices, no orchestral or cartoon sounds. Must sit under a 95 BPM background loop
and match existing SFX (short sine-like blips around 1.3–1.7 kHz, a 400 Hz metallic steel hit).

Technical spec for every file: WAV, 48 kHz, 24-bit, stereo, peak -3 dBFS, no leading silence,
natural tail with no clicks, trimmed to the stated length.

Files:
1. sfx_ui_pause_in.wav (≈150 ms) – descending soft "power-down" blip; feels like freezing time.
2. sfx_ui_pause_out.wav (≈150 ms) – mirror of pause_in, ascending "resume" blip.
3. sfx_speed_x1.wav / sfx_speed_x2.wav / sfx_speed_x4.wav (≈80 ms each) – same tick timbre;
   x1 = 1 pulse, x2 = 2 quick pulses, x4 = 4 rapid pulses, each slightly higher in pitch.
4. sfx_aim_cancel.wav (≈120 ms) – short soft downward swipe/"retract"; neutral, not an error buzz.
5. sfx_turns_warning.wav (≈250 ms) – amber-tone two-note alert, subtle; plays when 3 turns remain.
6. sfx_turns_critical.wav (≈300 ms) – magenta-tone, more tense version; plays when 1 turn remains.
7. sfx_victory.wav (≈1.5 s) – bright rising synth arpeggio resolving to a major chord; satisfying,
   "puzzle solved" feeling, not triumphant fanfare.
8. sfx_star_1.wav / sfx_star_2.wav / sfx_star_3.wav (≈300 ms each) – crystalline chime, each a
   step higher in the same scale; star_3 slightly richer with a short shimmer tail.
9. sfx_defeat.wav (≈1.2 s) – descending minor phrase with a soft low-pass fade; calm, not punishing,
   invites a quick retry.

Deliver as individual files with exactly these names.
```

### 2.8 Archivos (rutas del repositorio)

- Poster frame del video: `assets/video/gameplay-trailer-poster.jpg` (1920 × 1080, JPG, ≤ 300 KB), un cuadro representativo del trailer para el atributo `poster`.
- Optimizar la música para web: `assets/audio/music_loop_95bpm_64bars.wav` pesa 45 MB. Se solicita una versión OGG/Opus (~160 kbps) que conserve el punto de loop exacto (161,684 s).

---

## 3. Formato de entrega de sprites

Todo sprite nuevo se agrega al atlas actual con el mismo formato:

- `spritesheet@1x/@2x/@3x.png` + `.json`, con `meta.image`, `meta.scale`, `meta.size` y `frames.{nombre}` → `{x, y, w, h}`.
- Separación de 4 px × escala entre frames.
- Nombres en `snake_case`: `hit_flash`, `hit_flash_steel`, `spark`, `particle_*`, `launcher`, `launcher_disabled`.
- El SVG fuente de cada sprite nuevo va en `assets/sprites/svg/`.

## 4. Ya entregado (no requiere acción)

- Atlas `assets/sprites/spritesheet@1x/@2x/@3x` (PNG + JSON) con 14 frames, coherente en las tres escalas.
- 14 SVG fuente en `assets/sprites/svg/`.
- 18 SFX de juego y el loop musical en `assets/audio/`. Los sonidos de la sección 2.7 son **adicionales**: ninguno reemplaza ni duplica estos 18.
- Video de presentación: `assets/video/gameplay-trailer.mp4`.

## 5. Nota para producto (fuera de diseño)

- HU-03, escenario 3: cambiar "quedan bloques destructibles" por **"quedan núcleos activos"**, que es la regla de derrota confirmada.
