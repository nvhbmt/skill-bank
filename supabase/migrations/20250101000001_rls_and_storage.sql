-- RLS + storage cho môi trường dev local.
-- Policy ở đây nới lỏng hơn production: đọc mở cho anon (app tự lọc theo
-- status/deleted_at), ghi yêu cầu đã đăng nhập. Đủ để chạy thử toàn bộ luồng.

do $$
declare t text;
begin
    foreach t in array array[
        'user_info','user_profiles','user_reputation','skills','user_skills',
        'projects','project_members','project_skills','project_milestones',
        'applications','contracts','deliveries','disputes','messages',
        'notifications','reviews','password_resets'
    ] loop
        execute format('alter table public.%I enable row level security', t);
        execute format(
            'create policy "dev_read_all" on public.%I for select using (true)', t);
        execute format(
            'create policy "dev_write_authenticated" on public.%I for all
             to authenticated using (true) with check (true)', t);
        execute format('grant select on public.%I to anon, authenticated', t);
        execute format('grant all on public.%I to authenticated', t);
    end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Bucket lưu file mà app dùng
insert into storage.buckets (id, name, public)
values
    ('project-covers', 'project-covers', true),
    ('cover-images',   'cover-images',   true),
    ('cv-files',       'cv-files',       true),
    ('avatars',        'avatars',        true)
on conflict (id) do nothing;

create policy "dev_storage_read" on storage.objects
    for select using (true);
create policy "dev_storage_write" on storage.objects
    for all to authenticated using (true) with check (true);
