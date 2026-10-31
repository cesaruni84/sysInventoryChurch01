# Inventario de Bienes y Enseres – Tiempo de Restauración

Sistema web de inventario de la Iglesia Cristiana de Avivamiento (sede CERES).

- **Por sede**: al iniciar sesión se elige la sede (Templo Central, anexos). Todo el inventario se filtra por la sede activa, que se ve en la barra superior y se puede cambiar desde ahí.
- **Dashboard**: bienes registrados, unidades, valor total (S/), ubicaciones, conteo por estado y últimos registros.
- **Bienes / Enseres**
  - **Listado**: búsqueda, filtros por ubicación y estado, edición y eliminación.
  - **Registro**: alta y edición de bienes con los campos del formato físico.
  - **Reporte físico**: réplica del formato *Inventario Físico de Bienes y Enseres* para imprimir (A4 horizontal) o exportar a Excel (.xlsx).

Stack: Vite + React + TypeScript + Tailwind CSS, con Supabase (Postgres + Auth). Se ingresa con correo y contraseña. Cualquier persona puede crear una cuenta (nombre, apellido, correo y contraseña) en `/crear-cuenta`; al confirmar el correo obtiene acceso completo al inventario.

## Puesta en marcha

1. **Crear el proyecto en Supabase** en [supabase.com](https://supabase.com) (el plan gratuito es suficiente).
2. **Crear las tablas**: en *SQL Editor*, ejecuta en orden los scripts de [`supabase/migrations/`](supabase/migrations/) (`0001_bienes.sql`, `0002_solo_autenticados.sql`, `0003_perfiles.sql`, `0004_lugares.sql`, `0005_bienes_por_lugar.sql`, `0006_ubicaciones.sql`, `0007_usuarios_roles.sql`, `0008_imagen_bienes.sql`, `0009_mantenimiento_catalogos.sql`, `0010_ubicaciones_por_sede.sql`). Cada sede tiene sus propias ubicaciones. Las sedes (tabla `lugares`) y las ubicaciones (de la sede activa) se administran desde la app en *Configuración → Sedes* y *Configuración → Ubicaciones*: agregar, editar, ordenar, desactivar (ocultar de los combos) o eliminar si no están en uso. Opcional: datos de ejemplo en [`supabase/seed/`](supabase/seed/).
   - **Registro con confirmación**: en *Authentication → Sign In / Providers → Email*, activa *Allow new users to sign up* y *Confirm email*.
   - **URLs de retorno**: en *Authentication → URL Configuration*, pon como *Site URL* la URL publicada (p. ej. `https://inventario-tiempo-restauracion.vercel.app`) y agrega en *Redirect URLs* esa URL con `/**` y `http://localhost:5173/**`.
   - **Envío de correos**: el servidor de correo incluido en Supabase solo envía unos pocos correos por hora. Para uso real, configura un SMTP propio en *Authentication → Emails → SMTP Settings*.
   - También puedes crear usuarios a mano en *Authentication → Users → Add user* (marca *Auto Confirm User*).
3. **Configurar las credenciales**: copia `.env.example` a `.env` y completa los valores de *Project Settings → API*:
   ```
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```
4. **Instalar y ejecutar**:
   ```
   npm install
   npm run dev
   ```
   Abre http://localhost:5173.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Verificación de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run lint` | Linter (oxlint) |

## Publicación (Vercel)

1. `npx vercel login` (una sola vez) y luego `npx vercel` para vincular el proyecto.
2. Agrega las variables de entorno en Vercel (*Project → Settings → Environment Variables*) o con `npx vercel env add VITE_SUPABASE_URL` y `npx vercel env add VITE_SUPABASE_ANON_KEY`.
3. `npx vercel --prod` publica a producción.

`vercel.json` redirige todas las rutas a `index.html` para que funcionen las URLs de la app (p. ej. `/bienes/3`) al recargar.

## Seguridad

La tabla `bienes` solo es accesible para usuarios autenticados (políticas RLS en `0002_solo_autenticados.sql`). Como el registro es abierto, cualquiera que cree y confirme una cuenta puede ver, editar y borrar bienes. La clave pública (`anon`/publishable) puede ir en el frontend; nunca uses la clave `service_role`/secret en la app.
