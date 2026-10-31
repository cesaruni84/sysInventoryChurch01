-- Restringe la tabla bienes a usuarios autenticados (login con Supabase Auth).
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar.
-- Los usuarios se crean a mano en Authentication → Users → Add user.

drop policy if exists "bienes_anon_all" on public.bienes;
drop policy if exists "bienes_autenticados_all" on public.bienes;

create policy "bienes_autenticados_all" on public.bienes
  for all
  to authenticated
  using (true)
  with check (true);

-- Sin política para anon: con RLS activo, el rol anónimo no puede leer ni escribir.
revoke all on public.bienes from anon;
