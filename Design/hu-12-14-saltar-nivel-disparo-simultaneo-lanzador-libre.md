# AngleCraft — HU-12, HU-13 y HU-14

**Fecha:** 2026-10-21
**Estado:** HU-14 implementada (cambio OpenSpec `anglecraft-v1-free-launcher`, casos CP-36 a CP-44). HU-12 y HU-13 listas para desarrollo (HU-13 con dos supuestos por confirmar, S-13.1 y S-13.2).
**Contexto:** HU-10 (mover el lanzador con A / D) y HU-11 (modo de disparo 1–3) están implementadas en `feature/anglecraft-v1-launcher-and-fire-mode`.

## Análisis previo: ¿el lanzador "vuelve al centro" cuando cae la bola?

**No es un bug: es el comportamiento definido.** Al aterrizar el grupo, el lanzador se reubica donde cayó su primera bola (D-10.1 y D-11.3, confirmadas por el PO el 2026-10-21). Solo vuelve al centro al cargar o reiniciar un nivel. Comprobado en la sesión del juego:

| Acción | Posición del lanzador |
|---|---|
| Inicio del nivel 1 | x = 540 (centro) |
| `A` mantenida 0,5 s | x = 300 |
| Disparo vertical (90°) desde 300 | x = 300 (la bola cae donde salió) |
| Disparo a 60° desde 300 | x = 875 (la bola rebota y cae al otro lado) |
| Disparo a 120° desde 875 | x = 300 |
| `R` (reiniciar) | x = 540 |

Según el ángulo, el salto a donde cae la bola puede parecer una "vuelta al centro". El PO pide ahora que la posición no cambie sola: eso es la **HU-14**, que reemplaza D-10.1 y D-11.3.

---

## HU-12: Avanzar de nivel libremente, sin clasificación

**Como** jugador que quiere explorar o practicar los niveles,
**quiero** pasar al nivel siguiente en cualquier momento, aunque no haya resuelto el actual,
**para** no quedarme bloqueado en un puzzle y poder ver todo el contenido.

**Impacto de negocio:**
* Reduce el abandono por bloqueo en un nivel difícil.
* Facilita demos, pruebas de diseño y revisiones de nivel.

**Regla clave:** un nivel saltado **no clasifica**: no otorga estrellas, puntos ni récord, y no cuenta como resuelto.

**Decisiones del PO:**

| ID | Decisión |
|---|---|
| D-12.1 | Saltar es **inmediato, sin confirmación**. |
| D-12.2 | La tecla es **`N`**. |
| D-12.3 | **Solo se avanza**: no hay retroceso al nivel anterior. |
| D-12.4 | El modal de **victoria** no cambia: ofrece "Siguiente nivel", no "Saltar". |
| D-12.5 | Los niveles saltados quedan **marcados como "sin resolver"** para el futuro selector de niveles (HU-07). |

### Criterios de aceptación

```gherkin
Escenario: AC1 - Saltar desde la partida
  Dado que el jugador está en el nivel 2 en Aiming, con 3 turnos usados
  Cuando pulsa N
  Entonces se carga el nivel 3 en Aiming con sus valores iniciales (turnos, tirada, lanzador al centro, modo 1)

Escenario: AC2 - Saltar con bolas en vuelo o en pausa
  Dado que el jugador está en el nivel 2 en Simulating (o con la pausa activa)
  Cuando pulsa N
  Entonces las bolas en vuelo desaparecen y se carga el nivel 3 en Aiming

Escenario: AC3 - Saltar desde la derrota
  Dado que el modal de derrota del nivel 4 está visible
  Cuando el jugador pulsa el botón "Saltar nivel [N]"
  Entonces se carga el nivel 5 en Aiming

Escenario: AC4 - Sin clasificación
  Dado que el nivel 2 no tiene récord guardado
  Cuando el jugador lo salta con N
  Entonces no se guarda ningún récord, estrella ni puntaje para el nivel 2
  Y no suena la victoria ni se muestran estrellas

Escenario: AC5 - El récord anterior se conserva
  Dado que el nivel 2 tiene un récord de 2 estrellas y 900 puntos
  Cuando el jugador vuelve a jugarlo y lo salta con N
  Entonces el récord sigue siendo 2 estrellas y 900 puntos

Escenario: AC6 - Último nivel
  Dado que el jugador está en el nivel 6
  Cuando pulsa N
  Entonces no ocurre nada y el botón "Saltar nivel" se muestra deshabilitado

Escenario: AC7 - Visible en el HUD
  Dado cualquier estado de juego dentro de un nivel
  Cuando se dibuja el panel CONTROL
  Entonces aparece el botón "Saltar nivel" con la tecla N y la fila "Saltar nivel N" en ATAJOS

Escenario: AC8 - Ignorado fuera de los niveles
  Dado que el juego está en la pantalla de inicio (Loading o Title)
  Cuando el jugador pulsa N
  Entonces no ocurre nada

Escenario: AC9 - El nivel saltado queda "sin resolver" (D-12.5)
  Dado que el nivel 3 nunca se resolvió
  Cuando el jugador lo salta con N
  Entonces el nivel 3 queda registrado como "sin resolver", sin estrellas ni puntaje
  Y si más adelante lo resuelve, se guarda su récord normalmente y deja de estar "sin resolver"

Escenario: AC10 - El modal de victoria no ofrece saltar (D-12.4)
  Dado que el modal de victoria del nivel 2 está visible
  Cuando se muestra
  Entonces ofrece "Repetir" y "Siguiente nivel", sin botón "Saltar nivel"

Escenario: AC11 - Solo avanzar (D-12.3)
  Dado que el jugador está en el nivel 3
  Cuando pulsa cualquier otra tecla o control
  Entonces no existe forma de volver al nivel 2 salvo reiniciar la sesión
```

