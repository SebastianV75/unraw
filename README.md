# Unraw

Unraw es un sistema simple para organizar ideas, áreas, proyectos y tareas desde un solo lugar.

## Inicio rápido

Requisitos: Node 20 o 22 LTS, Yarn 1.x y un proyecto de Supabase.

```bash
yarn install
cp web/.env.example web/.env.local
yarn dev
```

Abre `http://localhost:3000`. La landing pública está en `/`; el acceso autenticado comienza en `/login` y termina en `/overview` o `/onboarding` según el estado de la cuenta.

## Estructura

```text
unraw/
├── web/       # Aplicación Next.js
├── supabase/  # Schema y migraciones
└── firmware/  # Código de referencia de hardware
```

## Comandos

```bash
yarn workspace web lint
```

## Stack

- Next.js 15 y React 19
- Supabase para autenticación y persistencia
- Tailwind CSS y DaisyUI
- OpenRouter para el procesamiento opcional de capturas
