# Unraw — Design System
> Documento de diseño para uso con agente de IA (Pi Agent)  
> Stack: Next.js · Tailwind CSS · shadcn/ui  
> Versión: 1.0

---

## 1. Filosofía de diseño

Unraw es una herramienta seria para gente ocupada. El diseño no distrae — desaparece.

**Principios:**
- **Espacioso y zen:** Mucho whitespace. Nunca se siente apretado.
- **Tipografía con carácter:** La personalidad viene de la fuente, no de los colores.
- **Neutro frío:** Sin colores de acento. El negro y el gris hacen todo el trabajo.
- **Herramienta, no app de consumo:** Referencia visual: Anytype, Linear, Raycast. No Notion consumer, no apps coloridas.
- **Light mode como base:** Dark mode disponible pero no es el default.

---

## 2. Tipografía

### Fuentes

```css
/* Instalar via next/font */
import { Geist, Geist_Mono } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})
```

| Rol | Fuente | Uso |
|-----|--------|-----|
| Display / Headings | Geist Sans | Títulos, nombres de secciones, logo |
| Body | Geist Sans | Texto corrido, UI general |
| Mono / Data | Geist Mono | Fechas, tags, labels técnicos, contadores |

**Geist Mono es la firma visual de Unraw** — se usa en labels de categorías, contadores de capturas, fechas, y cualquier dato que necesite diferenciarse del texto normal. Le da el vibe tech/tool sin ser agresivo.

### Escala tipográfica

```css
/* tailwind.config — extend fontSize */
fontSize: {
  'display':  ['32px', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '500' }],
  'title':    ['22px', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '500' }],
  'heading':  ['16px', { lineHeight: '1.4',  letterSpacing: '-0.01em', fontWeight: '500' }],
  'body':     ['14px', { lineHeight: '1.65', letterSpacing: '0',       fontWeight: '400' }],
  'small':    ['13px', { lineHeight: '1.5',  letterSpacing: '0',       fontWeight: '400' }],
  'label':    ['11px', { lineHeight: '1.4',  letterSpacing: '0.06em',  fontWeight: '500' }],
  'mono':     ['12px', { lineHeight: '1.5',  letterSpacing: '0',       fontWeight: '400', fontFamily: 'var(--font-mono)' }],
}
```

### Uso

- `text-display` — nombre del área en vista de área, empty states
- `text-title` — headings de sección, nombre del proyecto
- `text-heading` — subtítulos, nombres de items en sidebar
- `text-body` — contenido de notas, descripciones
- `text-small` — metadata, fechas, contadores secundarios
- `text-label` — eyebrows uppercase (ÁREAS / TAREAS / IDEAS), separadores de sección
- `text-mono` — contadores de capturas (`28/30`), fechas (`ago 08`), tags

---

## 3. Paleta de colores

### Variables CSS (globals.css)

