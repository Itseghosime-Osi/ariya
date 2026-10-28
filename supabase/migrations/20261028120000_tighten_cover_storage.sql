-- Migration: Tighten Event Cover Image Storage Policies
-- Timestamp: 20261028120000

-- 1. Drop public read policy so anonymous listing through storage API stops
drop policy if exists "Public can read event-covers" on storage.objects;

-- 2. Drop existing member-based write policies
drop policy if exists "Event members can upload event-covers" on storage.objects;
drop policy if exists "Event members can update event-covers" on storage.objects;
drop policy if exists "Event members can delete event-covers" on storage.objects;

-- Drop manager policies if they exist (for idempotency)
drop policy if exists "Event managers can select event-covers" on storage.objects;
drop policy if exists "Event managers can upload event-covers" on storage.objects;
drop policy if exists "Event managers can update event-covers" on storage.objects;
drop policy if exists "Event managers can delete event-covers" on storage.objects;

-- 3. SELECT policy for authenticated event managers (owner, planner, couple)
-- Allows upsert and remove().list() while stopping anonymous and staff listing
create policy "Event managers can select event-covers"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
        else false
      end
    )
  );

-- 4. INSERT policy for authenticated event managers (owner, planner, couple)
create policy "Event managers can upload event-covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
        else false
      end
    )
  );

-- 5. UPDATE policy for authenticated event managers (owner, planner, couple)
create policy "Event managers can update event-covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
        else false
      end
    )
  )
  with check (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
        else false
      end
    )
  );

-- 6. DELETE policy for authenticated event managers (owner, planner, couple)
create policy "Event managers can delete event-covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
        else false
      end
    )
  );

