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

  update public.fichas_monitoreo
  set docente_id = null, docente = 'Sin docente asignado'
  where docente_id = p_docente_id;

  delete from public.docentes where id = p_docente_id;
end;
$$;

notify pgrst, 'reload schema';
