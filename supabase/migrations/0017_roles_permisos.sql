-- Roles con permisos reales: el Administrador accede a todas las sedes; los demás roles, solo a la sede
-- de su perfil (perfiles.lugar_id). Ver docs/pendientes/plan-roles-permisos.md.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0016_categorias_sin_unidad.sql).
--
-- IMPORTANTE: antes de ejecutar, revisa los correos del Administrador inicial más abajo (paso 2).
-- Si ninguno coincide con un usuario existente, el script se cancela entero (no deja a nadie sin acceso).

begin;

-- 1. Roles con código fijo --------------------------------------------------------------------------
alter table public.roles
  add column if not exists codigo text,
  add column if not exists descripcion text;

update public.roles set codigo = 'admin',     descripcion = 'Accede a todas las sedes y administra usuarios, sedes y catálogos.' where nombre = 'Administrador';
update public.roles set codigo = 'encargado', descripcion = 'Gestiona los bienes, las ubicaciones y los usuarios de su sede.'        where nombre = 'Encargado';
update public.roles set codigo = 'revisor',   descripcion = 'Consulta el inventario y el reporte de su sede (solo lectura).'       where nombre = 'Revisor';
update public.roles set codigo = 'aprobador', descripcion = 'Consulta el inventario y el reporte de su sede (solo lectura).'       where nombre = 'Aprobador';

alter table public.roles drop constraint if exists roles_codigo_check;
alter table public.roles
  add constraint roles_codigo_check check (codigo in ('admin', 'encargado', 'revisor', 'aprobador'));
create unique index if not exists roles_codigo_key on public.roles (codigo);

-- 2. Administrador inicial --------------------------------------------------------------------------
update public.perfiles
set rol_id = (select id from public.roles where codigo = 'admin')
where lower(email) in ('cesaruni84@2f7py2.onmicrosoft.com', 'cesaruni84@gmail.com');

do $$
begin
  if not exists (
    select 1 from public.perfiles p join public.roles r on r.id = p.rol_id where r.codigo = 'admin'
  ) then
    raise exception 'No hay ningún Administrador: corrige los correos del paso 2 y vuelve a ejecutar.';
  end if;
end;
$$;

-- 3. Funciones auxiliares (security definer: leen perfiles sin pasar por sus propias reglas) ---------
create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.codigo
  from public.perfiles p
  join public.roles r on r.id = p.rol_id
  where p.id = auth.uid()
$$;

create or replace function public.sede_propia()
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select p.lugar_id from public.perfiles p where p.id = auth.uid()
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() = 'admin', false)
$$;

-- Dice si un rol_id es el de Administrador (para impedir que un Encargado lo asigne).
create or replace function public.es_rol_admin(p_rol_id smallint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.roles r where r.id = p_rol_id and r.codigo = 'admin')
$$;

revoke all on function public.rol_actual(), public.sede_propia(), public.es_admin(), public.es_rol_admin(smallint) from public, anon;
grant execute on function public.rol_actual(), public.sede_propia(), public.es_admin(), public.es_rol_admin(smallint) to authenticated;

-- 4. Reglas de acceso (RLS) -------------------------------------------------------------------------
-- bienes: admin todo; encargado, revisor y aprobador solo su sede; escribe admin o el encargado de la sede.
drop policy if exists "bienes_autenticados_all" on public.bienes;
drop policy if exists "bienes_lectura" on public.bienes;
drop policy if exists "bienes_escritura" on public.bienes;

create policy "bienes_lectura" on public.bienes
  for select to authenticated
  using (public.es_admin() or (public.rol_actual() is not null and lugar_id = public.sede_propia()));

create policy "bienes_escritura" on public.bienes
  for all to authenticated
  using (public.es_admin() or (public.rol_actual() = 'encargado' and lugar_id = public.sede_propia()))
  with check (public.es_admin() or (public.rol_actual() = 'encargado' and lugar_id = public.sede_propia()));

-- ubicaciones: igual que bienes.
drop policy if exists "ubicaciones_lectura" on public.ubicaciones;
drop policy if exists "ubicaciones_autenticados_all" on public.ubicaciones;
drop policy if exists "ubicaciones_escritura" on public.ubicaciones;

create policy "ubicaciones_lectura" on public.ubicaciones
  for select to authenticated
  using (public.es_admin() or (public.rol_actual() is not null and lugar_id = public.sede_propia()));

create policy "ubicaciones_escritura" on public.ubicaciones
  for all to authenticated
  using (public.es_admin() or (public.rol_actual() = 'encargado' and lugar_id = public.sede_propia()))
  with check (public.es_admin() or (public.rol_actual() = 'encargado' and lugar_id = public.sede_propia()));

-- lugares (sedes): leen todos los autenticados; escribe solo el admin. anon sigue viendo las activas (0004).
drop policy if exists "lugares_autenticados_all" on public.lugares;
drop policy if exists "lugares_autenticados_lectura" on public.lugares;
drop policy if exists "lugares_admin_escritura" on public.lugares;

create policy "lugares_autenticados_lectura" on public.lugares
  for select to authenticated
  using (true);

create policy "lugares_admin_escritura" on public.lugares
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- roles y categorias: leen todos los autenticados; escribe solo el admin.
drop policy if exists "roles_autenticados_all" on public.roles;
drop policy if exists "roles_lectura" on public.roles;
drop policy if exists "roles_admin_escritura" on public.roles;

create policy "roles_lectura" on public.roles
  for select to authenticated
  using (true);

