# PRD — Unraw
> Documento de requerimientos de producto para uso con agente de IA (Pi Agent)
> Stack: Next.js · Supabase · Vercel
> Versión: 1.0 — MVP

---

## 1. Visión del producto

**Unraw** es una app de productividad personal donde el usuario captura notas crudas, vagas y rápidas, y la IA las transforma al instante en tareas, ideas y notas organizadas dentro de su propio sistema — sin que tenga que construir ni mantener ese sistema manualmente.

**Problema que resuelve:** Las personas capturan cosas pero nunca las procesan porque ir a Notion u Obsidian, saber dónde va cada cosa y ordenarlo todo requiere tiempo y energía que no tienen. El inbox se acumula, genera culpa, y las ideas nunca se convierten en acción.

**Propuesta de valor:** Tiras una nota cruda. Unraw la organiza sola, en tu sistema, en segundos.

---

## 2. Usuario objetivo

**Daniela Mora, 29 años** — profesional o freelance que quiere organizarse, captura cosas constantemente, pero nunca termina de armar ni mantener un sistema. No le falta motivación; le falta el puente entre capturar y hacer.

---

## 3. Estructura de la aplicación

### 3.1 Navegación principal (Sidebar)

```
Unraw
├── Overview          ← dashboard con pendientes del día
├── Captura           ← campo de nota cruda + IA
└── Áreas
    └── [Área 1]
        ├── Proyectos
        ├── Tareas
        ├── Ideas
        └── Second Brain
    └── [Área 2]
        └── ...
```

### 3.2 Modelo de datos

Las áreas son el contenedor raíz. Todo lo demás vive dentro de un área.

```
Área
├── Proyectos        (agrupan tareas relacionadas)
├── Tareas           (accionables con estado: pendiente / en progreso / hecho)
├── Ideas            (captura rápida sin compromiso de acción)
└── Second Brain     (conceptos, aprendizajes, libros, temas, cualquier nota no accionable)
```

**Relaciones:**
- Una tarea puede pertenecer a un área directamente, o a un proyecto dentro de un área.
- Un proyecto siempre pertenece a un área.
- Ideas y Second Brain pertenecen al área, no a proyectos.

---

## 4. Funcionalidades del MVP

### 4.1 Onboarding

Al registrarse, el usuario responde 3–5 preguntas para definir su contexto inicial:

1. ¿Cuáles son las principales áreas de tu vida o trabajo? (ej. Trabajo, Personal, Salud, Finanzas)
2. ¿Qué tipo de cosas capturas con más frecuencia? (tareas, ideas, aprendizajes, proyectos)
3. ¿Tienes algún proyecto activo en este momento?

El sistema crea automáticamente las áreas y proyectos iniciales con base en las respuestas. El usuario puede editarlos después.

**Regla:** El onboarding se muestra solo una vez. Si el usuario ya tiene áreas creadas, se salta.

---

### 4.2 Captura con IA

**Pantalla central del producto.**

**Flujo:**
1. El usuario abre la pantalla de Captura.
2. Escribe o pega una nota cruda — vaga, larga, mezclada, sin formato.
3. Presiona "Organizar".
4. La IA procesa la nota y devuelve un output estructurado.
5. El usuario revisa el output.
6. Si la IA sugiere crear algo nuevo (área, proyecto), el usuario lo confirma o descarta.
7. El usuario guarda. Los ítems se distribuyen en el sistema.

**Comportamiento de la IA:**
- Clasifica cada fragmento de la nota en: Tarea, Idea, Nota de Second Brain.
- Asigna cada ítem al área y proyecto más probable según el contexto del usuario.
- Si detecta algo que no encaja en ningún área/proyecto existente, **sugiere crear uno nuevo** — no lo crea automáticamente. El usuario confirma.
- Respeta las categorías y áreas que el usuario ya tiene definidas.
- El output es claro, accionable y legible — sin jerga técnica.

**Formato del output (ejemplo):**

