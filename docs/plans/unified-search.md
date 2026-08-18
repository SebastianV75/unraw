# Plan de implementación: búsqueda unificada

Estado: Feature cerrada en `main`; Fases 1–5 de implementación completas; tests, typecheck, build y lint de `web` pasan; caché/feedback de cliente implementados; optimización SQL `012` aplicada en Cloud. La validación manual autenticada queda como seguimiento no bloqueante
Alcance: primera versión textual de la búsqueda global de Unraw  
Ruta prevista: `/search`  
Última actualización: 2026-08-17

Este documento es la fuente de verdad para implementar la búsqueda unificada. Describe el producto aprobado, el contrato técnico, los estados de interfaz, las tareas, las pruebas y los límites de la primera versión. El equipo que implemente este cambio no debe tener que reconstruir decisiones desde conversaciones anteriores.

## 1. Resultado esperado

Unraw permitirá encontrar rápidamente contenido existente desde cualquier sección de la aplicación:

- `Ctrl/Cmd + K` abrirá una Command Palette de búsqueda rápida.
- La navegación principal tendrá una entrada llamada **Buscar** que abrirá `/search`.
- Ambas superficies consultarán tareas, ideas, conocimiento, áreas y proyectos.
- La búsqueda será textual, global, tolerante a mayúsculas y acentos, pero no corregirá errores ortográficos.
- Seleccionar un resultado abrirá la página específica del elemento cuando exista; de lo contrario, abrirá su contexto padre.

La primera versión debe sentirse como una herramienta para recuperar algo que el usuario ya guardó, no como un asistente que recomienda qué hacer ni como un panel de edición.

## 2. Decisiones de producto cerradas

| Tema | Decisión aprobada |
| --- | --- |
| Objetivo | Encontrar una tarea, idea o nota específica. |
| Entidades | Tareas, ideas, conocimiento, áreas y proyectos. |
| Exclusiones | Inbox, capturas originales, etiquetas y descripciones. |
| Acceso rápido | Command Palette con `Ctrl/Cmd + K`. |
| Página completa | `/search`, accesible desde navegación principal como **Buscar**. |
| “Ver todos” | Expande la palette en el mismo lugar y muestra todos los resultados con scroll. |
| Alcance | Global; no depende de la sección actual. |
| Actualización | Mientras se escribe, después de 250 ms sin nuevas teclas. |
| Inicio de consulta | Desde el primer carácter. |
| Coincidencias | Parciales; todos los términos deben coincidir. |
| Normalización | Ignorar mayúsculas y acentos. |
| Errores ortográficos | No corregir ni aproximar typos. |
| Relevancia | Títulos y nombres pesan más que el contenido. |
| Resultados compactos | Máximo 8 resultados en la palette cerrada. |
| Resultados expandidos | Todos los resultados disponibles en una lista con scroll. |
| Agrupación | Lista única ordenada por relevancia; no separar por tipo. |
| Datos visibles | Tipo, contexto, fragmento coincidente y fecha de tarea si existe. |
| Fragmento | Máximo 2 líneas, con términos coincidentes resaltados discretamente. |
| Estados visibles | No mostrar estados de tareas, ideas ni proyectos en el resultado. |
| Fechas | Buscar `due_date` de tareas; no buscar `due_at`. |
| Fechas relativas | Resolver `hoy`, `mañana` y días de la semana en la zona horaria local del usuario. |
| Acciones | Ninguna acción rápida; el resultado solo navega. |
| Teclado | `↑/↓` navega, `Enter` abre, `Esc` cierra. |
| Móvil | Mismo comportamiento y contenido; solo cambia el layout responsive. |
| Consulta en URL | No persistir la consulta en la URL del navegador. |
| Autofocus | En `/search`, enfocar el campo automáticamente al entrar. |
| Estado inicial de `/search` | Campo vacío y explicación breve. |
| Consulta borrada | Mostrar los resultados recientes de la sesión. |
| Sin resultados | Mostrar `No encontramos resultados para esta búsqueda.` |
| Error | Mostrar error breve y conservar los resultados anteriores. |
| Backend | Un endpoint/RPC server-side que consulte Supabase directamente. |
| Índice dedicado | No crear un índice persistente de búsqueda en esta primera versión. |

## 3. Aclaraciones sobre el modelo actual

