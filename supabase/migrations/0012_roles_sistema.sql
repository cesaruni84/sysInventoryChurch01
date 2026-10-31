-- Roles del sistema: Administrador, Encargado, Revisor y Aprobador.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de 0011_perfil_sexo_funcion_foto.sql).
-- Los roles anteriores (Pastor, Siervos, Diáconos) eran la función en la iglesia, que desde 0011
-- va en perfiles.funcion. Los roles todavía no limitan permisos (ver docs/pendientes/plan-roles-permisos.md).

-- Quien tenía un rol anterior conserva el dato como función (solo si no tenía una).
update public.perfiles p
set funcion = case r.nombre
                when 'Pastor' then 'Pastor'
                when 'Siervos' then 'Siervo'
                when 'Diáconos' then 'Diácono'
              end
from public.roles r
where p.rol_id = r.id
  and r.nombre in ('Pastor', 'Siervos', 'Diáconos')
  and p.funcion is null;

-- Esos usuarios quedan sin rol y se borran los roles anteriores.
update public.perfiles
set rol_id = null
where rol_id in (select id from public.roles where nombre in ('Pastor', 'Siervos', 'Diáconos'));

delete from public.roles where nombre in ('Pastor', 'Siervos', 'Diáconos');

insert into public.roles (nombre) values
  ('Administrador'),
  ('Encargado'),
  ('Revisor'),
  ('Aprobador')
on conflict (nombre) do nothing;

-- El registro público no tiene sesión: si crear_perfil() copiara rol_id de los metadatos,
-- cualquiera podría crearse una cuenta como Administrador. Los usuarios nuevos quedan sin rol;
-- Usuarios → Registro asigna el rol con un update justo después de crear la cuenta.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_lugar_id smallint;
begin
  if (m ->> 'lugar_id') ~ '^\d{1,4}$' then
    select l.id into v_lugar_id from public.lugares l where l.id = (m ->> 'lugar_id')::smallint;
  end if;

  insert into public.perfiles (id, email, nombre, apellido, telefono, lugar_id, sexo, funcion)
  values (
    new.id,
    new.email,
    coalesce(trim(m ->> 'nombre'), ''),
    coalesce(trim(m ->> 'apellido'), ''),
    nullif(trim(coalesce(m ->> 'telefono', '')), ''),
    v_lugar_id,
    case when m ->> 'sexo' in ('M', 'F') then m ->> 'sexo' end,
    case when m ->> 'funcion' in ('Pastor', 'Siervo', 'Diácono') then m ->> 'funcion' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
