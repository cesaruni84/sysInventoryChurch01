-- Catálogo de lugares (sedes) y lugar de cada usuario.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0003_perfiles.sql).
-- Para agregar o desactivar sedes basta con editar la tabla public.lugares.

create table if not exists public.lugares (
  id      smallint generated always as identity primary key,
  nombre  text not null unique,
  orden   smallint not null default 0,
  activo  boolean not null default true
);

insert into public.lugares (nombre, orden) values
  ('Templo Central Javier Prado', 1),
  ('Anexo Ceres',                 2),
  ('Anexo San Gregorio',          3),
  ('Anexo Callao',                4)
on conflict (nombre) do nothing;

-- El combo se muestra en la pantalla de registro (antes de iniciar sesión),
-- así que el rol anónimo puede leer los lugares activos, solo lectura.
alter table public.lugares enable row level security;

drop policy if exists "lugares_lectura" on public.lugares;
create policy "lugares_lectura" on public.lugares
  for select
  to anon, authenticated
  using (activo);

grant select on public.lugares to anon, authenticated;

-- Lugar del usuario
alter table public.perfiles
  add column if not exists lugar_id smallint references public.lugares (id);

-- El registro envía lugar_id en los metadatos. Un valor inválido se guarda como NULL
-- en lugar de hacer fallar la creación del usuario.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lugar text := new.raw_user_meta_data ->> 'lugar_id';
  v_lugar_id smallint;
begin
  if v_lugar ~ '^\d{1,4}$' then
    select l.id into v_lugar_id from public.lugares l where l.id = v_lugar::smallint;
  end if;

  insert into public.perfiles (id, email, nombre, apellido, lugar_id)
  values (
    new.id,
    new.email,
    coalesce(trim(new.raw_user_meta_data ->> 'nombre'), ''),
    coalesce(trim(new.raw_user_meta_data ->> 'apellido'), ''),
    v_lugar_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
