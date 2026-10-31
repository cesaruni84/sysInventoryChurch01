-- Perfiles de usuario (nombre y apellido) creados al registrarse.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar.
-- La app envía nombre y apellido en options.data de signUp; quedan en
-- auth.users.raw_user_meta_data y el trigger los copia a public.perfiles.

create table if not exists public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nombre      text not null default '',
  apellido    text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "perfiles_lectura_propia" on public.perfiles;
create policy "perfiles_lectura_propia" on public.perfiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "perfiles_edicion_propia" on public.perfiles;
create policy "perfiles_edicion_propia" on public.perfiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke all on public.perfiles from anon;

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email, nombre, apellido)
  values (
    new.id,
    new.email,
    coalesce(trim(new.raw_user_meta_data ->> 'nombre'), ''),
    coalesce(trim(new.raw_user_meta_data ->> 'apellido'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Perfiles para los usuarios que ya existían antes de esta migración.
insert into public.perfiles (id, email, nombre, apellido)
select
  u.id,
  u.email,
  coalesce(trim(u.raw_user_meta_data ->> 'nombre'), ''),
  coalesce(trim(u.raw_user_meta_data ->> 'apellido'), '')
from auth.users u
on conflict (id) do nothing;
