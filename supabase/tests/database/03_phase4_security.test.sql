begin;
select plan(12);

-- Setup test data
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'owner1@example.com')
on conflict (id) do nothing;

insert into public.events (id, title, couple, date, venue, slug, status, is_public)
values (
  'e0000000-0000-0000-0000-000000000001',
  'Private Royal Nuptials',
  'Bride & Groom',
  now() + interval '30 days',
  'Grand Pavilion',
  'private-royal-nuptials',
  'active',
  false
) on conflict (id) do nothing;

insert into public.event_members (event_id, user_id, role)
values ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner')
on conflict (event_id, user_id) do nothing;

insert into public.guests (id, event_id, name, email, rsvp_token, party_size)
values
  ('d0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Guest With Email', 'existing@example.com', 'token_guest_with_email', 1),
  ('d0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Guest No Email', null, 'token_guest_no_email', 1)
on conflict (id) do nothing;

update public.guests set rsvp_token = 'token_guest_with_email' where id = 'd0000000-0000-0000-0000-000000000001';
update public.guests set rsvp_token = 'token_guest_no_email' where id = 'd0000000-0000-0000-0000-000000000002';

-- TEST 1: submit_rsvp CANNOT overwrite an existing email on file
select is(
  (public.submit_rsvp('token_guest_with_email', 'accepted', 1, null, null, null, 'attempted_hack@example.com')->'email_delivery'->>'target_email'),
  'existing@example.com',
  'submit_rsvp ignores contact email when email is already on file'
);

select is(
  (select email from public.guests where id = 'd0000000-0000-0000-0000-000000000001'),
  'existing@example.com',
  'guests.email remains un-overwritten after public submit_rsvp submission'
);

select is(
  (public.submit_rsvp('token_guest_with_email', 'accepted', 1, null, null, null, 'attempted_hack@example.com')->'email_delivery'->>'was_on_file')::boolean,
  true,
  'email_delivery was_on_file is true for guest with email on file'
);

-- TEST 2: submit_rsvp fills email when currently null
select is(
  (public.submit_rsvp('token_guest_no_email', 'accepted', 1, null, null, null, 'firstfill@example.com')->'email_delivery'->>'target_email'),
  'firstfill@example.com',
  'submit_rsvp fills null email with provided contact email'
);

select is(
  (select email from public.guests where id = 'd0000000-0000-0000-0000-000000000002'),
  'firstfill@example.com',
  'guests.email stores newly supplied contact email'
);

select is(
  (public.submit_rsvp('token_guest_no_email', 'accepted', 1, null, null, null, 'newone@example.com')->'email_delivery'->>'was_on_file')::boolean,
  false,
  'was_on_file is false during the fill session'
);

-- TEST 3: Email 24h cap: if not originally on file, capped after 1 sent email in email_log
insert into public.email_log (event_id, guest_id, recipient_email, template_type, subject, status, sent_at)
values ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'firstfill@example.com', 'accepted', 'Pass', 'sent', now() - interval '2 hours');

select is(
  (public.submit_rsvp('token_guest_no_email', 'accepted', 1, null, null, null, 'firstfill@example.com')->'email_delivery'->>'can_send')::boolean,
  false,
  'submit_rsvp rejects repeated email sends within 24 hours for newly collected address'
);

-- TEST 4: get_public_event returns null when is_public is false
select is(
  public.get_public_event('private-royal-nuptials'),
  null,
  'get_public_event returns null when is_public is false'
);

-- TEST 5: get_public_event returns public details when is_public is true
update public.events set is_public = true where id = 'e0000000-0000-0000-0000-000000000001';

select is(
  (public.get_public_event('private-royal-nuptials')->>'title'),
  'Private Royal Nuptials',
  'get_public_event returns event details when is_public is true'
);

-- TEST 6: hit_rate_limit allows requests within limit
select is(
  (public.hit_rate_limit('test_rate_key_1', 3, interval '1 minute')->>'allowed')::boolean,
  true,
  'hit_rate_limit allows first request'
);

-- TEST 7: hit_rate_limit blocks requests exceeding limit
select public.hit_rate_limit('test_rate_key_1', 3, interval '1 minute');
select public.hit_rate_limit('test_rate_key_1', 3, interval '1 minute');

select is(
  (public.hit_rate_limit('test_rate_key_1', 3, interval '1 minute')->>'allowed')::boolean,
  false,
  'hit_rate_limit blocks requests exceeding limit'
);

-- TEST 8: rate_limits table direct access revoked from anon
set local role anon;
select throws_ok(
  'select * from public.rate_limits',
  '42501',
  NULL,
  'Anon cannot directly select from rate_limits table'
);

select * from finish();
rollback;
