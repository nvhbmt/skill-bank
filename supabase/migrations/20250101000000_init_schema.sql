-- Schema SkillBank dựng lại từ src/types/database.types.ts để chạy Supabase local.
-- Không phải bản dump của production; chỉ dùng cho môi trường dev.

create table if not exists public.user_info (
    user_id     uuid primary key references auth.users(id) on delete cascade,
    username    text not null unique,
    email       text not null,
    full_name   text,
    avatar_url  text,
    role        text not null default 'user',
    created_at  timestamptz default now(),
    updated_at  timestamptz default now(),
    deleted_at  timestamptz
);

create table if not exists public.user_profiles (
    id            bigserial primary key,
    user_id       uuid not null references auth.users(id) on delete cascade,
    bio           text,
    phone         text,
    address       text,
    portfolio_url text,
    experiences   text,
    certifications text,
    interests     text,
    projects      text,
    deleted_at    timestamptz
);

create table if not exists public.user_reputation (
    id         bigserial primary key,
    user_id    uuid not null references auth.users(id) on delete cascade,
    score      integer default 0,
    updated_at timestamptz default now()
);

create table if not exists public.skills (
    id          bigserial primary key,
    name        text not null,
    category    text,
    description text,
    created_at  timestamptz default now()
);

create table if not exists public.user_skills (
    id         bigserial primary key,
    user_id    uuid not null references auth.users(id) on delete cascade,
    skill_id   bigint not null references public.skills(id) on delete cascade,
    level      text,
    verified   boolean default false,
    deleted_at timestamptz
);

create table if not exists public.projects (
    id              bigserial primary key,
    title           text not null,
    description     text,
    cover_image_url text,
    project_type    text,
    location        text,
    start_date      date,
    status          text default 'pending',
    owner_id        uuid not null references auth.users(id) on delete cascade,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now(),
    deleted_at      timestamptz
);

create table if not exists public.project_members (
    id         bigserial primary key,
    project_id bigint not null references public.projects(id) on delete cascade,
    user_id    uuid not null references auth.users(id) on delete cascade,
    role       text,
    joined_at  timestamptz default now(),
    left_at    timestamptz,
    deleted_at timestamptz
);

create table if not exists public.project_skills (
    id          bigserial primary key,
    project_id  bigint not null references public.projects(id) on delete cascade,
    skill_id    bigint not null references public.skills(id) on delete cascade,
    description text
);

create table if not exists public.project_milestones (
    id          bigserial primary key,
    project_id  bigint not null references public.projects(id) on delete cascade,
    title       text not null,
    description text,
    due_date    date,
    order_index integer,
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

create table if not exists public.applications (
    id           bigserial primary key,
    project_id   bigint not null references public.projects(id) on delete cascade,
    applicant_id uuid not null references auth.users(id) on delete cascade,
    cover_letter text,
    status       text default 'pending',
    applied_at   timestamptz default now(),
    deleted_at   timestamptz
);

create table if not exists public.contracts (
    id         bigserial primary key,
    project_id bigint not null references public.projects(id) on delete cascade,
    member_id  uuid not null references auth.users(id) on delete cascade,
    terms      text,
    start_date date,
    end_date   date,
    status     text,
    created_at timestamptz default now(),
    deleted_at timestamptz
);

create table if not exists public.deliveries (
    id            bigserial primary key,
    contract_id   bigint not null references public.contracts(id) on delete cascade,
    description   text,
    delivery_date date,
    status        text,
    deleted_at    timestamptz
);

create table if not exists public.disputes (
    id           bigserial primary key,
    project_id   bigint not null references public.projects(id) on delete cascade,
    raised_by_id uuid not null references auth.users(id) on delete cascade,
    resolved_by  uuid references auth.users(id),
    description  text,
    status       text,
    created_at   timestamptz default now(),
    deleted_at   timestamptz
);

create table if not exists public.messages (
    id          bigserial primary key,
    sender_id   uuid references auth.users(id) on delete cascade,
    receiver_id uuid not null references auth.users(id) on delete cascade,
    content     text not null,
    is_read     boolean default false,
    sent_at     timestamptz default now(),
    deleted_at  timestamptz
);

create table if not exists public.notifications (
    id         bigserial primary key,
    user_id    uuid not null references auth.users(id) on delete cascade,
    title      text,
    message    text,
    type       text,
    is_read    boolean default false,
    created_at timestamptz default now()
);

create table if not exists public.reviews (
    id          bigserial primary key,
    project_id  bigint not null references public.projects(id) on delete cascade,
    reviewer_id uuid not null references auth.users(id) on delete cascade,
    reviewee_id uuid not null references auth.users(id) on delete cascade,
    rating      integer,
    comment     text,
    created_at  timestamptz default now(),
    deleted_at  timestamptz
);

create table if not exists public.password_resets (
    id         bigserial primary key,
    user_id    uuid not null references auth.users(id) on delete cascade,
    token      text not null,
    expires_at timestamptz not null,
    used       boolean default false,
    deleted_at timestamptz
);

-- Index cho các cột hay lọc
create index if not exists idx_projects_status     on public.projects(status);
create index if not exists idx_projects_owner      on public.projects(owner_id);
create index if not exists idx_members_project     on public.project_members(project_id);
create index if not exists idx_applications_proj   on public.applications(project_id);
create index if not exists idx_notifications_user  on public.notifications(user_id);
