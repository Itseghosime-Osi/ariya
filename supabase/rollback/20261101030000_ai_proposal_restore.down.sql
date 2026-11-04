-- Rollback for 20261101030000_ai_proposal_restore.sql
--
-- Only the one function this migration added. Any `restoredAt` marker already written into an
-- applied proposal's result stays where it is: the column is untouched, so the record that a host
-- undid a change is not lost, it is merely no longer writable.

begin;

drop function if exists public.restore_ai_proposal_result(uuid, jsonb);

commit;
