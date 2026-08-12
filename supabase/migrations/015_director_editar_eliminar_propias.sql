-- El director elimina sus propias fichas (antes solo admin).
create or replace function public.soft_delete_ficha(p_ficha_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ceba_id uuid;
begin
  select ceba_id into v_ceba_id from public.fichas_monitoreo where id = p_ficha_id and deleted_at is null;
  if v_ceba_id is null then
    raise exception 'Ficha no encontrada o ya eliminada';
  end if;

  if not (public.is_admin() or v_ceba_id = public.my_ceba_id()) then
    raise exception 'No tenés permiso para eliminar esta ficha' using errcode = '42501';
  end if;

  update public.fichas_monitoreo set deleted_at = now() where id = p_ficha_id;
end;
$$;

-- El director edita SOLO los datos de su propia ficha (docente, area,
-- fecha, monitoreo) - nunca estado/observaciones, eso es del revisor.
create or replace function public.director_update_ficha(
  p_ficha_id uuid,
  p_docente_id uuid,
  p_docente text,
  p_area text,
  p_fecha_monitoreo date,
  p_monitoreo_id uuid,
  p_n_monitoreo text,
  p_titulo text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ceba_id uuid;
begin
  select ceba_id into v_ceba_id from public.fichas_monitoreo where id = p_ficha_id and deleted_at is null;
  if v_ceba_id is null or v_ceba_id <> public.my_ceba_id() then
    raise exception 'No tenés permiso para editar esta ficha' using errcode = '42501';
  end if;

  update public.fichas_monitoreo
  set docente_id = p_docente_id, docente = p_docente, area = p_area,
      fecha_monitoreo = p_fecha_monitoreo, monitoreo_id = p_monitoreo_id,
      n_monitoreo = p_n_monitoreo, titulo = p_titulo
  where id = p_ficha_id;
end;
$$;

grant execute on function public.director_update_ficha(uuid, uuid, text, text, date, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
