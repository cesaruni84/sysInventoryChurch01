-- Sexo, función y foto de cada usuario; eliminación de usuarios desde la app.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0010_ubicaciones_por_sede.sql).

-- Perfiles: sexo ('M' / 'F'), función en la iglesia y ruta de la foto en Storage.
alter table public.perfiles
  add column if not exists sexo text check (sexo in ('M', 'F')),
  add column if not exists funcion text check (funcion in ('Pastor', 'Siervo', 'Diácono')),
  add column if not exists foto text;

-- El registro envía sexo y función en los metadatos; valores inválidos se guardan como NULL.
-- (La foto se sube después de crear la cuenta y se guarda con un update.)
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_lugar_id smallint;
  v_rol_id smallint;
begin
  if (m ->> 'lugar_id') ~ '^\d{1,4}$' then
    select l.id into v_lugar_id from public.lugares l where l.id = (m ->> 'lugar_id')::smallint;
  end if;
  if (m ->> 'rol_id') ~ '^\d{1,4}$' then
    select r.id into v_rol_id from public.roles r where r.id = (m ->> 'rol_id')::smallint;
  end if;

  insert into public.perfiles (id, email, nombre, apellido, telefono, lugar_id, rol_id, sexo, funcion)
  values (
    new.id,
    new.email,
    coalesce(trim(m ->> 'nombre'), ''),
    coalesce(trim(m ->> 'apellido'), ''),
    nullif(trim(coalesce(m ->> 'telefono', '')), ''),
    v_lugar_id,
    v_rol_id,
    case when m ->> 'sexo' in ('M', 'F') then m ->> 'sexo' end,
    case when m ->> 'funcion' in ('Pastor', 'Siervo', 'Diácono') then m ->> 'funcion' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Fotos de usuarios: bucket privado, igual que las imágenes de bienes (0008).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('usuarios', 'usuarios', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "usuarios_fotos_lectura" on storage.objects;
drop policy if exists "usuarios_fotos_subida" on storage.objects;
drop policy if exists "usuarios_fotos_edicion" on storage.objects;
drop policy if exists "usuarios_fotos_borrado" on storage.objects;

create policy "usuarios_fotos_lectura" on storage.objects
  for select to authenticated
  using (bucket_id = 'usuarios');

create policy "usuarios_fotos_subida" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'usuarios');

create policy "usuarios_fotos_edicion" on storage.objects
  for update to authenticated
  using (bucket_id = 'usuarios')
  with check (bucket_id = 'usuarios');

create policy "usuarios_fotos_borrado" on storage.objects
  for delete to authenticated
  using (bucket_id = 'usuarios');

-- Borrar la cuenta de acceso necesita privilegios de administrador; esta función los da
-- sin exponer la clave service_role. Al borrar de auth.users, el perfil se borra en cascada.
-- Como los roles aún no limitan permisos, cualquier usuario autenticado puede usarla,
-- pero nadie puede eliminarse a sí mismo.
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
  if p_id = auth.uid() then
    raise exception 'No puedes eliminar tu propio usuario.' using errcode = 'P0001';
  end if;
  delete from auth.users where id = p_id;
end;
$$;

revoke all on function public.eliminar_usuario(uuid) from public, anon;
grant execute on function public.eliminar_usuario(uuid) to authenticated;