El esquema actual no representa exactamente todos los conceptos de la conversación de producto. Estas reglas evitan que la implementación invente columnas o estados:

### Áreas

`areas` no tiene columna de estado. Por tanto:

- todas las áreas del usuario participan en la búsqueda;
- no se aplica prioridad por estado a las áreas;
- la etiqueta de un resultado de área solo muestra su nombre y contexto disponible.

### Proyectos

`projects.status` usa `active`, `paused` y `completed`:

- todos los proyectos del usuario participan;
- los proyectos activos tienen prioridad sobre pausados y completados cuando la coincidencia sea equivalente;
- el estado no se muestra como metadato visual en el resultado de acuerdo con la decisión de producto.

### Tareas

Las tareas tienen `title`, `notes`, `status`, `due_date` y `due_at`:

- `title` y `notes` son texto buscable;
- `due_date` participa en la búsqueda temporal;
- `due_at` no participa en la búsqueda;
- todos los estados (`pending`, `in_progress`, `done`) participan;
- no se muestra `status` en el resultado.

### Ideas

Las ideas tienen `content` y `status`:

- `content` es buscable;
- todos los estados (`new`, `evaluating`, `discarded`, `converted`) participan;
- no se muestra `status` en el resultado.

### Conocimiento

`second_brain` tiene `title`, `content`, `tags` y `area_id` opcional:

- `title` y `content` son buscables;
- `tags` quedan fuera del alcance inicial;
- el conocimiento puede ser global cuando `area_id` es `null`;
- el contexto debe mostrar el área cuando exista y `Conocimiento global` cuando sea `null`.

### Descripciones e Inbox

- `projects.description` queda fuera del alcance inicial, aunque sea texto.
- `inbox_items`, `capture_batches` y `raw_note` quedan fuera del alcance inicial.
- Esto evita mezclar recuperación de contenido final con triage e historial de capturas.

## 4. Experiencia de usuario

### 4.1 Command Palette cerrada

La Command Palette actual ya existe en `web/components/navigation/CommandPalette.tsx` y está integrada en `web/app/(app)/layout.tsx`. La implementación debe conservar:

- apertura por botón y por `Ctrl/Cmd + K`;
- focus automático en el input;
- cierre con `Esc`, botón de cierre o click fuera;
- devolución del foco al launcher al cerrar;
- soporte para navegación móvil.

Debe cambiar el comportamiento de “buscar páginas” por búsqueda de contenido real.

Estado sin consulta:

- mostrar únicamente el campo y su placeholder;
- no mostrar páginas recientes ni accesos rápidos;
- no mostrar resultados hasta que exista al menos un carácter.

Estado con consulta:

- esperar 250 ms después de la última tecla;
- conservar la lista anterior durante la actualización;
- mostrar un indicador pequeño de actualización;
- mostrar una lista única con hasta 8 resultados en modo compacto;
- ofrecer `Ver todos` cuando existan más resultados que el límite compacto;
- `Ver todos` debe expandir el mismo diálogo y habilitar scroll;
- no navegar a `/search` desde `Ver todos`.

Interacción de teclado:

| Tecla | Comportamiento |
| --- | --- |
| `ArrowDown` | Mover el resultado activo al siguiente, sin salir de la palette. |
| `ArrowUp` | Mover el resultado activo al anterior. |
| `Enter` | Abrir el resultado activo. |
| `Escape` | Cerrar la palette y devolver el foco al botón launcher. |
| `Ctrl/Cmd + K` | Abrir la palette desde cualquier sección autenticada. |

Si la consulta no tiene coincidencias, mostrar exactamente:

> No encontramos resultados para esta búsqueda.

Si una consulta falla, mostrar un mensaje breve de error sin borrar la lista anterior.

### 4.2 Página `/search`

La página debe estar dentro de `web/app/(app)/search/page.tsx` y entrar en la navegación principal de `web/app/(app)/layout.tsx` con:

- etiqueta: `Buscar`;
- ruta: `/search`;
- icono de Reicon consistente con la navegación actual;
- estado activo cuando `pathname === "/search"`.

Al entrar directamente:

1. renderizar el título de la página;
2. renderizar un campo de búsqueda con autofocus;
3. mostrar una explicación breve debajo del campo;
4. no mostrar resultados recientes en la primera visita de la sesión.

Texto recomendado para el estado inicial:

