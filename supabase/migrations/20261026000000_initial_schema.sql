-- Àríyá Database Schema & RLS Policies
-- PostgreSQL Migration for Supabase

-- Extensions
create extension if not exists "uuid-ossp";

-- Profiles table (synced with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Events table
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  couple text not null,
  date timestamptz not null,
  venue text not null,
  area text,
  dress_code text,
  slug text unique not null,
  status text not null check (status in ('draft', 'active', 'archived')) default 'active',
  registry_code text,
  rsvp_by timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Event Members table
create table if not exists public.event_members (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'planner', 'couple', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- Tables (Banquet Seating)
create table if not exists public.tables (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  capacity integer not null check (capacity > 0),
  shape text not null default 'round' check (shape in ('round', 'rectangular', 'oval', 'head')),
  position_x integer not null default 0,
  position_y integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Guests table
create table if not exists public.guests (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  side text default 'Bride' check (side in ('Bride', 'Groom', 'Family', 'VIP', 'Planner', 'Imported')),
  group_name text,
  is_vip boolean not null default false,
  party_size integer not null default 1 check (party_size between 1 and 20),
  plus_ones_allowed boolean not null default false,
  rsvp_token text not null unique,
  notes text,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RSVPs table
create table if not exists public.rsvps (
  id uuid primary key default uuid_generate_v4(),
  guest_id uuid not null references public.guests(id) on delete cascade unique,
  status text not null check (status in ('pending', 'accepted', 'declined')) default 'pending',
  attending_count integer not null default 0 check (attending_count >= 0),
  plus_one_name text,
  dietary text,
  note text,
  revision_count integer not null default 0,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seat Assignments table
create table if not exists public.seat_assignments (
  id uuid primary key default uuid_generate_v4(),
  guest_id uuid not null references public.guests(id) on delete cascade unique,
  table_id uuid not null references public.tables(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vendors table
create table if not exists public.vendors (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  category text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  cost_kobo bigint not null default 0,
  deposit_kobo bigint not null default 0,
  status text not null check (status in ('draft', 'contracted', 'confirmed', 'completed')) default 'contracted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vendor Tasks table
create table if not exists public.vendor_tasks (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  task text not null,
  due_date date,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reminders & Email Log table
create table if not exists public.email_log (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  template_type text not null,
  provider_id text,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Payments & Invoices table
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  paystack_reference text not null unique,
  amount_kobo bigint not null,
  status text not null check (status in ('pending', 'success', 'failed', 'refunded')) default 'pending',
  channel text,
  paid_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invoices table
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references public.payments(id) on delete set null,
  event_id uuid not null references public.events(id) on delete cascade,
  invoice_number text not null unique,
  amount_kobo bigint not null,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  status text not null check (status in ('draft', 'issued', 'paid', 'void')) default 'issued',
  created_at timestamptz not null default now()
);

-- Check-ins table
create table if not exists public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  staff_id uuid references public.profiles(id) on delete set null,
  checked_in_count integer not null default 1,
  checked_in_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- Capacity enforcement function and trigger for seating
create or replace function public.check_table_capacity()
returns trigger as $$
declare
  v_capacity int;
  v_used int;
  v_guest_party int;
begin
  select capacity into v_capacity from public.tables where id = new.table_id;
  
  -- Calculate seats currently used at this table excluding this guest
  select coalesce(sum(r.attending_count), 0) into v_used
  from public.seat_assignments sa
  join public.guests g on g.id = sa.guest_id
  join public.rsvps r on r.guest_id = g.id
  where sa.table_id = new.table_id and sa.guest_id <> new.guest_id and r.status = 'accepted';

  -- Get party size of the guest being seated
  select coalesce(r.attending_count, g.party_size) into v_guest_party
  from public.guests g
  left join public.rsvps r on r.guest_id = g.id
  where g.id = new.guest_id;

  if (v_used + v_guest_party) > v_capacity then
    raise exception 'Table capacity exceeded. Available: %, required: %', (v_capacity - v_used), v_guest_party;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger tr_check_table_capacity
before insert or update on public.seat_assignments
for each row execute function public.check_table_capacity();

-- Automatically create profile when a user signs up via auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Automatically make creator the owner member of an event
create or replace function public.handle_new_event()
returns trigger as $$
begin
  if auth.uid() is not null then
    insert into public.event_members (event_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict (event_id, user_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger tr_on_event_created
after insert on public.events
for each row execute function public.handle_new_event();

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.tables enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.seat_assignments enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_tasks enable row level security;
alter table public.email_log enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.check_ins enable row level security;

-- Profiles: user can read/write their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Helper function to check event membership
create or replace function public.is_event_member(p_event_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.event_members
    where event_id = p_event_id and user_id = p_user_id
  );
$$ language sql security definer;

-- Events policies
create policy "Members can view their events" on public.events
  for select using (public.is_event_member(id, auth.uid()));

create policy "Users can insert events" on public.events
  for insert with check (auth.uid() is not null);

create policy "Owners and planners can update events" on public.events
  for update using (
    exists (
      select 1 from public.event_members
      where event_id = id and user_id = auth.uid() and role in ('owner', 'planner')
    )
  );

-- Event Members policies
create policy "Members can view member list" on public.event_members
  for select using (public.is_event_member(event_id, auth.uid()));

create policy "Owners and planners can manage members" on public.event_members
  for all using (
    exists (
      select 1 from public.event_members em
      where em.event_id = event_members.event_id and em.user_id = auth.uid() and em.role in ('owner', 'planner')
    )
  );

create policy "Users can join as owner on event creation" on public.event_members
  for insert with check (auth.uid() = user_id);

-- Tables policies
create policy "Members can view tables" on public.tables
  for select using (public.is_event_member(event_id, auth.uid()));

create policy "Planners can manage tables" on public.tables
  for all using (
    exists (
      select 1 from public.event_members
      where event_id = tables.event_id and user_id = auth.uid() and role in ('owner', 'planner')
    )
  );

-- Guests policies
create policy "Members can view guests" on public.guests
  for select using (public.is_event_member(event_id, auth.uid()));

create policy "Planners can manage guests" on public.guests
  for all using (
    exists (
      select 1 from public.event_members
      where event_id = guests.event_id and user_id = auth.uid() and role in ('owner', 'planner')
    )
  );

-- RSVPs policies
create policy "Members can view RSVPs" on public.rsvps
  for select using (
    exists (
      select 1 from public.guests g
      where g.id = rsvps.guest_id and public.is_event_member(g.event_id, auth.uid())
    )
  );

create policy "Planners can manage RSVPs" on public.rsvps
  for all using (
    exists (
      select 1 from public.guests g
      where g.id = rsvps.guest_id and exists (
        select 1 from public.event_members em
        where em.event_id = g.event_id and em.user_id = auth.uid() and em.role in ('owner', 'planner')
      )
    )
  );

-- Seat Assignments policies
create policy "Members can view seat assignments" on public.seat_assignments
  for select using (
    exists (
      select 1 from public.guests g
      where g.id = seat_assignments.guest_id and public.is_event_member(g.event_id, auth.uid())
    )
  );

create policy "Planners can manage seat assignments" on public.seat_assignments
  for all using (
    exists (
      select 1 from public.guests g
      where g.id = seat_assignments.guest_id and exists (
        select 1 from public.event_members em
        where em.event_id = g.event_id and em.user_id = auth.uid() and em.role in ('owner', 'planner')
      )
    )
  );

-- Vendors policies
create policy "Members can view vendors" on public.vendors
  for select using (public.is_event_member(event_id, auth.uid()));

create policy "Planners can manage vendors" on public.vendors
  for all using (
    exists (
      select 1 from public.event_members
      where event_id = vendors.event_id and user_id = auth.uid() and role in ('owner', 'planner')
    )
  );

-- Check-ins policies
create policy "Members can view check-ins" on public.check_ins
  for select using (public.is_event_member(event_id, auth.uid()));

create policy "Staff can insert check-ins" on public.check_ins
  for insert with check (
    public.is_event_member(event_id, auth.uid())
  );

-- Payments & Invoices policies
create policy "Members can view payments" on public.payments
  for select using (public.is_event_member(event_id, auth.uid()));

create policy "Members can view invoices" on public.invoices
  for select using (public.is_event_member(event_id, auth.uid()));

-- Guest Definer RPC: Guests look up their invitation securely by token
create or replace function public.get_invitation(p_token text)
returns jsonb as $$
declare
  v_guest record;
  v_event record;
  v_rsvp record;
  v_table record;
begin
  select * into v_guest from public.guests where rsvp_token = p_token;
  if not found then
    return null;
  end if;

  select * into v_event from public.events where id = v_guest.event_id;
  select * into v_rsvp from public.rsvps where guest_id = v_guest.id;
  
  select t.* into v_table
  from public.seat_assignments sa
  join public.tables t on t.id = sa.table_id
  where sa.guest_id = v_guest.id;

  return jsonb_build_object(
    'guest', row_to_json(v_guest),
    'event', row_to_json(v_event),
    'rsvp', row_to_json(v_rsvp),
    'table', row_to_json(v_table)
  );
end;
$$ language plpgsql security definer;

-- Guest Definer RPC: Guests submit RSVP response securely
create or replace function public.submit_rsvp(
  p_token text,
  p_status text,
  p_attending_count integer,
  p_plus_one_name text default null,
  p_dietary text default null,
  p_note text default null
)
returns jsonb as $$
declare
  v_guest record;
  v_rsvp record;
begin
  select * into v_guest from public.guests where rsvp_token = p_token;
  if not found then
    raise exception 'Invalid invitation token';
  end if;

  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid status';
  end if;

  insert into public.rsvps (
    guest_id, status, attending_count, plus_one_name, dietary, note, responded_at, revision_count
  )
  values (
    v_guest.id,
    p_status,
    case when p_status = 'accepted' then p_attending_count else 0 end,
    p_plus_one_name,
    p_dietary,
    p_note,
    now(),
    1
  )
  on conflict (guest_id) do update set
    status = excluded.status,
    attending_count = excluded.attending_count,
    plus_one_name = excluded.plus_one_name,
    dietary = excluded.dietary,
    note = excluded.note,
    revision_count = rsvps.revision_count + 1,
    responded_at = now(),
    updated_at = now()
  returning * into v_rsvp;

  -- If guest declined, automatically unassign any seating
  if p_status = 'declined' then
    delete from public.seat_assignments where guest_id = v_guest.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'rsvp', row_to_json(v_rsvp)
  );
end;
$$ language plpgsql security definer;
