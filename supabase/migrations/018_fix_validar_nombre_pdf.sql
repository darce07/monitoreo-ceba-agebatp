-- BUG: el trigger de la migracion 002 exigia extension ".pdf" y codigo de
-- monitoreo fijo "M01".."M12". Desde la migracion 014 el catalogo de
-- monitoreos_pedagogicos permite codigos libres (el hint de la UI en
-- Monitoreos.tsx sugiere "1T2026" como ejemplo) y desde antes UploadFicha.tsx
-- ya permitia subir .doc/.docx ademas de .pdf. Con la regex vieja, subir un
-- Word o usar cualquier monitoreo que no fuera M01-M12 hacia fallar el
-- INSERT en fichas_monitoreo con un error crudo de Postgres.
--
-- Esta migracion relaja la validacion: exige el prefijo de CEBA correcto y
-- una extension soportada, sin atarse a un patron de codigo de monitoreo
-- especifico (el codigo ya se sanea en el frontend antes de armar el
-- nombre de archivo, ver commit que ajusta UploadFicha.tsx).
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

  if new.nombre_pdf !~ ('^' || v_codigo || '_[A-Z0-9]+_[0-9]{8}_[A-Z0-9]+\.(pdf|doc|docx)$') then
    raise exception 'Nombre de archivo invalido. Formato esperado: %_DOCENTE_AAAAMMDD_CODIGOMONITOREO.(pdf|doc|docx)', v_codigo;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
