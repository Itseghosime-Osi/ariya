-- Custom RSVP questions and the optional one-time access card.
--
--   * events.rsvp_questions       the questions the host asks when a guest confirms (up to 8)
--   * events.require_access_card  true (default): an accepted guest gets a personal QR/code card that
--                                 the check-in desk scans; each seat on it admits once.
--                                 false: no card is issued and the host checks guests in by name.
--   * rsvp_answers                one row per guest: their answers to the questions
--   * get_rsvp_form(token)        the questions, the card setting and the guest's saved answers
--   * save_rsvp_answers(token, a) stores a guest's answers, keeping only valid ones
--   * get_check_in_code           issues no code when the host switched the access card off

alter table public.events
  add column if not exists rsvp_questions jsonb not null default '[]'::jsonb,
  add column if not exists require_access_card boolean not null default true;

alter table public.events drop constraint if exists events_rsvp_questions_shape;
alter table public.events
  add constraint events_rsvp_questions_shape check (
    jsonb_typeof(rsvp_questions) = 'array'
    and jsonb_array_length(rsvp_questions) <= 8
    and pg_column_size(rsvp_questions) < 8000
  );

create table if not exists public.rsvp_answers (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint rsvp_answers_shape check (
    jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 8000
  )
);

create index if not exists rsvp_answers_event_idx on public.rsvp_answers(event_id);

alter table public.rsvp_answers enable row level security;

drop policy if exists "Members can view RSVP answers" on public.rsvp_answers;
create policy "Members can view RSVP answers" on public.rsvp_answers
  for select using (public.is_event_member(event_id));

-- Answers are written only by save_rsvp_answers (security definer); nobody writes the table directly.
revoke all on public.rsvp_answers from public, anon, authenticated;
revoke truncate, references, trigger on public.rsvp_answers from service_role;
grant select on public.rsvp_answers to authenticated;
grant select, insert, update, delete on public.rsvp_answers to service_role;

-- Once the day has passed, answers can no longer change either.
drop trigger if exists tr_guard_expired_event_rows on public.rsvp_answers;
create trigger tr_guard_expired_event_rows
  before insert or update or delete on public.rsvp_answers
  for each row execute function public.guard_expired_event_rows();

-- What the invitation page needs to draw the questions.
create or replace function public.get_rsvp_form(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_event record;
  v_answers jsonb;
begin
  if nullif(trim(p_token), '') is null then
    return null;
  end if;

  select * into v_guest from public.guests where rsvp_token = trim(p_token);
  if not found then
    return null;
  end if;

  select rsvp_questions, require_access_card into v_event
  from public.events where id = v_guest.event_id;
  if not found then
    return null;
  end if;

  select a.answers into v_answers from public.rsvp_answers a where a.guest_id = v_guest.id;

  return jsonb_build_object(
    'questions', v_event.rsvp_questions,
    'require_access_card', v_event.require_access_card,
    'answers', coalesce(v_answers, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.get_rsvp_form(text) to anon, authenticated;

-- Stores a guest's answers. Only answers to the event's own questions are kept; text is trimmed and
-- capped, and a choice must be one of the options the host wrote.
create or replace function public.save_rsvp_answers(p_token text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_event record;
  v_q jsonb;
  v_id text;
  v_type text;
  v_value text;
  v_clean jsonb := '{}'::jsonb;
begin
  if nullif(trim(p_token), '') is null then
    raise exception 'Invalid invitation token'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  select * into v_guest from public.guests where rsvp_token = trim(p_token);
  if not found then
    raise exception 'Invalid invitation token'
      using errcode = 'P0001', hint = 'GUEST_NOT_FOUND';
  end if;

  if not (public.hit_rate_limit(
    'rpc:save_rsvp_answers:' || md5(trim(p_token)), 10, interval '1 minute'
  ) ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'rate_limited', true);
  end if;

  select * into v_event from public.events where id = v_guest.event_id;
  if not found then
    raise exception 'Celebration not found'
      using errcode = 'P0001', hint = 'EVENT_NOT_FOUND';
  end if;

  if v_event.status <> 'active' then
    raise exception 'This celebration is no longer accepting RSVP responses'
      using errcode = 'P0001', hint = 'RSVP_CLOSED';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be an object'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  for v_q in select * from jsonb_array_elements(v_event.rsvp_questions) loop
    v_id := v_q ->> 'id';
    v_type := v_q ->> 'type';
    v_value := nullif(substr(trim(coalesce(p_answers ->> v_id, '')), 1, 300), '');

    if v_id is null or v_value is null then
      continue;
    end if;

    if v_type = 'choice' then
      if not exists (
        select 1 from jsonb_array_elements_text(coalesce(v_q -> 'options', '[]'::jsonb)) o
        where o = v_value
      ) then
        continue;
      end if;
    elsif v_type = 'yesno' then
      if v_value not in ('Yes', 'No') then
        continue;
      end if;
    end if;

    v_clean := v_clean || jsonb_build_object(v_id, v_value);
  end loop;

  insert into public.rsvp_answers (guest_id, event_id, answers, updated_at)
  values (v_guest.id, v_guest.event_id, v_clean, now())
  on conflict (guest_id) do update set answers = excluded.answers, updated_at = now();

  return jsonb_build_object('ok', true, 'answers', v_clean);
end;
$$;

grant execute on function public.save_rsvp_answers(text, jsonb) to anon, authenticated;

-- The access card: a guest gets a code only when the host asked for cards.
create or replace function public.get_check_in_code(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_rsvp record;
  v_card boolean;
begin
  if nullif(trim(p_token), '') is null then
    return null;
  end if;

  select * into v_guest
  from public.guests
  where rsvp_token = trim(p_token);

  if not found then
    return null;
  end if;

  if not (public.hit_rate_limit(
    'rpc:get_check_in_code:' || md5(trim(p_token)), 40, interval '1 minute'
  ) ->> 'allowed')::boolean then
    return null;
  end if;

  select require_access_card into v_card from public.events where id = v_guest.event_id;
  if not coalesce(v_card, true) then
    return null;
  end if;

  select * into v_rsvp from public.rsvps where guest_id = v_guest.id;

  if not found or v_rsvp.status <> 'accepted' then
    return null;
  end if;

  return v_guest.check_in_code;
end;
$$;

grant execute on function public.get_check_in_code(text) to anon, authenticated;
