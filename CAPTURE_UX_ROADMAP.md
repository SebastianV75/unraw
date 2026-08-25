# Roadmap de UX para Captura

## Estado

- **Documento de planificación:** Slice A, Slice B, Slice C, Slice D, Slice E y Slice F implementados.
- **Objetivo:** hacer que Captura sea rápida, clara y confiable desde la nota inicial hasta el siguiente paso después de guardar.
- **Principio:** priorizar corrección, confianza y velocidad percibida antes de añadir polish visual o animaciones.

## Flujo objetivo

```text
Escribir nota
  → Ordenar
  → Revisar sólo lo que necesita atención
  → Confirmar y guardar
  → Capturar otra o ver resultados
```

La IA propone. La aplicación valida. El usuario conserva el control.

## P0 — Mantener la nota y la revisión sincronizadas

### Problema

Actualmente, editar la nota después de procesarla puede conservar el resultado anterior. Esto permitiría guardar una nota nueva junto con una clasificación generada para una versión anterior.

Además, al iniciar un reproceso se limpia inmediatamente la revisión. Si la IA falla, el usuario puede perder temporalmente sus ediciones, asignaciones y descartes.

### Propuesta

- Asociar cada resultado con la versión o hash exacto de la nota procesada.
- Al editar una nota ya procesada:
  - marcar la revisión como desactualizada;
  - mostrar `La nota cambió. Vuelve a ordenar para actualizar los resultados.`;
  - desactivar `Confirmar y guardar`;
  - no reprocesar automáticamente.
- Durante un reproceso:
  - conservar visible la revisión anterior;
  - bloquear sus controles;
  - reemplazarla únicamente después de recibir un resultado válido.
- Si el reproceso falla, restaurar completamente la revisión anterior.

### Archivos principales

- `web/app/(app)/capture/page.tsx`
- `web/lib/captures/review-state.ts`
- `web/lib/captures/review-state.test.ts`
- `web/lib/captures/draft.ts`

### Criterios de aceptación

- Editar la nota después de procesarla impide guardar resultados obsoletos.
- Reprocesar exitosamente sustituye la revisión anterior.
- Reprocesar con error conserva resultado, ediciones, asignaciones, descartes y undo.
- Draft recovery mantiene la relación entre nota y resultado procesado.

---

## P1 — Mostrar y guardar el destino efectivo

### Problema

La interfaz puede seguir mostrando el área sugerida originalmente después de que el usuario cambió el destino. También puede conservar un proyecto incompatible al cambiar de área; el backend termina eliminándolo silenciosamente.

Con cientos de áreas o proyectos, los `<select>` tradicionales dejarán de ser cómodos.

### Propuesta

- Diferenciar visualmente:
  - `Sugerido: Trabajo` antes de una edición;
  - `Asignado a: Personal` después de una decisión manual.
- Renderizar siempre el área y proyecto efectivos desde el estado de revisión.
- Implementar selección dependiente:
  1. elegir área;
  2. filtrar proyectos pertenecientes a esa área;
  3. limpiar visiblemente un proyecto incompatible.
- Mantener `Dejar en Inbox` como opción explícita.
- Evolucionar los selects a combobox buscable cuando el catálogo sea grande.
- No guardar nunca una asignación diferente de la que la interfaz muestra.

### Archivos principales

- `web/components/capture/CaptureReviewPanel.tsx`
- `web/app/(app)/capture/page.tsx`
- `web/lib/captures/review-state.ts`
- `web/lib/captures/save.ts`

### Criterios de aceptación

- El destino mostrado coincide exactamente con el payload guardado.
- Cambiar de área filtra o limpia el proyecto de forma visible.
- Inbox es una decisión explícita, no un fallback sorpresivo.
- El selector funciona con teclado, móvil y catálogos grandes.
- No existe pérdida silenciosa de proyecto durante el guardado.

---

## P1 — Revisar excepciones, no todo

### Problema

