# Auditoría previa a Coolify

Fecha: 2026-10-21. Alcance: código versionado de `web`, configuración del
monorepo y `docs`, dependencias, autenticación/API y migraciones de Supabase.

## Diagnóstico

La estructura Next.js + Supabase y los workspaces Yarn son válidos. El build
inicial ya funcionaba y las 174 pruebas existentes pasaban. No hace falta
reestructurar la aplicación para alojarla en Coolify.

`web` necesita un servidor Next.js: además de la interfaz, contiene API routes,
autenticación y procesamiento de IA. Alojar la misma aplicación que en Vercel
incluye esas rutas; Supabase puede seguir en su proyecto actual.

## Hallazgos corregidos

1. **Alta — cuota modificable por el usuario.** Las políticas de `profiles`
   protegen filas, pero permitían actualizar `captures_used` y
   `captures_reset_date`, o borrar/recrear el perfil. La migración nueva
   `017_protect_capture_quota.sql` limita escrituras por columna y reserva la
   actualización de cuota a `consume_free_capture()` y a los reembolsos de
   servidor. Mantiene los upserts de onboarding/ajustes y el borrado de cuenta
   mediante Auth admin. No cambia las migraciones históricas.
2. **Alta — dependencias con avisos publicados.** Next.js pasa de 15.5.19 a
   15.5.28 en ambos workspaces. Se actualiza MDX a 6 en `docs` y se resuelven
   versiones corregidas de PostCSS, Nano ID, source-map-js y js-yaml. El audit
   inicial reportaba 79 incidencias (3 críticas, 34 altas, 41 moderadas, 1 baja);
   después queda una moderada, descrita abajo. Son incidencias del árbol de
   dependencias, no 79 vulnerabilidades demostradas en las rutas de Unraw.
3. **Media — webhook sin firma en producción.** Resend ahora devuelve 503 si
   falta su secreto en producción, 401 ante firma inválida y 400 ante un evento
   inválido. Los eventos válidos firmados siguen funcionando.
4. **Media — persistencia incompleta de revisión.** El efecto del borrador de
   captura omitía `approved` de sus dependencias; cambiar solo una aprobación
   podía perderse al salir y regresar. Se incluye en la persistencia.
5. **Media — validación de Inbox.** Se valida JSON y UUID con Zod antes de
   invocar la RPC; las solicitudes malformadas reciben 400.
6. **Media — navegación de búsqueda.** `/search` no estaba en la lista de
   páginas protegidas. Ahora exige sesión y onboarding, como las otras páginas
   del área privada. Su API ya exigía sesión; no se observó exposición de datos
   por esta omisión de navegación.
7. **Media — memoria del rate limit de waitlist.** El mapa conservaba entradas
   expiradas indefinidamente. Ahora elimina expiradas y limita la cantidad de
   claves a 10.000 para un proceso persistente.
8. **Mantenimiento — dependencias sobrantes.** Se quitan 12 dependencias directas
   de `web` sin imports en su código, incluidos LangChain, MCP, React Email y
   herramientas MDX que utiliza solamente `docs`. `web` pasa de 26 a 14
   dependencias de ejecución. Las funcionalidades actuales conservan sus imports.
9. **Mantenimiento — controles automáticos.** Se sustituye `next lint` obsoleto
   por ESLint CLI, se excluyen artefactos generados y se exigen cero warnings.
   Se añaden scripts raíz de tipos/pruebas y un workflow de GitHub Actions con
   instalación congelada, lint, tipos, pruebas y builds de ambos workspaces.

## Pendientes y límites

- **Moderada en dependencias de docs:**
  `gray-matter → js-yaml → argparse → sprintf-js`, sin versión corregida publicada
  en el advisory consultado. `docs` lee archivos del repo, no MDX o formatos
  enviados por usuarios. No se encontró un camino desde las entradas de usuario
  de `web` a esta dependencia. Para eliminarla del árbol completo habría que
  sustituir el lector de frontmatter de `docs`, en una mejora independiente.
- **Waitlist:** el límite sigue siendo por proceso y confía en cabeceras IP del
  proxy. Hay que verificar qué cabeceras sobrescribe Coolify; no es protección
  distribuida ni cubre inserciones directas en la tabla pública de waitlist.
  El límite de cuerpo actual usa `Content-Length`; no garantiza por sí solo
  un límite de lectura para cuerpos enviados sin esa cabecera.
- **Tipos:** `strict: false` continúa activo. Activarlo requiere una migración
  gradual del código; no es un requisito para alojar el build actual.
- **Warnings de build:** Supabase importa una comprobación de Node en middleware
  Edge; el build pasa, pero debe verificarse al probar el servidor desplegado.
  También aparecen avisos de caché de webpack y de `punycode` transitivo.
- `next-mdx-remote` está archivado upstream. La versión 6 corrige el problema
  detectado, pero conviene planificar un reemplazo en la documentación.
- No se ha comprobado el estado real de migraciones, RLS o credenciales en
  Supabase remoto. La revisión no sustituye una prueba de integración con un
  proyecto de staging ni una auditoría completa de seguridad/historial Git.

## Validación

- Instalación con `yarn install --frozen-lockfile --non-interactive`.
- ESLint de `web` y `docs` sin warnings, comprobación TypeScript y 191 pruebas
  Vitest en 31 archivos, todas aprobadas.
- Builds de producción de ambos workspaces. `web` también se compila con
  credenciales públicas ficticias para comprobar el escenario de CI sin secretos.
- Migraciones 001–017 aplicadas en orden sobre PostgreSQL 15 temporal, con
  roles, funciones Auth y permisos por defecto equivalentes para esta prueba.
  Esto prueba SQL/permisos, no toda la plataforma Supabase.
- `supabase/tests/profile_quota.sql` comprueba upsert, bloqueo de cambios directos,
  bloqueo de borrado/recreación, límite de 30, aislamiento de otro usuario y
  reembolso con service role. Solo ejecutar en una base aislada.
- Pruebas nuevas de webhook firmado, validación Inbox, protección de búsqueda y
  caducidad/capacidad del rate limit. No se hicieron llamadas reales a IA.

## Antes de crear la imagen de despliegue

Aplicar la migración 017 al Supabase de destino después de revisar su historial;
no repetir la 001 sobre una base existente: contiene operaciones destructivas.
Conservar la clave de cifrado OpenRouter actual al trasladar el despliegue para
poder descifrar los tokens ya guardados. Definir las variables públicas durante
el build y las privadas en ejecución, y probar sesión/callback detrás del proxy.
El Dockerfile se añadió después de esta auditoría, con instrucciones en
[DEPLOY_COOLIFY.md](DEPLOY_COOLIFY.md). El despliegue remoto sigue pendiente.

## Referencias

- [Advisory de Next.js sobre imágenes AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).
- [Cambios de seguridad en next-mdx-remote 6](https://github.com/hashicorp/next-mdx-remote/releases/tag/v6.0.0).
- [Aviso pendiente de sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).
