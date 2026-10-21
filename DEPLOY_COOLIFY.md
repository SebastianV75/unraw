# Desplegar Unraw en Coolify

La imagen ejecuta el workspace `web` con Next.js standalone, incluidas sus rutas
API. Supabase sigue siendo un servicio externo. La construcción usa Node 22 y
Yarn 1.22.22; el contenedor final funciona como usuario sin privilegios y escucha
en `0.0.0.0:3000`.

El callback de autenticación usa `NEXT_PUBLIC_APP_URL` para evitar redirigir al
hostname interno del contenedor cuando se ejecuta detrás del proxy.

## 1. Publicar el código

Subir a GitHub los cambios del repo, incluidos `Dockerfile`, `.dockerignore`,
`web/next.config.mjs`, los manifiestos y `yarn.lock`. El contexto de construcción
es la raíz del monorepo. Los archivos `.env*` locales quedan fuera de la imagen.

## 2. Crear la aplicación

En el proyecto/environment de Coolify, crear un recurso desde el repositorio
`https://github.com/SebastianV75/unraw` con la rama `main`, una vez integrado el
PR de preparación del despliegue. `deploy/coolify` es una rama de trabajo temporal.
Usar GitHub App o deploy key si el repositorio es privado.

Para una aplicación existente que sigue `deploy/coolify`, integrar primero los
cambios a `main`, cambiar la rama del recurso en Coolify a `main` y desplegar.
Mantener dominio, variables y configuración del recurso. Las próximas mejoras
se desarrollan en ramas breves y se integran a `main` mediante PR.

- Build Pack / Build strategy: **Dockerfile**.
- Base Directory: `/` (raíz del repo).
- Dockerfile Location: `/Dockerfile` (archivo raíz, relativo a Base Directory).
- Ports Exposes: `3000`.
- Build/start commands personalizados: vacíos; el Dockerfile los define.
- Domain: la URL elegida para la aplicación, por ejemplo `https://unraw.example.com`.
- Si se configura un health check HTTP en Coolify: `GET /favicon.svg`, puerto
  `3000`, respuesta esperada `200`. Comprueba que el servidor responde, no el
  estado de Supabase ni de OpenAI. El Dockerfile también incluye este check.

No hacen falta volúmenes para los datos de usuario: se guardan en Supabase.
Para usar un dominio público, debe resolver al servidor y ser accesible al proxy
de Coolify. Un hostname privado de Tailscale sirve para acceso privado, pero no
convierte el servidor en un servicio público.

## 3. Variables de entorno

En Environment Variables, agregar las siguientes como disponibles **durante el
build y en ejecución**. Usar los valores del proyecto Supabase actual:

```dotenv
NEXT_PUBLIC_APP_URL=https://unraw.example.com
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-ANON-KEY-PUBLICA
```

Las tres son obligatorias para construir esta imagen. Next.js incorpora las
variables públicas al bundle: cambiar dominio o proyecto Supabase requiere
reconstruir la imagen. La anon key es pública; la service-role key es privada y
no debe usarse en su lugar.

Agregar las siguientes como **solo ejecución**, desactivando su disponibilidad
durante el build:

```dotenv
OPENAI_API_KEY=TU-CLAVE
SUPABASE_SERVICE_ROLE_KEY=TU-SERVICE-ROLE-KEY
CAPTURE_CANDIDATE_RETRIEVAL_ENABLED=false
```

OpenAI permite procesar capturas gratuitas. La service-role key permite devolver
cuota cuando falla el procesamiento y eliminar cuentas desde ajustes. Conservar
el valor actual del flag de retrieval de Vercel si ya está habilitado y sus
migraciones están aplicadas.

Si se usan tokens personales de OpenRouter, copiar **el mismo valor existente**
de `OPENROUTER_TOKEN_ENCRYPTION_KEY` desde Vercel, solo en ejecución. Cambiarlo
impide descifrar los tokens ya almacenados.

Copiar otras variables de las integraciones utilizadas, solo en ejecución:
`RESEND_WEBHOOK_SECRET` y, si corresponden, credenciales Google u otras privadas.
`NEXT_PUBLIC_POSTHOG_KEY` y `NEXT_PUBLIC_POSTHOG_HOST`, si se necesitan, deben
estar disponibles durante build y ejecución. No se requieren claves privadas
para compilar la imagen.

## 4. Auth y base de datos

En Supabase > Authentication > URL Configuration, agregar la URL de callback
`https://unraw.example.com/auth/callback` a Redirect URLs. Durante las pruebas,
conservar las URL de Vercel que sigan en uso. Al hacer el cambio definitivo,
actualizar Site URL al dominio elegido. Revisar también los destinos de emails
de confirmación/reset y la configuración OAuth si se utiliza.

Revisar las migraciones aplicadas al proyecto actual. La migración nueva
`017_protect_capture_quota.sql` protege la cuota; se aplica a Supabase por
separado y Docker no ejecuta migraciones. No reejecutar la 001 sobre una base con
datos, ya que contiene operaciones destructivas.

## 5. Desplegar y comprobar

Guardar la configuración y pulsar Deploy. Verificar que los logs muestran que
Next.js está listo y que el contenedor está healthy. Probar login, captura,
guardado y cierre de sesión con el dominio elegido. Tras validar el despliegue,
activar los despliegues automáticos si se desea.

## Construcción local sin secretos

Desde la raíz, usar valores públicos de prueba para comprobar la imagen:

```bash
docker build -t unraw:local \
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=build-test-not-a-real-key .
docker run --rm -p 3000:3000 unraw:local
```

Esto permite comprobar el arranque y los assets, pero no autenticar usuarios ni
procesar capturas. Para uso real, construir con las variables públicas reales
y pasar las privadas mediante variables de ejecución del contenedor.

La imagen se construyó y se probó localmente con valores públicos ficticios:
login, assets estáticos, redirecciones detrás de proxy, callback sin código,
rechazo de APIs sin sesión y health check. La autenticación real y las llamadas
a Supabase/OpenAI se verifican después de configurar el despliegue.

Referencias: [Dockerfile en Coolify](https://coolify.io/docs/applications/builds/dockerfile),
[variables de Coolify](https://coolify.io/docs/applications/configuration/environment-variables),
[standalone de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
