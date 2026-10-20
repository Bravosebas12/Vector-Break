---
name: qa-casos-de-prueba
description: Diseña casos de prueba funcionales en español a partir de historias de usuario, tickets Jira, PRDs, endpoints o cambios de código. Usar cuando se pida "casos de prueba", "test cases", "escenarios de prueba", "matriz de pruebas" o "cobertura de pruebas" de una funcionalidad.
---

# Diseño de casos de prueba (QA funcional)

## Cuándo usarla
- Llega una historia/ticket (Jira) y hay que derivar los casos antes de ejecutar.
- Hay que ampliar cobertura de un módulo existente o preparar una regresión.
- Se necesita trazabilidad requisito → caso → evidencia.

## Entradas que debes reunir primero
Antes de escribir casos, pregunta solo lo que falte y sea bloqueante:
1. **Requisito / criterios de aceptación** (o ID de Jira).
2. **Alcance**: módulo, ambiente (QA/UAT/PROD), datos de prueba disponibles.
3. **Precondiciones técnicas**: usuarios/roles, dispositivos, servicios externos (p. ej. Geotab, Azure Functions), scripts SQL de verificación.
4. **Riesgo**: qué pasa si falla (define profundidad y prioridad).

Si algo no es bloqueante, asume y **declara el supuesto** en el documento.

## Técnicas obligatorias (aplica las que correspondan y decláralo)
- **Partición de equivalencia**: una clase válida y una inválida por variable.
- **Valores límite**: mín-1, mín, mín+1, máx-1, máx, máx+1.
- **Tabla de decisión**: para reglas de negocio con varias condiciones combinadas.
- **Transición de estados**: para flujos con estados (activo/suspendido/retirado, pendiente/procesado/error).
- **Pruebas negativas y de error**: entradas inválidas, timeouts, caída de servicio dependiente, duplicados, concurrencia.
- **Idempotencia / reintentos**: crítico en integraciones y jobs.
- **Permisos por rol**: cada rol relevante, incluido el no autorizado.

No inventes cobertura de humo: cada caso debe poder fallar por una razón distinta. Si dos casos fallarían por lo mismo, fusiónalos.

## Formato de salida
Un archivo Markdown por funcionalidad. Ruta por defecto en este repo:
`Navicare/casos/<modulo>/<ID o nombre>.md`

Estructura:

```markdown
# Casos de prueba — <Funcionalidad> (<ID Jira>)

**Módulo:** ... | **Ambiente:** ... | **Autor:** ... | **Fecha:** AAAA-MM-DD
**Requisito / AC:** enlace o resumen
**Supuestos:** ...
**Precondiciones generales:** ...
**Datos de prueba:** ...

## Matriz de cobertura
| Criterio de aceptación | Casos que lo cubren |
|---|---|
| AC1 ... | CP-01, CP-04 |

## Casos

### CP-01 — <Título en una línea, orientado al resultado esperado>
- **Tipo:** funcional positivo | negativo | límite | permisos | integración | regresión
- **Prioridad:** Alta / Media / Baja  ·  **Técnica:** valores límite
- **Precondición:** ...
- **Pasos:**
  1. ...
  2. ...
- **Resultado esperado:** observable y verificable (qué ve el usuario, qué queda en BD, qué se registra en log/alerta).
- **Verificación adicional:** consulta SQL / log / endpoint, si aplica.
- **Evidencia:** `Navicare/evidencias/<modulo>/<caso>/`
```

## Reglas de calidad
- **Un caso = un objetivo verificable.** Título sin ambigüedad, en español, sin "verificar que funcione".
- **Resultado esperado medible**: nada de "el sistema responde correctamente"; di qué valor, estado, código HTTP o registro se espera.
- **Pasos reproducibles por otra persona** sin contexto previo.
- **Numeración estable** (CP-01, CP-02...): no renumeres al agregar; añade al final.
- Marca explícitamente los casos **candidatos a automatización**.
- Si la funcionalidad toca datos productivos o borrado, añade un caso de **rollback / restauración** y advierte del riesgo.

## Después de generar
1. Lista los **huecos de cobertura** que no pudiste cubrir y por qué (falta de datos, ambiente, permiso).
2. Propón el **orden de ejecución** (dependencias entre casos).
3. Ofrece crear la carpeta de evidencias correspondiente.

Relacionada: `qa-criterios-de-aceptacion`, `qa-plan-de-pruebas`, `qa-reporte-de-defecto`.
