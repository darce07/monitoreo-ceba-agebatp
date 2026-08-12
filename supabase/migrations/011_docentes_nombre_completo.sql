alter table public.docentes
  add column if not exists nombres text,
  add column if not exists apellido_paterno text,
  add column if not exists apellido_materno text;

-- Backfill best-effort desde el nombre libre que ya existia: primera
-- palabra como nombres, resto como apellido paterno. Los datos reales
-- se corrigen despues desde la UI de edicion.
update public.docentes
set
  nombres = coalesce(nombres, split_part(nombre, ' ', 1)),
  apellido_paterno = coalesce(apellido_paterno, nullif(trim(substring(nombre from position(' ' in nombre) + 1)), ''))
where nombres is null;

update public.docentes set apellido_paterno = nombres, nombres = 'Sin nombre' where apellido_paterno is null;

alter table public.docentes
  alter column nombres set not null,
  alter column apellido_paterno set not null;

create or replace function public.docentes_sync_nombre()
returns trigger language plpgsql as $$
begin
  new.nombre := trim(new.nombres || ' ' || new.apellido_paterno || ' ' || coalesce(new.apellido_materno, ''));
  return new;
end;
$$;

drop trigger if exists trg_docentes_sync_nombre on public.docentes;
create trigger trg_docentes_sync_nombre
  before insert or update of nombres, apellido_paterno, apellido_materno on public.docentes
  for each row execute function public.docentes_sync_nombre();

-- Dispara el trigger para recalcular "nombre" con el backfill de arriba.
update public.docentes set nombres = nombres;

create or replace function public.rename_docente(
  p_docente_id uuid,
  p_nombres text,
  p_apellido_paterno text,
  p_apellido_materno text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_nombre_completo text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Solo un administrador puede editar docentes' using errcode = '42501';
  end if;

  if p_nombres is null or trim(p_nombres) = '' or p_apellido_paterno is null or trim(p_apellido_paterno) = '' then
    raise exception 'Nombres y apellido paterno son obligatorios';
  end if;

  update public.docentes
  set nombres = trim(p_nombres), apellido_paterno = trim(p_apellido_paterno), apellido_materno = nullif(trim(p_apellido_materno), '')
  where id = p_docente_id
  returning nombre into v_nombre_completo;

  if v_nombre_completo is null then
    raise exception 'Docente no encontrado';
  end if;

  update public.fichas_monitoreo set docente = v_nombre_completo where docente_id = p_docente_id;
end;
$$;

grant execute on function public.rename_docente(uuid, text, text, text) to authenticated;

drop function if exists public.rename_docente(uuid, text);

notify pgrst, 'reload schema';