La revisión completa está dentro de `ShowMore` con una altura máxima. En capturas largas puede aparecer scroll anidado y el botón Guardar queda oculto al final del disclosure.

El usuario dedica la misma atención a elementos claros y elementos ambiguos.

### Propuesta

- Eliminar el scroll interno y usar el flujo normal de la página.
- Sacar `Confirmar y guardar` fuera del disclosure.
- Mostrar un resumen por categoría:

```text
3 tareas · 2 ideas · 1 nota
2 elementos necesitan revisión
```

- Priorizar o abrir automáticamente elementos con:
  - destino vacío;
  - proyecto incompatible;
  - sugerencias nuevas;
  - fechas ambiguas;
  - warnings de validación.
- Permitir colapsar grupos completos de tareas, ideas y conocimiento.
- Evaluar una barra de acción inferior sólo en desktop o con safe-area correcta; evitar tapar contenido o teclado móvil.

### Archivos principales

- `web/components/capture/CaptureReviewPanel.tsx`
- `web/components/interior/show-more.tsx`
- `web/app/globals.css`

### Criterios de aceptación

- Capturas con 1, 10 y 50 elementos no generan scroll anidado.
- Guardar siempre es alcanzable con teclado y en 320/360 px.
- La interfaz indica claramente qué requiere atención.
- El resumen incluye elementos restantes y sugerencias aprobadas.

---

## P1 — Completar éxito, error y siguiente acción

### Problema

Después de guardar se muestra un UUID técnico de recibo y desaparece la revisión, pero no existe un siguiente paso claro. En revisiones largas, los errores aparecen lejos del botón Guardar.

### Propuesta

- Reemplazar el UUID visible por feedback comprensible:

```text
Captura guardada
3 tareas y 1 nota añadidas
```

- Mantener el identificador técnico únicamente en logs o detalles diagnósticos.
- Ofrecer acciones posteriores:
  - `Capturar otra`;
  - `Ver Inbox`;
  - `Ver elementos guardados` cuando el receipt permita construir el destino.
- Tras `Capturar otra`, enfocar el editor en desktop.
- Mostrar errores de guardado junto a la acción Guardar.
- Anunciar error o éxito una sola vez con `aria-live`.
- Mover foco o hacer scroll controlado al error, sin saltos bruscos.
- Mostrar discretamente `Borrador recuperado` cuando corresponda, con opción de descartarlo.

### Archivos principales

- `web/app/(app)/capture/page.tsx`
- `web/components/capture/CaptureReviewPanel.tsx`
- `web/lib/captures/receipt.ts`

### Decisiones de producto pendientes

- ¿Después de guardar, la acción principal debe ser `Capturar otra` o `Ver Inbox`?
- ¿Cuándo debe desaparecer automáticamente el mensaje de éxito?
- ¿Se debe permitir abrir directamente los elementos creados?

### Criterios de aceptación

- El usuario entiende qué se guardó sin ver IDs técnicos.
- Existe una acción siguiente clara.
- El error de guardado siempre aparece cerca del botón y recibe foco adecuado.
- El borrador recuperado nunca sorprende al usuario.

---

## P2 — Ruta rápida de teclado y carga no bloqueante

### Problema

`Ordenar` espera a que el cliente cargue áreas y proyectos, aunque el endpoint obtiene su propio contexto. El editor incluye shortcuts de formato, pero no un shortcut para procesar.

El autofocus actual también puede abrir automáticamente el teclado en móvil.

### Propuesta

- Permitir escribir y ordenar mientras carga el contexto del cliente.
- Bloquear únicamente controles que realmente dependan de áreas/proyectos.
- Añadir:

```text
⌘ Enter / Ctrl Enter → Ordenar
```

- Mantener single-flight para evitar solicitudes duplicadas.
- Mostrar el shortcut como hint discreto en desktop.
- Aplicar autofocus sólo en dispositivos desktop con pointer fino.
- Añadir al textarea:
  - `name="capture-note"`;
  - `autoComplete="off"`;
  - placeholder con el carácter `…`.
