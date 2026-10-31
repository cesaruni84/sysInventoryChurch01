-- Quita la unidad de medida por defecto de las categorías (ya no se usa en la app).
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0015_categorias_tipo_contable.sql).
-- La unidad de cada bien (bienes.unidad_medida) no cambia.

alter table public.categorias drop column if exists unidad_medida;
