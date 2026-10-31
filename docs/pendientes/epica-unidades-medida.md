# Épica: catálogo de unidades de medida

> **Estado:** implementada el 28/10/2026 (HU-1 a HU-3). Falta ejecutar `0018_unidades_medida.sql` en Supabase antes de publicar.

## Contexto y objetivo

Las unidades de medida (UND, DOC, JGO…) estaban fijas en el código (`UNIDADES_MEDIDA`). El Administrador pidió una
vista **Configuración → Unidades de medida** con un catálogo más amplio (cantidades, peso, volumen, longitud y
superficie), para verlo y mantenerlo sin tocar código, y que el combo del formulario de bienes se alimente de ahí.

## Decisiones

- **Un código por unidad.** Donde la lista original daba dos («KGM o KG»), se usa el primero, el internacional:
  KGM, GRM, TNE, LTR, MLT, GAL, MTR, CMT, MTK. Los cortos (KG, GR, LT, ML, MT, CM, M2) van en la descripción.
- **`bienes.unidad_medida` sigue siendo texto**, sin FK: guarda el código. Un bien con una unidad inactiva o ajena al
  catálogo la conserva al editarlo.
- **El código no se edita** una vez creado (los bienes lo guardan como texto).
- **Permisos:** leen todos los autenticados; escribe solo el Administrador (como Categorías).

## Historias de usuario y tareas

**HU-1. Catálogo de unidades en la base de datos**
Como Administrador, quiero que las unidades estén en una tabla, para mantenerlas desde la app.
- La tabla trae las 17 unidades iniciales en 4 grupos, con descripción.
- Solo el Administrador escribe; el resto solo lee.

Tareas
- [x] Migración `0018_unidades_medida.sql` (tabla, check de código y tipo, RLS, datos iniciales).
- [ ] Ejecutar la 0018 en el SQL Editor de Supabase (manual, antes de publicar).

**HU-2. Vista Configuración → Unidades de medida**
Como Administrador, quiero listar, agregar, editar, desactivar y eliminar unidades.
- La lista muestra código, unidad, tipo, estado y fecha de registro.
- El código no se puede cambiar al editar.
- Una unidad en uso por algún bien no se elimina: se desactiva.

Tareas
- [x] `src/lib/unidades.ts`: tipos, `useUnidades`, `useGuardarUnidad`, `useEliminarUnidad` (revisa el uso en `bienes`).
- [x] `src/pages/configuracion/UnidadesMedida.tsx` (tabla y diálogo).
- [x] Ruta `configuracion/unidades-medida` (permiso `gestionarConfiguracion`) y opción en el menú.

**HU-3. El combo de bienes usa el catálogo**
Como Encargado, quiero elegir la unidad entre las activas, agrupadas por tipo.
- El combo muestra `CÓDIGO · Nombre` por grupo (`optgroup`).
- Editar un bien con una unidad inactiva o antigua la mantiene como opción.

Tareas
- [x] `Registro.tsx` lee `useUnidades()` y espera a que cargue antes de montar el formulario.
- [x] Quitar `UNIDADES_MEDIDA` de `bienes.ts`.

## Riesgos

- Si se despliega sin ejecutar la 0018, el combo de unidades falla al cargar y no se puede registrar ni editar bienes.
- La unidad se compara por texto: no cambiar un código ya usado (por eso es de solo lectura).

## Verificación

1. `npm run lint` y `npm run build` sin errores.
2. Administrador: alta, edición (código bloqueado), desactivar y eliminar una unidad de prueba; eliminar una en uso muestra el aviso.
3. Registrar bien: el combo muestra las activas por grupo; un bien antiguo conserva su unidad al editar.
4. Encargado: no ve la opción del menú ni entra por URL, y el combo de bienes funciona.
