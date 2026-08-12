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

  if exists (select 1 from public.fichas_monitoreo where docente_id = p_docente_id and deleted_at is null) then
    raise exception 'No se puede eliminar: este docente tiene fichas activas registradas';
  end if;

  -- Fichas ya eliminadas (soft-delete) que aun apuntan a este docente:
  -- se desvincula el id pero el nombre queda "congelado" en el texto,
  -- asi la tabla de auditoria conserva el dato sin bloquear el borrado
  -- por la foreign key.
  update public.fichas_monitoreo set docente_id = null where docente_id = p_docente_id;

  delete from public.docentes where id = p_docente_id;
  if not found then
    raise exception 'Docente no encontrado';
  end if;
end;
$$;

notify pgrst, 'reload schema';
