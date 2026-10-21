# AngleCraft — HU-10 y HU-11: mover el lanzador y modo de disparo

**Fecha:** 2026-10-21
**Estado:** refinadas con PO y listas para desarrollo (decisiones D-10.1 a D-11.4)
**Contexto actual (v1):** el lanzador se reubica solo, al final de cada turno, en la `x` donde aterrizó la primera bola (volley-economy). Cada turno emite **toda la tirada** en secuencia (una bola cada 1/12 s); la tirada empieza en `startBalls` del nivel (por ejemplo 5 en el nivel 2) y crece con los orbes hasta 50. El nivel tiene un límite de turnos (por ejemplo 12).
**Teclas ya ocupadas:** `Espacio` (lanzar), `1` `2` `4` (velocidad), `P` (pausa), `R` (reiniciar), `Enter` (acción del modal). `A`, `D` y `M` están libres.

## Decisiones del PO (2026-10-21)

| ID | Decisión |
|---|---|
| D-10.1 | El lanzador **sigue reubicándose automáticamente** donde aterriza la primera bola; A/D es un ajuste manual posterior. |
| D-10.2 | Desde esa posición el movimiento con A/D es **libre por todo el ancho inferior**, sin importar dónde cayó la bola, y **se detiene en el borde del tablero** aunque la tecla siga presionada. |
| D-11.1 | **Opción A:** la tirada del turno se dispara en grupos de 1, 2 o 3 bolas; el turno no termina hasta haber disparado y recogido todas las bolas de la tirada. El número de turnos del nivel no cambia. |
| D-11.2 | El modo **no da ventaja ni tiene costo**: puntos, estrellas y récords se calculan igual que en v1. |
| D-11.3 | El lanzador se reubica automáticamente **después de cada grupo** (no solo al final del turno), donde aterrizó la primera bola de ese grupo; el jugador puede reajustar con A/D antes del siguiente grupo. |
| D-11.4 | Los orbes capturados en cualquier grupo se suman a la tirada de los **turnos siguientes** (como en v1, HU-04), no al turno en curso. |

---

## HU-10: Ajuste manual de la posición del lanzador con A y D

**Como** jugador de puzzles en PC que planifica cada tiro,
**quiero** mover el lanzador a la izquierda con `A` y a la derecha con `D` antes de disparar, desde donde quedó tras el último tiro,
**para** elegir el punto de salida que mejor abre el ángulo hacia el núcleo, sin quedar atado a dónde cayó la primera bola.

**Impacto de negocio:**
* Más control táctico y menos tiros "forzados" por la posición heredada: baja la frustración en los niveles 4 a 6.
* Abre espacio para puzzles que exigen elegir posición además de ángulo.

### Criterios de aceptación

```gherkin
Escenario: AC1 - La reubicación automática se mantiene
  Dado que un tiro termina y la primera bola aterrizó en x = 700
  Cuando el juego vuelve a Aiming
  Entonces el lanzador está en x = 700, como en v1

Escenario: AC2 - Mover el lanzador a la izquierda
  Dado que el juego está en Aiming, sin pausa, con el lanzador en x = 540
  Cuando el jugador mantiene pulsada la tecla A durante 0,5 s
  Entonces el lanzador se desplaza hacia la izquierda a velocidad constante y queda en x = 300
  Y la previsualización de la trayectoria se recalcula desde la nueva posición en el mismo cuadro

Escenario: AC3 - Mover el lanzador a la derecha
  Dado que el juego está en Aiming, sin pausa, con el lanzador en x = 540
  Cuando el jugador mantiene pulsada la tecla D durante 0,5 s
  Entonces el lanzador queda en x = 780
  Y la previsualización se recalcula desde la nueva posición

Escenario: AC4 - Movimiento libre desde la posición automática
  Dado que la primera bola aterrizó en x = 1000 y el lanzador se reubicó ahí
  Cuando el jugador mantiene pulsada A durante 2 s
  Entonces el lanzador cruza todo el ancho hacia la izquierda sin ningún límite relativo a x = 1000
  Y se detiene en el borde izquierdo, x = 50

Escenario: AC5 - Toque corto
  Dado que el juego está en Aiming con el lanzador en x = 540
  Cuando el jugador pulsa y suelta D de inmediato (un toque)
  Entonces el lanzador se mueve exactamente un paso mínimo de 8 px, a x = 548

Esquema del escenario: AC6 - Se detiene en el borde aunque la tecla siga pulsada
  Dado que el juego está en Aiming con el lanzador en x = <inicio>
  Cuando el jugador mantiene pulsada <tecla> durante 2 s
  Entonces el lanzador se detiene en x = <limite> y permanece ahí mientras la tecla siga pulsada
  Ejemplos:
    | inicio | tecla | limite |
    | 100    | A     | 50     |
    | 980    | D     | 1030   |

Esquema del escenario: AC7 - Teclas ignoradas fuera de Aiming
  Dado que el juego está en <estado>
  Cuando el jugador pulsa A o D
  Entonces la posición del lanzador no cambia
  Ejemplos:
    | estado                      |
    | Firing                      |
    | Simulating                  |
    | Aiming con pausa activa     |
    | Victory                     |
    | GameOver                    |
    | Title                       |

Escenario: AC8 - El tiro sale desde la posición elegida
  Dado que el jugador movió el lanzador de x = 540 a x = 300 en Aiming
  Cuando dispara con clic izquierdo o Espacio
  Entonces todas las bolas del grupo salen desde x = 300 con la dirección bloqueada

Escenario: AC9 - Teclas opuestas a la vez
  Dado que el juego está en Aiming con el lanzador en x = 540
  Cuando el jugador mantiene A y D al mismo tiempo durante 0,5 s
  Entonces el lanzador no se mueve

Escenario: AC10 - Reiniciar devuelve la posición del nivel
  Dado que el jugador movió el lanzador en el nivel 2
  Cuando pulsa R
  Entonces el lanzador vuelve a la x inicial definida en level2.json

Escenario: AC11 - Mayúsculas y atajos visibles
  Dado que Bloq Mayús está activo
  Cuando el jugador mantiene pulsada A
  Entonces el lanzador se mueve igual que con a minúscula
  Y el panel CONTROL lista el atajo "Mover lanzador" con las teclas A y D
```

