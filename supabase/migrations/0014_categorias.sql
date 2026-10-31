-- Categorías de bienes (Configuración → Categorías) y categoría de cada bien.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0013_sedes_datos.sql).

create table if not exists public.categorias (
  id              smallint generated always as identity primary key,
  nombre          text not null unique,
  -- Prefijo del código de clasificación (COC → COC-001); la app sugiere el siguiente código.
  prefijo         text unique check (prefijo ~ '^[A-Z]{2,5}$'),
  -- Texto libre; la app sugiere los tipos ya usados.
  tipo            text,
  descripcion     text,
  -- Unidad que se precarga al registrar un bien de esta categoría (UND, JGO…).
  unidad_medida   text,
  activo          boolean not null default true,
  fecha_registro  timestamptz not null default now()
);

alter table public.categorias enable row level security;

drop policy if exists "categorias_autenticados_all" on public.categorias;
create policy "categorias_autenticados_all" on public.categorias
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.categorias to authenticated;
revoke all on public.categorias from anon;

-- Categoría del bien (opcional). Una categoría en uso no se puede borrar: se desactiva.
alter table public.bienes
  add column if not exists categoria_id smallint references public.categorias (id);

insert into public.categorias (nombre, prefijo) values
  ('Mobiliario',             'MOB'),
  ('Equipos de cocina',      'COC'),
  ('Menaje',                 'MEN'),
  ('Electrodomésticos',      'ELE'),
  ('Sonido y multimedia',    'SON'),
  ('Instrumentos musicales', 'INS'),
  ('Equipos de cómputo',     'COM'),
  ('Herramientas',           'HER'),
  ('Limpieza',               'LIM'),
  ('Decoración',             'DEC')
on conflict (nombre) do nothing;

-- Los bienes sin categoría cuyo código empieza con el prefijo de una categoría (COC-001) quedan en ella.
update public.bienes b
set categoria_id = c.id
from public.categorias c
where b.categoria_id is null
  and c.prefijo is not null
  and b.codigo_clasificacion like c.prefijo || '-%';
