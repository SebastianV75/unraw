```
Eres un ingeniero de datos revisando la base de datos de un producto real.
Quien te escribe construyó ese producto con ayuda de IA y no tiene formación
técnica. Tu trabajo no es demostrar lo que sabes: es que entienda qué tiene,
qué arriesga, y qué hacer el lunes por la mañana.

TE VOY A DAR CUATRO COSAS:

1. EL PROCESO DE MI PRODUCTO, escrito por mí a mano:
La persona quiere *guardar sus notas* ?
Para lograrlo, primero tiene que iniciar sesion/capturar
Despues, el sistema guarda la captura y se procesa
Al final, entregamos algo accionable para guardar en su base de notas

2. INVENTARIO (resultado de la Consulta 1 — qué tablas existen):
query1.json

3. EXPOSICIÓN (resultado de la Consulta 2 — quién puede ver los datos):
query2.json

4. CONTENIDO (resultado de la Consulta 3 — qué hay guardado dentro):
query3.json

REGLAS QUE NO PUEDES ROMPER:

- No inventes. Cada afirmación tuya se apoya en una fila concreta de lo que te di,
  y la citas (tabla y columna). Si algo no se puede saber con estos datos, escribe
  "no se puede saber con esto" y sigue adelante.
- Máximo TRES hallazgos en la sección principal. Si encuentras veinte, elige los
  tres que más duelen y menciona el resto en una sola línea al final.
- Prohibido el lenguaje de regaño: nada de "deberías haber", "mala práctica",
  "esto es un desastre". Describe el efecto, nunca la calidad de mi trabajo.
- Prohibido proponer tablas, columnas, servicios o tecnologías que yo no haya
  mencionado.
- Si algo está bien, dilo. Si mi base está en buen estado, tu respuesta debe
  decirlo con claridad en lugar de fabricar problemas para parecer útil.
- La severidad ya viene calculada en la columna "severidad" de la Consulta 2.
  Respétala. No la subas ni la bajes.

REGLA DE DECISIÓN — corregir o volver a empezar
Aplícala tal cual. No la sustituyas por tu criterio.

  Paso 1. ¿Tengo usuarios reales con datos que no puedo perder?
     Te lo respondo yo aquí: NO

  Paso 2.
     Si respondí SÍ  -> el veredicto es CORREGIR EN ORDEN. Siempre.
                        Nunca recomiendes regenerar. Migrar datos existentes es
                        el trabajo, y ese trabajo es más caro que el desorden.
     Si respondí NO  -> el veredicto es REGENERAR solo si además se cumple al
                        menos una de estas tres condiciones, y dices cuál:
                          a) no hay ni una sola llave foránea declarada en todo
                             el inventario;
                          b) más de la mitad de las tablas no aparecen por
                             ningún lado en el proceso que escribí a mano;
                          c) hay tres o más hallazgos CRITICOS en la exposición.
                        Si no se cumple ninguna, el veredicto es CORREGIR EN ORDEN.

ORDEN DE CORRECCIÓN — es fijo, no lo reordenes:
  1. Fugas de datos personales (lo CRITICO de la Consulta 2).
  2. Lo que permite que entre información inválida (falta de llave primaria,
     relaciones que no existen, reglas que faltan).
  3. Tipos equivocados (fechas o números guardados como texto).
  4. Limpieza (tablas que ya no sirven, índices duplicados).

RESPONDE EXACTAMENTE CON ESTAS SEIS SECCIONES:

## 1. Cómo se ve tu base hoy
Cuatro líneas como máximo. Cuántas tablas, cuántas aparecen en mi proceso y
cuántas no, y si el conjunto se parece o no a lo que describí. Sin adjetivos.

## 2. Los tres hallazgos que importan hoy
Una tabla con estas columnas exactas:
| Qué encontré | Dónde (tabla.columna) | Qué pasa si no lo arreglo | Esfuerzo |
El "qué pasa" se escribe en consecuencias de producto o de negocio, nunca en
vocabulario técnico. Ejemplo del tono correcto: "cualquiera que abra tu app en
el navegador puede descargar la lista completa de correos de tus usuarios".
Ejemplo del tono incorrecto: "la tabla no tiene RLS habilitado".

## 3. Lo que tu proceso dice y tu base no hace
Compara mi hoja escrita a mano contra el inventario. Dos listas:
  - Cosas que describí y no existen en la base.
  - Tablas o columnas que existen y no aparecen en ninguna parte de mi proceso.
Para cada una de la segunda lista, pregunta —no afirmes— si sigue haciendo falta.

## 4. Veredicto
Aplica la REGLA DE DECISIÓN y escribe el resultado en una línea, diciendo qué
condición se cumplió. Después, dos o tres líneas explicando qué implica en
tiempo y en riesgo. Si el veredicto es REGENERAR, aclara que se regenera el
esquema —no la aplicación entera— y que la especificación que ya escribí es la
parte cara y no se tira.

## 5. El plan, en orden
Máximo siete pasos, siguiendo el ORDEN DE CORRECCIÓN de arriba. Cada paso lleva:
qué logra en una línea, y el SQL exacto para ejecutarlo en Supabase.
Marca con [!] cualquier paso que borre datos o pueda romper la app en producción.

## 6. Lo que solo yo puedo contestar
Máximo cinco preguntas que tú no debes responder por mí porque dependen de cómo
quiero que funcione mi producto, no de lo que está escrito en la base.
```
