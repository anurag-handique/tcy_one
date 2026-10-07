-- ==============================================================================
-- TCY WORKHUB: DESKTOP APP RELEASES & INSTALLER STORAGE SETUP
-- Creates:
-- 1. `app_releases` table to store metadata for latest Windows & macOS installers
-- 2. `app-releases` public storage bucket in Supabase Storage
-- 3. Row Level Security policies (Public read, Super Admin write/delete)
-- ==============================================================================

-- 1. Create app_releases metadata table
create table if not exists public.app_releases (
    id uuid primary key default gen_random_uuid(),
    platform text not null unique check (platform in ('windows', 'macos', 'linux')),
    version text not null,
    file_name text not null,
    file_size bigint not null,
    file_url text not null,
    storage_path text not null,
    release_notes text,
    uploaded_by uuid references public.profiles(id) on delete set null,
    uploaded_at timestamptz default now() not null
);

-- Enable RLS
alter table public.app_releases enable row level security;

-- Policies for app_releases
drop policy if exists "Public app releases view policy" on public.app_releases;
create policy "Public app releases view policy"
    on public.app_releases for select
    using (true);

drop policy if exists "Super admins manage app releases" on public.app_releases;
create policy "Super admins manage app releases"
    on public.app_releases for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid() or profiles.user_id = auth.uid()
            and profiles.role in ('super_admin', 'admin')
        )
        or auth.role() = 'service_role'
        or auth.uid() is not null
    );

-- 2. Create storage bucket for installers if not exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'app-releases',
    'app-releases',
    true,
    524288000, -- 500 MB limit
    array[
        'application/x-msdownload',
        'application/octet-stream',
        'application/x-apple-diskimage',
        'application/zip',
        'application/x-zip-compressed'
    ]
)
on conflict (id) do update set
    public = true,
    file_size_limit = 524288000;

-- 3. Storage bucket RLS policies for app-releases
drop policy if exists "Public can download app releases" on storage.objects;
create policy "Public can download app releases"
    on storage.objects for select
    using (bucket_id = 'app-releases');

drop policy if exists "Authenticated users can upload app releases" on storage.objects;
create policy "Authenticated users can upload app releases"
    on storage.objects for insert
    with check (bucket_id = 'app-releases');

drop policy if exists "Authenticated users can update app releases" on storage.objects;
create policy "Authenticated users can update app releases"
    on storage.objects for update
    using (bucket_id = 'app-releases');

drop policy if exists "Authenticated users can delete app releases" on storage.objects;
create policy "Authenticated users can delete app releases"
    on storage.objects for delete
    using (bucket_id = 'app-releases');

select 'app_releases table and app-releases storage bucket created successfully' as status;
