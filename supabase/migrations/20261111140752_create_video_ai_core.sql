create table public.video_projects (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check (char_length(name) between 2 and 160),
 description text, creative_brief text,
 status text not null default 'draft' check (status in ('draft','ingesting','analyzing','ready_for_review','rendering','completed','failed','archived')),
 aspect_ratio text not null default '9:16' check (aspect_ratio in ('9:16','16:9','1:1')),
 resolution text not null default '1080p' check (resolution in ('720p','1080p','1440p','2160p')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (organization_id,id)
);
create table public.video_project_members (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 access_role text not null default 'client' check (access_role in ('client','reviewer','editor','producer')),
 created_at timestamptz not null default now(), unique (organization_id,project_id,user_id),
 foreign key (organization_id,project_id) references public.video_projects(organization_id,id) on delete cascade
);
create table public.video_assets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 kind text not null check (kind in ('original','proxy','audio','thumbnail','broll','graphic','export','subtitle')),
 storage_path text not null unique, original_filename text not null, mime_type text not null,
 size_bytes bigint not null check (size_bytes >= 0), duration_ms bigint,
 metadata jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 foreign key (organization_id,project_id) references public.video_projects(organization_id,id) on delete cascade
);
create table public.video_edits (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 version integer not null check (version > 0),
 status text not null default 'draft' check (status in ('draft','pending_approval','approved','rendered','rejected')),
 edit_decision_list jsonb not null default '{}'::jsonb, notes text,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz,
 foreign key (organization_id,project_id) references public.video_projects(organization_id,id) on delete cascade,
 unique (project_id,version)
);
create table public.video_jobs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 job_type text not null check (job_type in ('ingest','transcribe','analyze','plan_edit','render','quality_check','export')),
 status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled','needs_approval')),
 payload jsonb not null default '{}'::jsonb, result jsonb,
 attempt_count integer not null default 0 check (attempt_count >= 0),
 max_attempts integer not null default 3 check (max_attempts between 1 and 10),
 idempotency_key text, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz, last_error text,
 foreign key (organization_id,project_id) references public.video_projects(organization_id,id) on delete cascade,
 unique (organization_id,idempotency_key)
);
create table public.video_approvals (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, project_id uuid not null,
 edit_id uuid references public.video_edits(id) on delete set null,
 requested_by uuid references auth.users(id) on delete set null, decided_by uuid references auth.users(id) on delete set null,
 status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
 feedback text, created_at timestamptz not null default now(), decided_at timestamptz,
 foreign key (organization_id,project_id) references public.video_projects(organization_id,id) on delete cascade
);
create index video_projects_org_updated_idx on public.video_projects(organization_id,updated_at desc);
create index video_project_members_user_idx on public.video_project_members(user_id,project_id);
create index video_assets_project_created_idx on public.video_assets(project_id,created_at desc);
create index video_jobs_queue_idx on public.video_jobs(status,created_at) where status='queued';
create index video_jobs_project_idx on public.video_jobs(project_id,created_at desc);
create index video_edits_project_version_idx on public.video_edits(project_id,version desc);
create index video_approvals_project_status_idx on public.video_approvals(project_id,status,created_at desc);

create or replace function private.can_access_video_project(target_project uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
  select 1 from public.video_projects p
  join public.organization_members om on om.organization_id=p.organization_id
   and om.user_id=(select auth.uid()) and om.status='active'
  where p.id=target_project and (
   om.role in ('owner','director','manager') or exists (
    select 1 from public.video_project_members pm where pm.project_id=p.id and pm.user_id=(select auth.uid())
   )
  )
 );
$$;
create or replace function private.can_manage_video_project(target_project uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
  select 1 from public.video_projects p
  join public.organization_members om on om.organization_id=p.organization_id
   and om.user_id=(select auth.uid()) and om.status='active'
  where p.id=target_project and (
   om.role in ('owner','director','manager') or exists (
    select 1 from public.video_project_members pm where pm.project_id=p.id
     and pm.user_id=(select auth.uid()) and pm.access_role in ('editor','producer')
   )
  )
 );
$$;
revoke all on function private.can_access_video_project(uuid) from public;
revoke all on function private.can_manage_video_project(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_access_video_project(uuid) to authenticated;
grant execute on function private.can_manage_video_project(uuid) to authenticated;

alter table public.video_projects enable row level security;
alter table public.video_project_members enable row level security;
alter table public.video_assets enable row level security;
alter table public.video_edits enable row level security;
alter table public.video_jobs enable row level security;
alter table public.video_approvals enable row level security;

create policy video_projects_read on public.video_projects for select to authenticated using (private.can_access_video_project(id));
create policy video_projects_create on public.video_projects for insert to authenticated with check (created_by=(select auth.uid()) and private.has_org_role(organization_id,array['owner','director','manager']));
create policy video_projects_update on public.video_projects for update to authenticated using (private.can_manage_video_project(id)) with check (private.can_manage_video_project(id));
create policy video_project_members_read on public.video_project_members for select to authenticated using (private.can_access_video_project(project_id));
create policy video_project_members_manage on public.video_project_members for all to authenticated using (private.has_org_role(organization_id,array['owner','director','manager'])) with check (private.has_org_role(organization_id,array['owner','director','manager']));
create policy video_assets_read on public.video_assets for select to authenticated using (private.can_access_video_project(project_id));
create policy video_assets_add on public.video_assets for insert to authenticated with check (created_by=(select auth.uid()) and private.can_access_video_project(project_id));
create policy video_assets_manage on public.video_assets for update to authenticated using (private.can_manage_video_project(project_id)) with check (private.can_manage_video_project(project_id));
create policy video_assets_delete on public.video_assets for delete to authenticated using (private.can_manage_video_project(project_id));
create policy video_edits_read on public.video_edits for select to authenticated using (private.can_access_video_project(project_id));
create policy video_edits_create on public.video_edits for insert to authenticated with check (created_by=(select auth.uid()) and private.can_manage_video_project(project_id));
create policy video_edits_update on public.video_edits for update to authenticated using (private.can_manage_video_project(project_id)) with check (private.can_manage_video_project(project_id));
create policy video_jobs_read on public.video_jobs for select to authenticated using (private.can_access_video_project(project_id));
create policy video_jobs_request on public.video_jobs for insert to authenticated with check (created_by=(select auth.uid()) and private.can_manage_video_project(project_id));
create policy video_approvals_read on public.video_approvals for select to authenticated using (private.can_access_video_project(project_id));
create policy video_approvals_request on public.video_approvals for insert to authenticated with check (requested_by=(select auth.uid()) and private.can_access_video_project(project_id));
create policy video_approvals_decide on public.video_approvals for update to authenticated using (private.can_access_video_project(project_id)) with check (private.can_access_video_project(project_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('09-video-ai','09-video-ai',false,2147483648,array['video/mp4','video/quicktime','video/webm','video/x-matroska','audio/mpeg','audio/wav','audio/mp4','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy video_storage_read on storage.objects for select to authenticated using (
 bucket_id='09-video-ai' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 and private.can_access_video_project(((storage.foldername(name))[1])::uuid)
);
create policy video_storage_insert on storage.objects for insert to authenticated with check (
 bucket_id='09-video-ai' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 and private.can_access_video_project(((storage.foldername(name))[1])::uuid)
);
create policy video_storage_delete on storage.objects for delete to authenticated using (
 bucket_id='09-video-ai' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 and private.can_manage_video_project(((storage.foldername(name))[1])::uuid)
);