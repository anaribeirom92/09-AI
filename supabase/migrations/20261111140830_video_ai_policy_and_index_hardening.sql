drop policy if exists video_project_members_manage on public.video_project_members;
drop policy if exists video_project_members_insert on public.video_project_members;
drop policy if exists video_project_members_update on public.video_project_members;
drop policy if exists video_project_members_delete on public.video_project_members;
create policy video_project_members_insert on public.video_project_members for insert to authenticated with check (
 private.has_org_role(organization_id,array['owner','director','manager'])
 and exists(select 1 from public.organization_members target where target.organization_id=video_project_members.organization_id and target.user_id=video_project_members.user_id and target.status='active')
);
create policy video_project_members_update on public.video_project_members for update to authenticated using (
 private.has_org_role(organization_id,array['owner','director','manager'])
) with check (
 private.has_org_role(organization_id,array['owner','director','manager'])
 and exists(select 1 from public.organization_members target where target.organization_id=video_project_members.organization_id and target.user_id=video_project_members.user_id and target.status='active')
);
create policy video_project_members_delete on public.video_project_members for delete to authenticated using (
 private.has_org_role(organization_id,array['owner','director','manager'])
);
create index if not exists video_projects_created_by_idx on public.video_projects(created_by);
create index if not exists video_project_members_org_project_idx on public.video_project_members(organization_id,project_id);
create index if not exists video_assets_org_project_idx on public.video_assets(organization_id,project_id);
create index if not exists video_assets_created_by_idx on public.video_assets(created_by);
create index if not exists video_edits_org_project_idx on public.video_edits(organization_id,project_id);
create index if not exists video_edits_created_by_idx on public.video_edits(created_by);
create index if not exists video_edits_approved_by_idx on public.video_edits(approved_by);
create index if not exists video_jobs_org_project_idx on public.video_jobs(organization_id,project_id);
create index if not exists video_jobs_created_by_idx on public.video_jobs(created_by);
create index if not exists video_approvals_org_project_idx on public.video_approvals(organization_id,project_id);
create index if not exists video_approvals_edit_id_idx on public.video_approvals(edit_id);
create index if not exists video_approvals_requested_by_idx on public.video_approvals(requested_by);
create index if not exists video_approvals_decided_by_idx on public.video_approvals(decided_by);