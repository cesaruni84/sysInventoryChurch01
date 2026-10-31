-- Cada ubicación pertenece a una única sede (tabla lugares).
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0009_mantenimiento_catalogos.sql).
-- Las ubicaciones existentes quedan en la sede "base" y se copian a cada una de las demás sedes;
-- los bienes de otras sedes pasan a apuntar a la copia de su propia sede.
-- Sede base (sin depender de su nombre, que puede haberse cambiado): la que tiene más bienes;
-- si no hay bienes, la primera sede por orden.

begin;

alter table public.ubicaciones add column if not exists lugar_id smallint references public.lugares (id);

-- El nombre ya no es único en general, sino dentro de cada sede.
alter table public.ubicaciones drop constraint if exists ubicaciones_descripcion_key;

do $$
declare
  v_base smallint;
begin
  select b.lugar_id into v_base
  from public.bienes b
  group by b.lugar_id
  order by count(*) desc, b.lugar_id
  limit 1;

  if v_base is null then
    select l.id into v_base from public.lugares l order by l.orden, l.id limit 1;
  end if;

  if v_base is null then
    raise exception 'No hay sedes en la tabla lugares: crea al menos una antes de ejecutar este script.';
  end if;

  -- Filas existentes (sin sede) → sede base.
  update public.ubicaciones set lugar_id = v_base where lugar_id is null;

  -- Copia del juego de la sede base para cada una de las demás sedes.
  insert into public.ubicaciones (descripcion, orden, activo, lugar_id)
  select u.descripcion, u.orden, u.activo, l.id
  from public.ubicaciones u
  cross join public.lugares l
  where u.lugar_id = v_base
    and l.id <> v_base;
end;
$$;

-- Bienes de otras sedes que apuntaban a una ubicación de Ceres → la copia de su sede.
update public.bienes b
set ubicacion_id = c.id
from public.ubicaciones u, public.ubicaciones c
where b.ubicacion_id = u.id
  and u.lugar_id <> b.lugar_id
  and c.lugar_id = b.lugar_id
  and c.descripcion = u.descripcion;

alter table public.ubicaciones alter column lugar_id set not null;

alter table public.ubicaciones drop constraint if exists ubicaciones_lugar_descripcion_key;
alter table public.ubicaciones add constraint ubicaciones_lugar_descripcion_key unique (lugar_id, descripcion);

-- Necesaria para la FK compuesta de bienes.
alter table public.ubicaciones drop constraint if exists ubicaciones_id_lugar_key;
alter table public.ubicaciones add constraint ubicaciones_id_lugar_key unique (id, lugar_id);

-- Un bien solo puede tener una ubicación de su misma sede.
-- (MATCH SIMPLE: un ubicacion_id NULL, de bienes antiguos sin enlazar, sigue permitido.)
alter table public.bienes drop constraint if exists bienes_ubicacion_id_fkey;
alter table public.bienes drop constraint if exists bienes_ubicacion_sede_fkey;
alter table public.bienes
  add constraint bienes_ubicacion_sede_fkey
  foreign key (ubicacion_id, lugar_id) references public.ubicaciones (id, lugar_id);

create index if not exists ubicaciones_lugar_idx on public.ubicaciones (lugar_id);

commit;
