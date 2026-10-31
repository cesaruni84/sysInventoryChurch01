-- Catálogo de ubicaciones y ubicación de cada bien.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0005_bienes_por_lugar.sql).
-- Para agregar una ubicación, inserta una fila en public.ubicaciones; para ocultarla, activo = false.

create table if not exists public.ubicaciones (
  id              smallint generated always as identity primary key,
  descripcion     text not null unique,
  fecha_registro  timestamptz not null default now(),
  orden           smallint not null default 0,
  activo          boolean not null default true
);

insert into public.ubicaciones (descripcion, orden) values
  ('Almacén',              1),
  ('Oficina Pastoral',     2),
  ('Cocina',               3),
  ('Salón Central Piso 1', 4),
  ('Salón Central Piso 2', 5)
on conflict (descripcion) do nothing;

-- Solo usuarios autenticados la leen (el formulario de bienes está detrás del login).
alter table public.ubicaciones enable row level security;

drop policy if exists "ubicaciones_lectura" on public.ubicaciones;
create policy "ubicaciones_lectura" on public.ubicaciones
  for select
  to authenticated
  using (true);

grant select on public.ubicaciones to authenticated;
revoke all on public.ubicaciones from anon;

-- Bienes → ubicación. La columna de texto bienes.ubicacion se mantiene y la app
-- la llena con la descripción (la usan el listado, los filtros y el reporte).
alter table public.bienes add column if not exists ubicacion_id smallint references public.ubicaciones (id);

-- Bienes existentes: se enlazan si su texto coincide con una ubicación del catálogo
-- (sin distinguir mayúsculas ni tildes). Los que no coinciden quedan sin ubicacion_id
-- y se les pedirá elegir una al editarlos.
update public.bienes b
set ubicacion_id = u.id,
    ubicacion    = u.descripcion
from public.ubicaciones u
where b.ubicacion_id is null
  and lower(translate(trim(b.ubicacion), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'))
    = lower(translate(u.descripcion,     'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'));

create index if not exists bienes_ubicacion_id_idx on public.bienes (ubicacion_id);
