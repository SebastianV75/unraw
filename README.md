<div align="center">
  <img src="web/public/brand/unraw-app-icon.png" alt="Logo de Unraw" width="128" />
  <h1>Unraw</h1>
  <p><strong>Captura lo que tienes en la cabeza. Unraw le da forma.</strong></p>
</div>

Unraw es una aplicación de productividad personal que convierte notas crudas —ideas, tareas y pensamientos sin estructura— en contenido organizado dentro del sistema de cada usuario. La IA propone una clasificación y un destino; la persona revisa, corrige, guarda o descarta.

## Qué incluye

- **Captura asistida por IA:** procesa una nota y la clasifica como tarea, idea o nota de conocimiento.
- **Revisión antes de guardar:** permite editar contenido y destino, aprobar propuestas individualmente y descartar elementos.
- **Fechas naturales:** reconoce fechas y horas explícitas en las capturas y conserva la zona horaria del navegador.
- **Inbox:** conserva elementos que todavía no tienen un área o proyecto claro para revisarlos después.
- **Hoy:** muestra la siguiente acción, una cola breve de tareas y contexto de proyectos activos.
- **Áreas y proyectos:** organiza tareas, ideas y conocimiento por contexto; los proyectos agrupan tareas y tienen estado y progreso.
- **Tareas:** admiten estado, notas, proyecto opcional y fecha de vencimiento.
- **Ideas:** se guardan como contenido independiente con su propio estado.
- **Segundo cerebro:** notas globales o asociadas a un área, con editor Markdown, vista previa y etiquetas opcionales.
- **Búsqueda y navegación rápida:** búsqueda unificada y Command Palette (`Ctrl+K` / `Cmd+K`).
- **Accesibilidad e interfaz adaptable:** tema claro/oscuro, navegación por teclado, diseño responsive y respeto por `prefers-reduced-motion`.
- **Autenticación:** registro e inicio de sesión con email y contraseña mediante Supabase Auth; Google OAuth puede habilitarse opcionalmente.

## Arquitectura

El repositorio contiene una aplicación Next.js con App Router y un proyecto de base de datos Supabase:

```text
unraw/
├── web/
│   ├── app/            # páginas, layouts y API routes de Next.js
│   ├── components/     # componentes de interfaz
│   ├── lib/            # Supabase, IA, búsqueda y lógica de dominio
│   ├── types/          # tipos compartidos
│   └── .env.example    # plantilla de configuración local
├── supabase/
│   ├── migrations/     # esquema, RLS, funciones y cambios incrementales
│   ├── config.toml     # configuración opcional de Supabase local
│   └── seed.sql        # datos iniciales de desarrollo
├── docs/               # documentación interna del proyecto
└── package.json        # workspace Yarn y scripts principales
```

**Stack principal:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, DaisyUI, Motion, Supabase PostgreSQL/Auth, OpenAI/OpenRouter, React Markdown y Resend.

La base de datos aplica Row Level Security (RLS) para que cada usuario solo pueda acceder a sus propios perfiles, áreas, proyectos, tareas, ideas y notas de conocimiento. Las migraciones también crean las funciones, índices y relaciones necesarias.

## Inicio rápido

### Requisitos

- Node.js `20.19+`, `22.13+` o `24+`.
- Yarn `1.22.x` (el repositorio declara `yarn@1.22.22`).
- Un proyecto de Supabase Cloud. Ejecutar Supabase localmente es opcional.
- Una clave de OpenAI para el procesamiento de capturas del nivel gratuito.

### Instalación local

```bash
git clone https://github.com/SebastianV75/unraw.git
cd unraw
yarn install
cp web/.env.example web/.env.local
```

1. Crea un proyecto en Supabase y copia sus credenciales API en `web/.env.local`.
2. Aplica las migraciones del directorio [`supabase/migrations`](supabase/migrations). Con Supabase CLI y un proyecto enlazado puedes ejecutar:

   ```bash
   supabase db push
   ```

   También puedes ejecutarlas desde el SQL Editor de Supabase en orden numérico.
3. Completa las variables requeridas y arranca Next.js:

   ```bash
   yarn dev
   ```

4. Abre [http://localhost:3000](http://localhost:3000) y crea una cuenta.

Para usar Supabase completamente en local, instala la Supabase CLI y ejecuta `supabase start`. La configuración incluida usa PostgreSQL 15 y define el callback local de autenticación; Docker y la CLI no son necesarios si utilizas Supabase Cloud.

## Configuración

La plantilla base de variables es [`web/.env.example`](web/.env.example); algunas rutas específicas admiten variables adicionales. Nunca publiques secretos ni expongas una service-role key en el navegador.

### Requeridas para el flujo principal

```env
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
OPENAI_API_KEY=<openai-key>
```

Las dos variables públicas de Supabase son necesarias para autenticación y acceso a datos. `OPENAI_API_KEY` se utiliza para procesar capturas con el proveedor gratuito configurado por la aplicación.

### Opcionales o dependientes de una capacidad

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
CAPTURE_CANDIDATE_RETRIEVAL_ENABLED=false
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENROUTER_TOKEN_ENCRYPTION_KEY=<64-hex-characters>
GOOGLE_OAUTH_CLIENT_ID=<client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<client-secret>
NEXT_PUBLIC_POSTHOG_KEY=<posthog-key>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
RESEND_API_KEY=<resend-key>
RESEND_WEBHOOK_SECRET=<webhook-secret>
```

- `NEXT_PUBLIC_APP_URL` es opcional; si falta, la aplicación usa `http://localhost:3000`.
- `CAPTURE_CANDIDATE_RETRIEVAL_ENABLED` solo se activa con el valor literal `true`; habilita la recuperación acotada de contexto para las capturas.
- `SUPABASE_SERVICE_ROLE_KEY` es una credencial de servidor para operaciones administrativas concretas. No es necesaria para el cliente ni debe compartirse.
- `OPENROUTER_TOKEN_ENCRYPTION_KEY` es necesaria si se habilita el uso de tokens personales de OpenRouter. Debe tener 64 caracteres hexadecimales.
- Las variables de Google OAuth habilitan el proveedor Google después de configurarlo también en Supabase Auth.
- PostHog, Resend y sus webhooks solo son necesarios si se habilitan esas integraciones; `RESEND_WEBHOOK_SECRET` protege la firma del webhook cuando está configurado.

## Comandos de desarrollo

Desde la raíz del repositorio:

```bash
yarn dev       # servidor Next.js en modo desarrollo
yarn build     # build de producción
yarn start     # arranca la build de producción
```

Para ejecutar pruebas o usar scripts específicos del workspace:

```bash
yarn workspace web test
yarn workspace web lint
```

También puedes usar `yarn workspace web dev`, `yarn workspace web build` y `yarn workspace web start`.

## Contribuir

Las contribuciones son bienvenidas. Antes de abrir un cambio:

1. Revisa el código existente y las migraciones relacionadas.
2. Mantén los cambios acotados y conserva las políticas RLS.
3. Ejecuta las pruebas relevantes del workspace `web`.
4. Describe el comportamiento afectado y cualquier cambio de configuración o esquema.

No se deben incluir archivos `.env.local`, credenciales, tokens ni datos reales en commits o pull requests.

## Licencia

Este repositorio no declara actualmente una licencia pública. Consulta al equipo antes de reutilizar, modificar o redistribuir el código.
