-- 09 VIDEO AI: internal-only access model
-- Clients never receive accounts, project membership, or access to the editor.
drop table if exists public.video_project_members cascade;

create or replace function private.can_access_video_project(target_project uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
  select 1 from public.video_projects p
  join public.organization_members om on om.organization_id=p.organization_id
   and om.user_id=(select auth.uid()) and om.status='active'
  where p.id=target_project
 );
$$;

create or replace function private.can_manage_video_project(target_project uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
  select 1 from public.video_projects p
  join public.organization_members om on om.organization_id=p.organization_id
   and om.user_id=(select auth.uid()) and om.status='active'
  where p.id=target_project
 );
$$;

revoke all on function private.can_access_video_project(uuid) from public;
revoke all on function private.can_manage_video_project(uuid) from public;
grant execute on function private.can_access_video_project(uuid) to authenticated;
grant execute on function private.can_manage_video_project(uuid) to authenticated;