```
📌 TAREAS
- [ ] Llamar al contador — Área: Finanzas
- [ ] Revisar propuesta de diseño — Área: Trabajo > Proyecto: Rediseño web

💡 IDEAS
- Explorar si vale la pena automatizar los reportes mensuales — Área: Trabajo

🧠 SECOND BRAIN
- Concepto: "Deep Work" de Cal Newport — enfocarse sin distracciones produce trabajo de alto valor — Área: Personal
```

---

### 4.3 Overview (Dashboard)

Vista de inicio con resumen del estado actual del sistema.

**Contenido:**
- Tareas pendientes del día (o sin fecha, ordenadas por área)
- Proyectos activos con progreso (tareas completadas / total)
- Acceso rápido a la pantalla de Captura

**Vistas disponibles:**
- Lista simple con filtros (por área, por estado, por fecha)
- Kanban (columnas: Pendiente / En progreso / Hecho)
- El usuario elige su vista preferida y se guarda en su perfil.

---

### 4.4 Gestión de Áreas

- El usuario puede crear, editar y eliminar áreas.
- Dentro de cada área puede crear proyectos, tareas, ideas y notas de Second Brain manualmente.
- Vista de área muestra todo su contenido organizado por tipo.

---

### 4.5 Gestión de Proyectos

- Un proyecto tiene: nombre, descripción opcional, área a la que pertenece, estado (activo / pausado / completado).
- Un proyecto contiene tareas.
- Vista de proyecto muestra sus tareas con estado y progreso.

---

### 4.6 Tareas

Cada tarea tiene:
- Título
- Estado: `pendiente` | `en_progreso` | `hecho`
- Área (obligatorio)
- Proyecto (opcional)
- Fecha límite (opcional)
- Notas (opcional)

---

### 4.7 Ideas

Cada idea tiene:
- Contenido (texto libre)
- Área
- Fecha de captura
- Estado: `nueva` | `en_evaluación` | `descartada` | `convertida en proyecto/tarea`

---

### 4.8 Second Brain

Cada entrada tiene:
- Título
- Contenido (texto libre, puede ser largo)
- Área
- Tags (opcionales, el usuario los define)
- Fecha de captura

---

### 4.9 Autenticación

- Registro e inicio de sesión con email/password via Supabase Auth.
- Opcionalmente: login con Google (OAuth).
- Cada usuario ve únicamente sus propios datos (RLS en Supabase).

---

## 5. Esquema de base de datos (Supabase)

```sql
-- Usuarios (gestionado por Supabase Auth)
-- auth.users ya existe, se extiende con perfil

-- Perfil de usuario
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  onboarding_completed boolean default false,
  preferred_view text default 'list', -- 'list' | 'kanban'
  created_at timestamp with time zone default now()
);

-- Áreas
create table areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text, -- hex color para UI
  created_at timestamp with time zone default now()
);

-- Proyectos
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  area_id uuid references areas on delete cascade not null,
  name text not null,
  description text,
  status text default 'active', -- 'active' | 'paused' | 'completed'
  created_at timestamp with time zone default now()
);

-- Tareas
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  area_id uuid references areas on delete cascade not null,
  project_id uuid references projects on delete set null,
  title text not null,
  notes text,
  status text default 'pending', -- 'pending' | 'in_progress' | 'done'
  due_date date,
  created_at timestamp with time zone default now()
);

-- Ideas
create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  area_id uuid references areas on delete cascade not null,
  content text not null,
  status text default 'new', -- 'new' | 'evaluating' | 'discarded' | 'converted'
  created_at timestamp with time zone default now()
);

-- Second Brain
create table second_brain (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  area_id uuid references areas on delete cascade not null,
  title text not null,
  content text not null,
  tags text[], -- array de strings
  created_at timestamp with time zone default now()
);
```

