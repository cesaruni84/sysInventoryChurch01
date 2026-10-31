# Plan pendiente: roles con permisos reales

> **Estado:** fases 1 y 2 implementadas el 25/10/2026 (migración `0017`) con ajustes: Revisor y Aprobador
> solo ven su sede, y el Encargado también gestiona usuarios de su sede. Documentado en `CLAUDE.md`
> (Permisos por rol). Queda pendiente la fase 3 (aprobación del inventario).

## Contexto

Hoy los roles no limitan nada. Todas las reglas de acceso (RLS) son "cualquier usuario con sesión
puede todo", así que cualquiera ve y modifica cualquier sede.

Además hay un hueco de seguridad que este plan debe cerrar: el registro público ("Crear cuenta") no
tiene sesión, y `crear_perfil()` copia el `rol_id` que llegue en los metadatos de `signUp`. Si se crea
un rol Administrador sin cambiar eso, cualquiera podría registrarse pidiendo ese rol.

**Ya hecho en `0012_roles_sistema.sql`:** la tabla `roles` tiene los 4 roles de este plan
(Administrador, Encargado, Revisor y Aprobador); los anteriores (Pastor, Siervos, Diáconos) pasaron a
`perfiles.funcion`. Además, `crear_perfil()` ya no copia `rol_id`, y Usuarios → Registro asigna el rol
con un update después de `signUp`. Falta que los roles den permisos.

## Matriz de permisos

| | Administrador | Encargado | Revisor | Aprobador |
|---|---|---|---|---|
| Ver bienes y reporte | Todas las sedes | Su sede | Todas las sedes | Todas las sedes |
| Registrar, editar y eliminar bienes | ✓ (todas) | ✓ (su sede) | – | – |
| Ubicaciones | ✓ (todas) | ✓ (su sede) | – | – |
| Sedes y roles | ✓ | – | – | – |
| Usuarios (listar, crear, editar, eliminar) | ✓ | – | – | – |
| Cambiar de sede | ✓ | – | ✓ | ✓ |

Las firmas del reporte corresponden a los roles: **Elaborado por** (Encargado), **Revisado por**
(Revisor) y **Aprobado por** (Aprobador).

Un usuario **sin rol** inicia sesión pero ve la pantalla "Tu cuenta está pendiente de aprobación"
hasta que un administrador le asigne uno. Es el caso de quien se registra solo en "Crear cuenta".

## Fase 1: base de datos (`supabase/migrations/0017_roles_permisos.sql`)

1. **Roles con código fijo:** agregar a `roles` las columnas `codigo` (única, con check:
   `admin`, `encargado`, `revisor`, `aprobador`) y `descripcion`, y llenarlas para los 4 roles que
   ya existen (por nombre).
2. **Administrador inicial:** el usuario administrador queda con el rol `admin` (ver decisión 2),
   para no perder acceso.
3. **Funciones auxiliares** (`security definer`, `stable`, `search_path = ''`):
   `rol_actual()` devuelve el código del rol de `auth.uid()`, `sede_propia()` devuelve su
   `perfiles.lugar_id` y `es_admin()` dice si es administrador. Las usan las reglas de acceso.
4. **Reglas de acceso (RLS):**
   - `bienes`: lectura para `admin`, `revisor` y `aprobador` en todas las sedes, y para `encargado`
     solo en `lugar_id = sede_propia()`. Escritura (insert, update, delete) para `admin`,
     o para `encargado` si `lugar_id = sede_propia()`.
   - `ubicaciones`: lo mismo que `bienes`.
   - `lugares`: lectura para todos los usuarios con sesión; escritura solo para `admin`. El público
     sin sesión (`anon`) sigue viendo solo las sedes activas.
   - `roles`: lectura para todos los usuarios con sesión; escritura solo para `admin`.
   - `perfiles`: cada uno lee el suyo y `admin` lee todos; solo `admin` edita, así nadie puede
     cambiarse su propio rol o sede.
   - Storage `bienes`: lectura igual que la tabla; subir o borrar solo `admin`, o `encargado` si
     `(storage.foldername(name))[1]` es su sede.
   - Storage `usuarios`: solo `admin`.
5. **`eliminar_usuario()`** exige además `es_admin()`.

## Fase 2: aplicación

1. **Nuevo `src/lib/permisos.ts`:**
   - El tipo `CodigoRol`.
   - `usePerfilActual()`: lee el perfil propio con `roles(codigo)`.
   - `usePermisos()`: devuelve `editarBienes`, `todasLasSedes`, `gestionarUsuarios` y
     `gestionarConfiguracion`.
2. **`AuthProvider` / `RequireAuth`:**
   - Cargan el perfil al iniciar sesión.
   - Sin rol, muestran la pantalla "pendiente de aprobación" (con botón Cerrar sesión).
   - Para `encargado`, la sede activa es siempre la de su perfil (se ignora la elegida
     al iniciar sesión) y se oculta el botón "Cambiar" de la barra superior.
3. **Menú (`src/components/layout/SidebarNav.tsx`):** cada opción declara el permiso que necesita y se
   ocultan las que no corresponden. Por ejemplo, Revisor y Aprobador no ven "Registrar bien",
   Usuarios ni Configuración.
4. **Rutas (`src/App.tsx`):** un componente `RequierePermiso` envuelve las rutas protegidas, para que
   no se pueda entrar escribiendo la URL.
5. **Pantallas:**
   - Listado de bienes: los botones editar y eliminar se ocultan sin permiso.
   - `bienes/:id`: se abre en modo solo lectura sin permiso de edición.
   - Roles (`src/pages/usuarios/Roles.tsx`): pasa a ser una lista de solo lectura con la descripción
     de cada rol, sin crear ni borrar, porque los códigos son fijos (`src/lib/roles.ts`).
   - Registro de usuario: la sede es obligatoria para `encargado`.
6. **`CLAUDE.md`:** documentar el modelo de permisos y quitar la frase "Roles do not grant
   permissions yet".

## Fase 3 (opcional): aprobación del inventario

Una tabla `revisiones_inventario` (sede, fecha, revisado_por, revisado_en, aprobado_por, aprobado_en).
En el Reporte, botones "Marcar como revisado" (Revisor) y "Aprobar" (Aprobador), y los nombres salen
impresos en las firmas de `FIRMAS` (`src/lib/reporte.ts`), en pantalla y en el Excel.

## Verificación

- `npm run build` y `npm run lint` sin errores.
- Crear un usuario de prueba por rol y comprobar con cada uno: el menú, las rutas bloqueadas, los
  botones ocultos, y que la base de datos rechaza las escrituras no permitidas aunque se salte la
  interfaz (por ejemplo, un update directo con supabase-js desde la consola del navegador).
- Comprobar que el registro público queda "pendiente" aunque se envíe `rol_id` en los metadatos.

## Decisiones pendientes

1. **Revisor y Aprobador:** en las fases 1 y 2 tienen los mismos permisos (solo lectura de todas las
   sedes) y solo se distinguen en la fase 3. ¿Se mantienen separados o se juntan en uno solo?
2. **Usuario administrador inicial:** ¿`cesaruni84@2f7py2.onmicrosoft.com`?
3. **Fase 3:** ¿se incluye junto con las fases 1 y 2 o queda para después?
