drop policy if exists "fichas_update_admin_only" on public.fichas_monitoreo;

create policy "fichas_update_admin_only" on public.fichas_monitoreo
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Hueco real encontrado de paso: la auditoria confia en que el trigger
-- (SECURITY DEFINER) salte esta RLS, pero sin policy explicita cualquier
-- cambio de ese supuesto rompe todo en silencio. La dejamos explicita.
drop policy if exists "audit_insert_system" on public.fichas_monitoreo_audit;
create policy "audit_insert_system" on public.fichas_monitoreo_audit
  for insert to authenticated
  with check (true);

notify pgrst, 'reload schema';
