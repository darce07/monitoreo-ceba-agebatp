create table if not exists public.monitoreos_pedagogicos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.monitoreos_pedagogicos enable row level security;

drop policy if exists "monitoreos_select_all" on public.monitoreos_pedagogicos;
create policy "monitoreos_select_all" on public.monitoreos_pedagogicos
  for select to authenticated using (true);

drop policy if exists "monitoreos_write_viewer" on public.monitoreos_pedagogicos;
create policy "monitoreos_write_viewer" on public.monitoreos_pedagogicos
  for all to authenticated using (public.is_viewer()) with check (public.is_viewer());

-- Backfill: los M01-M12 que ya se usaban quedan como catalogo inicial,
-- para no romper las fichas existentes.
insert into public.monitoreos_pedagogicos (codigo, nombre, orden)
select 'M' || lpad(n::text, 2, '0'), 'Monitoreo ' || n, n
from generate_series(1, 12) as n
on conflict (codigo) do nothing;

alter table public.fichas_monitoreo add column if not exists monitoreo_id uuid references public.monitoreos_pedagogicos(id);

update public.fichas_monitoreo f
set monitoreo_id = m.id
from public.monitoreos_pedagogicos m
where m.codigo = f.n_monitoreo and f.monitoreo_id is null;

notify pgrst, 'reload schema';
