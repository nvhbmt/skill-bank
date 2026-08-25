-- Hoàn thiện 2 tính năng còn dang dở:
--   1. Lưu link CV của đơn ứng tuyển (trước đây file upload lên rồi bị bỏ đi).
--   2. Luồng bàn giao dự án (dialog "Bàn giao" trước đây bấm Gửi không làm gì).

alter table public.applications
    add column if not exists cv_url text;

create table if not exists public.project_handovers (
    id           bigserial primary key,
    project_id   bigint not null references public.projects(id) on delete cascade,
    member_id    uuid   not null references auth.users(id) on delete cascade,
    notes        text,
    status       text   not null default 'pending',
    submitted_at timestamptz default now(),
    reviewed_at  timestamptz,
    reviewed_by  uuid references auth.users(id),
    review_note  text,
    deleted_at   timestamptz,
    -- mỗi thành viên chỉ có một bản bàn giao đang hiệu lực trên một dự án
    unique (project_id, member_id)
);

create index if not exists idx_handovers_project on public.project_handovers(project_id);
create index if not exists idx_handovers_member  on public.project_handovers(member_id);

alter table public.project_handovers enable row level security;
create policy "dev_read_all" on public.project_handovers
    for select using (true);
create policy "dev_write_authenticated" on public.project_handovers
    for all to authenticated using (true) with check (true);
grant select on public.project_handovers to anon, authenticated;
grant all    on public.project_handovers to authenticated;
grant usage, select on sequence public.project_handovers_id_seq to anon, authenticated;