> Busca tareas, ideas, notas, áreas y proyectos en todo Unraw.

Al escribir:

- la explicación desaparece cuando aparecen resultados;
- los resultados se actualizan con el mismo debounce de 250 ms;
- la página puede mostrar todos los resultados en scroll;
- no aparecen filtros ni acciones rápidas.

Al borrar una consulta después de haber recibido resultados:

- conservar en memoria del cliente el último conjunto exitoso;
- mostrar ese conjunto como `Resultados recientes`;
- no persistirlo en Supabase ni en la URL;
- si todavía no hubo una búsqueda exitosa, mostrar el estado inicial con explicación.

### 4.3 Filas de resultado

Cada fila debe contener, en este orden visual:

1. título o nombre principal;
2. etiqueta de tipo: `Tarea`, `Idea`, `Conocimiento`, `Área` o `Proyecto`;
3. contexto: nombre de área, proyecto o `Conocimiento global`;
4. fragmento de hasta dos líneas cuando la coincidencia esté en contenido;
5. fecha de tarea cuando `due_date` exista.

La fila completa debe ser seleccionable y abrir el destino definido. No debe contener botones de completar, mover, editar o eliminar.

## 5. Semántica de búsqueda

### 5.1 Normalización

La consulta y los campos de comparación deben normalizarse de la misma forma:

1. recortar espacios al inicio y al final;
2. convertir a minúsculas;
3. eliminar diacríticos con comportamiento equivalente a `unaccent`;
4. separar por espacios y eliminar tokens vacíos;
5. tratar todos los tokens como términos obligatorios (`AND`);
6. comparar coincidencias parciales dentro de cada campo.

No se debe implementar corrección ortográfica, fuzzy matching ni expansión semántica.

Ejemplo:

```text
Consulta: "Trabajo Profundo"
Tokens:   ["trabajo", "profundo"]
Coincide: "Bloque de trabajo profundo los viernes"
No coincide: "Trabajo semanal"  // falta "profundo"
```

### 5.2 Campos buscables

| Tipo | Campos buscables | Campos excluidos |
| --- | --- | --- |
| Tarea | `title`, `notes`, `due_date` | `due_at`, `status` como campo de texto |
| Idea | `content` | `status` |
| Conocimiento | `title`, `content` | `tags` |
| Área | `name` | No tiene estado ni descripción |
| Proyecto | `name` | `description`, `status` como campo de texto |

La consulta debe estar limitada al `auth.uid()` actual. Nunca debe devolver filas de otro usuario aunque el cliente manipule parámetros.

### 5.3 Fechas

La fecha de vencimiento solo se usa para tareas.

La implementación debe aceptar:

- formato ISO `YYYY-MM-DD`;
- día y mes escritos en español, como `15 de agosto`;
- `hoy`;
- `mañana`;
- nombres de días de la semana en español.

Reglas temporales:

- usar la zona horaria local del navegador/usuario;
- `hoy` representa la fecha local actual;
- `mañana` representa la fecha local siguiente;
- un día de semana representa la próxima ocurrencia, incluyendo hoy si coincide;
- una fecha sin año usa el año local actual;
- si el texto no se puede interpretar como fecha, continuar con búsqueda textual normal;
- no convertir una hora ni consultar `due_at`.

La fecha reconocida debe contribuir al ranking, pero una coincidencia exacta en título o nombre debe seguir teniendo más peso.

### 5.4 Ranking determinista

El ranking debe ser estable y explicable. Como punto de partida:

| Coincidencia | Puntuación base |
| --- | ---: |
| Coincidencia exacta de título/nombre | 100 |
| Título/nombre comienza con el término | 85 |
| Coincidencia parcial en título/nombre | 70 |
| Coincidencia en contenido o notas | 45 |
| Coincidencia de `due_date` | 40 |

Bonificaciones y desempates:

- proyecto `active`: `+10`;
- proyecto `paused`: `+5`;
- proyecto `completed`: `+0`;
- ordenar empates por `updated_at DESC`;
- usar `id` como último desempate estable.

Las áreas no reciben bonificación de estado porque no tienen estado en el esquema.

La puntuación no se muestra al usuario; solo determina el orden.

## 6. Contrato técnico

### 6.1 Separación de responsabilidades

La implementación debe mantener estas capas:

