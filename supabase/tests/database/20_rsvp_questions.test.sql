begin;
create extension if not exists pgtap;

select plan(11);

select has_column('public', 'events', 'rsvp_questions', 'events has rsvp_questions');
select col_default_is('public', 'events', 'require_access_card', 'true', 'access cards are on by default');
select has_table('public', 'rsvp_answers', 'rsvp_answers exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rsvp_answers'::regclass),
  'rsvp_answers has row level security'
);

create temp table q (event_id uuid, guest_id uuid, token text, code text);
do $$
declare
  v_event uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
begin
  insert into public.events (id, title, couple, date, venue, slug, status, rsvp_questions)
  values (
    v_event, 'Q Owambe', 'Q & Couple', now() + interval '40 days', 'Hall', 'q-slug', 'active',
    '[{"id":"q1","label":"Jollof or fried rice?","type":"choice","options":["Jollof","Fried"],"required":true},
      {"id":"q2","label":"Song request","type":"text","required":false},
      {"id":"q3","label":"Coming by car?","type":"yesno","required":false}]'::jsonb
  );
  insert into public.guests (id, event_id, name, rsvp_token, check_in_code)
  values (v_guest, v_event, 'Chief Q Guest', (select token from q), (select code from q));
  insert into public.rsvps (guest_id, status, attending_count, responded_at)
  values (v_guest, 'accepted', 1, now());
  insert into q select v_event, v_guest, rsvp_token, check_in_code from public.guests where id = v_guest;
end $$;

select is(
  jsonb_array_length(public.get_rsvp_form((select token from q)) -> 'questions'),
  3,
  'the form returns the host questions'
);
select is(public.get_rsvp_form('nope-nope-nope'), null, 'an unknown token gets nothing');

select is(
  public.save_rsvp_answers(
    (select token from q),
    '{"q1":"Jollof","q2":"  Water no get enemy  ","q3":"Maybe","bogus":"x"}'::jsonb
  ) -> 'answers',
  '{"q1":"Jollof","q2":"Water no get enemy"}'::jsonb,
  'only valid answers to the event''s own questions are kept'
);
select is(
  public.save_rsvp_answers((select token from q), '{"q1":"Pounded yam"}'::jsonb) -> 'answers',
  '{}'::jsonb,
  'a choice outside the options is dropped, and a new save replaces the old'
);
select is(
  (select answers from public.rsvp_answers where guest_id = (select guest_id from q)),
  '{}'::jsonb,
  'the answers are stored per guest'
);

select is(public.get_check_in_code((select token from q)), (select code from q), 'an accepted guest gets an access card code');
update public.events set require_access_card = false where id = (select event_id from q);
select is(public.get_check_in_code((select token from q)), null, 'no code is issued when cards are off');

select * from finish();
rollback;
