# AngleCraft: Especificación de Negocio e Historias de Usuario (PC / Web)

> **Versión 2.0 (2026-10-20).** Alineada con las skills del proyecto (`.claude/skills/`), que son la fuente de verdad ante cualquier contradicción con el diseño.

---

## 1. Visión General del Producto

* **Producto:** AngleCraft
* **Plataforma:** PC / Web (16:9 widescreen, optimizado para interacción con ratón y teclado)
* **Género:** Physics Puzzle / Strategic Brick Breaker
* **Objetivo de Negocio:** Maximizar el tiempo de sesión útil y la retención mediante niveles estáticos tipo puzzle que premien la optimización analítica (cálculo de ángulos, rebotes en trampas y multiplicación de proyectiles) sobre mecánicas pasivas de supervivencia.

---

## 2. Matriz de Priorización de Negocio (MoSCoW)

| ID | Título de la Historia | Prioridad | Métrica de Éxito / KPI Impactado |
| :--- | :--- | :--- | :--- |
| **HU-01** | Apuntado Táctico con Previsualización de un Rebote | **Must Have** | Retención D1 / Reducción de abandono en Nivel 1 (< 5%) |
| **HU-02** | Desgaste Escalonado de Bloques Núcleo (HP Alto) | **Must Have** | Tiempo medio por sesión (> 8 min) / Picos de satisfacción |
| **HU-05** | Acelerador Temporal de Simulación (1X, 2X, 4X) | **Must Have** | Eliminación de abandonos por lentitud (*Session Churn*) |
| **HU-06** | Tutorial Progresivo en los 3 Niveles Base | **Must Have** | Abandono en niveles 1–3 (< 5%) / Tasa de llegada al nivel 4 (> 80%) |
| **HU-03** | Calificación por Estrellas y Rejugabilidad | **Should Have** | Tasa de repetición de niveles para optimización (> 30%) |
| **HU-04** | Orbes Multiplicadores de Proyectiles | **Should Have** | Factor viral / Generación de clips de pantalla masiva |

---

## 3. Historias de Usuario Detalladas

---

### Épica 1: Mecánica Central y Bucle de Retención (Core Loop)

#### HU-01: Dominio Táctico del Apuntado Balístico con Feedback Visual Predictivo
* **Como** jugador de puzzles de estrategia en PC,
* **quiero** una previsualización precisa de la trayectoria y de su primer rebote controlada por el ratón,
* **para** sentir control analítico sobre el disparo, reduciendo la frustración por tiros ciegos y elevando la percepción de habilidad (*mastery effect*).

**Impacto de Negocio:**
* Reduce la fricción inicial durante el onboarding (niveles 1 a 3).
* Traslada la responsabilidad del fallo al cálculo del jugador y no a una supuesta imprecisión del juego.

**Criterios de Aceptación:**
* **Escenario 1: Proyección del primer impacto**
  * **Dado** que el juego está en el estado `Aiming`,
  * **Cuando** el usuario desplaza el cursor sobre el lienzo,
  * **Entonces** se dibuja la trayectoria desde el lanzador hasta el primer contacto con cualquier superficie (pared o bloque de cualquier tipo), usando la misma geometría de colisión que la simulación (bola expandida por su radio).
* **Escenario 2: Un solo rebote reflejado**
  * **Dado** que la trayectoria tiene un primer punto de contacto `P` con normal `N`,
  * **Cuando** se calcula la previsualización,
  * **Entonces** desde `P` se dibuja un segmento de longitud fija en la dirección reflejada $\vec{r} = \vec{u} - 2(\vec{u} \cdot \vec{n})\vec{n}$ y **nunca** se dibuja un segundo rebote.
* **Escenario 3: Ángulo de disparo válido**
  * **Dado** que el usuario apunta casi en horizontal,
  * **Cuando** la componente vertical de la dirección es menor a 0,05,
  * **Entonces** el ángulo se limita a ese mínimo para evitar trayectorias horizontales infinitas.
