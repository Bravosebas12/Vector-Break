---
name: qa-plan-de-pruebas
description: Elabora planes de prueba, estrategias de testing y checklists de regresión para un release, módulo o sprint. Usar cuando se pida "plan de pruebas", "estrategia de pruebas", "alcance de testing", "checklist de regresión" o "plan de certificación".
---

# Plan de pruebas

## Cuándo usarla

Antes de certificar un release, al arrancar un módulo nuevo, o cuando hay que acordar con el equipo qué se prueba y qué no.

## Estructura del documento

Ruta sugerida: `Navicare/casos/<modulo>/plan-de-pruebas.md`

1. **Objetivo y contexto** — qué se certifica y para qué release/ticket.
2. **Alcance**
   - *Dentro del alcance*: módulos, flujos, integraciones.
   - *Fuera del alcance* (explícito: es la parte que evita discusiones después).
3. **Estrategia por nivel** — qué se cubre con pruebas unitarias, de integración, de sistema/E2E y de aceptación (UAT); y qué tipos aplican: funcional, regresión, permisos, rendimiento, seguridad, usabilidad, compatibilidad.
4. **Análisis de riesgo** — tabla `Riesgo | Probabilidad | Impacto | Mitigación / cobertura`. La profundidad de prueba se asigna por riesgo, no de forma uniforme.
5. **Ambientes y datos** — URLs, roles necesarios (sin exponer secretos), datos semilla, scripts SQL de preparación y verificación, dependencias externas y su disponibilidad.
6. **Criterios de entrada** — qué debe estar listo para empezar a probar: build desplegado, DoR cumplida, datos cargados.
7. **Criterios de salida** — qué debe cumplirse para certificar: p. ej. 100% de casos de prioridad Alta ejecutados, 0 defectos críticos o mayores abiertos, regresión en verde, evidencias adjuntas.
8. **Suite de regresión** — casos existentes a re-ejecutar y por qué (módulos que el cambio toca).
9. **Cronograma y responsables**.
10. **Gestión de defectos** — severidades, flujo de reporte y reprueba.
11. **Entregables** — casos, evidencias, reporte de ejecución.

## Reglas

- El alcance excluido debe ser tan explícito como el incluido.
- Todo criterio de salida debe ser **verificable**, no aspiracional.
- Prioriza por riesgo: más casos donde más duele si falla (dinero, datos, seguridad, operación en campo).
- Si el tiempo no alcanza para el alcance, dilo y propón el recorte: qué se deja fuera y qué riesgo se acepta. Esa decisión es del PO, no de QA.

Relacionada: `qa-casos-de-prueba`, `qa-reporte-de-defecto`.
