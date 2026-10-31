# Épica: etiquetas QR y conteo físico

> **Estado:** fase 1 implementada el 25/10/2026 (HU-1 a HU-6, falta probar con teléfono e impresora reales).
> Fase 2 (conteo físico, HU-7 a HU-9) pendiente.

## Contexto y objetivo

El conteo físico del inventario se hace hoy a mano, comparando con el formato en papel. La épica agrega
una etiqueta escaneable por bien, que se imprime y se pega en el mueble o equipo, y una pantalla para
leerla con el teléfono (o con un lector). Así se identifica cada bien al instante y el conteo es mucho
más rápido y con menos errores.

## Decisiones ya tomadas

- **Solo QR**, sin código de barras. Se lee bien con la cámara del teléfono, funciona en etiquetas
  pequeñas y tolera etiquetas rayadas o desgastadas. Si algún día hace falta código de barras, se puede
  agregar sin tocar la base de datos.
- **Lectura con la cámara del teléfono**, y la app también acepta un lector USB/Bluetooth tipo teclado
  (un campo de captura siempre enfocado).
- **El QR no se guarda.** Se dibuja en el navegador a partir del `id` del bien (`bienes.id`): es único,
  no cambia nunca y existe en todos los bienes, también los antiguos. La generación no necesita
  migración.
- **`codigo_clasificacion` no es el identificador**: es opcional, editable y no único. Solo se imprime
  como texto legible junto al QR.

## Decisiones tomadas (25/10/2026)

1. **Alcance:** por fases. Fase 1 (HU-1 a HU-6) implementada; la fase 2 (HU-7 a HU-9, conteo físico) queda pendiente.
2. **Formato de impresión:** hoja A4 vertical con cuadrícula de 2 × 5 (10 etiquetas por hoja, QR de 44 mm; antes 3 × 8 con QR de 24 mm, cambiado el 28/10/2026 para que el QR sea más grande).
3. **Contenido del QR:** URL de la app, `https://<app>/bienes/<id>`.
4. **Copias:** una etiqueta por cada unidad. Por defecto las copias de un bien son su `cantidad` (editable, de 1 a 500); todas llevan el mismo QR, porque el sistema registra lotes y no unidades sueltas.

## Historias de usuario y tareas

### Fase 1: etiquetas y escaneo (sin cambios en la base de datos)

**HU-1. Imprimir la etiqueta al registrar un bien**
Como Encargado, quiero imprimir la etiqueta del bien que acabo de registrar.
- Al registrar hay una casilla «Imprimir etiqueta al guardar»; al editar, un botón «Imprimir etiqueta».
- La etiqueta muestra el QR, el código de clasificación, la descripción, la ubicación y la sede.
- Un bien sin código de clasificación también tiene etiqueta (el QR usa el `id`).

Tareas:
- [x] Instalar `qrcode` y crear `src/lib/etiquetas.ts` (`textoQr`, `idDesdeTexto`).
- [x] Crear `src/components/EtiquetaBien.tsx`.
- [x] Agregar la casilla «Imprimir etiqueta al guardar» y el botón «Imprimir etiqueta» (al editar) en `Registro.tsx`.
- [ ] Probar con un bien sin código de clasificación.

**HU-2. Imprimir etiquetas desde el Listado**
Como Encargado, quiero imprimir las etiquetas de varios bienes a la vez.
- El Listado tiene un botón por fila y otro «Imprimir etiquetas» para lo que está filtrado.
- Se puede imprimir todo, una ubicación o una selección.
- Los bienes antiguos, registrados antes de esta función, también se pueden etiquetar.

Tareas:
- [x] Botón por fila en `Listado.tsx` y botón «Imprimir etiquetas» para lo filtrado.
- [x] Pasar la selección a la pantalla de etiquetas.
- [ ] Verificar con bienes antiguos.

**HU-3. Pantalla de etiquetas**
Como Encargado, quiero elegir bienes, formato y copias, y ver una vista previa antes de imprimir.
- Ruta `/bienes/etiquetas`, solo para quien puede editar bienes (Administrador y Encargado).
- Al imprimir, la página sale con el tamaño del formato elegido y sin alterar el A4 apaisado del Reporte.

