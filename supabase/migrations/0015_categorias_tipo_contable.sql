-- Tipo contable de la categoría: valores fijos "Activo Fijo" o "Suministro" (antes, texto libre).
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0014_categorias.sql).

-- Un tipo escrito a mano que no sea uno de los dos valores queda vacío para elegirlo de nuevo.
update public.categorias
set tipo = null
where tipo is not null and tipo not in ('Activo Fijo', 'Suministro');

alter table public.categorias drop constraint if exists categorias_tipo_check;
alter table public.categorias
  add constraint categorias_tipo_check check (tipo in ('Activo Fijo', 'Suministro'));
