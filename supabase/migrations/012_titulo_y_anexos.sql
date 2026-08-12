alter table public.fichas_monitoreo add column if not exists titulo text;

create table if not exists public.ficha_anexos (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas_monitoreo(id) on delete cascade,
  nombre_archivo text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.ficha_anexos enable row level security;

drop policy if exists "anexos_select_own_ceba_or_admin" on public.ficha_anexos;
create policy "anexos_select_own_ceba_or_admin" on public.ficha_anexos
  for select to authenticated using (
    exists (
      select 1 from public.fichas_monitoreo f
      where f.id = ficha_anexos.ficha_id
        and (f.ceba_id = public.my_ceba_id() or public.is_admin())
    )
  );

drop policy if exists "anexos_insert_own_ceba_or_admin" on public.ficha_anexos;
create policy "anexos_insert_own_ceba_or_admin" on public.ficha_anexos
  for insert to authenticated with check (
    exists (
      select 1 from public.fichas_monitoreo f
      where f.id = ficha_anexos.ficha_id
        and (f.ceba_id = public.my_ceba_id() or public.is_admin())
    )
  );

drop policy if exists "anexos_delete_admin_only" on public.ficha_anexos;
create policy "anexos_delete_admin_only" on public.ficha_anexos
  for delete to authenticated using (public.is_admin());

-- Storage: mismas policies del bucket fichas_monitoreo ya cubren la
-- carpeta "anexos/<ceba>/..." porque filtran por el primer segmento
-- de la ruta (codigo de CEBA), sin cambios necesarios ahi.

notify pgrst, 'reload schema';