Tareas:
- [x] Crear `src/pages/bienes/Etiquetas.tsx` (selección, formato, copias, vista previa).
- [x] Estilos de impresión: `@page` propio solo en esta pantalla, sin tocar el Reporte (`src/index.css`).
- [x] Ruta `/bienes/etiquetas` con `RequierePermiso permiso="editarBienes"` y opción en `SidebarNav.tsx`.

**HU-4. Escanear con la cámara del teléfono**
Como Encargado, Revisor o Aprobador, quiero escanear una etiqueta con mi teléfono para ver el bien.
- Ruta `/escanear`, disponible para todos los roles con sede.
- Pide permiso de cámara y lee el QR en una o dos segundos con buena luz.
- Muestra la ficha del bien (descripción, código, ubicación, estado, cantidad).
- Funciona en Android e iPhone.

Tareas:
- [x] Instalar `@zxing/browser` y cargarlo con `import()` dinámico.
- [x] Crear `src/pages/bienes/Escanear.tsx` con la cámara y la ficha del bien.
- [x] Manejar permiso de cámara denegado y falta de HTTPS.
- [ ] Probar en Android e iPhone, en el dominio de Vercel.

**HU-5. Escanear con lector USB o Bluetooth**
Como usuario con un lector físico, quiero escanear sin usar la cámara.
- La pantalla tiene un campo de captura enfocado; el lector «escribe» el código y termina con Enter.
- Tras cada lectura, el campo queda listo para la siguiente.

Tareas:
- [x] Campo de captura enfocado con Enter como fin de lectura.
- [x] Reenfocar el campo tras cada lectura.
- [ ] Probar con un lector real o simulando teclado.

**HU-6. Respetar sede y rol**
Como administrador, quiero que nadie vea bienes de otra sede escaneando.
- Si el bien es de otra sede o no existe, se muestra un aviso claro y no se revela ningún dato.
- Un Revisor o un Aprobador solo ve la ficha, sin editar (no tienen detalle de bien).
- La base de datos lo respalda con las reglas por sede de la migración `0017`.

Tareas:
- [x] Buscar el bien solo en `useBienes()` (sede activa) y mostrar el aviso si no está.
- [x] Ficha de solo lectura para Revisor y Aprobador (`/bienes/:id` los envía a `/escanear?bien=<id>`, con `BienPorId.tsx`).
- [ ] Probar con usuarios de otra sede y de cada rol.

### Fase 2: conteo físico (si se elige B o C)

**HU-7. Abrir y cerrar un conteo**
Como Encargado, quiero abrir un conteo para mi sede y cerrarlo al terminar.
- Un conteo tiene sede, fecha, quién lo abrió y estado (abierto o cerrado).
- Solo puede haber un conteo abierto por sede.

Tareas:
- [ ] Migración `0018_conteos.sql`: tabla `conteos` con índice único de un conteo abierto por sede.
- [ ] RLS con `es_admin()`, `rol_actual()` y `sede_propia()`.
- [ ] Hooks en `src/lib/conteos.ts` y pantalla para abrir y cerrar.

**HU-8. Marcar bienes como contados**
Como Encargado, quiero que cada escaneo marque el bien como contado.
- Se guarda quién y cuándo lo contó.
- Escanear dos veces el mismo bien no lo cuenta dos veces y avisa.
- Un código no reconocido queda anotado como «no encontrado».

Tareas:
- [ ] Tabla `conteo_items` (único por conteo y bien) y RLS.
- [ ] Registrar el escaneo con usuario y fecha; avisar si ya estaba contado.
- [ ] Guardar los códigos no reconocidos como «no encontrado».

**HU-9. Resumen y exportación**
Como Encargado, Revisor o Aprobador, quiero ver el resultado del conteo.
- Muestra contados, faltantes y no encontrados, con desglose por ubicación.
- Se exporta a Excel con el mismo enfoque que el reporte (`src/lib/exportExcel.ts`).
- Revisor y Aprobador lo ven en solo lectura.

Tareas:
- [ ] Calcular contados, faltantes y no encontrados por ubicación.
- [ ] Exportar a Excel siguiendo `src/lib/exportExcel.ts`.
- [ ] Vista de solo lectura para Revisor y Aprobador.