create policy "roles_admin_escritura" on public.roles
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "categorias_autenticados_all" on public.categorias;
drop policy if exists "categorias_lectura" on public.categorias;
drop policy if exists "categorias_admin_escritura" on public.categorias;

create policy "categorias_lectura" on public.categorias
  for select to authenticated
  using (true);

create policy "categorias_admin_escritura" on public.categorias
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- perfiles: cada uno lee el suyo; el admin lee todos; el encargado lee los de su sede.
-- Edita el admin (todo) o el encargado (usuarios no admin de su sede, sin poder asignar el rol Administrador).
drop policy if exists "perfiles_autenticados_lectura" on public.perfiles;
drop policy if exists "perfiles_autenticados_edicion" on public.perfiles;
drop policy if exists "perfiles_lectura" on public.perfiles;
drop policy if exists "perfiles_edicion" on public.perfiles;

create policy "perfiles_lectura" on public.perfiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.es_admin()
    or (public.rol_actual() = 'encargado' and lugar_id = public.sede_propia())
  );

create policy "perfiles_edicion" on public.perfiles
  for update to authenticated
  using (
    public.es_admin()
    or (
      public.rol_actual() = 'encargado'
      and lugar_id = public.sede_propia()
      and not coalesce(public.es_rol_admin(rol_id), false)
    )
  )
  with check (
    public.es_admin()
    or (
      public.rol_actual() = 'encargado'
      and lugar_id = public.sede_propia()
      and not coalesce(public.es_rol_admin(rol_id), false)
    )
  );

-- Storage "bienes": la primera carpeta de la ruta es el id de la sede (<lugar_id>/<uuid>.<ext>).
drop policy if exists "bienes_imagenes_lectura" on storage.objects;
drop policy if exists "bienes_imagenes_subida" on storage.objects;
drop policy if exists "bienes_imagenes_edicion" on storage.objects;
drop policy if exists "bienes_imagenes_borrado" on storage.objects;

create policy "bienes_imagenes_lectura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bienes'
    and (public.es_admin() or (public.rol_actual() is not null and (storage.foldername(name))[1] = public.sede_propia()::text))
  );

create policy "bienes_imagenes_subida" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bienes'
    and (public.es_admin() or (public.rol_actual() = 'encargado' and (storage.foldername(name))[1] = public.sede_propia()::text))
  );

create policy "bienes_imagenes_edicion" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'bienes'
    and (public.es_admin() or (public.rol_actual() = 'encargado' and (storage.foldername(name))[1] = public.sede_propia()::text))
  )
  with check (
    bucket_id = 'bienes'
    and (public.es_admin() or (public.rol_actual() = 'encargado' and (storage.foldername(name))[1] = public.sede_propia()::text))
  );

create policy "bienes_imagenes_borrado" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bienes'
    and (public.es_admin() or (public.rol_actual() = 'encargado' and (storage.foldername(name))[1] = public.sede_propia()::text))
  );

-- Storage "usuarios": la primera carpeta es el id del usuario (<user_id>/<uuid>.<ext>).
-- Cada uno ve su foto; admin y encargado gestionan las de los usuarios que pueden ver (perfiles_lectura).
drop policy if exists "usuarios_fotos_lectura" on storage.objects;
drop policy if exists "usuarios_fotos_subida" on storage.objects;
drop policy if exists "usuarios_fotos_edicion" on storage.objects;
drop policy if exists "usuarios_fotos_borrado" on storage.objects;

create policy "usuarios_fotos_lectura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'usuarios'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.es_admin()
      or (
        public.rol_actual() = 'encargado'
        and exists (
          select 1 from public.perfiles p
          where p.id::text = (storage.foldername(name))[1] and p.lugar_id = public.sede_propia()
        )
      )
    )
  );

create policy "usuarios_fotos_subida" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'usuarios'
    and (
      public.es_admin()
      or (
        public.rol_actual() = 'encargado'
        and exists (
          select 1 from public.perfiles p
          where p.id::text = (storage.foldername(name))[1] and p.lugar_id = public.sede_propia()
        )
      )
    )
  );

create policy "usuarios_fotos_edicion" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'usuarios'
    and (
      public.es_admin()
      or (
        public.rol_actual() = 'encargado'
        and exists (
          select 1 from public.perfiles p
          where p.id::text = (storage.foldername(name))[1] and p.lugar_id = public.sede_propia()
        )
      )
    )
  )
  with check (
    bucket_id = 'usuarios'
    and (
      public.es_admin()
      or (
        public.rol_actual() = 'encargado'
        and exists (
          select 1 from public.perfiles p
          where p.id::text = (storage.foldername(name))[1] and p.lugar_id = public.sede_propia()
        )
      )
    )
  );

create policy "usuarios_fotos_borrado" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'usuarios'
    and (
      public.es_admin()
      or (
        public.rol_actual() = 'encargado'
        and exists (
          select 1 from public.perfiles p
          where p.id::text = (storage.foldername(name))[1] and p.lugar_id = public.sede_propia()
        )
      )
    )
  );

-- 5. Eliminar usuarios: solo el Administrador, y nadie puede eliminarse a sí mismo ------------------
create or replace function public.eliminar_usuario(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;
  if not public.es_admin() then
    raise exception 'Solo un Administrador puede eliminar usuarios.' using errcode = '42501';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes eliminar tu propio usuario.' using errcode = 'P0001';
  end if;
  delete from auth.users where id = p_id;
end;
$$;

revoke all on function public.eliminar_usuario(uuid) from public, anon;
grant execute on function public.eliminar_usuario(uuid) to authenticated;

commit;
