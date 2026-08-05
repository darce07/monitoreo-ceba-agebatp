create table if not exists public.docentes (
  id uuid primary key default gen_random_uuid(),
  ceba_id uuid not null references public.cebas(id),
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (ceba_id, nombre)
);

alter table public.docentes enable row level security;

drop policy if exists "docentes_select_own_ceba_or_admin" on public.docentes;
create policy "docentes_select_own_ceba_or_admin" on public.docentes
  for select to authenticated using (
    ceba_id = public.my_ceba_id() or public.is_admin()
  );

drop policy if exists "docentes_insert_own_ceba_or_admin" on public.docentes;
create policy "docentes_insert_own_ceba_or_admin" on public.docentes
  for insert to authenticated with check (
    ceba_id = public.my_ceba_id() or public.is_admin()
  );

drop policy if exists "docentes_update_admin_only" on public.docentes;
create policy "docentes_update_admin_only" on public.docentes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Backfill: un docente por cada (ceba_id, nombre normalizado) que ya aparece en fichas_monitoreo
insert into public.docentes (ceba_id, nombre)
select distinct ceba_id, docente
from public.fichas_monitoreo
where docente is not null and docente <> ''
on conflict (ceba_id, nombre) do nothing;

alter table public.fichas_monitoreo add column if not exists docente_id uuid references public.docentes(id);

update public.fichas_monitoreo f
set docente_id = d.id
from public.docentes d
where d.ceba_id = f.ceba_id and d.nombre = f.docente and f.docente_id is null;
