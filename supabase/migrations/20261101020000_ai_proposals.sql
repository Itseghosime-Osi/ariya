-- Migration: Proposals a connected app may raise, and a human must approve (20261101020000)
--
-- 20261101000000 confined an app token. This one gives it somewhere to put a request it cannot
-- carry out: a row in ai_proposals, visible only to the host, decidable only by the host, and
-- applied by first-party server code that re-checks everything before it sends anything.
--
--   * ai_proposals               -- propose, never perform; the human decides
--   * charge_proposal_quota()    -- 50 proposals a day per host, charged where the row appears
--   * propose_send_invitations / propose_send_reminders (tools) land here
--   * decide_ai_proposal()       -- one atomic status change, first-party only
--   * record_ai_proposal_result() -- how applying finishes, first-party only
--   * ai_activity_log            -- gains 'denied' as an outcome and a short note
--
-- An app token may only insert a pending row for itself, on a celebration it was given, when the
-- connection is not read-only. It has no UPDATE and no DELETE. Every status change goes through the
-- two security-definer RPCs below, and both of those refuse an app token outright.

-- ============================================================================
-- 1. THE TABLE
-- ============================================================================

create table if not exists public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  -- The host who owns the proposal. The app acts as them, but only they may decide.
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  -- The OAuth client that raised it, copied from the token's own claim.
  client_id text not null,
  kind text not null,
  title text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  decided_at timestamptz,

  constraint ai_proposals_kind_check check (
    kind in (
      'send_invitations',
      'send_reminders',
      'apply_hall_layout',
      'apply_seating_plan'
    )
  ),
  constraint ai_proposals_status_check check (
    status in ('pending', 'approved', 'rejected', 'expired', 'applied', 'failed')
  ),
  constraint ai_proposals_client_id_check check (btrim(client_id) <> ''),
  constraint ai_proposals_title_check check (
    length(btrim(title)) between 1 and 200
  ),
  constraint ai_proposals_summary_check check (
    length(btrim(summary)) between 1 and 2000
  ),
  -- A payload is a small JSON object, never a document of its own.
  constraint ai_proposals_payload_check check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 262144
  ),
  -- A decided row always says when, and a pending one never does.
  constraint ai_proposals_decided_check check (
    (status = 'pending' and decided_at is null)
    or (status <> 'pending' and decided_at is not null)
  )
);

-- The approvals desk reads newest first; the badge counts what is still waiting.
create index if not exists idx_ai_proposals_user_recent
  on public.ai_proposals (user_id, created_at desc);
create index if not exists idx_ai_proposals_pending
  on public.ai_proposals (user_id, expires_at)
  where status = 'pending';
create index if not exists idx_ai_proposals_event
  on public.ai_proposals (event_id);

-- The activity log learns one outcome and one short note. Both are written by the tool layer with
-- a fixed vocabulary, so nothing a guest or a model typed can reach a row here.
alter table public.ai_activity_log
  drop constraint if exists ai_activity_log_outcome_check;
alter table public.ai_activity_log
  add constraint ai_activity_log_outcome_check
  check (outcome in ('ok', 'denied', 'error'));
alter table public.ai_activity_log
  add column if not exists note text;

-- ============================================================================
-- 2. GRANTS AND ROW LEVEL SECURITY
-- ============================================================================
--
-- No UPDATE and no DELETE for anyone but the owner role: a proposal's status changes only inside
-- the security-definer RPCs in section 4, which is what makes "approved once, applied once" true.

alter table public.ai_proposals enable row level security;

revoke all on table public.ai_proposals from anon, authenticated;
grant select, insert on table public.ai_proposals to authenticated;

revoke truncate, references, trigger on table public.ai_proposals
  from authenticated, service_role;

-- The host reads their own proposals. An app token reads them too, through the same token that
-- raised them, so list_my_proposals can answer.
create policy "ai_proposals_select_own" on public.ai_proposals
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Only an app token inserts, and only as itself: no other host, no other client, no scope it was
-- not given, no read-only connection, no status other than pending.
create policy "ai_proposals_insert_app_token" on public.ai_proposals
  for insert to authenticated
  with check (
    public.is_app_token()
    and user_id = (select auth.uid())
    and client_id = public.current_app_client_id()
    and status = 'pending'
    and public.ai_connection_event_allowed(event_id)
    and not public.ai_connection_read_only()
  );