* **Escenario 4: Disparo**
  * **Dado** que el juego está en `Aiming` con un ángulo válido,
  * **Cuando** el usuario hace clic izquierdo o pulsa `Espacio`,
  * **Entonces** la dirección se bloquea y el juego pasa a `Firing`, emitiendo las bolas de la tirada en secuencia.

---

#### HU-02: Dinámica de Desgaste Masivo y Bloques Núcleo
* **Como** jugador,
* **quiero** impactar bloques con durabilidades escalonadas que reaccionen visual y auditivamente a cada golpe,
* **para** experimentar una gratificación sensorial acumulativa (*sensory feedback loop*) al ver colapsar estructuras resistentes mediante el ángulo adecuado.

**Tipos de bloque:**

| Tipo | HP | Comportamiento |
| :--- | :--- | :--- |
| `standard` | 1–15 | Se destruye al llegar a 0 |
| `reinforced` | 20–80 | Se destruye al llegar a 0 |
| `core` | 100–500 | Se destruye al llegar a 0; destruir todos los núcleos gana el nivel |
| `indestructible` (titanio) | — | Obstáculo/reflector; nunca recibe daño |

**Impacto de Negocio:**
* Romper un núcleo de 300 o 500 HP produce un pico de gratificación superior al de un bloque simple, fortaleciendo el enganche (*engagement*).
* Fomenta la búsqueda deliberada de trampas de rebote (*loop traps*), aumentando el tiempo de análisis reflexivo.

**Criterios de Aceptación:**
* **Escenario 1: Micro-recompensas en tiempo real**
  * **Dado** un bloque con HP alto (ej. 300 HP),
  * **Cuando** recibe impactos consecutivos del flujo de bolas,
  * **Entonces** su número desciende en tiempo real, su color transiciona según la vida restante y cada impacto consecutivo (dentro de 250 ms) suena un escalón más agudo que el anterior.
* **Escenario 2: Destrucción y apertura de camino**
  * **Dado** un bloque cuyo HP llega a 0,
  * **Cuando** recibe el golpe final,
  * **Entonces** se pulveriza con partículas expansivas y la celda queda libre de inmediato para que las bolas restantes continúen su camino.
* **Escenario 3: Bloques de titanio (indestructibles)**
  * **Dado** un bloque indestructible,
  * **Cuando** cualquier bola impacta sobre él,
  * **Entonces** no pierde durabilidad, produce un rebote perfectamente elástico (la rapidez de la bola no cambia) y emite un golpe metálico diferenciado.
* **Escenario 4: Sin atravesar bloques**
  * **Dado** cualquier velocidad de simulación (1X, 2X o 4X),
  * **Cuando** una bola se dirige a un bloque de una celda,
  * **Entonces** la colisión siempre se registra; ninguna bola atraviesa un bloque (*tunneling*).

---

### Épica 2: Progresión, Recompensa y Rejugabilidad

#### HU-03: Sistema de Clasificación por Estrellas y Optimización de Tiros
* **Como** jugador competitivo o perfeccionista,
* **quiero** recibir una calificación de 1 a 3 estrellas basada en la cantidad de tiros utilizados para destruir todos los núcleos,
* **para** contar con un incentivo explícito de rejugabilidad que me impulse a repetir niveles buscando la solución más eficiente.

**Impacto de Negocio:**
* Extiende el ciclo de vida del juego (LTV) multiplicando el tiempo útil de cada nivel sin requerir contenido nuevo constante.
* Establece las bases cuantitativas para futuros rankings.

**Criterios de Aceptación:**
* **Escenario 1: Fin de turno sincronizado**
  * **Dado** que el juego está en `Firing` o `Simulating`,
  * **Cuando** la última bola de la tirada toca el suelo y ya se emitieron todas las bolas de la tirada,
  * **Entonces** el juego pasa a `Resolving`; si aún quedan bolas en vuelo o por emitir, el turno no termina.
* **Escenario 2: Tiro maestro (3 estrellas)**
  * **Dado** un nivel con límite de $N$ tiros,
  * **Cuando** el jugador destruye todos los núcleos en exactamente 1 tiro,
  * **Entonces** se le otorgan 3 estrellas y una distinción gráfica de tiro perfecto.
