-- El admin real pasa a ser 100% solo lectura en todo el sistema (fichas,
-- docentes, monitoreos): ya no edita ni elimina fichas, ni renombra ni
-- elimina docentes. La unica excepcion de escritura para revisar el
-- estado/observaciones de una ficha pasa al especialista AGEBATP.
-- La gestion de usuarios (auth.admin.*, tabla profiles) sigue siendo
-- exclusiva del admin via la Edge Function admin-users, eso no cambia.

create or replace function public.is_especialista()
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'especialista');
$$;

grant execute on function public.is_especialista() to authenticated;

-- soft_delete_ficha: ya no admite bypass de admin, solo el director dueño.
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

  if v_ceba_id <> public.my_ceba_id() then
    raise exception 'No tenés permiso para eliminar esta ficha' using errcode = '42501';
  end if;

  update public.fichas_monitoreo set deleted_at = now() where id = p_ficha_id;
end;
$$;

-- rename_docente / delete_docente: idem, solo director dueño de la CEBA.
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

  if v_ceba_id <> public.my_ceba_id() then
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

  if v_ceba_id <> public.my_ceba_id() then
    raise exception 'No tenés permiso para eliminar este docente' using errcode = '42501';
  end if;

  update public.fichas_monitoreo
  set docente_id = null, docente = 'Sin docente asignado'
  where docente_id = p_docente_id;

  delete from public.docentes where id = p_docente_id;
end;
$$;

-- Nueva funcion: solo el especialista AGEBATP revisa (estado + observaciones).
-- Reemplaza el UPDATE directo que hacia FichasAdmin.tsx cuando el rol era
-- admin (ver auditoria previa: usar RPC security definer en vez de UPDATE
-- directo gateado por RLS evita el problema intermitente 42501 que tuvimos
-- con soft_delete_ficha).
create or replace function public.revisar_ficha(
  p_ficha_id uuid,
  p_estado text,
  p_observaciones text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_especialista() then
    raise exception 'Solo el especialista AGEBATP puede revisar fichas' using errcode = '42501';
  end if;

  if p_estado not in ('Pendiente', 'Recibido', 'Observado') then
    raise exception 'Estado inválido: %', p_estado;
  end if;

  update public.fichas_monitoreo
  set estado = p_estado, observaciones = p_observaciones
  where id = p_ficha_id and deleted_at is null;

  if not found then
    raise exception 'Ficha no encontrada o ya eliminada';
  end if;
end;
$$;

grant execute on function public.revisar_ficha(uuid, text, text) to authenticated;

-- Catalogo de monitoreos: la escritura queda solo para el especialista
-- (antes admin+especialista via is_viewer()).
drop policy if exists "monitoreos_write_viewer" on public.monitoreos_pedagogicos;
create policy "monitoreos_write_especialista" on public.monitoreos_pedagogicos
  for all to authenticated using (public.is_especialista()) with check (public.is_especialista());

notify pgrst, 'reload schema';
