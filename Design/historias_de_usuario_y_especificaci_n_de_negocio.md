# AngleCraft: Especificación de Negocio e Historias de Usuario (PC / Web)

---

## 1. Visión General del Producto

* **Producto:** AngleCraft
* **Plataforma:** PC / Web (16:9 widescreen, optimizado para interacción con ratón y teclado)
* **Género:** Physics Puzzle / Strategic Brick Breaker
* **Objetivo de Negocio:** Maximizar el tiempo de sesión útil y la retención mediante niveles estáticos tipo puzzle que premien la optimización analítica (cálculo de ángulos, rebotes infinitos y multiplicación de proyectiles) sobre mecánicas pasivas de supervivencia.

---

## 2. Matriz de Priorización de Negocio (MoSCoW)

| ID | Título de la Historia | Prioridad | Métrica de Éxito / KPI Impactado |
| :--- | :--- | :--- | :--- |
| **HU-01** | Apuntado Táctico con Previsualización Reflectiva | **Must Have** | Retención D1 / Reducción de abandono en Nivel 1 (< 5%) |
| **HU-02** | Desgaste Escalonado de Bloques Núcleo (HP Alto) | **Must Have** | Tiempo medio por sesión (> 8 min) / Picos de satisfacción |
| **HU-05** | Acelerador Temporal de Simulación (1X, 2X, 4X) | **Must Have** | Eliminación de abandonos por lentitud (*Session Churn*) |
| **HU-03** | Calificación por Estrellas y Rejugabilidad | **Should Have** | Tasa de repetición de niveles para optimización (> 30%) |
| **HU-04** | Multiplicación Dinámica de Proyectiles (Splitters) | **Should Have** | Factor viral / Generación de clips de pantalla masiva |

---

## 3. Historias de Usuario Detalladas

---

### Épica 1: Mecánica Central y Bucle de Retención (Core Loop)

#### HU-01: Dominio Táctico del Apuntado Balístico con Feedback Visual Predictivo
* **Como** jugador de puzzles de estrategia en PC,  
* **quiero** una previsualización milimétrica de la trayectoria y de sus rebotes controlada por el ratón,  
* **para** sentir control analítico absoluto sobre el disparo, reduciendo la frustración por tiros ciegos y elevando la percepción de habilidad y satisfacción (*mastery effect*).

**Impacto de Negocio:**
* Reduce la fricción inicial durante el onboarding (niveles 1 a 3).
* Traslada la responsabilidad del fallo al cálculo del jugador y no a una supuesta imprecisión del juego.

**Criterios de Aceptación:**
* **Escenario 1: Proyección balística de alta fidelidad**
  * **Dado** que el juego está en fase de resolución (`Aiming`),
  * **Cuando** el usuario desplaza el cursor sobre el lienzo,
  * **Entonces** el motor calcula a 60+ FPS una línea punteada que muestra la trayectoria inicial y el ángulo reflejado en paredes y bloques indestructibles:
    $$\vec{r} = \vec{u} - 2(\vec{u} \cdot \vec{n})\vec{n}$$
* **Escenario 2: Truncamiento en el primer bloque destructible**
  * **Dado** que la trayectoria apunta hacia un bloque destructible,
  * **Cuando** el rayo hace contacto con su arista,
  * **Entonces** la guía visual se interrumpe exactamente en ese punto, manteniendo el factor sorpresa de los rebotes internos.
* **Escenario 3: Cancelación ágil sin penalización**
  * **Dado** que el usuario está apuntando,
  * **Cuando** acciona clic derecho (`Mouse 2`) o presiona `Escape`,
  * **Entonces** la guía se oculta sin consumir tiros ni alterar el tablero.

---

#### HU-02: Dinámica de Desgaste Masivo y Bloques Núcleo
* **Como** jugador,  
* **quiero** impactar bloques con durabilidades escalonadas (desde 1 hasta 500 impactos) que reaccionen visual y auditivamente a cada golpe,  
* **para** experimentar una gratificación sensorial acumulativa (*sensory feedback loop*) al ver colapsar estructuras resistentes mediante el ángulo adecuado.

**Impacto de Negocio:**
* Romper un bloque de 300 o 500 puntos produce un pico de gratificación superior al de un bloque simple, fortaleciendo el enganche (*engagement*).
* Fomenta la búsqueda deliberada de "trampas de rebote" (*loop traps*), aumentando el tiempo de análisis reflexivo.

**Criterios de Aceptación:**
* **Escenario 1: Micro-recompensas en tiempo real**
  * **Dado** un bloque con HP alto (ej. 300 HP),
  * **Cuando** recibe impactos sostenidos del flujo de bolas,
  * **Entonces** su número desciende en tiempo real, su color transiciona según la vida restante y emite chispas visuales con modulación de sonido ascendente.
* **Escenario 2: Destrucción y apertura de camino**
  * **Dado** un bloque cuyo HP llega a 0,
  * **Cuando** recibe el golpe final,
  * **Entonces** se pulveriza con partículas expansivas, despejando la celda inmediatamente para que las bolas restantes continúen su camino.