-- ============================================================================
-- 3. QUOTA AND THE PENDING CEILING
-- ============================================================================
--
-- Charged in a trigger, so a token pointed straight at PostgREST is counted exactly like one that
-- came through /mcp. Neither limit applies to a first-party session, which cannot insert here at
-- all.

create or replace function public.charge_proposal_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending integer;
begin
  if not public.is_app_token() then
    return new;
  end if;

  select count(*)::integer into v_pending
  from public.ai_proposals
  where user_id = new.user_id
    and status = 'pending'
    and expires_at > now();

  if v_pending >= 20 then
    raise exception 'You already have 20 proposals waiting for approval. Decide some in Àríyá before asking for more.'
      using errcode = 'P0001', hint = 'PENDING_LIMIT';
  end if;

  perform public.charge_app_token_quota(
    'proposals',
    1,
    50,
    'Daily limit reached: this connection can raise 50 proposals a day. Try again tomorrow.'
  );

  return new;
end;
$$;

revoke execute on function public.charge_proposal_quota() from public, anon, authenticated;

drop trigger if exists tr_ai_proposals_quota on public.ai_proposals;
create trigger tr_ai_proposals_quota
before insert on public.ai_proposals
for each row execute function public.charge_proposal_quota();

-- ============================================================================
-- 4. DECIDING AND RECORDING, BOTH FIRST-PARTY ONLY
-- ============================================================================
--
-- RLS does not apply inside a security-definer function, so each one repeats the rules: no app
-- token, owner only, pending only, unexpired only. The status change is a single UPDATE with the
-- old status in its WHERE clause, so two tabs, a double click and a retry all resolve to exactly
-- one winner; the loser finds no row and is refused.

create or replace function public.decide_ai_proposal(
  p_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_status text;
  v_existing text;
  v_row public.ai_proposals;
begin
  if public.is_app_token() then
    raise exception 'Connected AI apps cannot approve or reject proposals. Only you can, in Àríyá.'
      using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;

  if v_user_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'Decision must be approve or reject'
      using errcode = '22000';
  end if;

  -- Retire an overdue proposal first, so the status column tells the truth rather than leaving it
  -- looking decidable.
  update public.ai_proposals
  set status = 'expired',
      decided_at = now()
  where id = p_id
    and user_id = v_user_id
    and status = 'pending'
    and expires_at <= now();

  v_status := case v_decision when 'approve' then 'approved' else 'rejected' end;

  update public.ai_proposals
  set status = v_status,
      decided_at = now()
  where id = p_id
    and user_id = v_user_id
    and status = 'pending'
    and expires_at > now()
  returning * into v_row;

  if v_row.id is null then
    select status into v_existing
    from public.ai_proposals
    where id = p_id and user_id = v_user_id;

    -- Expiry is the one refusal that has to be reported as a return rather than a raise: the row
    -- was just moved to 'expired' by the statement above, and a raise would roll that back.
    if v_existing = 'expired' then
      return jsonb_build_object(
        'id', p_id,
        'status', 'expired',
        'decided', false
      );
    end if;

    raise exception 'That proposal is no longer waiting for you.'
      using errcode = 'P0001', hint = 'PROPOSAL_NOT_PENDING';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'kind', v_row.kind,
    'eventId', v_row.event_id,
    'clientId', v_row.client_id,
    'title', v_row.title,
    'summary', v_row.summary,
    'payload', v_row.payload,
    'status', v_row.status,
    'decided', true
  );
end;
$$;

create or replace function public.record_ai_proposal_result(
  p_id uuid,
  p_status text,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_row public.ai_proposals;
begin
  if public.is_app_token() then
    raise exception 'Connected AI apps cannot record what happened to a proposal.'
      using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;

  if v_user_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if v_status not in ('applied', 'failed') then
    raise exception 'Result status must be applied or failed'
      using errcode = '22000';
  end if;

  -- Only an approved proposal can be finished, and only once.
  update public.ai_proposals
  set status = v_status,
      result = coalesce(p_result, '{}'::jsonb)
  where id = p_id
    and user_id = v_user_id
    and status = 'approved'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'That proposal is not waiting to be applied.'
      using errcode = 'P0001', hint = 'PROPOSAL_NOT_APPROVED';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'result', v_row.result
  );
end;
$$;

revoke execute on function public.decide_ai_proposal(uuid, text) from public, anon;
revoke execute on function public.record_ai_proposal_result(uuid, text, jsonb) from public, anon;
grant execute on function public.decide_ai_proposal(uuid, text) to authenticated;
grant execute on function public.record_ai_proposal_result(uuid, text, jsonb) to authenticated;