**Row Level Security (RLS):** Habilitar RLS en todas las tablas. Cada tabla debe tener una policy que permita al usuario autenticado leer y escribir únicamente sus propios registros (`user_id = auth.uid()`).

---

## 6. Estructura de carpetas — Next.js

```
unraw/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← layout con sidebar
│   │   ├── overview/
│   │   │   └── page.tsx
│   │   ├── capture/
│   │   │   └── page.tsx
│   │   ├── areas/
│   │   │   ├── page.tsx        ← lista de áreas
│   │   │   └── [areaId]/
│   │   │       ├── page.tsx    ← vista de área
│   │   │       └── projects/
│   │   │           └── [projectId]/
│   │   │               └── page.tsx
│   │   └── second-brain/
│   │       └── page.tsx
│   ├── api/
│   │   └── ai/
│   │       └── process-note/
│   │           └── route.ts    ← endpoint que llama a la IA
│   └── onboarding/
│       └── page.tsx
├── components/
│   ├── sidebar/
│   ├── capture/
│   ├── overview/
│   ├── areas/
│   ├── tasks/
│   ├── ideas/
│   └── ui/                     ← componentes base (shadcn/ui)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── ai/
│   │   └── process-note.ts     ← lógica del prompt a la IA
│   └── utils.ts
├── types/
│   └── index.ts                ← tipos TypeScript de todas las entidades
└── middleware.ts                ← protección de rutas autenticadas
```

---

## 7. Lógica del procesamiento de notas con IA

### Endpoint: `POST /api/ai/process-note`

**Input:**
```json
{
  "raw_note": "string",
  "user_context": {
    "areas": [{ "id": "uuid", "name": "string" }],
    "projects": [{ "id": "uuid", "name": "string", "area_id": "uuid" }]
  }
}
```

**Output:**
```json
{
  "tasks": [
    {
      "title": "string",
      "area_id": "uuid | null",
      "project_id": "uuid | null",
      "suggested_new_area": "string | null",
      "suggested_new_project": "string | null"
    }
  ],
  "ideas": [
    {
      "content": "string",
      "area_id": "uuid | null",
      "suggested_new_area": "string | null"
    }
  ],
  "second_brain": [
    {
      "title": "string",
      "content": "string",
      "area_id": "uuid | null",
      "tags": ["string"],
      "suggested_new_area": "string | null"
    }
  ],
  "suggestions": [
    {
      "type": "new_area | new_project",
      "name": "string",
      "reason": "string"
    }
  ]
}
```

**Prompt base para la IA:**
```
Eres un asistente de productividad personal. El usuario tiene el siguiente sistema:

Áreas: {areas}
Proyectos: {projects}

El usuario escribió esta nota cruda:
"{raw_note}"

Tu trabajo es:
1. Identificar cada ítem accionable (tarea), cada idea y cada aprendizaje o concepto (second brain).
2. Asignar cada ítem al área y proyecto más adecuado del sistema existente del usuario.
3. Si algo no encaja en ningún área o proyecto existente, márcalo como sugerencia — no lo crees automáticamente.
4. Devuelve SOLO un JSON válido con la estructura especificada. Sin texto adicional.

Reglas:
- Una tarea es algo que requiere acción concreta.
- Una idea es algo a explorar o evaluar, sin compromiso de acción inmediata.
- Second Brain es un concepto, aprendizaje, referencia o nota de conocimiento.
- Si no puedes determinar el área con certeza, deja area_id como null y sugiere una.
```

---

## 8. Rutas y flujo de navegación

| Ruta | Descripción | Auth requerida |
|------|-------------|----------------|
| `/login` | Inicio de sesión | No |
| `/register` | Registro | No |
| `/onboarding` | Setup inicial (una vez) | Sí |
| `/overview` | Dashboard principal | Sí |
| `/capture` | Campo de captura con IA | Sí |
| `/areas` | Lista de todas las áreas | Sí |
| `/areas/[areaId]` | Vista de un área | Sí |
| `/areas/[areaId]/projects/[projectId]` | Vista de un proyecto | Sí |
| `/second-brain` | Vista global del second brain | Sí |

