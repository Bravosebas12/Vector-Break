---
name: qa-criterios-de-aceptacion
description: Redacta o refina historias de usuario y sus criterios de aceptación en formato Gherkin (Dado/Cuando/Entonces), aplicando INVEST y la Definición de Listo. Usar cuando se pida "historia de usuario", "criterios de aceptación", "AC", "refinar el ticket" o "Gherkin".
---

# Historias de usuario y criterios de aceptación (PO ↔ QA)

Es el puente entre lo que pide negocio y lo que QA puede probar. Un criterio que no se puede convertir en caso de prueba está mal escrito.

## Formato de la historia

```
Como <rol concreto, no "usuario">
quiero <capacidad>
para <beneficio medible de negocio>
```

## Criterios de aceptación — Gherkin

```gherkin
Escenario: <nombre en presente, orientado al resultado>
  Dado <precondición y estado inicial concreto>
  Cuando <una sola acción del actor>
  Entonces <resultado observable y verificable>
  Y <efecto secundario: registro, notificación, estado en BD>
```

Reglas:
- **Un solo "Cuando" por escenario.** Si hay dos acciones, son dos escenarios.
- Cubre siempre: **camino feliz, al menos un caso de error, y las reglas de negocio límite**.
- Nada de detalles de implementación (nombres de tabla, endpoints) salvo que sean el requisito.
- Datos concretos: "Dado un dispositivo con 3 días sin reportar", no "Dado ciertos datos".
- Usa `Esquema del escenario` + `Ejemplos` para variantes de los mismos pasos.

## Checklist INVEST antes de dar por lista la historia

- **I**ndependiente: se puede entregar sin esperar otra historia.
- **N**egociable: describe el qué, no el cómo.
- **V**aliosa: el "para" nombra un beneficio real.
- **E**stimable: el equipo entiende el alcance.
- **S**mall: cabe en un sprint.
- **T**esteable: cada AC se traduce en al menos un caso de prueba.

## Definición de Listo (DoR) — verifica y reporta lo que falte

- [ ] Criterios de aceptación en Gherkin, revisados con QA.
- [ ] Reglas de negocio y validaciones explícitas.
- [ ] Roles/permisos afectados.
- [ ] Datos de prueba y ambiente identificados.
- [ ] Dependencias externas (integraciones, servicios) nombradas.
- [ ] Impacto en regresión / módulos vecinos.
- [ ] Manejo de errores y mensajes al usuario.
- [ ] Criterios no funcionales relevantes (tiempo de respuesta, volumen, concurrencia).

## Salida esperada

1. La historia reescrita.
2. Los escenarios Gherkin numerados (AC1, AC2...).
3. **Preguntas abiertas** para el PO: ambigüedades reales que cambiarían el desarrollo.
4. **Riesgos y casos borde** que el ticket no menciona.

Al terminar, ofrece generar los casos de prueba con `qa-casos-de-prueba` reusando la numeración de AC para la matriz de trazabilidad.
