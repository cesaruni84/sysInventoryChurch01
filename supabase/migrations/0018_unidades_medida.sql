-- Catálogo de unidades de medida (Configuración → Unidades de medida).
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0017_roles_permisos.sql).
-- bienes.unidad_medida sigue siendo texto (sin FK): guarda el código de la unidad.

begin;

create table if not exists public.unidades_medida (
  id              smallint generated always as identity primary key,
  codigo          text not null unique check (codigo ~ '^[A-Z0-9]{2,5}$'),
  nombre          text not null,
  tipo            text not null check (tipo in ('Cantidades y agrupaciones', 'Peso', 'Volumen y capacidad', 'Longitud y superficie')),
  descripcion     text,
  activo          boolean not null default true,
  fecha_registro  timestamptz not null default now()
);

alter table public.unidades_medida enable row level security;

-- Leen todos los autenticados; escribe solo el Administrador (igual que categorías, 0017).
drop policy if exists "unidades_lectura" on public.unidades_medida;
drop policy if exists "unidades_admin_escritura" on public.unidades_medida;

create policy "unidades_lectura" on public.unidades_medida
  for select to authenticated
  using (true);

create policy "unidades_admin_escritura" on public.unidades_medida
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

grant select, insert, update, delete on public.unidades_medida to authenticated;
revoke all on public.unidades_medida from anon;

insert into public.unidades_medida (codigo, nombre, tipo, descripcion) values
  ('UND', 'Unidad',   'Cantidades y agrupaciones', 'Artículos individuales, como sillas, estantes o mesas.'),
  ('DOC', 'Docena',   'Cantidades y agrupaciones', 'Conjuntos de 12 unidades.'),
  ('JGO', 'Juego',    'Cantidades y agrupaciones', 'Conjunto de piezas que se usan juntas, como un juego de cucharas.'),
  ('CJA', 'Caja',     'Cantidades y agrupaciones', 'Caja.'),
  ('PQT', 'Paquete',  'Cantidades y agrupaciones', 'Paquete.'),
  ('PAR', 'Par',      'Cantidades y agrupaciones', 'Par.'),
  ('PZA', 'Pieza',    'Cantidades y agrupaciones', 'Pieza.'),
  ('MLL', 'Millar',   'Cantidades y agrupaciones', '1000 unidades; útil para papelería o suministros menores.'),
  ('KGM', 'Kilogramo',  'Peso', 'Kilogramo (KG).'),
  ('GRM', 'Gramo',      'Peso', 'Gramo (GR).'),
  ('TNE', 'Tonelada',   'Peso', 'Tonelada.'),
  ('LTR', 'Litro',      'Volumen y capacidad', 'Litro (LT); común en insumos de cocina, limpieza o pintura.'),
  ('MLT', 'Mililitro',  'Volumen y capacidad', 'Mililitro (ML).'),
  ('GAL', 'Galón',      'Volumen y capacidad', 'Galón.'),
  ('MTR', 'Metro',             'Longitud y superficie', 'Metro (MT); para cables, telas, etc.'),
  ('CMT', 'Centímetro',        'Longitud y superficie', 'Centímetro (CM).'),
  ('MTK', 'Metro cuadrado',    'Longitud y superficie', 'Metro cuadrado (M2); para cerámicas, alfombras, etc.')
on conflict (codigo) do nothing;

commit;
