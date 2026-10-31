-- Imagen de cada bien, guardada en Supabase Storage.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0007_usuarios_roles.sql).
-- Bucket privado: las imágenes solo se ven con sesión iniciada (URLs firmadas temporales).

-- Ruta del archivo dentro del bucket (p. ej. "2/4f1c…e9.jpg"); NULL si no tiene imagen.
alter table public.bienes add column if not exists imagen text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bienes', 'bienes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bienes_imagenes_lectura" on storage.objects;
drop policy if exists "bienes_imagenes_subida" on storage.objects;
drop policy if exists "bienes_imagenes_edicion" on storage.objects;
drop policy if exists "bienes_imagenes_borrado" on storage.objects;

create policy "bienes_imagenes_lectura" on storage.objects
  for select to authenticated
  using (bucket_id = 'bienes');

create policy "bienes_imagenes_subida" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bienes');

create policy "bienes_imagenes_edicion" on storage.objects
  for update to authenticated
  using (bucket_id = 'bienes')
  with check (bucket_id = 'bienes');

create policy "bienes_imagenes_borrado" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bienes');