```css
:root {
  /* Superficies */
  --bg-page:       #f7f7f6;   /* fondo de la app */
  --bg-surface:    #ffffff;   /* cards, sidebar, paneles */
  --bg-hover:      #f2f2f0;   /* hover state */
  --bg-active:     #ebebea;   /* item seleccionado */

  /* Bordes */
  --border:        #e5e5e3;   /* hairline default */
  --border-strong: #d0d0cd;   /* bordes con más peso */

  /* Texto */
  --text-primary:   #1a1a1a;  /* texto principal */
  --text-secondary: #6b6b68;  /* texto de soporte */
  --text-muted:     #a0a09d;  /* placeholders, hints */
  --text-disabled:  #c8c8c5;  /* estados deshabilitados */

  /* Acento único */
  --accent:        #1a1a1a;   /* CTAs primarios, links activos */
  --accent-fg:     #ffffff;   /* texto sobre acento */

  /* Semánticos (mínimos) */
  --success:       #2d7a4f;
  --success-bg:    #f0faf4;
  --warning:       #92600a;
  --warning-bg:    #fef9ec;
  --danger:        #b91c1c;
  --danger-bg:     #fef2f2;

  /* Sombras */
  --shadow-sm:     0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:     0 2px 8px rgba(0,0,0,0.08);

  /* Radio */
  --radius-sm:     6px;
  --radius:        8px;
  --radius-lg:     12px;
}

[data-theme="dark"] {
  --bg-page:       #111110;
  --bg-surface:    #1a1a19;
  --bg-hover:      #222221;
  --bg-active:     #2a2a29;

  --border:        #2e2e2c;
  --border-strong: #3d3d3b;

  --text-primary:   #f0f0ee;
  --text-secondary: #9a9a97;
  --text-muted:     #6a6a67;
  --text-disabled:  #4a4a48;

  --accent:        #f0f0ee;
  --accent-fg:     #111110;

  --success:       #4ade80;
  --success-bg:    #0a1f13;
  --warning:       #fbbf24;
  --warning-bg:    #1a1200;
  --danger:        #f87171;
  --danger-bg:     #1a0808;

  --shadow-sm:     0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:     0 2px 8px rgba(0,0,0,0.4);
}
```

### En Tailwind

```js
// tailwind.config.js — extend colors
colors: {
  page:      'var(--bg-page)',
  surface:   'var(--bg-surface)',
  hover:     'var(--bg-hover)',
  active:    'var(--bg-active)',
  border:    'var(--border)',
  'border-strong': 'var(--border-strong)',
  primary:   'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  muted:     'var(--text-muted)',
  accent:    'var(--accent)',
  'accent-fg': 'var(--accent-fg)',
}
```

---

## 4. Espaciado y layout

### Principio
Unraw es espacioso. Usar padding generoso, dejar respirar los elementos. No comprimir.

### Grid general

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px)  │  Main content (flex-1)           │
│                   │                                  │
│  [Logo]           │  [Page header]                   │
│  [Nav items]      │                                  │
│  ──────────────   │  [Content area]                  │
│  [Areas]          │                                  │
│                   │                                  │
└─────────────────────────────────────────────────────┘
```

### Tokens de espaciado

| Token | Valor | Uso |
|-------|-------|-----|
| `p-3` / `gap-3` | 12px | Spacing interno de items compactos |
| `p-4` / `gap-4` | 16px | Padding de cards pequeños, gaps de lista |
| `p-5` / `gap-5` | 20px | Padding estándar de secciones |
| `p-6` / `gap-6` | 24px | Padding de sidebar, padding de página |
| `p-8` / `gap-8` | 32px | Separación entre secciones grandes |
| `p-12`          | 48px | Padding de content area principal |

### Content area

```css
.content-area {
  max-width: 780px;       /* ancho máximo del contenido */
  margin: 0 auto;         /* centrado */
  padding: 48px 48px;     /* espacioso */
}
```

---

## 5. Componentes

### 5.1 Sidebar

```
width: 240px
background: var(--bg-surface)
border-right: 1px solid var(--border)
padding: 24px 12px
```

**Logo / Wordmark**
```
font: Geist Sans, 16px, weight 600, tracking -0.02em
color: var(--text-primary)
margin-bottom: 32px
padding: 0 12px
```

**Nav item**
```
height: 32px
padding: 0 12px
border-radius: var(--radius-sm)
font: 14px, weight 400
color: var(--text-secondary)

hover:
  background: var(--bg-hover)
  color: var(--text-primary)

active/selected:
  background: var(--bg-active)
  color: var(--text-primary)
  font-weight: 500
```

**Section label en sidebar**
```
font: Geist Mono, 11px, weight 500, uppercase, tracking 0.06em
color: var(--text-muted)
padding: 16px 12px 6px
```

### 5.2 Botones

**Primario**
```css
background: var(--accent);        /* negro */
color: var(--accent-fg);          /* blanco */
border-radius: var(--radius-sm);
padding: 8px 16px;
font-size: 14px;
font-weight: 500;
border: none;
cursor: pointer;