## Diseño técnico

### Fase 1
- **Dependencias** (`package.json`): `qrcode` para dibujar el QR como SVG (nítido al imprimir) y
  `@zxing/browser` para leer con la cámara, que funciona también en iPhone. La de lectura se carga con
  `import()` dinámico para no engordar el bundle principal, como ya se hace con exceljs.
- **`src/lib/etiquetas.ts`:** `textoQr(id)` (URL o código corto, según la decisión 3), `idDesdeTexto(texto)`
  (el inverso, para el escáner) y los datos de la etiqueta tomados de `Bien`.
- **`src/components/EtiquetaBien.tsx`:** la etiqueta (QR, código, descripción, ubicación, sede).
- **`src/pages/bienes/Etiquetas.tsx`:** selección, formato, copias, vista previa e impresión. Reutiliza
  `.no-print` y `.print-area` de `src/index.css`; el `@page` propio de las etiquetas se inyecta solo en
  esta pantalla.
- **`src/pages/bienes/Escanear.tsx`:** cámara más campo de captura; busca el bien en `useBienes()`, que ya
  filtra por la sede activa.
- **Puntos de entrada:** `Registro.tsx` (botón tras guardar y al editar), `Listado.tsx` (botón por fila y
  masivo), `SidebarNav.tsx` (opciones «Etiquetas», con `editarBienes`, y «Escanear», para todos) y
  `App.tsx` (rutas bajo `RequierePermiso` donde corresponda).
- **Permisos:** reutiliza `usePermisos()` (`src/lib/permisos.ts`); no hace falta un permiso nuevo.

### Fase 2
- **Migración `0018_conteos.sql`:** tablas `conteos` (sede, fecha, creado_por, estado) y `conteo_items`
  (conteo, bien, contado_por, contado_en, único por conteo y bien).
- **RLS** con `es_admin()`, `rol_actual()` y `sede_propia()` (definidas en `0017`): Administrador y
  Encargado escriben en su sede; Revisor y Aprobador solo leen la suya.
- **Pantalla de conteo** y exportación a Excel reutilizando el patrón de `src/lib/exportExcel.ts`.

## Riesgos y puntos de atención

- **HTTPS obligatorio para la cámara.** Vercel y `localhost` lo cumplen; probar en el dominio real desde
  el teléfono.
- **Dominio dentro de las etiquetas** (si el QR lleva URL): cambiar de dominio dejaría sin abrir las
  etiquetas ya impresas. Mitigación: usar un dominio propio estable, o elegir el código corto.
- **iPhone:** no tiene el lector nativo `BarcodeDetector`; por eso se usa `@zxing/browser`.
- **Calidad de impresión:** QR mínimo de unos 2×2 cm, con margen blanco, impreso en negro sobre blanco.
  Probar sobre las superficies reales (madera, plástico, metal).
- **Lotes:** un registro de bien puede tener varias unidades (`cantidad`); una sola etiqueta identifica el
  lote, no cada unidad.

## Verificación

- `npm run build` y `npm run lint` sin errores.
- Imprimir (o guardar como PDF) una hoja de etiquetas y escanearla con un Android y un iPhone: debe
  identificar el bien correcto.
- Probar una etiqueta de un bien recién registrado y la de un bien antiguo sin código de clasificación.
- Escanear con un usuario de otra sede: no debe mostrar el bien.
- Lector USB/Bluetooth: el campo de captura recibe el código y muestra el bien.
- Fase 2: contar dos veces el mismo bien, un código desconocido, cerrar el conteo y exportar a Excel.

## Archivos a tocar

Nuevos: `src/lib/etiquetas.ts`, `src/components/EtiquetaBien.tsx`, `src/pages/bienes/Etiquetas.tsx`,
`src/pages/bienes/Escanear.tsx` y, en la fase 2, `supabase/migrations/0018_conteos.sql`.
Modificados: `src/pages/bienes/Listado.tsx`, `src/pages/bienes/Registro.tsx`,
`src/components/layout/SidebarNav.tsx`, `src/App.tsx`, `src/index.css`, `package.json`, `CLAUDE.md` y
`docs/BACKLOG.md`.
