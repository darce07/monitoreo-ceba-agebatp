create or replace function public.validar_nombre_pdf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  select codigo into v_codigo from public.cebas where id = new.ceba_id;

  if v_codigo is null then
    raise exception 'CEBA no encontrada';
  end if;

  if new.nombre_pdf !~ ('^' || v_codigo || '_[A-Z0-9]+_[0-9]{8}_M(0[1-9]|1[0-2])\.pdf$') then
    raise exception 'Nombre de archivo invalido. Formato esperado: %_DOCENTE_AAAAMMDD_Mxx.pdf', v_codigo;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_nombre_pdf on public.fichas_monitoreo;
create trigger trg_validar_nombre_pdf
  before insert or update of nombre_pdf, ceba_id on public.fichas_monitoreo
  for each row execute function public.validar_nombre_pdf();
