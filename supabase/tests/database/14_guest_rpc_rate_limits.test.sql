begin;
create extension if not exists pgtap;
select plan(8);

create temp table rpc_rate_fixture (token text, guest_id uuid);
with event as (
  insert into public.events (title, slug, date, couple, venue, status)
  values ('Rate limit test', 'rate-limit-test', now() + interval '30 days', 'Test Couple', 'Test Venue', 'active')
  returning id
), guest as (
  insert into public.guests (event_id, name, party_size)
  select id, 'Test Guest', 1 from event returning id, rsvp_token
)
insert into rpc_rate_fixture select rsvp_token, id from guest;
grant select on rpc_rate_fixture to anon;

-- Pre-fill counters one below the limit; the calls themselves run as anon.
insert into public.rate_limits (key, count, reset_at)
select 'rpc:' || fn || ':' || md5(token), lim - 1, now() + interval '1 minute'
from rpc_rate_fixture cross join (values
  ('get_invitation', 40), ('get_check_in_code', 40), ('submit_rsvp', 10)
) limits(fn, lim);

set local role anon;
select isnt(public.get_invitation((select token from rpc_rate_fixture)), null::jsonb, 'last permitted invitation lookup succeeds');
select is(public.get_invitation((select token from rpc_rate_fixture)), null::jsonb, 'direct anonymous invitation lookup is throttled');
select is(public.submit_rsvp((select token from rpc_rate_fixture), 'accepted', 1)->>'ok', 'true', 'last permitted RSVP succeeds');
select isnt(public.get_check_in_code((select token from rpc_rate_fixture)), null::text, 'last permitted check-in-code lookup succeeds');
select is(public.get_check_in_code((select token from rpc_rate_fixture)), null::text, 'direct anonymous code lookup is throttled');
select is(public.submit_rsvp((select token from rpc_rate_fixture), 'declined', 0)->>'rate_limited', 'true', 'direct anonymous RSVP mutation is throttled');
reset role;
select is((select status::text from public.rsvps where guest_id = (select guest_id from rpc_rate_fixture)), 'accepted', 'throttled RSVP does not modify attendance');
select is((select count from public.rate_limits where key = 'rpc:submit_rsvp:' || md5((select token from rpc_rate_fixture))), 11, 'throttled counter persists without an exception rollback');
select * from finish();
rollback;
