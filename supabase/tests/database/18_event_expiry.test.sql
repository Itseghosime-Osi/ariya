begin;
create extension if not exists pgtap;

select plan(24);

select ok(public.event_is_expired(now() - interval '2 days'), 'a date two days ago is expired');
select ok(not public.event_is_expired(now() + interval '2 days'), 'a future date is not expired');
select ok(not public.event_is_expired(now()), 'the event day itself is not expired');
select ok(not public.event_is_expired(null), 'no date is never expired');

-- Fixture: one expired and one live event, each with a guest.
create temp table ex (past_id uuid, live_id uuid, past_guest uuid, live_guest uuid);
do $$
declare
  v_past uuid := gen_random_uuid();
  v_live uuid := gen_random_uuid();
  v_pg uuid := gen_random_uuid();
  v_lg uuid := gen_random_uuid();
begin
  insert into public.events (id, title, couple, date, venue, slug, is_public)
  values
    (v_past, 'Old Owambe', 'Old & Couple', now() + interval '3 days', 'Hall', 'expiry-past', true),
    (v_live, 'New Owambe', 'New & Couple', now() + interval '30 days', 'Hall', 'expiry-live', true);
  insert into public.guests (id, event_id, name, rsvp_token, check_in_code)
  values
    (v_pg, v_past, 'Old Guest', 'expiry-tok-past', 'EXPA'),
    (v_lg, v_live, 'Live Guest', 'expiry-tok-live', 'EXPB');
  insert into public.vendors (id, event_id, name, category, cost_kobo, deposit_kobo)
  values ('00000000-0000-0000-0000-0000000000a1', v_past, 'Old Caterer', 'Catering', 100000, 20000);
  insert into public.vendor_tasks (id, vendor_id, event_id, task)
  values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', v_past, 'Final tasting');
  -- The event ends: back-date it once its guest exists (a live event may be moved freely).
  update public.events set date = now() - interval '3 days' where id = v_past;
  insert into ex values (v_past, v_live, v_pg, v_lg);
end $$;

select throws_ok(
  $$ update public.events set date = now() + interval '90 days' where id = (select past_id from ex) $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'an expired event cannot be given a new date'
);
select throws_ok(
  $$ update public.events set title = 'Reused' where id = (select past_id from ex) $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'an expired event cannot be renamed'
);
select throws_ok(
  $$ update public.events set is_public = false where id = (select past_id from ex) $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'an expired event cannot change its visibility'
);
select lives_ok(
  $$ update public.events set paid_at = now() where id = (select past_id from ex) $$,
  'payment bookkeeping may still be recorded on an expired event'
);
select lives_ok(
  $$ update public.events set title = 'Renamed' where id = (select live_id from ex) $$,
  'a live event stays editable'
);
select throws_ok(
  $$ insert into public.guests (event_id, name, rsvp_token, check_in_code)
     values ((select past_id from ex), 'Late', 'expiry-late', 'EXPC') $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'guests cannot be added to an expired event'
);
select throws_ok(
  $$ insert into public.rsvps (guest_id, status, attending_count)
     values ((select past_guest from ex), 'accepted', 1) $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'replies cannot be recorded for an expired event'
);
select lives_ok(
  $$ insert into public.guests (event_id, name, rsvp_token, check_in_code)
     values ((select live_id from ex), 'Fine', 'expiry-fine', 'EXPD') $$,
  'guests can still be added to a live event'
);

select is(
  (public.get_public_event('expiry-past') ->> 'expired')::boolean,
  true,
  'the public page of an expired event reports it has ended'
);
select ok(
  (public.get_public_event('expiry-past') ->> 'venue') is null,
  'and gives away none of its details'
);

select lives_ok(
  $$ update public.events set status = 'archived' where id = (select past_id from ex) $$,
  'an ended event can still be archived'
);
select lives_ok(
  $$ update public.events set status = 'active' where id = (select past_id from ex) $$,
  'and restored'
);
select lives_ok(
  $$ update public.vendors set deposit_kobo = 50000 where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'a payment can still be recorded against a vendor of an ended event'
);
select throws_ok(
  $$ update public.vendors set deposit_kobo = 999999 where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'but never past the contract'
);
select throws_ok(
  $$ update public.vendors set cost_kobo = 1 where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'the contract itself is frozen'
);
select throws_ok(
  $$ insert into public.vendors (event_id, name, category) values ((select past_id from ex), 'New', 'Music') $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'no vendor can be added'
);
select lives_ok(
  $$ update public.vendor_tasks set is_done = true where id = '00000000-0000-0000-0000-0000000000b1' $$,
  'a deliverable can still be ticked'
);
select throws_ok(
  $$ update public.vendor_tasks set task = 'Something else' where id = '00000000-0000-0000-0000-0000000000b1' $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'but not reworded'
);
select throws_ok(
  $$ delete from public.vendor_tasks where id = '00000000-0000-0000-0000-0000000000b1' $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'and not removed'
);

select lives_ok(
  $$ delete from public.events where id = (select past_id from ex) $$,
  'an expired event can still be deleted, with everything in it'
);

select * from finish();
rollback;
