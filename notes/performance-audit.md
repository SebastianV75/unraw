# Revisión de rendimiento — 2026-10-21

## Cambios verificados

- MarkdownRenderer usa memo y una lista estable de plugins: cambiar selecciones o controles de revisión ya no vuelve a analizar contenido idéntico.
- Captura carga el panel de revisión y la vista previa Markdown bajo demanda.
- Hoy solicita solo las tres entradas visibles del Inbox y la fecha de la última captura, sin descargar raw_note, snapshots ni referencias guardadas.
- Guardar captura valida únicamente IDs usados, deduplicados, en hasta dos consultas paralelas. Captura rápida sin asignaciones omite ambas consultas. Errores de validación detienen el guardado.
- Búsqueda conserva debounce de 250 ms, AbortController, caché LRU de 24 entradas / 30 s e invalidación por cambio de sesión. Los espacios exteriores ya no reinician el efecto. El buscador cerrado no ejecuta búsquedas; la suscripción de auth se mantiene para invalidar datos entre usuarios.
- Logos usan next/image con dimensiones y tamaños de descarga; favicon usa el archivo de 64 px. Departure Mono no se precarga globalmente; se descarga cuando CSS la necesita. Imágenes Markdown usan decodificación asíncrona y lazy loading.

Build inicial: Captura 278 kB First Load JS. Con lazy loading: 227 kB (51 kB menos, aproximadamente 18%). Son estimaciones del build de Next, no mediciones de red comprimidas. En el navegador local, el logo pasó de 123.288 a 8.150 bytes transferidos (aproximadamente 93% menos); dimensiones visibles 140 × 24 px y descarga optimizada de 384 px. Landing aumenta aproximadamente 5 kB por next/image; se compensa con el ahorro del logo, medido aparte en navegador.

## SQL y N+1

Las pantallas revisadas agrupan consultas con Promise.all; unified_search y capture_candidate_retrieval usan una RPC por operación. No se encontró un N+1 de requests por fila en estas rutas.

save_capture sí ejecuta búsquedas de área/proyecto por nombre dentro de bucles SQL. La migración 018 agrega índices que coinciden con user_id, lower(name), área y orden temporal. Reduce el trabajo de cada búsqueda; no elimina el patrón de consultas por elemento. Se aplicó a la base remota; los detalles de ejecución están al final. Como 016, requiere ejecutar CREATE INDEX CONCURRENTLY fuera de una transacción.

Durante la auditoría inicial no había conexión SQL ni sesión de usuario autenticada disponible. Luego se conectó el CLI y se aplicaron las migraciones. No se midieron consultas reales con EXPLAIN ANALYZE ni tiempos de interacción autenticada. La clave de servicio de la app no sustituye una conexión SQL y no se usó para acceder a datos de usuarios.

Para identificar consultas lentas en Supabase, ejecutar en su SQL Editor (requiere pg_stat_statements habilitado; no publicar resultados que contengan datos sensibles):

```sql
select queryid, calls, round(mean_exec_time::numeric, 2) as mean_ms,
       round(total_exec_time::numeric, 2) as total_ms, rows, query
from extensions.pg_stat_statements
where dbid = (select oid from pg_database where datname = current_database())
order by total_exec_time desc
limit 20;
```

Para inspeccionar sentencias dentro de save_capture, pg_stat_statements.track debe incluir `all` (administración de BD). EXPLAIN de la llamada RPC por sí solo no muestra los planes internos de PL/pgSQL. Comparar volumen representativo, p95 y lecturas de buffers antes de decidir una reescritura por conjuntos que preserve locks, idempotencia, RLS y asignación de nuevas sugerencias.

## Pendientes identificados

- Hoy sigue descargando todas las tareas abiertas; una RPC con agregados permitiría paginar sin romper el selector por área.
- El progreso de proyectos en Hoy ya excluía tareas completadas de su consulta: por eso el numerador siempre es cero. Resolver con agregados de estados, no trayendo todo el histórico al navegador.
- Inbox y biblioteca de conocimiento aún requieren paginación para catálogos grandes.
- Para medir renders reales con React Profiler y latencias de consultas hace falta una sesión autenticada y datos representativos. La memoización se verificó por comparación de props y tests de salida, no por conteos de renders en producción.

Validación: 197 tests en 32 archivos, lint y build de producción correctos. Navegador: landing carga logo optimizado, dos fuentes precargadas en vez de tres y /capture redirige a login sin sesión. Los tiempos locales de navegación no se usan como evidencia de mejora en producción.

## Aplicación remota — 2026-10-21

CLI Supabase 2.121.0 autenticado y proyecto `unraw` (`vriuoakhpiupryjmnnze`) vinculado. Se ejecutaron las dos sentencias de 018 individualmente con `db query --linked`, fuera de una transacción, para conservar CREATE INDEX CONCURRENTLY. Se verificaron definiciones, indisvalid=true e indisready=true para ambos índices y se registró 018 como aplicada mediante migration repair. La 017 estaba pendiente durante este paso y se aplicó posteriormente, como se registra abajo. La conexión SQL mediante CLI ya está disponible; las limitaciones anteriores describen la auditoría inicial.

## Migración 017 — aplicada posteriormente

Tras revisar la función remota consume_free_capture y las escrituras de onboarding/settings, se aplicó 017 mediante `supabase db push --include-all --yes`. Verificación de permisos efectiva: authenticated no puede insertar/actualizar captures_used, reiniciar captures_reset_date ni borrar profiles; sí conserva edición de nombre e inserción de preferencias. consume_free_capture es SECURITY DEFINER con search_path vacío, ejecutable por authenticated y no por anon. No se ejecutaron fixtures del test SQL aislado contra producción. Dry run posterior: base remota al día, sin migraciones pendientes.
