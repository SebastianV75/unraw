```
Vas a dibujar dos diagramas en Mermaid a partir de la base de datos real de mi
producto y del proceso que yo escribí a mano.

TE DOY DOS COSAS:

1. EL PROCESO DE MI PRODUCTO, escrito por mí:
[pega aquí tu hoja de la sesión 1]

2. INVENTARIO (resultado de la Consulta 1):
[pega aquí]

REGLAS DE SINTAXIS — un diagrama que no se dibuja no sirve de nada:
- Usa los nombres de tabla tal como aparecen en el inventario, sin comillas y
  sin espacios. Los acentos y la ñ funcionan bien; los espacios no.
- En erDiagram, TODA relación lleva etiqueta obligatoria.
  Correcto:   USUARIOS ||--o{ CURRICULUMS : "sube"
  Se rompe:   USUARIOS ||--o{ CURRICULUMS
- En las líneas "class" usa siempre el identificador simple de la tabla, nunca
  un nombre entre comillas.
- En flowchart, la palabra "end" en minúsculas rompe el diagrama: escribe "Fin".
- En flowchart, cualquier etiqueta con paréntesis va entre comillas dobles:
  A["Total (con IVA)"]
- No inventes ninguna tabla, columna ni relación que no esté en el inventario.

DIAGRAMA 1 — El mapa real de mi base

Un erDiagram con TODAS las tablas del inventario.

- Para cada tabla incluye solo la llave primaria, las llaves foráneas y hasta
  cuatro columnas más: las que mejor expliquen para qué sirve la tabla.
- Marca las llaves con PK, FK y UK.
- Dibuja SOLO las relaciones que aparecen en la columna "relaciones" del
  inventario. Son las únicas que existen de verdad en la base.
- Las columnas marcadas PARECE_RELACION_SIN_SERLO en la columna "banderas" son
  relaciones que alguien quiso hacer y nunca se declararon. Dibújalas con línea
  punteada y etiqueta "sin declarar":
      CURRICULUMS }o..|| USUARIOS : "sin declarar"
- Cardinalidad: ||--o{ para uno a muchos, }o--o{ para muchos a muchos.
- Al final, colorea cada tabla según aparezca o no en mi proceso escrito:

      classDef enmiproceso fill:#eeebfb,stroke:#4535aa,stroke-width:2px,color:#221d3f
      classDef sinlugar    fill:#f1f0f6,stroke:#4e4770,stroke-width:1px,color:#221d3f
      class TABLA_A,TABLA_B enmiproceso
      class TABLA_C sinlugar

  enmiproceso = la tabla corresponde a algo que yo describí
  sinlugar    = la tabla existe y no aparece por ningún lado en mi proceso

DIAGRAMA 2 — Mi proceso contra mi base

Un flowchart LR que recorra los pasos de mi proceso, en orden. Debajo de cada
paso indica qué tabla guarda esa información. Colorea con estas clases:

      classDef ok    fill:#eeebfb,stroke:#4535aa,stroke-width:2px,color:#221d3f
      classDef falta fill:#fdecf3,stroke:#c02e6d,stroke-width:2px,color:#221d3f

  ok    = el paso existe en mi proceso y hay una tabla que lo soporta
  falta = el paso existe en mi proceso y NINGUNA tabla guarda esa información

DESPUÉS DE LOS DIAGRAMAS

Escribe exactamente tres líneas, sin adornos:
- Pasos de mi proceso que ninguna tabla soporta: [lista o "ninguno"]
- Tablas que no corresponden a ningún paso: [lista o "ninguna"]
- Relaciones que mi proceso implica y la base no declara: [lista o "ninguna"]
```