* **Escenario 3: Comportamiento de bloques de titanio (Indestructibles)**
  * **Dado** un bloque marcado como indestructible,
  * **Cuando** cualquier bola impacta sobre él,
  * **Entonces** no pierde durabilidad, produce un rebote elástico perfecto y emite una resonancia metálica diferenciada.

---

### Épica 2: Progresión, Recompensa y Rejugabilidad

#### HU-03: Sistema de Clasificación por Estrellas y Optimización de Tiros
* **Como** jugador competitivo o perfeccionista,  
* **quiero** recibir una calificación de 1 a 3 estrellas basada estrictamente en la cantidad de turnos utilizados para limpiar el tablero,  
* **para** contar con un incentivo explícito de rejugabilidad que me impulse a repetir niveles ya superados buscando la solución matemática más eficiente.

**Impacto de Negocio:**
* Extiende el ciclo de vida del juego (LTV) multiplicando el tiempo útil de cada nivel sin requerir desarrollo de contenido nuevo constante.
* Establece las bases cuantitativas para futuros rankings globales o tablas de clasificación competitivas.

**Criterios de Aceptación:**
* **Escenario 1: Tiro maestro (3 Estrellas)**
  * **Dado** un nivel con límite de $N$ tiros,
  * **Cuando** el jugador destruye todos los bloques en exactamente 1 disparo,
  * **Entonces** se le otorgan 3 estrellas doradas y una distinción gráfica de tiro perfecto.
* **Escenario 2: Victoria estándar y guardado de progreso**
  * **Dado** que el jugador supera el nivel dentro del cupo permitido (> 1 tiro),
  * **Cuando** el tablero queda limpio,
  * **Entonces** se asignan 2 o 1 estrella, se guarda la marca en `localStorage` y se habilita el botón de siguiente nivel.
* **Escenario 3: Reintento inmediato tras fallo**
  * **Dado** que se agotan los tiros y aún quedan bloques destructibles,
  * **Cuando** la última bola toca el suelo,
  * **Entonces** aparece el panel de derrota con opción de reinicio instantáneo pulsando la tecla `R` en menos de 500 ms.

---

#### HU-04: Multiplicación Viral de Proyectiles (Splitters)
* **Como** jugador,  
* **quiero** alcanzar nodos estratégicos (`+`) que dupliquen mis proyectiles dentro de la misma tirada,  
* **para** sentir una sensación de poder abrumador (*power fantasy*) al inundar la pantalla con cientos de bolas rebotando al unísono.

**Impacto de Negocio:**
* Genera escenas de alto impacto visual con cientos de partículas y proyectiles simultáneos, propensas a ser capturadas y compartidas en clips cortos (TikTok, Shorts, Discord).
* Compensa de forma sustancial al jugador que logró colar la bola por un acceso estrecho y difícil.

**Criterios de Aceptación:**
* **Escenario 1: Bifurcación instantánea en vuelo**
  * **Dado** un orbe `+` activo en el tablero,
  * **Cuando** una bola entra en su radio de colisión,
  * **Entonces** el orbe se desactiva y divide la bola en 2 proyectiles con un desvío simétrico de $\pm 15^\circ$.
* **Escenario 2: Crecimiento permanente del arsenal para el nivel**
  * **Dado** que se capturaron $K$ orbes en el turno,
  * **Cuando** la ronda termina y se regresa a la fase de apuntado,
  * **Entonces** la reserva de bolas para los siguientes tiros del nivel aumenta en $+K$.

---

### Épica 3: Ergonomía de PC y Retención de Sesión

#### HU-05: Control Dinámico de Velocidad (1X, 2X, 4X)
* **Como** jugador de PC que valora su tiempo,  
* **quiero** alternar de forma inmediata entre velocidades de simulación (1X, 2X, 4X) usando atajos de teclado numéricos,  
* **para** eliminar tiempos muertos de espera durante secuencias con más de 200 bolas activas sin perder fluidez ni precisión de físicas.

**Impacto de Negocio:**
* Previene el abandono de pestaña o cierre del juego (*session drop-off*) durante simulaciones prolongadas.
* Se alinea con los estándares de usabilidad esperados por la comunidad de escritorio (accesibilidad por teclado y control del tiempo).

**Criterios de Aceptación:**
* **Escenario 1: Cambio ágil mediante atajos**
  * **Dado** que la simulación está en curso (`Firing` o `Simulating`),
  * **Cuando** el usuario pulsa las teclas `1`, `2` o `4` (o la tecla `Tab`),
  * **Entonces** el multiplicador de velocidad temporal (`dt`) se actualiza de inmediato sin saltos abruptos en la simulación.
* **Escenario 2: Garantía anti-tunneling a velocidad 4X**
  * **Dado** que la simulación corre a velocidad máxima (4X),
  * **Cuando** los proyectiles alcanzan su pico cinético,
  * **Entonces** el motor ejecuta pasos de física fraccionados (*substepping*) para impedir que las bolas atraviesen bloques u obstáculos sin registrar colisión.
* **Escenario 3: Persistencia de preferencia**
  * **Dado** que el usuario eligió la velocidad 4X,
  * **Cuando** comienza un nuevo turno o un nuevo nivel,
  * **Entonces** la velocidad seleccionada se mantiene activa por defecto.