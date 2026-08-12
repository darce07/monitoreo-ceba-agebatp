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
  v_ceba_id uuid;
  v_nombre_completo text;
begin
  select ceba_id into v_ceba_id from public.docentes where id = p_docente_id;
  if v_ceba_id is null then
    raise exception 'Docente no encontrado';
  end if;

  if not (public.is_admin() or v_ceba_id = public.my_ceba_id()) then
    raise exception 'No tenés permiso para editar este docente' using errcode = '42501';
  end if;

  if p_nombres is null or trim(p_nombres) = '' or p_apellido_paterno is null or trim(p_apellido_paterno) = '' then
    raise exception 'Nombres y apellido paterno son obligatorios';
  end if;

  update public.docentes
  set nombres = trim(p_nombres), apellido_paterno = trim(p_apellido_paterno), apellido_materno = nullif(trim(p_apellido_materno), '')
  where id = p_docente_id
  returning nombre into v_nombre_completo;

  update public.fichas_monitoreo set docente = v_nombre_completo where docente_id = p_docente_id;
end;
$$;

create or replace function public.delete_docente(p_docente_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ceba_id uuid;
begin
  select ceba_id into v_ceba_id from public.docentes where id = p_docente_id;
  if v_ceba_id is null then
    raise exception 'Docente no encontrado';
  end if;

  if not (public.is_admin() or v_ceba_id = public.my_ceba_id()) then
    raise exception 'No tenés permiso para eliminar este docente' using errcode = '42501';
  end if;

  if exists (select 1 from public.fichas_monitoreo where docente_id = p_docente_id and deleted_at is null) then
    raise exception 'No se puede eliminar: este docente tiene fichas activas registradas';
  end if;

  update public.fichas_monitoreo set docente_id = null where docente_id = p_docente_id;
  delete from public.docentes where id = p_docente_id;
end;
$$;

notify pgrst, 'reload schema';
