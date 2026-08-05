drop policy if exists "fichas_update_own_ceba_or_admin" on public.fichas_monitoreo;
create policy "fichas_update_admin_only" on public.fichas_monitoreo
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
