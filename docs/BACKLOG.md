# Backlog: Inventario de Bienes y Enseres

Funcionalidades pendientes del sistema. Cada ítem dice qué falta, por qué importa y, si ya hay plan,
dónde está el detalle.

**Cómo usarlo**
- Un ítem nuevo va en la sección de su prioridad, con el formato de los demás.
- Si un ítem necesita fases o decisiones, su plan va en `docs/pendientes/<tema>.md` y aquí solo el enlace.
- Al terminarlo, se pasa a **Hecho** con la fecha, y lo implementado se documenta en `CLAUDE.md`.

**Prioridades:** Alta = seguridad o algo que bloquea el uso real · Media = mejora importante · Baja = mejora deseable.

---

## Prioridad alta

_(Sin ítems pendientes.)_

---

## Prioridad media

### 3. Aprobación del inventario (firmas del reporte)
- **Qué falta:** registrar quién revisó y quién aprobó el inventario de una sede y en qué fecha, con
  botones "Marcar como revisado" (Revisor) y "Aprobar" (Aprobador) en el Reporte. Los nombres saldrían
  en las firmas "Revisado por" y "Aprobado por", en pantalla, impreso y en el Excel.
- **Por qué:** hoy las firmas del reporte salen en blanco y se completan a mano.
- **Plan:** fase 3 de [`plan-roles-permisos.md`](pendientes/plan-roles-permisos.md). El ítem 1 (roles con permisos) ya está hecho.

### 4. Etiquetas QR y conteo físico
- **Qué falta:** imprimir una etiqueta QR por bien (se dibuja desde `bienes.id`, sin guardarla) y escanearla
  con la cámara del teléfono o un lector USB/Bluetooth. En una segunda fase, un conteo físico que marque
  los bienes contados y muestre los faltantes.
- **Por qué:** agiliza el conteo físico, que hoy se hace a mano contra el formato en papel.
- **Estado:** fase 1 (etiquetas y escaneo) hecha el 25/10/2026; falta la fase 2 (conteo físico) y probar con teléfonos e impresora.
- **Plan:** [`epica#6-etiquetas-qr.md`](pendientes/epica%236-etiquetas-qr.md), con las historias de
  usuario, el diseño técnico y las decisiones abiertas (alcance, formato de impresión, contenido del QR).

### 5. Cálculo de área (largo × ancho) en el formulario de bien
- **Qué falta:** para bienes en metros cuadrados, ingresar largo y ancho y que Cantidad se calcule sola.
- **Plan:** [`epica-calculo-area.md`](pendientes/epica-calculo-area.md). Pendiente de confirmar si Cantidad admite decimales.

---

## Prioridad baja

_(Sin ítems pendientes.)_

---

## Desestimado

- **Crear usuarios sin confirmación de correo** (antes ítem 5): descartado el 28/10/2026. Opción que se había
  evaluado: una función SQL `security definer` que marcara `auth.users.email_confirmed_at`, exigiendo `es_admin()`.

---

## Tareas operativas pendientes (no son funcionalidad)

- [x] Ejecutar en el editor SQL de Supabase, en orden: `0011_perfil_sexo_funcion_foto.sql`, `0012_roles_sistema.sql`, `0013_sedes_datos.sql`, `0014_categorias.sql`, `0015_categorias_tipo_contable.sql` y `0016_categorias_sin_unidad.sql`.
- [ ] Completar en Configuración → Sedes la ubicación (sobre todo el distrito, que sale en el reporte) y el responsable de cada sede.
- [ ] Revisar en Configuración → Categorías las 10 categorías iniciales: completar el tipo contable, y ajustar o desactivar las que no apliquen.
- [x] (28/10/2026) Ejecutar `0017_roles_permisos.sql` antes de publicar la app, y publicar en Vercel el código con permisos por rol.
- [ ] Ejecutar `0018_unidades_medida.sql` en el editor SQL de Supabase **antes** de publicar la app (sin ella, el combo de unidades del formulario de bienes falla).
- [ ] Asignar un rol y una sede a cada usuario: sin rol ven «pendiente de aprobación», y sin sede (si no son Administrador) no pueden entrar.
- [ ] Configurar el dashboard de Supabase:
  - *Site URL*: `https://inventario-tiempo-restauracion.vercel.app`.
  - *Redirect URLs*: esa URL con `/**` y `http://localhost:5173/**`.
  - Plantilla "Confirm signup" con `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
- [x] (25/10/2026) Publicar en Vercel los cambios de usuarios (sexo, función, foto, eliminar, roles), sedes y categorías después de ejecutar las migraciones.

---

## Hecho

| Fecha | Ítem |
|---|---|
| 24/10/2026 | Pantalla propia de confirmación de correo (`/confirmar-correo`) con reenvío del enlace. |
| 24/10/2026 | Usuarios: sexo, función, foto y eliminar usuario (migración `0011`). |
| 24/10/2026 | Nombre completo del usuario en el pie del menú, leído del perfil. |
| 24/10/2026 | Roles del sistema: Administrador, Encargado, Revisor y Aprobador (migración `0012`). |
| 25/10/2026 | Sedes: código, tipo, dirección, distrito, provincia, departamento y responsable; el distrito sale en el encabezado del reporte (migración `0013`). |
| 25/10/2026 | Sedes: departamento, provincia y distrito como combos del ubigeo del Perú; código y orden fuera del formulario. |
| 25/10/2026 | Usuarios: columna y filtro por Función en el listado. |
| 25/10/2026 | Categorías de bienes: catálogo en Configuración, combo en el bien con código sugerido por prefijo, y filtro en el listado (migración `0014`). |
| 25/10/2026 | Categorías: "Tipo contable" con valores fijos Activo Fijo y Suministro (migración `0015`). |
| 25/10/2026 | Bienes: unidad de medida como combo fijo (UND, DOC, JGO, CJA, PQT, PAR, PZA, MLL). |
| 25/10/2026 | Categorías: se elimina la unidad de medida por defecto (migración `0016`). |
| 25/10/2026 | Roles con permisos reales: Administrador en todas las sedes, el resto solo en su sede; Encargado, Revisor y Aprobador; pantalla «pendiente de aprobación» (migración `0017`). |
| 28/10/2026 | Configuración → Unidades de medida: catálogo de 17 unidades por tipo, y el combo de bienes se alimenta de ahí (migración `0018`; épica [`epica-unidades-medida.md`](pendientes/epica-unidades-medida.md)). |
| 28/10/2026 | Usuarios: botón "Eliminar" en el listado (solo Administrador, no a sí mismo), con confirmación. |
| 31/10/2026 | Combos con buscador interno (Categoría, Unidad de medida y Ubicación) en el formulario de bien; épica [`epica-combos-con-buscador.md`](pendientes/epica-combos-con-buscador.md). |
| 25/10/2026 | Etiquetas QR: impresión en hoja A4 (3 × 8, una por unidad; desde el 28/10/2026 son 2 × 5 con QR más grande) y pantalla de escaneo con cámara o lector USB (fase 1 de la épica #6). |