- Mostrar contador de caracteres sólo cuando se acerque al límite.

### Archivos principales

- `web/app/(app)/capture/page.tsx`
- `web/components/capture/MarkdownEditor.tsx`

### Criterios de aceptación

- Una carga lenta o fallida de áreas no impide enviar la nota.
- `Cmd/Ctrl+Enter` genera exactamente una petición.
- El shortcut no interfiere con edición Markdown.
- El teclado móvil no se abre automáticamente al entrar.

---

## P2 — Edición completa de resultados

### Problema

La edición actual no cubre todos los datos importantes:

- conocimiento permite editar principalmente el título, no todo el contenido;
- tareas no permiten corregir claramente fecha/proyecto desde la misma tarjeta;
- no existe una señal consistente de campos modificados por el usuario.

### Propuesta

- Definir formularios por tipo:
  - tarea: título, fecha, área y proyecto;
  - idea: contenido y área;
  - conocimiento: título, contenido, tags y área.
- Indicar discretamente qué valores fueron modificados manualmente.
- Conservar cambios al reabrir y cerrar una edición.
- Validar inline sin borrar el texto introducido.

### Criterios de aceptación

- Todo valor importante puede corregirse antes de guardar.
- Cancelar restaura el valor anterior.
- Guardar edición no modifica otros elementos.
- Los campos funcionan completamente con teclado y lector de pantalla.

---

## P2 — Estados vacíos y fallback a Inbox

### Propuesta

Cuando el usuario descarte todos los resultados, ofrecer:

- `Deshacer descarte` para el último elemento;
- `Guardar nota original en Inbox`;
- `Editar y volver a ordenar`.

No obligar a reprocesar si la intención es conservar la nota original.

### Criterios de aceptación

- Nunca existe un callejón sin salida.
- El usuario entiende qué contenido se guardará.
- Guardar en Inbox conserva íntegramente la nota original.

---

## Accesibilidad y validación transversal

Cada slice debe comprobar:

- navegación sólo con teclado;
- zoom al 200 %;
- 320 px, 360 px, tablet y desktop;
- teclado móvil abierto;
- tema claro y oscuro;
- `prefers-reduced-motion`;
- foco después de editar, descartar, undo, error y éxito;
- un solo anuncio relevante por cambio de estado;
- touch targets de al menos 44 px;
- textos largos, Markdown, URLs y 50 elementos;
- sin scroll horizontal o regiones desplazables anidadas.

## Orden recomendado de implementación

1. **Slice A — Consistencia nota ↔ resultado**
   - versión/hash procesado;
   - estado desactualizado;
   - reproceso no destructivo.
2. **Slice B — Destino efectivo Área → Proyecto**
   - fuente de verdad visual;
   - compatibilidad y limpieza explícita.
3. **Slice C — Revisión por excepciones**
   - sin scroll interno;
   - resumen y Guardar fuera del disclosure.
4. **Slice D — Éxito, errores y siguiente acción**
   - feedback comprensible;
   - foco y acciones posteriores.
5. **Slice E — Ruta rápida**
   - contexto no bloqueante;
   - Cmd/Ctrl+Enter;
   - autofocus desktop.
6. **Slice F — Edición completa y escalabilidad**
   - forms por tipo;
   - combobox buscable;
   - acciones para capturas grandes.

## Fuera de alcance inicialmente

- Animaciones decorativas.
- Más llamadas al modelo.
- Guardado automático sin revisión.
- Historial ilimitado de undo.
- Cambios de navegación global.

## Métricas de éxito

- Tiempo desde abrir Captura hasta enviar la nota.
- Tiempo desde resultado hasta confirmación.
- Porcentaje de capturas guardadas sin correcciones.
- Correcciones de área/proyecto por captura.
- Reprocesos y errores de guardado.
- Abandono después de recibir resultados.
- Uso de Inbox como destino explícito.
- Uso de `Capturar otra` y `Ver Inbox` después de guardar.