| Capa | Responsabilidad |
| --- | --- |
| Normalizador | Convertir consulta y términos temporales a una representación segura y predecible. |
| Supabase/RPC | Consultar únicamente datos del usuario autenticado y devolver filas unificadas. |
| Route handler | Validar input, resolver errores HTTP y traducir el resultado a JSON. |
| Hook/componente cliente | Debounce, cancelación de respuestas obsoletas, estados de carga/error y navegación. |
| Presentación | Renderizar fila, tipo, contexto, fragmento, fecha y resaltado seguro. |

No se debe consultar cada tabla directamente desde `CommandPalette`. La palette y `/search` deben compartir la misma función cliente/API.

### 6.2 Endpoint recomendado

La ruta `web/app/api/search/route.ts` expone `GET`:

```text
GET /api/search?q=<consulta>&mode=compact|all
```

Reglas:

- `q` es obligatorio cuando `mode` es `compact` o `all`;
- `mode=compact` devuelve hasta 8 resultados;
- `mode=all` devuelve todos los resultados coincidentes para el scroll expandido;
- la consulta no se agrega a la URL visible de `/search`;
- el endpoint sí puede recibirla como parámetro interno de la petición;
- `q` vacío o ausente devuelve `400`; el endpoint no consulta tablas para input inválido;
- el cliente no realiza solicitudes mientras la búsqueda está en estado `idle`, sin consulta;
- limitar la longitud de `q` a 200 caracteres;
- devolver `400` para input inválido;
- devolver `401` si no existe usuario autenticado;
- devolver `500` con mensaje genérico si Supabase falla;
- nunca devolver detalles de SQL, tokens ni información de otros usuarios.

### 6.3 Forma de respuesta

La respuesta debe ser uniforme para todas las entidades:

```json
{
  "query": "texto original",
  "results": [
    {
      "id": "uuid",
      "kind": "task",
      "label": "Tarea",
      "title": "Preparar presentación",
      "context": "Trabajo / Lanzamiento",
      "snippet": "Preparar la presentación para el lunes...",
      "highlightRanges": [[0, 9]],
      "dueDate": "2026-08-17",
      "href": "/areas/area-id/projects/project-id",
      "score": 100,
      "updatedAt": "2026-08-14T12:00:00Z"
    }
  ]
}
```

Reglas del contrato:

- `score` puede quedarse fuera de la UI, pero debe existir internamente para ordenar;
- `snippet` debe estar ya limitado a dos líneas o su equivalente de longitud;
- el renderer debe tratar todo contenido como texto, nunca como HTML confiable;
- `highlightRanges` se calculará en el route handler usando texto/rangos, sin interpolar HTML sin sanitizar;
- `href` debe ser generado server-side a partir de IDs validados y rutas conocidas;
- para una idea, `dueDate` es `null`;
- para conocimiento global, `context` debe ser `Conocimiento global`;
- el endpoint no debe devolver `raw_note`, `tags`, `description` ni `status`.

### 6.4 RPC o consulta SQL

Crear una migración nueva, propuesta como `supabase/migrations/006_unified_search.sql`, que:

1. habilite `unaccent` si el entorno lo permite;
2. defina una función server-side/RPC para devolver una forma unificada;
3. limite cada rama a `auth.uid()`;
4. una resultados de `tasks`, `ideas`, `second_brain`, `areas` y `projects`;
5. normalice texto para comparación insensible a mayúsculas y acentos;
6. aplique la condición `AND` para todos los términos;
7. calcule el ranking definido arriba;
8. genere fragmentos de contenido sin exponer HTML;
9. ordene por puntuación, `updated_at DESC` e `id`;
10. permita el modo compacto y el modo completo.

La función debe ser `SECURITY INVOKER` o equivalente con la garantía de que RLS y `auth.uid()` se respetan. No usar `SUPABASE_SERVICE_ROLE_KEY` para la búsqueda de usuarios.

La búsqueda directa es aceptable en esta primera versión porque el modelo actual es pequeño y no tiene índice dedicado. Si el volumen crece, el equipo debe medir antes de migrar a un índice persistente.

## 7. Archivos esperados

El equipo puede ajustar nombres internos, pero debe conservar estas responsabilidades:

