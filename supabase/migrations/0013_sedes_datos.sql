-- Datos de cada sede: código, tipo, ubicación (dirección, distrito, provincia, departamento) y responsable.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0012_roles_sistema.sql).
-- El distrito de la sede sale en el encabezado del reporte (si falta, se muestra VITARTE).

alter table public.lugares
  add column if not exists codigo text unique check (codigo ~ '^[A-Z0-9-]{2,10}$'),
  add column if not exists tipo text not null default 'Anexo'
    check (tipo in ('Templo', 'Anexo', 'Casa de oración')),
  add column if not exists direccion text,
  add column if not exists distrito text,
  add column if not exists provincia text,
  add column if not exists departamento text,
  add column if not exists responsable_id uuid references public.perfiles (id) on delete set null;

-- Las sedes actuales son anexos salvo el templo central.
update public.lugares set tipo = 'Templo' where nombre ilike 'templo%';

-- El público sin sesión lee las sedes activas para el combo del login y del registro.
-- Solo necesita estas columnas: la dirección y el responsable no deben quedar públicos.
revoke select on public.lugares from anon;
grant select (id, nombre, orden, activo) on public.lugares to anon;