hover: opacity 0.85;
active: scale(0.98);
```

**Secundario**
```css
background: transparent;
color: var(--text-primary);
border: 1px solid var(--border-strong);
border-radius: var(--radius-sm);
padding: 8px 16px;
font-size: 14px;
font-weight: 400;

hover: background var(--bg-hover);
```

**Ghost**
```css
background: transparent;
color: var(--text-secondary);
border: none;
border-radius: var(--radius-sm);
padding: 8px 12px;

hover: background var(--bg-hover); color var(--text-primary);
```

### 5.3 Input / Textarea

```css
background: var(--bg-surface);
border: 1px solid var(--border);
border-radius: var(--radius);
padding: 10px 14px;
font-size: 14px;
color: var(--text-primary);
font-family: var(--font-geist);

focus:
  border-color: var(--border-strong);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.06);

placeholder:
  color: var(--text-muted);
```

**Textarea de captura** (el corazón de la app)
```css
min-height: 200px;
resize: none;
font-size: 15px;
line-height: 1.7;
padding: 20px;
border-radius: var(--radius-lg);
border: 1px solid var(--border);
width: 100%;

focus:
  border-color: var(--border-strong);
  box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
```

### 5.4 Cards

**Card estándar**
```css
background: var(--bg-surface);
border: 1px solid var(--border);
border-radius: var(--radius-lg);
padding: 20px 24px;

hover:
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
```

**Card de tarea / item de lista**
```css
display: flex;
align-items: center;
gap: 12px;
padding: 10px 12px;
border-radius: var(--radius);
border: 1px solid transparent;

hover:
  background: var(--bg-hover);
  border-color: var(--border);
```

### 5.5 Badge / Tag

```css
/* Geist Mono, 11px */
font-family: var(--font-mono);
font-size: 11px;
padding: 2px 8px;
border-radius: 4px;
background: var(--bg-hover);
color: var(--text-secondary);
border: 1px solid var(--border);
```

**Badge de estado**
```css
/* pendiente */
background: var(--bg-hover); color: var(--text-secondary);

/* en progreso */
background: var(--warning-bg); color: var(--warning);