| Archivo | Cambio esperado |
| --- | --- |
| `web/components/navigation/CommandPalette.tsx` | Reemplazar filtrado de comandos estáticos por el cliente de búsqueda; conservar shortcuts, foco, teclado y cierre. |
| `web/components/navigation/SearchResultRow.tsx` | Nuevo componente reutilizable para una fila de resultado. |
| `web/components/navigation/SearchResults.tsx` | Nuevo renderer para lista, estados, scroll y “Ver todos”. |
| `web/components/navigation/useUnifiedSearch.ts` | Nuevo hook para debounce, cancelación, resultados recientes, carga y error. |
| `web/app/(app)/search/page.tsx` | Nueva página con autofocus, explicación, búsqueda completa y resultados. |
| `web/app/(app)/layout.tsx` | Añadir `Buscar` a navegación principal y soporte de estado activo. |
| `web/app/api/search/route.ts` | Nuevo endpoint autenticado. |
| `web/lib/search/normalize.ts` | Normalización de texto y tokens. |
| `web/lib/search/dates.ts` | Resolución de fechas relativas en zona horaria local. |
| `web/lib/search/types.ts` | Tipos de consulta, respuesta y resultado. |
| `web/types/index.ts` | Reexportar tipos públicos si el proyecto lo requiere. |
| `supabase/migrations/006_unified_search.sql` | Función/RPC, extensión y cambios SQL necesarios. |
| `supabase/migrations/012_optimize_unified_search.sql` | Texto normalizado almacenado, índices trigram y RPC optimizada. |
| `web/app/globals.css` | Layout responsive, etiquetas, fragmentos, resaltado, loading y scroll. |
| `web/package.json` | Añadir script/dependencias de tests si se adopta el runner definido abajo. |

No modificar la clasificación de IA, el guardado de capturas, el modelo de Inbox ni las entidades para implementar esta primera versión.

## 8. Plan de trabajo por fases

### Fase 0 — Preparación y contrato

Entregables:

- confirmar que el documento está aprobado como fuente de verdad;
- crear tipos de respuesta y helpers puros;
- fijar ejemplos de consulta y ranking;
- decidir el nombre final del icono Reicon sin cambiar la etiqueta `Buscar`.

Salida verificable: el equipo puede compilar los tipos y revisar el contrato sin depender de Supabase.

### Fase 1 — Base de datos y seguridad

Entregables:

- migración `006_unified_search.sql`;
- función/RPC unificada;
- normalización de acentos y mayúsculas;
- ramas para las cinco entidades;
- ranking y modo compacto/completo;
- filtros obligatorios por `auth.uid()`;
- pruebas SQL o smoke tests autenticados para impedir fuga entre usuarios.

Salida verificable: una consulta autenticada devuelve resultados unificados y una consulta de otro usuario no devuelve filas.

### Fase 2 — Cliente de búsqueda compartido

Entregables:

- hook común para palette y `/search`;
- debounce de 250 ms;
- cancelación o descarte de respuestas obsoletas;
- estados `idle`, `loading`, `refreshing`, `success`, `empty` y `error`;
- resultados anteriores conservados durante `refreshing` y `error`;
- resultados recientes en memoria al borrar una búsqueda exitosa.

Salida verificable: ambas superficies usan el mismo contrato y no duplican lógica de consulta.

### Fase 3 — Command Palette (implementada)

Entregables:

- búsqueda desde primer carácter;
- límite compacto de 8;
- “Ver todos” con scroll dentro del mismo diálogo;
- navegación `↑/↓`, `Enter`, `Esc`;
- labels de tipo, contexto, snippet, resaltado y fecha;
- accesibilidad con `role="dialog"`, `role="listbox"`, opción activa y foco restaurado;
- comportamiento responsive equivalente en móvil.

Salida verificable: el usuario puede abrir, buscar, navegar y abrir un resultado sin usar el mouse.

### Fase 4 — Página `/search` y navegación (implementada)

Entregables:

- ruta autenticada `/search`;
- entrada `Buscar` en desktop y navegación móvil;
- autofocus;
- explicación inicial;
- resultados completos con scroll;
- estado de resultados recientes al limpiar una consulta previa;
- no persistir `q` en URL;
- estado activo correcto de navegación.

Salida verificable: la página funciona directamente y mantiene el mismo contrato de búsqueda que la palette.

### Fase 5 — Verificación y documentación de entrega (cerrada)

Entregables:

