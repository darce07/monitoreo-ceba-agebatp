create or replace function public.soft_delete_ficha(p_ficha_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Solo un administrador puede eliminar fichas' using errcode = '42501';
  end if;

  update public.fichas_monitoreo
  set deleted_at = now()
  where id = p_ficha_id and deleted_at is null;

  if not found then
    raise exception 'Ficha no encontrada o ya eliminada';
  end if;
end;
$$;

grant execute on function public.soft_delete_ficha(uuid) to authenticated;

notify pgrst, 'reload schema';
