-- Mantenimiento de sedes (tabla lugares) y ubicaciones desde Configuración.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0008_imagen_bienes.sql).

-- Usuarios autenticados: leer todo (también inactivos) y escribir.
-- El rol anónimo sigue viendo solo las sedes activas (login y registro).
drop policy if exists "lugares_autenticados_all" on public.lugares;
create policy "lugares_autenticados_all" on public.lugares
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "ubicaciones_autenticados_all" on public.ubicaciones;
create policy "ubicaciones_autenticados_all" on public.ubicaciones
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.lugares, public.ubicaciones to authenticated;

-- Fecha de registro también para las sedes.
alter table public.lugares add column if not exists fecha_registro timestamptz not null default now();

-- Los bienes guardan una copia del nombre (bienes.lugar, bienes.ubicacion) que usan el listado
-- y el reporte. Al renombrar una sede o una ubicación, se actualiza esa copia.
create or replace function public.propagar_nombre_lugar()
returns trigger
language plpgsql
as $$
begin
  update public.bienes set lugar = new.nombre where lugar_id = new.id;
  return new;
end;
$$;

drop trigger if exists lugares_propagar_nombre on public.lugares;
create trigger lugares_propagar_nombre
  after update of nombre on public.lugares
  for each row
  when (old.nombre is distinct from new.nombre)
  execute function public.propagar_nombre_lugar();

create or replace function public.propagar_descripcion_ubicacion()
returns trigger
language plpgsql
as $$
begin
  update public.bienes set ubicacion = new.descripcion where ubicacion_id = new.id;
  return new;
end;
$$;

drop trigger if exists ubicaciones_propagar_descripcion on public.ubicaciones;
create trigger ubicaciones_propagar_descripcion
  after update of descripcion on public.ubicaciones
  for each row
  when (old.descripcion is distinct from new.descripcion)
  execute function public.propagar_descripcion_ubicacion();