**Valores propuestos (a confirmar):** velocidad 480 px/s mientras se mantiene la tecla; paso mínimo de 8 px por toque; límites `x = 50..1030` (los bordes del tablero, iguales a v1).

---

## HU-11: Modo de disparo de 1, 2 o 3 bolas por tiro

**Como** jugador que quiere dosificar cada tiro,
**quiero** disparar la tirada del turno en grupos de 1, 2 o 3 bolas en lugar de soltarla toda en secuencia,
**para** apuntar bola a bola, corregir el ángulo entre grupos y planificar los rebotes con más precisión.

**Impacto de negocio:**
* Cada grupo se vuelve una decisión de ángulo y posición: más profundidad sin agregar controles complejos.
* Hace legible el resultado de cada disparo, útil en tutoriales y clips.

### Criterios de aceptación

```gherkin
Escenario: AC1 - Modo por defecto
  Dado que el jugador inicia o reinicia cualquier nivel
  Cuando el nivel entra en Aiming
  Entonces el modo de disparo activo es "1 bola por tiro"
  Y el panel CONTROL muestra el modo activo

Esquema del escenario: AC2 - Un disparo lanza exactamente N bolas de la tirada
  Dado que el juego está en Aiming, la tirada del turno es de 5 bolas sin disparar y el modo es <modo>
  Cuando el jugador dispara
  Entonces salen exactamente <bolas> bolas, una tras otra en la misma dirección
  Y quedan <restantes> bolas por disparar en el turno
  Ejemplos:
    | modo | bolas | restantes |
    | 1    | 1     | 4         |
    | 2    | 2     | 3         |
    | 3    | 3     | 2         |

Escenario: AC3 - Entre grupos se vuelve a apuntar dentro del mismo turno
  Dado que el turno tiene 5 bolas, el modo es 2 y el jugador disparó el primer grupo
  Cuando las 2 bolas del grupo aterrizan
  Entonces el juego vuelve a Aiming con 3 bolas restantes en el turno
  Y el contador de TURNOS no cambia

Escenario: AC4 - Reubicación automática después de cada grupo (D-11.3)
  Dado que el turno tiene 5 bolas, el modo es 2 y la primera bola del primer grupo aterrizó en x = 620
  Cuando las 2 bolas del grupo terminan de aterrizar
  Entonces el juego vuelve a Aiming con el lanzador en x = 620
  Y el jugador puede moverlo con A/D antes del siguiente grupo (HU-10)

Escenario: AC5 - Orbes para los turnos siguientes (D-11.4)
  Dado que la tirada del turno es de 5 bolas y el primer grupo captura un orbe +2
  Cuando el jugador dispara el segundo grupo del mismo turno
  Entonces al turno en curso le siguen quedando las bolas de la tirada original (5 en total)
  Y la tirada de los turnos siguientes es de 7 bolas

Escenario: AC6 - El turno termina al recoger la última bola de la tirada
  Dado que al turno le queda 1 bola por disparar y el nivel lleva 3 de 12 turnos usados
  Cuando esa bola se dispara y aterriza
  Entonces el turno se resuelve como en v1 (orbes, victoria o derrota)
  Y el nivel pasa a 4 de 12 turnos usados

Escenario: AC7 - Si quedan menos bolas que el modo, sale lo que queda
  Dado que al turno le quedan 2 bolas por disparar y el modo es 3
  Cuando el jugador dispara
  Entonces salen 2 bolas
  Y el selector indica que el grupo quedó limitado a 2

Escenario: AC8 - Victoria a mitad de turno
  Dado que al turno le quedan 3 bolas por disparar
  Cuando un grupo destruye el último núcleo y sus bolas aterrizan
  Entonces el nivel termina en Victory sin disparar las bolas restantes
  Y las estrellas y los puntos se calculan con la misma regla que v1 (D-11.2)

Escenario: AC9 - Cambiar de modo con la tecla M
  Dado que el juego está en Aiming con el modo 1
  Cuando el jugador pulsa M
  Entonces el modo pasa a 2 (y luego 3, y de nuevo 1 en las siguientes pulsaciones)
  Y el panel CONTROL resalta el modo nuevo

Escenario: AC10 - Cambiar de modo desde el panel
  Dado que el juego está en Aiming
  Cuando el jugador hace clic en el botón "3" del selector MODO del panel CONTROL
  Entonces el modo activo pasa a 3 y el siguiente disparo lanza hasta 3 bolas

Escenario: AC11 - No se cambia el modo con un grupo en vuelo
  Dado que el juego está en Firing o Simulating con el modo 2
  Cuando el jugador pulsa M o hace clic en el selector
  Entonces el modo sigue en 2
  Y el selector se muestra deshabilitado

Escenario: AC12 - Sin ventaja por modo
  Dado dos partidas idénticas del nivel 1 resueltas con los mismos ángulos, una en modo 1 y otra en modo 3
  Cuando se muestra el modal de victoria
  Entonces ambas tienen las mismas estrellas y la misma regla de puntos

Escenario: AC13 - Sin conflicto con las teclas de velocidad
  Dado que el juego está en Simulating
  Cuando el jugador pulsa 2
  Entonces cambia la velocidad a 2X (HU-05) y el modo de disparo no cambia

Escenario: AC14 - Modo y bolas restantes visibles en el HUD
  Dado cualquier estado de juego dentro de un nivel
  Cuando se dibuja el HUD
  Entonces el panel CONTROL muestra el selector MODO con 1, 2 y 3, el activo resaltado y el atajo M en ATAJOS
  Y el panel TELEMETRÍA muestra en BOLAS cuántas bolas quedan por disparar en el turno
```

