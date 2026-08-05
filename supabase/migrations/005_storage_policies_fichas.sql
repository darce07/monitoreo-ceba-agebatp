create policy "fichas_storage_select_own_ceba_or_admin" on storage.objects
  for select to authenticated using (
    bucket_id = 'fichas_monitoreo' and (
      public.is_admin()
      or (storage.foldername(name))[1] = (select codigo from public.cebas where id = public.my_ceba_id())
    )
  );

create policy "fichas_storage_insert_own_ceba_or_admin" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'fichas_monitoreo' and (
      public.is_admin()
      or (storage.foldername(name))[1] = (select codigo from public.cebas where id = public.my_ceba_id())
    )
  );

create policy "fichas_storage_update_own_ceba_or_admin" on storage.objects
  for update to authenticated using (
    bucket_id = 'fichas_monitoreo' and (
      public.is_admin()
      or (storage.foldername(name))[1] = (select codigo from public.cebas where id = public.my_ceba_id())
    )
  ) with check (
    bucket_id = 'fichas_monitoreo' and (
      public.is_admin()
      or (storage.foldername(name))[1] = (select codigo from public.cebas where id = public.my_ceba_id())
    )
  );

create policy "fichas_storage_delete_admin_only" on storage.objects
  for delete to authenticated using (
    bucket_id = 'fichas_monitoreo' and public.is_admin()
  );