* **Escenario 3: Victoria estándar y guardado de progreso**
  * **Dado** que el jugador destruye todos los núcleos usando más de 1 tiro y sin superar $N$,
  * **Cuando** termina el turno en `Resolving`,
  * **Entonces** se asignan 2 o 1 estrellas, se guarda la mejor marca en `localStorage` y se habilita el siguiente nivel.
* **Escenario 4: Derrota y reintento inmediato**
  * **Dado** que se agotaron los tiros y **quedan núcleos activos**,
  * **Cuando** termina el último turno en `Resolving`,
  * **Entonces** el juego pasa a `GameOver` y el panel de derrota permite reiniciar el nivel con la tecla `R` en menos de 500 ms.
* **Escenario 5: Reinicio rápido en cualquier momento**
  * **Dado** cualquier estado del juego,
  * **Cuando** el usuario pulsa `R` (sin auto-repetición de tecla),
  * **Entonces** el nivel se recarga y el juego vuelve a `Aiming`.

---

#### HU-04: Orbes Multiplicadores de Proyectiles
* **Como** jugador,
* **quiero** alcanzar orbes `+` que aumenten mi reserva de bolas,
* **para** sentir una progresión de poder (*power fantasy*) que me permita inundar la pantalla con cientos de bolas en los tiros siguientes.

**Impacto de Negocio:**
* Genera escenas de alto impacto visual con cientos de proyectiles simultáneos, propensas a ser capturadas y compartidas en clips cortos.
* Recompensa al jugador que logró colar la bola por un acceso estrecho y difícil.

**Criterios de Aceptación:**
* **Escenario 1: Captura del orbe**
  * **Dado** un orbe `+` con valor `V` activo en el tablero,
  * **Cuando** una bola lo toca por primera vez,
  * **Entonces** la bola lo atraviesa sin rebotar, el orbe desaparece y se registran `+V` bolas pendientes.
* **Escenario 2: Crecimiento del arsenal para el nivel**
  * **Dado** que en el turno se capturaron orbes por un total de `K`,
  * **Cuando** el turno termina en `Resolving`,
  * **Entonces** la tirada de los siguientes tiros del nivel aumenta en `+K` bolas.

---

### Épica 3: Ergonomía de PC y Retención de Sesión

#### HU-05: Control Dinámico de Velocidad (1X, 2X, 4X)
* **Como** jugador de PC que valora su tiempo,
* **quiero** alternar de forma inmediata entre velocidades de simulación (1X, 2X, 4X) usando atajos de teclado numéricos,
* **para** eliminar tiempos muertos durante secuencias con más de 200 bolas activas sin perder precisión de físicas.

**Impacto de Negocio:**
* Previene el abandono de pestaña o cierre del juego (*session drop-off*) durante simulaciones prolongadas.
* Se alinea con los estándares de usabilidad esperados en escritorio.

**Criterios de Aceptación:**
* **Escenario 1: Cambio ágil mediante atajos**
  * **Dado** que la simulación está en curso (`Firing` o `Simulating`),
  * **Cuando** el usuario pulsa las teclas `1`, `2` o `4`,
  * **Entonces** el multiplicador de velocidad se actualiza de inmediato sin saltos abruptos en la simulación.
* **Escenario 2: Garantía anti-tunneling a velocidad 4X**
  * **Dado** que la simulación corre a velocidad máxima (4X),
  * **Cuando** los proyectiles se mueven,
  * **Entonces** el motor aumenta los pasos de física fraccionados (*substepping*), nunca el desplazamiento por paso, para impedir que las bolas atraviesen bloques.
* **Escenario 3: Reinicio de velocidad por turno**
  * **Dado** que el usuario eligió 2X o 4X durante un turno,
  * **Cuando** comienza la siguiente fase de apuntado (`Aiming`),
  * **Entonces** la velocidad vuelve a 1X.
* **Escenario 4: Teclas fuera de simulación**
  * **Dado** que el juego está en `Aiming`,
  * **Cuando** el usuario pulsa `1`, `2` o `4`,
  * **Entonces** la velocidad no cambia.

---

### Épica 4: Onboarding

