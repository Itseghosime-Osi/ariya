-- What the Celebration Pass unlocks, enforced where every client meets it: the database.
--
-- A celebration has the pass once `events.paid_at` is set (a Paystack payment or a complimentary
-- pass from the admin desk). Without it:
--   * the door check-in desk records no new check-ins (check_ins inserts are refused);
--   * no new team invitations can be sent (event_invites inserts are refused). People already on
--     the team keep their place;
--   * a connected AI app cannot reach the celebration at all (ai_connection_event_allowed, which
--     every read and write policy already consults for app tokens, now also asks for the pass).
-- Guest-list import, the 3D hall and the print exports are checked in the app's server actions
-- and screens. Everything already recorded stays as it is.

create or replace function public.event_has_pass(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events where id = p_event_id and paid_at is not null
  );
$$;
revoke execute on function public.event_has_pass(uuid) from public, anon;
grant execute on function public.event_has_pass(uuid) to authenticated, service_role;

-- Raised with a stable hint, so the app can say "this needs the Celebration Pass" in plain words.
create or replace function public.require_celebration_pass()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.event_has_pass(new.event_id) then
    raise exception 'This needs the Celebration Pass for this celebration.'
      using errcode = 'P0001', hint = 'PASS_REQUIRED';
  end if;
  return new;
end;
$$;
revoke execute on function public.require_celebration_pass() from public, anon, authenticated;

drop trigger if exists check_ins_require_pass on public.check_ins;
create trigger check_ins_require_pass
  before insert on public.check_ins
  for each row execute function public.require_celebration_pass();

drop trigger if exists event_invites_require_pass on public.event_invites;
create trigger event_invites_require_pass
  before insert on public.event_invites
  for each row execute function public.require_celebration_pass();

-- Connected AI apps: the same scope check as before, plus the pass. First-party sessions are
-- untouched (the CASE returns true before anything else is read).
create or replace function public.ai_connection_event_allowed(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.is_app_token() then true
    else public.event_has_pass(p_event_id)
      and coalesce(
        (
          select s.event_ids is null or p_event_id = any (s.event_ids)
          from public.ai_connection_settings s
          where s.user_id = (select auth.uid())
            and s.client_id = public.current_app_client_id()
        ),
        true
      )
  end;
$$;
revoke execute on function public.ai_connection_event_allowed(uuid) from public, anon;
grant execute on function public.ai_connection_event_allowed(uuid) to authenticated;
