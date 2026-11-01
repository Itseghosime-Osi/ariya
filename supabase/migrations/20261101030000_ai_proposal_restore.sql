-- Migration: Record that an applied proposal was undone (20261101030000)
--
-- 20261101020000 gave a proposal two writes: `decide_ai_proposal` (pending -> approved/rejected)
-- and `record_ai_proposal_result` (approved -> applied/failed, once). "Restore previous" happens
-- after that, when the row is already 'applied', so there was no legal way to say it had been
-- undone. This adds exactly one, and nothing else: no new table, no new column, no new kind.
--
--   * restore_ai_proposal_result() -- first-party only, 'applied' only, once only, 7 days only
--
-- The conditions live in one UPDATE, as they do in the other two functions, so two tabs, a double
-- click and a retry all resolve to exactly one winner; the loser finds no row and is refused.

create or replace function public.restore_ai_proposal_result(
  p_id uuid,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_row public.ai_proposals;
begin
  if public.is_app_token() then
    raise exception 'Connected AI apps cannot undo a change. Only you can, in Àríyá.'
      using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;

  if v_user_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  -- The caller must say when it restored, because that marker is what makes a second restore
  -- impossible. Without it the guard below could never fire.
  if p_result is null
     or jsonb_typeof(p_result) <> 'object'
     or coalesce(btrim(p_result->>'restoredAt'), '') = '' then
    raise exception 'A restore must record when it happened.'
      using errcode = '22000';
  end if;

  -- Applied, still the host's own, not already undone, and inside the 7-day window the desk
  -- offers. Every condition in the WHERE clause, so the check and the write cannot drift apart.
  update public.ai_proposals
  set result = p_result
  where id = p_id
    and user_id = v_user_id
    and status = 'applied'
    and decided_at > now() - interval '7 days'
    and coalesce(result->>'restoredAt', '') = ''
  returning * into v_row;

  if v_row.id is null then
    raise exception 'That change can no longer be restored: it was already restored, it was never applied, or it is more than 7 days old.'
      using errcode = 'P0001', hint = 'NOT_RESTORABLE';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'result', v_row.result
  );
end;
$$;

revoke execute on function public.restore_ai_proposal_result(uuid, jsonb) from public, anon;
grant execute on function public.restore_ai_proposal_result(uuid, jsonb) to authenticated;