#### HU-06: Tutorial Progresivo en los 3 Niveles Base
* **Como** jugador nuevo de AngleCraft,
* **quiero** que los tres primeros niveles me enseñen una mecánica a la vez (tiro directo con rebote en pared, tiro indirecto ante obstáculos y trampas de rebote),
* **para** dominar el cálculo de ángulos de forma progresiva sin necesidad de instrucciones externas.

**Impacto de Negocio:**
* Reduce el abandono temprano (< 5% en niveles 1–3) y prepara al jugador para los niveles de mayor dificultad.
* Sirve como banco de prueba del balance (HP, tiros y bolas iniciales) de todo el juego.

**Contenido de los niveles base:**

| Nivel | Archivo | Mecánica que enseña | Contenido |
| :--- | :--- | :--- | :--- |
| 1 | `src/levels/level1.json` | Tiro directo y 1 rebote en pared | Bloques ligeros (1–10 HP), 1 orbe multiplicador y un núcleo mínimo (100 HP) cuya entrada se alcanza con 1 rebote en la pared |
| 2 | `src/levels/level2.json` | Obstáculos y tiro indirecto | Bloques de titanio que bloquean la línea directa y obligan a disparar en ángulo obtuso |
| 3 | `src/levels/level3.json` | Trampa de rebotes (*loop trap*) | Núcleo central de 400 HP encajonado entre deflectores de titanio con entrada estrecha, siguiendo la secuencia del video promocional |

**Criterios de Aceptación:**
* **Escenario 1: Nivel 1 superable con 1 rebote en pared**
  * **Dado** el nivel 1 recién cargado,
  * **Cuando** el jugador dispara usando un único rebote en una pared lateral,
  * **Entonces** existe al menos un ángulo cuya trayectoria llega a la entrada de la trampa del núcleo, verificable con la previsualización de HU-01.
* **Escenario 2: Nivel 2 sin línea directa**
  * **Dado** el nivel 2 recién cargado,
  * **Cuando** se traza cualquier línea recta desde el lanzador hasta la entrada de la trampa,
  * **Entonces** un bloque de titanio la intercepta, y existe al menos una trayectoria con ángulo obtuso y rebote en pared que sí la alcanza.
* **Escenario 3: Nivel 3 con trampa de rebotes**
  * **Dado** el nivel 3 recién cargado,
  * **Cuando** una bola entra por la abertura de la trampa,
  * **Entonces** rebota repetidamente dentro de la cavidad de titanio dañando el núcleo antes de salir.
* **Escenario 4: Validación estructural**
  * **Dado** cualquiera de los 3 niveles base,
  * **Cuando** se carga en el juego,
  * **Entonces** cumple el esquema `level.schema.json` y las reglas de diseño: al menos 1 núcleo, cada núcleo dentro de una trampa con entrada de 1–2 celdas y alcanzable desde un ángulo válido.
* **Escenario 5: Desbloqueo progresivo**
  * **Dado** que el jugador no ha superado el nivel N,
  * **Cuando** intenta acceder al nivel N+1,
  * **Entonces** el acceso no está disponible hasta superar el nivel N.

---

## 4. Preguntas Abiertas

| # | Pregunta | Historia |
| :--- | :--- | :--- |
| 1 | ¿Cuántos tiros otorgan 2 y 1 estrellas? (propuesta: 2★ ≤ 50% de $N$, 1★ resto) | HU-03 |
| 2 | La disposición del nivel 3 se aproximó a partir de la descripción; falta validarla cuadro a cuadro con el video promocional. | HU-06 |
| 3 | Las teclas de la maqueta que no están en las skills (`P` pausa, `Enter` siguiente nivel, `Esc` menú, clic derecho para cancelar) quedan para la especificación de pantallas. | HU-01, HU-05 |

---

## 5. Registro de Cambios

| Versión | Cambio |
| :--- | :--- |
| 2.0 | Alineación con las skills: victoria y derrota por núcleos, previsualización de un rebote, orbes que suman bolas al siguiente tiro, velocidad que vuelve a 1X por turno, rangos de HP por tipo. Se eliminan `Tab`, `Esc` y clic derecho (pasan a la spec de pantallas). Se agrega HU-06. |
