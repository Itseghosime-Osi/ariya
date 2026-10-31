-- The Team desk is useless if every collaborator reads as "Team Member".
-- Profiles were only readable by their owner, so the join in getTeamDeskData returned null for
-- everyone else. Let people see the profile of anyone they share a celebration with — and nobody
-- else. security definer keeps event_members' own RLS out of the lookup.
create or replace function public.shares_event_with(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.event_members mine
    join public.event_members theirs on theirs.event_id = mine.event_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;

revoke execute on function public.shares_event_with(uuid) from public, anon;
grant execute on function public.shares_event_with(uuid) to authenticated;

create policy "Collaborators can see each other's names"
  on public.profiles
  for select
  using (public.shares_event_with(id));
