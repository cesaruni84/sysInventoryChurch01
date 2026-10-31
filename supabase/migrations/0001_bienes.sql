-- Inventario físico de bienes y enseres
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar.

create table if not exists public.bienes (
  id                    bigint generated always as identity primary key,
  codigo_clasificacion  text,
  descripcion           text not null,
  marca                 text,
  modelo                text,
  serie                 text,
  color                 text,
  ubicacion             text not null,
  unidad_medida         text not null default 'UND',
  fecha_adquisicion     date,
  documento             text,
  estado                text not null default 'B' check (estado in ('B', 'R', 'M')),
  cantidad              integer not null default 1 check (cantidad > 0),
  valor_unitario        numeric(12, 2) not null default 0 check (valor_unitario >= 0),
  lugar                 text not null default 'CERES',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists bienes_ubicacion_idx on public.bienes (ubicacion);
create index if not exists bienes_created_at_idx on public.bienes (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bienes_set_updated_at on public.bienes;
create trigger bienes_set_updated_at
  before update on public.bienes
  for each row execute function public.set_updated_at();

-- La aplicación no tiene login: se permite acceso completo al rol anónimo.
-- Cualquiera con la URL de la app y la anon key puede leer y modificar datos.
alter table public.bienes enable row level security;

drop policy if exists "bienes_anon_all" on public.bienes;
create policy "bienes_anon_all" on public.bienes
  for all
  to anon, authenticated
  using (true)
  with check (true);
