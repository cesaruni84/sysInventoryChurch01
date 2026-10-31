-- Usuarios (perfiles) con teléfono y rol, y catálogo de roles.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0006_ubicaciones.sql).
-- Los roles todavía no limitan permisos: todo usuario autenticado puede hacer todo.

-- Roles
create table if not exists public.roles (
  id          smallint generated always as identity primary key,
  nombre      text not null unique,
  created_at  timestamptz not null default now()
);

insert into public.roles (nombre) values
  ('Pastor'),
  ('Siervos'),
  ('Diáconos')
on conflict (nombre) do nothing;

alter table public.roles enable row level security;

drop policy if exists "roles_autenticados_all" on public.roles;
create policy "roles_autenticados_all" on public.roles
  for all
  to authenticated
  using (true)
  with check (true);

revoke all on public.roles from anon;

-- Perfiles: teléfono y rol
alter table public.perfiles
  add column if not exists telefono text,
  add column if not exists rol_id smallint references public.roles (id) on delete restrict;

-- El listado de usuarios necesita ver y editar todos los perfiles (antes solo el propio).
drop policy if exists "perfiles_lectura_propia" on public.perfiles;
drop policy if exists "perfiles_edicion_propia" on public.perfiles;
drop policy if exists "perfiles_autenticados_lectura" on public.perfiles;
drop policy if exists "perfiles_autenticados_edicion" on public.perfiles;

create policy "perfiles_autenticados_lectura" on public.perfiles
  for select
  to authenticated
  using (true);

create policy "perfiles_autenticados_edicion" on public.perfiles
  for update
  to authenticated
  using (true)
  with check (true);

-- El registro (público o desde Usuarios → Registro) envía estos datos en los metadatos.
-- Valores inválidos se guardan como NULL para que nunca falle la creación del usuario.
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

  insert into public.perfiles (id, email, nombre, apellido, telefono, lugar_id, rol_id)
  values (
    new.id,
    new.email,
    coalesce(trim(m ->> 'nombre'), ''),
    coalesce(trim(m ->> 'apellido'), ''),
    nullif(trim(coalesce(m ->> 'telefono', '')), ''),
    v_lugar_id,
    v_rol_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
