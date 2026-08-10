create or replace function public.rename_docente(p_docente_id uuid, p_nuevo_nombre text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Solo un administrador puede editar docentes' using errcode = '42501';
  end if;

  if p_nuevo_nombre is null or trim(p_nuevo_nombre) = '' then
    raise exception 'El nombre no puede estar vacío';
  end if;

  update public.docentes set nombre = trim(p_nuevo_nombre) where id = p_docente_id;
  if not found then
    raise exception 'Docente no encontrado';
  end if;

  -- Mantiene el nombre "congelado" en cada ficha ya subida en sincronia,
  -- para que no muestren un nombre distinto al del docente actual.
  update public.fichas_monitoreo set docente = trim(p_nuevo_nombre) where docente_id = p_docente_id;
end;
$$;

grant execute on function public.rename_docente(uuid, text) to authenticated;

create or replace function public.delete_docente(p_docente_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Solo un administrador puede eliminar docentes' using errcode = '42501';
  end if;

  if exists (select 1 from public.fichas_monitoreo where docente_id = p_docente_id) then
    raise exception 'No se puede eliminar: este docente ya tiene fichas registradas';
  end if;

  delete from public.docentes where id = p_docente_id;
  if not found then
    raise exception 'Docente no encontrado';
  end if;
end;
$$;

grant execute on function public.delete_docente(uuid) to authenticated;

notify pgrst, 'reload schema';