/* hecho */
background: var(--success-bg); color: var(--success);
```

### 5.6 Contador de capturas

Siempre en Geist Mono. Aparece en el sidebar o en la pantalla de captura.

```
[28/30]   ← Geist Mono, 12px, color: var(--text-muted)
```

Cuando queda poco (< 5):
```
[28/30]   ← color: var(--warning)
```

Cuando se agota:
```
[30/30]   ← color: var(--danger)
```

---

## 6. Layout de pantallas

### 6.1 Overview

```
┌────────────────────────────────────┐
│  Buenos días, [nombre]             │  ← text-title, Geist Sans
│  Tienes 5 tareas pendientes        │  ← text-body, text-secondary
│                                    │
│  ──────── PENDIENTE HOY ────────   │  ← text-label, Geist Mono
│  [ ] Llamar al contador            │
│  [ ] Revisar propuesta             │
│                                    │
│  ──────── PROYECTOS ACTIVOS ──── │  ← text-label, Geist Mono
│  Rediseño web          3/8 tasks   │
│  App mobile            1/5 tasks   │
└────────────────────────────────────┘
```

### 6.2 Captura

```
┌────────────────────────────────────┐
│  Captura                           │  ← text-title
│  Escribe lo que tengas en mente.   │  ← text-body, text-secondary
│                                    │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │   textarea grande            │  │
│  │   min-height: 200px          │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Organizar →]          [28/30]    │  ← btn primario + mono counter
│                                    │
│  ── OUTPUT ─────────────────────   │  ← aparece tras procesar
│  📌 TAREAS                         │
│  💡 IDEAS                          │
│  🧠 SECOND BRAIN                   │
└────────────────────────────────────┘
```

### 6.3 Vista de área

```
┌────────────────────────────────────┐
│  Trabajo                           │  ← text-display, Geist Sans
│  4 proyectos · 12 tareas           │  ← text-small, text-muted
│                                    │
│  PROYECTOS ─────────────────────   │
│  [Card proyecto]  [Card proyecto]  │
│                                    │
│  TAREAS ────────────────────────   │
│  [ ] Tarea 1                       │
│  [ ] Tarea 2                       │
│                                    │
│  IDEAS ─────────────────────────   │
│  • Idea 1                          │
└────────────────────────────────────┘
```

---

## 7. Iconografía

Usar **Lucide React** — outline, stroke 1.5px, size 16px por default.

```tsx
import { Inbox, Layers, CheckSquare, Lightbulb, Brain, ChevronRight } from 'lucide-react'
```

| Sección | Icono Lucide |
|---------|-------------|
| Overview | `LayoutDashboard` |
| Captura | `Zap` o `Inbox` |
| Áreas | `Layers` |
| Proyectos | `FolderKanban` |
| Tareas | `CheckSquare` |
| Ideas | `Lightbulb` |
| Second Brain | `Brain` |
| Settings | `Settings` |

**Regla:** Los iconos siempre van a `color: var(--text-muted)` en estado default. En hover/activo pasan a `var(--text-primary)`.

---

## 8. Motion y transiciones

Unraw es zen — las animaciones son sutiles y rápidas. Nada llama la atención.

```css
/* Transición default para todo */
transition: all 120ms ease;

/* Hover en items */
transition: background 100ms ease, border-color 100ms ease;

/* Aparición de output de IA */
.ai-output {
  animation: fadeSlideIn 200ms ease;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 9. Dark mode

Toggle en el header o settings. Implementar con `data-theme="dark"` en el `<html>`.

```tsx
// lib/theme.ts
const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme')
  document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark')
  localStorage.setItem('theme', current === 'dark' ? 'light' : 'dark')
}
```

Respetar `prefers-color-scheme` en la primera visita si el usuario no tiene preferencia guardada.

---

## 10. Personalidad de la UI — reglas de copy

| Situación | Texto |
|-----------|-------|
| Placeholder del textarea | `"Escribe lo que tengas en mente. La IA hace el resto."` |
| Botón de captura | `"Organizar"` |
| Empty state de tareas | `"Sin tareas por aquí. Captura algo para empezar."` |
| Empty state de ideas | `"Tus ideas aparecen aquí cuando las capturas."` |
| Límite de capturas alcanzado | `"Usaste tus 30 capturas de este mes. Vuelves el 1 de [mes] con 30 nuevas — o conecta tu cuenta de OpenRouter para capturar sin límite."` |
| Onboarding — bienvenida | `"Cuéntanos un poco sobre ti para configurar tu sistema."` |
| Procesando nota | `"Organizando..."` |
| Output listo | `"Listo. Revisa y guarda lo que quieras."` |
| Error genérico | `"Algo salió mal. Intenta de nuevo."` |

**Tono:** Directo, sin floritura, sin exclamaciones. Como un buen compañero que no te habla de más.

---

## 11. shadcn/ui — componentes a instalar

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add select
```

**Importante:** Después de instalar shadcn, sobrescribir las CSS variables en `globals.css` con las de este documento. shadcn usa sus propias variables — las de Unraw tienen precedencia.

---

## 12. Estructura de archivos de estilos

```
app/
└── globals.css          ← CSS variables, reset, base styles

tailwind.config.js       ← extend con los tokens de este doc

components/
└── ui/                  ← shadcn components (no editar directo)

lib/
└── theme.ts             ← lógica de dark/light mode toggle
```

---

*Documento de diseño Unraw · Agosto 2026*