- pruebas unitarias de normalización, tokens, fechas y ranking — completadas;
- pruebas de contrato del endpoint — completadas;
- lint, typecheck y build del workspace `web` — completados;
- migraciones `006`–`012` aplicadas en Cloud y lint remoto sin errores — completado;
- caché cliente, feedback visual y optimización SQL — completados;
- smoke autenticado, aislamiento RLS y pruebas manuales exhaustivas de UI — seguimiento posterior no bloqueante.

Salida verificable: el cambio tiene evidencia reproducible y otro equipo puede retomarlo desde este documento.

## 9. Pruebas y criterios de aceptación

Vitest está configurado para helpers y contrato del endpoint. La validación manual autenticada de API/RPC y RLS queda como seguimiento operativo separado.

### 9.1 Búsqueda y ranking

- [ ] `Trabajo` y `trabajo` producen la misma consulta normalizada.
- [ ] `trabajó` y `trabajo` coinciden después de quitar diacríticos.
- [ ] Una consulta de dos términos exige que ambos aparezcan.
- [ ] El orden de los términos no cambia la coincidencia.
- [ ] Una coincidencia en título supera una coincidencia solo en contenido.
- [ ] Una coincidencia en nombre de proyecto supera una coincidencia parcial menos relevante.
- [ ] Una fecha `due_date` puede devolver una tarea.
- [ ] Una hora `due_at` no crea coincidencias.
- [ ] Una consulta con typo no se corrige automáticamente.
- [ ] Un área siempre puede aparecer porque no tiene estado.
- [ ] Proyectos activos se priorizan sobre pausados y completados en empate semántico.

### 9.2 Seguridad y datos

- [ ] Una persona autenticada solo recibe sus propias filas.
- [ ] Una persona no autenticada recibe `401`.
- [ ] El endpoint nunca expone `raw_note`, `tags`, `description` ni tokens.
- [ ] Inbox y capturas no aparecen aunque su texto coincida.
- [ ] Ideas descartadas y convertidas sí aparecen.
- [ ] Tareas completadas sí aparecen.
- [ ] Proyectos completados sí aparecen.

### 9.3 Command Palette

- [ ] `Ctrl/Cmd + K` abre y enfoca el campo.
- [ ] El primer carácter inicia la búsqueda.
- [ ] La consulta se ejecuta aproximadamente 250 ms después de dejar de escribir.
- [ ] La lista anterior permanece visible durante una actualización.
- [ ] Un error conserva la lista anterior y muestra un mensaje breve.
- [ ] El modo compacto muestra como máximo 8 resultados.
- [ ] “Ver todos” expande la lista con scroll en el mismo diálogo.
- [ ] `ArrowUp` y `ArrowDown` cambian el resultado activo.
- [ ] `Enter` abre el resultado activo.
- [ ] `Esc` cierra y devuelve el foco al launcher.
- [ ] El fragmento muestra como máximo dos líneas y resalta términos coincidentes.
- [ ] No aparecen botones de edición ni acciones rápidas.

### 9.4 Página `/search`

- [ ] `Buscar` aparece en navegación desktop y móvil.
- [ ] `/search` enfoca automáticamente el campo.
- [ ] Sin historial, muestra explicación y no resultados recientes.
- [ ] Al escribir, la explicación desaparece cuando llegan resultados.
- [ ] Al borrar una búsqueda exitosa, muestra el último conjunto de resultados en memoria.
- [ ] La consulta no aparece en la URL visible.
- [ ] Sin coincidencias muestra exactamente el mensaje definido.
- [ ] La página permite scroll en el conjunto completo de resultados.
- [ ] La presentación funciona en móvil sin cambiar reglas funcionales.

### 9.5 Calidad

- [ ] `yarn workspace web lint` pasa.
- [ ] `yarn workspace web build` pasa.
- [ ] Las pruebas del nuevo runner pasan.
- [ ] La migración se aplica en una base limpia.
- [ ] La migración se puede restablecer mediante el flujo local documentado.
- [ ] No se modifican flujos de captura, IA o Inbox fuera de lo descrito.

## 10. Estados de interfaz

