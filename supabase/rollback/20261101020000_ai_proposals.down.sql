-- Rollback for 20261101020000_ai_proposals.sql
--
-- This drops ai_proposals and its data. Export proposals first if a host has decisions in flight.
-- It also removes the ai_activity_log.note column, so those short reasons are lost; the log rows
-- themselves stay, except for the 'denied' ones the older constraint cannot hold.

begin;

-- 1. The trigger and the functions it depends on
drop trigger if exists tr_ai_proposals_quota on public.ai_proposals;
drop function if exists public.charge_proposal_quota();
drop function if exists public.record_ai_proposal_result(uuid, text, jsonb);
drop function if exists public.decide_ai_proposal(uuid, text);

-- 2. Policies, before the table that carries them
drop policy if exists "ai_proposals_select_own" on public.ai_proposals;
drop policy if exists "ai_proposals_insert_app_token" on public.ai_proposals;

-- 3. The table and its indexes
drop table if exists public.ai_proposals;

-- 4. The activity log returns to its two outcomes
alter table public.ai_activity_log
  drop constraint if exists ai_activity_log_outcome_check;
delete from public.ai_activity_log where outcome = 'denied';
alter table public.ai_activity_log
  add constraint ai_activity_log_outcome_check
  check (outcome in ('ok', 'error'));
alter table public.ai_activity_log
  drop column if exists note;

commit;
