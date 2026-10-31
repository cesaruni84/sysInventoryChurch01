-- Inventario por sede: cada bien pertenece a un lugar (public.lugares).
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0004_lugares.sql).
-- Los bienes existentes pasan a "Anexo Ceres". La columna de texto bienes.lugar
-- se mantiene; la app la llena con el nombre del lugar.

alter table public.bienes add column if not exists lugar_id smallint references public.lugares (id);

update public.bienes
set lugar_id = (select id from public.lugares where nombre = 'Anexo Ceres'),
    lugar    = 'Anexo Ceres'
where lugar_id is null;

alter table public.bienes alter column lugar_id set not null;

create index if not exists bienes_lugar_idx on public.bienes (lugar_id);