### Preguntas abiertas (PO)
Ninguna: HU-12 lista para desarrollo.

---

## HU-13: Disparo simultáneo, sin esperar a que caigan las bolas

**Como** jugador que quiere encadenar tiros,
**quiero** lanzar el siguiente grupo de bolas mientras las anteriores siguen en el aire,
**para** combinar trayectorias y no esperar a que cada grupo aterrice.

**Impacto de negocio:**
* Partidas más dinámicas y escenas con muchas bolas a la vez (HU-04).
* Recupera la estrategia de v1 en la que una bola abre camino a la siguiente mientras sigue en vuelo.

### Criterios de aceptación

```gherkin
Escenario: AC1 - Disparar con bolas en vuelo
  Dado que el turno tiene 5 bolas, el modo es 1 y la primera bola está en vuelo
  Cuando el jugador hace clic o pulsa Espacio
  Entonces sale la segunda bola de inmediato, sin esperar a que caiga la primera
  Y quedan 3 bolas por disparar en el turno

Escenario: AC2 - Apuntar mientras vuelan las bolas
  Dado que hay bolas en vuelo y quedan bolas por disparar en el turno
  Cuando el jugador mueve el ratón
  Entonces la mira y la trayectoria se actualizan y el siguiente disparo usa ese ángulo

Escenario: AC3 - Sin bolas restantes no se dispara
  Dado que ya se dispararon las 5 bolas del turno y algunas siguen en vuelo
  Cuando el jugador hace clic
  Entonces no sale ninguna bola
  Y el botón LANZAR se muestra deshabilitado

Escenario: AC4 - El turno termina cuando aterriza la última bola
  Dado que se dispararon todas las bolas del turno de forma simultánea
  Cuando aterriza la última bola en vuelo
  Entonces el turno se resuelve (orbes, victoria o derrota) y se cuenta un turno

Escenario: AC5 - Victoria inmediata al destruir el último núcleo (D-13.1)
  Dado que hay bolas en vuelo y quedan bolas por disparar
  Cuando una bola destruye el último núcleo
  Entonces el nivel termina en Victory en ese momento
  Y las bolas en vuelo desaparecen y las que quedaban por disparar no se disparan

Escenario: AC6 - Respeta el modo de disparo
  Dado el modo 2 y un grupo en vuelo
  Cuando el jugador dispara
  Entonces salen 2 bolas más (o las que queden)

Escenario: AC7 - Pausa
  Dado que el juego está en pausa con bolas en vuelo
  Cuando el jugador hace clic
  Entonces no sale ninguna bola

Escenario: AC8 - Límite de bolas en pantalla
  Dado 50 bolas en vuelo (tope de v1)
  Cuando el jugador intenta disparar
  Entonces no sale ninguna bola hasta que alguna aterrice

Escenario: AC9 - Mover el lanzador con bolas en el aire (D-13.2)
  Dado que hay bolas en vuelo y el lanzador está en x = 540
  Cuando el jugador mantiene D 0,5 s
  Entonces el lanzador queda en x = 780 y el siguiente disparo sale desde ahí
  Y las bolas que ya estaban en vuelo no cambian su trayectoria

Escenario: AC10 - Tope de 45 s por turno (D-13.3)
  Dado que el primer disparo del turno salió hace 45 s de simulación
  Cuando se alcanza el tope
  Entonces las bolas en vuelo cuentan como aterrizadas (el daño hecho se conserva)
  Y el turno se resuelve; las bolas que no se dispararon se pierden (supuesto S-13.1)

Escenario: AC11 - Cadencia mínima de 0,08 s (D-13.4)
  Dado que el jugador acaba de disparar un grupo y quedan bolas por disparar
  Cuando vuelve a disparar 0,05 s después
  Entonces el segundo disparo se ignora
  Y si dispara de nuevo 0,08 s o más después del primero, sale el siguiente grupo
```

