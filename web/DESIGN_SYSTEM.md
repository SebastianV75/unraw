# Sistema de diseño de Unraw

## Lenguaje y fundamentos
Unraw combina una base neutral/editorial con acentos **raw** (coral) y **flow** (índigo). Geist es la tipografía principal y Geist Mono/Departure Mono se reservan para datos técnicos. Los tokens viven en `app/globals.css`: superficies, texto, bordes, radios, sombras, estados semánticos y temas `unraw`/`unraw-dark`. El contraste objetivo es WCAG 2.2 AA; todo control tiene foco visible, alternativa de teclado y variante para `prefers-reduced-motion`.

## Componentes
La API pública está en `components/ui/index.tsx`. Incluye Accordion, Alert, Avatar, Badge, Button, Breadcrumbs, Calendar, Card, Carousel, Checkbox, Divider, Dropdown, Icon, Image, Link, List, LoadingIndicator, Modal, Pagination, Progress, Radio, Select, Skeleton, Switch, Tabs, TextArea, TextField, Toast y Tooltip. Los componentes usan HTML semántico y exponen los nombres/roles/estados ARIA aplicables a cada patrón. Los formularios conectan label, ayuda y error con `aria-describedby`; los diálogos usan `<dialog>` y Escape; pestañas, acordeón, menú, carrusel y paginación incluyen alternativas de teclado. Algunos comportamientos (fecha, diálogo y detalles) delegan intencionalmente en APIs nativas del navegador.

Consulta `/design-system` para estados interactivos y ejemplos. La ruta es pública y no usa el layout autenticado de producto.

## Compatibilidad y calidad
Soportamos las dos versiones recientes de Chrome, Edge, Firefox y Safari en móvil/tablet/escritorio; degradación segura de APIs nativas. Revisar teclado, lector de pantalla, zoom al 200%, contraste y movimiento reducido antes de publicar. Las fechas y números de producto deben formatearse con `Intl.*`.

## Política de biblioteca local
No añadir dependencias para un patrón que HTML/CSS/React resuelva. Un componente nuevo necesita API tipada, estados (carga, deshabilitado, error, foco), ejemplo en showcase y evidencia de accesibilidad. Migrar callsites solo cuando no cambie semántica de datos, auth, captura o persistencia.

## Mantenimiento y release
- **Owner:** equipo Web Platform; **aprobación:** Design + Accessibility.
- Cambios pequeños se agrupan semanalmente; breaking changes requieren RFC y una migración documentada.
- Revisar tokens y soporte de navegador trimestralmente; retirar APIs solo tras un ciclo de deprecación.
- Checklist de release: tipos/build, teclado/AT, contraste, responsive, reduced motion, bundle y revisión visual. Los criterios de proceso (owner, RFC, soporte, release y métricas) son expectativas de mantenimiento y no comportamiento runtime.

## Decisiones y roadmap
- 2026-08: tokens neutrales y temas existentes se formalizan como contrato.
- 2026-08: primitives sin dependencia y showcase público para evitar duplicación.
- Próximo: pruebas específicas del diálogo de confirmación, date-range y auditoría automatizada de contraste.

## Auditoría de producto (2026-08)
La auditoría cubre las rutas públicas (`/`, `/login`, `/register`, `/onboarding`) y las rutas autenticadas (`/overview`, `/capture`, `/inbox`, `/search`, `/areas`, `/areas/[areaId]`, `/areas/[areaId]/projects/[projectId]`, `/second-brain`, `/second-brain/new`, `/second-brain/[entryId]`, `/settings`). Las rutas autenticadas comparten `app/(app)/layout.tsx`, con navegación principal, navegación móvil, cambio de tema, cierre de sesión y captura global.

| Superficie | Evidencia implementada | Gaps conocidos |
| --- | --- | --- |
| Layout autenticado | Enlace “Saltar al contenido principal”, `aria-current` en navegación, nombres en español para controles, foco visible global y menú móvil con relación `aria-controls`, cierre con Escape y focus trap | Conviene automatizar una comprobación de contraste por tema |
| Captura e Inbox | Estados de carga, error, vacío y éxito en las pantallas de producto; acciones con botones nativos y teclado | Conviene automatizar una comprobación de contraste por tema |
| Áreas, proyectos y resumen | Acciones de edición/eliminación con estados de guardado y mensajes `role="alert"` | Falta una matriz automatizada de estados por ruta |
| Conocimiento | `/second-brain/new` usa la ruta dinámica existente; título, área y etiquetas tienen nombres accesibles; guardado expone estado `role="status"` y `aria-live`; eliminación usa diálogo accesible con confirmación por teclado | La confirmación requiere una prueba específica con lector de pantalla |
| Configuración | Formularios con validación inline, mensajes de error/éxito y botones de carga | Faltan pruebas de lector de pantalla en CI |

Las modificaciones de esta auditoría no alteran contratos de Supabase, autenticación, captura ni persistencia.

## Soporte y propuestas
**Plantilla de incidencia:** componente/versión, navegador/OS, pasos, resultado esperado/real, captura accesible y severidad. SLA objetivo: crítica 1 día hábil, alta 3, normal 10.

**Feature proposal:** problema y usuarios, API propuesta, estados y accesibilidad, impacto bundle, alternativas, plan de migración, métricas y owner. No aceptar una propuesta sin criterio de éxito observable.

**Analítica:** medir adopción y errores agregados (sin contenido privado); respetar consentimiento y no registrar texto capturado. Publicar una actualización comunitaria mensual y mantener una sesión de office hours abierta; preguntas fuera de horario reciben respuesta en el SLA correspondiente.

## Referencia
Este documento implementa el [Design System Checklist](https://www.designsystemchecklist.com/) y debe revisarse junto con sus criterios de diseño, foundations, componentes y mantenimiento.