| Estado | Palette | `/search` |
| --- | --- | --- |
| `idle` inicial | Campo vacío, sin resultados ni accesos extra. | Campo vacío + explicación. |
| `loading` inicial | Indicador pequeño; sin lista anterior. | Indicador pequeño; sin lista anterior. |
| `refreshing` | Lista anterior + indicador pequeño. | Lista anterior + indicador pequeño. |
| `success` | Resultados, máximo 8 en modo compacto. | Todos los resultados con scroll. |
| `empty` | Mensaje de no resultados. | Mensaje de no resultados. |
| `error` | Error breve + resultados anteriores si existen. | Error breve + resultados anteriores si existen. |
| `cleared-after-success` | Volver a estado idle de palette. | Mostrar último conjunto exitoso como resultados recientes. |
| `expanded` | Todos los resultados con scroll dentro de la palette. | No aplica; ya es vista completa. |

## 11. Fuera de alcance

No incluir en esta implementación:

- búsqueda semántica o embeddings;
- preguntas a la IA sobre el conocimiento;
- corrección ortográfica o fuzzy matching;
- etiquetas, descripciones, Inbox o historial de capturas;
- filtros por tipo, área, proyecto o estado;
- acciones rápidas sobre resultados;
- edición inline;
- historial persistente de búsquedas;
- persistencia de la consulta en la URL;
- paginación visible o carga incremental;
- colaboración o búsqueda entre usuarios;
- rediseño general de la navegación;
- cambios al prompt o al pipeline de clasificación de IA.

Si cualquiera de estos puntos se vuelve necesario, debe abrirse una decisión de alcance nueva y no incorporarse silenciosamente.

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Consultas lentas al usar `unaccent` y coincidencias parciales | Medir con datos reales; mantener consulta server-side; migrar a índices solo con evidencia. |
| Respuestas fuera de orden por escritura rápida | Usar abort controller o request id y descartar respuestas obsoletas. |
| Fuga de datos entre usuarios | `auth.uid()` en RPC, RLS y pruebas de aislamiento. |
| HTML inseguro en snippets | Renderizar texto y rangos de resaltado, nunca HTML interpolado del usuario. |
| Diferencias entre palette y `/search` | Compartir hook, tipos, contrato y componentes de resultado. |
| Confusión entre área y proyecto por estados | Mantener la aclaración del esquema: solo proyectos tienen status. |
| “Todos” devuelve demasiadas filas | Usar modo completo solo para el dataset del usuario; medir tamaño y documentar cualquier límite futuro como cambio de producto. |
| Falta de runner de tests | Crear el runner antes de implementar las pruebas de la fase 5. |

## 13. Checklist de entrega al siguiente equipo

- [ ] Leer este documento completo antes de editar código.
- [ ] Confirmar que el esquema real no cambió respecto a las aclaraciones de la sección 3.
- [ ] Implementar la migración antes de conectar la UI.
- [ ] Verificar RLS con al menos dos usuarios de prueba.
- [ ] Mantener un solo contrato para palette y `/search`.
- [ ] No agregar filtros, acciones ni campos fuera de alcance.
- [ ] Probar estados de carga, refreshing, empty, error y cleared-after-success.
- [ ] Probar teclado y móvil.
- [ ] Ejecutar lint, build y pruebas.
- [ ] Registrar aquí cualquier desviación antes de considerarla terminada.

## 14. Definición de terminado

La búsqueda unificada se considera terminada cuando:

1. el endpoint/RPC devuelve resultados correctos y aislados por usuario;
2. la palette y `/search` comparten consulta, ranking y presentación;
3. se cumplen todas las decisiones de producto de la sección 2;
4. los estados y criterios de aceptación de la sección 9 están verificados;
5. lint, build y pruebas pasan;
6. la migración está incluida en el historial de Supabase;
7. no hay cambios silenciosos en el alcance;
8. este documento refleja cualquier decisión posterior relevante.

## 15. Cierre de la feature

La búsqueda unificada queda cerrada para continuar con otra feature. La Fase 1 SQL está desplegada y validada en Cloud mediante las migraciones `006`–`012`, la route API está creada y las Fases 2–4 de cliente/UI están implementadas. El cliente reutiliza búsquedas recientes en memoria y muestra feedback de actualización sin reemplazar la lista visible. La migración `012_optimize_unified_search.sql` añade texto normalizado almacenado e índices trigram; fue aplicada en Cloud y el lint remoto no reporta errores. Tests, typecheck, build y lint de `web` pasan. La validación manual autenticada, RLS y pruebas manuales exhaustivas quedan registradas como seguimiento posterior y no bloquean el cierre de esta entrega.