**Decisiones del PO:**

| ID | Decisión |
|---|---|
| D-13.1 | Se gana **en el momento** en que se destruye el último núcleo. |
| D-13.2 | **A / D funcionan con bolas en el aire.** |
| D-13.3 | El tope de **45 s se mide por turno**, desde el primer disparo del turno. |
| D-13.4 | **Cadencia mínima de 0,08 s** entre disparos (el mismo intervalo que hay entre bolas de un grupo). |

**Supuestos por confirmar:**
- S-13.1: al llegar al tope de 45 s, las bolas del turno que aún no se dispararon se pierden.
- S-13.2: la velocidad elegida (2X / 4X) se mantiene mientras haya bolas en vuelo; vuelve a 1X al empezar el turno siguiente.

### Preguntas abiertas (PO)
Ninguna: HU-13 lista para desarrollo (confirmar S-13.1 y S-13.2 en la revisión).

---

## HU-14: Posición libre del lanzador (sin reubicación automática)

**Como** jugador que controla el lanzador con A / D,
**quiero** que el lanzador se quede donde lo dejé aunque las bolas caigan en otro lugar,
**para** planificar varios tiros desde la misma posición sin que cambie sola.

**Reemplaza:** D-10.1 y D-11.3 (reubicación automática donde cae la primera bola), HU-10 AC1 y HU-11 AC4.

**Decisión del PO:** D-14.1 — **`R` (reiniciar) devuelve el lanzador a la posición inicial del nivel (centro)**, igual que cambiar de nivel.

### Criterios de aceptación

```gherkin
Escenario: AC1 - La posición no cambia al caer las bolas
  Dado que el lanzador está en x = 300
  Cuando el jugador dispara a 60° y la bola aterriza en x = 875
  Entonces el lanzador sigue en x = 300

Escenario: AC2 - La posición se mantiene entre turnos
  Dado que el lanzador está en x = 300 y el turno se resuelve
  Cuando empieza el turno siguiente
  Entonces el lanzador sigue en x = 300

Escenario: AC3 - Solo A / D mueven el lanzador
  Dado que el lanzador está en x = 300
  Cuando el jugador mantiene D 0,5 s
  Entonces el lanzador queda en x = 540 (HU-10, sin cambios)

Escenario: AC4 - Al cambiar de nivel vuelve a la posición inicial
  Dado que el lanzador está en x = 300 en el nivel 1
  Cuando se carga el nivel 2 (Siguiente nivel o Saltar nivel, HU-12)
  Entonces el lanzador está en la posición inicial del nivel 2 (centro, x = 540)

Escenario: AC5 - Reiniciar devuelve el lanzador al centro (D-14.1)
  Dado que el lanzador está en x = 300 en el nivel 2
  Cuando el jugador pulsa R
  Entonces el lanzador vuelve a la posición inicial del nivel 2 (centro, x = 540)

Escenario: AC6 - Trayectoria estable
  Dado que el jugador apunta a un punto con el lanzador en x = 300
  Cuando caen las bolas del tiro
  Entonces la trayectoria mostrada sigue saliendo de x = 300 hacia el mismo punto
```

### Preguntas abiertas (PO)
1. **Balance:** con el lanzador fijo, algunos puzzles diseñados con reubicación pueden cambiar de dificultad. ¿Se revisa el balance de los niveles 1 a 6 con diseño?

---

## Impacto y orden sugerido

| Historia | Cambia | Riesgo |
|---|---|---|
| HU-14 | Regla de reubicación (volley-economy), pruebas CP-01 y CP-22, CP-23 del nivel | Bajo: quita lógica |
| HU-12 | Input (`N`), sesión (cargar siguiente sin registrar), HUD (botón y atajo), modal de derrota | Bajo |
| HU-13 | FSM (disparar en Firing / Simulating), cadencia, HUD (LANZAR habilitado en vuelo), tope de tiempo | Medio: cambia el ciclo del turno |

Orden sugerido: **HU-14 → HU-12 → HU-13**. HU-14 simplifica HU-13, porque sin reubicación automática no hay que decidir desde dónde sale un grupo disparado con otro en vuelo.