**Teclas:** `M` alterna el modo (los números `1` `2` `4` ya son velocidad, HU-05).

---

## Preguntas abiertas restantes

1. **Valores:** ¿480 px/s y 8 px por toque se sienten bien, o se prefiere otra velocidad?
2. **Tutorial (HU-06):** ¿los niveles 1 a 3 deben enseñar A/D y el modo de disparo?

## Riesgos y casos borde

- **Balance de niveles:** el movimiento libre y el apuntado entre grupos facilitan los puzzles actuales. Hay que re-validar las soluciones (`tests/fixtures/solutions.json`) y revisar si algún nivel se vuelve trivial.
- **Regla de tope por tirada (45 s, P3_volley_cap):** pasa a aplicarse por grupo; confirmar en la spec.
- **Teclado:** A/D mantenidas con repetición automática del sistema operativo; teclados AZERTY (A en otra posición): evaluar Q/D o flechas como alternativa.
- **Determinismo:** con grupos, "la primera bola en aterrizar" debe seguir definiéndose de forma reproducible.
- **Regresión:** cambian HU-01 (escenario 4: "emitiendo las bolas de la tirada en secuencia"), las specs `volley-economy`, `game-state`, `aiming` y `hud`, los sonidos (cambio de modo) y las pruebas visuales de referencia.

## Definición de Listo — estado

| Criterio | HU-10 | HU-11 |
|---|---|---|
| AC en Gherkin | Sí (11) | Sí (14) |
| Reglas de negocio explícitas | Sí (D-10.1, D-10.2) | Sí (D-11.1 a D-11.4) |
| Roles afectados | Jugador | Jugador |
| Datos de prueba | Niveles 1 a 6 | Niveles 1 a 6 |
| Dependencias | Ninguna externa | Ninguna externa; usa la reubicación de HU-10 |
| Impacto en regresión | aiming, volley-economy, HUD | volley-economy, game-state, HUD, niveles |
| Errores y mensajes | Teclas ignoradas fuera de Aiming; tope en bordes | Grupo limitado por bolas restantes; selector deshabilitado en vuelo |
| No funcionales | Movimiento fluido a 60 FPS | Sin cambio de rendimiento |
| **Lista para desarrollo** | **Sí** (valores a confirmar) | **Sí** |
