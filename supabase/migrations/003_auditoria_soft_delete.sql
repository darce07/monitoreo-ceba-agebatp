alter table public.fichas_monitoreo add column if not exists deleted_at timestamptz;

create table if not exists public.fichas_monitoreo_audit (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null,
  accion text not null check (accion in ('insert', 'update', 'delete')),
  actor_id uuid,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  created_at timestamptz not null default now()
);

alter table public.fichas_monitoreo_audit enable row level security;

drop policy if exists "audit_select_admin_only" on public.fichas_monitoreo_audit;
create policy "audit_select_admin_only" on public.fichas_monitoreo_audit
  for select to authenticated using (public.is_admin());

create or replace function public.registrar_auditoria_ficha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.fichas_monitoreo_audit (ficha_id, accion, actor_id, datos_nuevos)
    values (new.id, 'insert', auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.fichas_monitoreo_audit (ficha_id, accion, actor_id, datos_anteriores, datos_nuevos)
    values (new.id, 'update', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.fichas_monitoreo_audit (ficha_id, accion, actor_id, datos_anteriores)
    values (old.id, 'delete', auth.uid(), to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_auditoria_ficha on public.fichas_monitoreo;
create trigger trg_auditoria_ficha
  after insert or update or delete on public.fichas_monitoreo
  for each row execute function public.registrar_auditoria_ficha();

-- Las consultas normales de la app deben filtrar deleted_at is null
drop policy if exists "fichas_select_own_ceba_or_admin" on public.fichas_monitoreo;
create policy "fichas_select_own_ceba_or_admin" on public.fichas_monitoreo
  for select to authenticated using (
    (ceba_id = public.my_ceba_id() or public.is_admin()) and deleted_at is null
  );
