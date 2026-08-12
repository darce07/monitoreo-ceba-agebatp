-- Permite el tercer rol en profiles (si hay check constraint la ajustamos)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  ) then
    execute (
      select 'alter table public.profiles drop constraint ' || conname
      from pg_constraint
      where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
      limit 1
    );
  end if;
end $$;

alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'especialista', 'director'));

-- is_admin() sigue siendo SOLO admin real (para crear/editar/eliminar).
-- is_viewer() = admin o especialista: ambos ven todo, ninguno de los
-- dos permisos destructivos depende de esta funcion.
create or replace function public.is_viewer()
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'especialista'));
$$;

grant execute on function public.is_viewer() to authenticated;

-- fichas_monitoreo: lectura para admin/especialista, escritura solo director-propio o admin.
drop policy if exists "fichas_select_own_ceba_or_admin" on public.fichas_monitoreo;
create policy "fichas_select_own_ceba_or_viewer" on public.fichas_monitoreo
  for select to authenticated using (
    (ceba_id = public.my_ceba_id() or public.is_viewer()) and deleted_at is null
  );

-- docentes: misma logica.
drop policy if exists "docentes_select_own_ceba_or_admin" on public.docentes;
create policy "docentes_select_own_ceba_or_viewer" on public.docentes
  for select to authenticated using (
    ceba_id = public.my_ceba_id() or public.is_viewer()
  );

-- Storage: el especialista tambien tiene que poder ver/descargar PDFs
-- de cualquier CEBA (solo lectura), no subir ni borrar.
drop policy if exists "fichas_storage_select_own_ceba_or_admin" on storage.objects;
create policy "fichas_storage_select_own_ceba_or_viewer" on storage.objects
  for select to authenticated using (
    bucket_id = 'fichas_monitoreo' and (
      public.is_viewer()
      or (storage.foldername(name))[1] = (select codigo from public.cebas where id = public.my_ceba_id())
    )
  );

notify pgrst, 'reload schema';