**Middleware:** Si el usuario no está autenticado, redirigir a `/login`. Si está autenticado pero no completó onboarding, redirigir a `/onboarding`.

---

## 9. Modelo de uso y tiers

### 9.1 Tiers

| Tier | Cómo funciona | Límite |
|------|--------------|--------|
| **Free** | La app usa su propia API key (GPT-4.1 Nano) | 30 capturas/mes |
| **OpenRouter** | El usuario conecta su cuenta de OpenRouter via OAuth | Sin límite — usa los modelos del usuario |

No hay plan "Pro" en el MVP. La conversión natural es: Free → conectar OpenRouter.

### 9.2 Modelo de capturas Free

- **Límite:** 30 capturas por mes calendario.
- **Reset:** El 1 de cada mes a las 00:00 UTC se resetea el contador a 0.
- **Cuando se agota el límite:** Se muestra un mensaje inline en la pantalla de Captura — sin modal agresivo, sin countdown, sin urgencia forzada.

**Texto del mensaje de límite:**
> "Usaste tus 30 capturas de este mes. Vuelves el 1 de [mes] con 30 nuevas — o conecta tu cuenta de OpenRouter para capturar sin límite."

El botón de conectar OpenRouter está presente pero no es el protagonista. El usuario no se siente presionado.

### 9.3 Integración OpenRouter

**Flujo OAuth:**
1. El usuario va a Settings → "Conectar OpenRouter".
2. Se redirige a OpenRouter para autorizar.
3. OpenRouter devuelve un token de acceso.
4. El token se guarda cifrado en la tabla `profiles` del usuario.
5. Desde ese momento, todas las llamadas de IA del usuario usan su token de OpenRouter en lugar de la API key propia.

**Modelo usado con OpenRouter:** El usuario elige el modelo desde Settings (lista de modelos disponibles en su cuenta). Default sugerido: `openai/gpt-4.1-nano`.

**Modelo usado en Free:** `gpt-4.1-nano` via API key propia de la app.

### 9.4 Cambios al schema por esta lógica

```sql
-- Actualización a la tabla profiles
alter table profiles add column captures_used integer default 0;
alter table profiles add column captures_reset_date date default (date_trunc('month', now()) + interval '1 month')::date;
alter table profiles add column openrouter_token text; -- guardar cifrado
alter table profiles add column openrouter_model text default 'openai/gpt-4.1-nano';
alter table profiles add column tier text default 'free'; -- 'free' | 'openrouter'
```

**Lógica del endpoint `/api/ai/process-note`:**
1. Verificar tier del usuario.
2. Si `free`: verificar que `captures_used < 30`. Si no, devolver error 429 con mensaje amigable.
3. Si `free` y tiene capturas disponibles: usar API key propia (GPT-4.1 Nano), incrementar `captures_used`.
4. Si `openrouter`: usar token del usuario con el modelo que eligió.
5. Si hoy es 1 del mes y `captures_reset_date <= today`: resetear `captures_used = 0` y actualizar `captures_reset_date`.

---

## 11. Fuera del alcance del MVP

Los siguientes features están explícitamente excluidos del MVP:

- App móvil nativa
- Integraciones con Notion, Obsidian, o cualquier herramienta externa
- Colaboración entre usuarios
- Recordatorios y notificaciones
- Búsqueda global
- Exportación de datos
- Planes de pago / monetización

---

## 12. Criterio de éxito del MVP

El MVP es exitoso si:

1. Un usuario nuevo puede registrarse, completar el onboarding y tener su sistema listo en menos de 3 minutos.
2. El usuario puede capturar una nota cruda y ver el output organizado en menos de 10 segundos.
3. Al revisar el output, el usuario dice "esto ya lo puedo usar" sin necesidad de explicación.
4. El usuario vuelve al día siguiente a capturar algo nuevo.
