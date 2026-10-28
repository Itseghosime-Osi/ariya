-- Migration: Event Covers Storage Bucket & Access Control Policies
-- Timestamp: 20261027180000

-- 1. Create public 'event-covers' bucket if not exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage Policies on storage.objects for event-covers bucket

-- Allow public read of cover images
drop policy if exists "Public can read event-covers" on storage.objects;
create policy "Public can read event-covers"
  on storage.objects for select
  using (bucket_id = 'event-covers');

-- Allow authenticated event members to upload cover images
-- Path convention: <event_id>/<filename>
drop policy if exists "Event members can upload event-covers" on storage.objects;
create policy "Event members can upload event-covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_event_member(((storage.foldername(name))[1])::uuid)
        else false
      end
    )
  );

-- Allow authenticated event members to update cover images
drop policy if exists "Event members can update event-covers" on storage.objects;
create policy "Event members can update event-covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_event_member(((storage.foldername(name))[1])::uuid)
        else false
      end
    )
  )
  with check (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_event_member(((storage.foldername(name))[1])::uuid)
        else false
      end
    )
  );

-- Allow authenticated event members to delete cover images
drop policy if exists "Event members can delete event-covers" on storage.objects;
create policy "Event members can delete event-covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-covers'
    and (
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_event_member(((storage.foldername(name))[1])::uuid)
        else false
      end
    )
  );
