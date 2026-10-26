-- Àríyá Seed Data
-- Mirrors demo.js & FINAL 01-06 specifications

-- 1. Insert Event
insert into public.events (
  id, title, couple, date, venue, area, dress_code, slug, status, registry_code, rsvp_by, paid_at
) values (
  '00000000-0000-0000-0000-000000000001',
  'Chidinma & Tunde''s Nuptials',
  'Chidinma & Tunde',
  '2026-12-12 14:00:00+01',
  'The Grand Pavilion',
  'Victoria Island, Lagos',
  'Aṣọ-Ẹbí: Burgundy velvet and champagne gold',
  'chidinma-tunde-2026',
  'active',
  'LOS-2026-CT',
  '2026-11-20 23:59:59+01',
  now()
) on conflict (id) do nothing;

-- 2. Insert Tables
insert into public.tables (id, event_id, name, capacity, shape, position_x, position_y) values
  ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'Head Table (Kings & Queens)', 10, 'head', 450, 100),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Table 1 • Royal Elders', 8, 'round', 200, 260),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Table 2 • Groom''s Cohort', 8, 'round', 450, 260),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Table 3 • Bride''s Cohort', 8, 'round', 700, 260),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Table 4 • Lagos Tech Alliance', 8, 'round', 200, 420),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Table 5 • Extended Family', 8, 'round', 450, 420),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Table 6 • Diaspora Friends', 8, 'round', 700, 420),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Table 7 • Ikoyi Neighbours', 8, 'round', 200, 580),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Table 8 • Honoraries', 8, 'round', 700, 580)
on conflict (id) do nothing;

-- 3. Insert Sample Guests
insert into public.guests (
  id, event_id, name, phone, email, side, group_name, is_vip, party_size, plus_ones_allowed, rsvp_token, notes, invited_at
) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mama Ijeoma', '+2348031234500', 'ijeoma@family.ng', 'Family', 'Grandmother', true, 1, false, 'k7MamaIjeomaQx', 'Groom''s Grandmother • Front row seating', now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Dr. Folake Adeleke', '+2348031234501', 'folake@adeleke.org', 'Bride', 'Bride''s Cohort', true, 1, false, 'k7FolakeAdelekeQx', 'Chief Medical Director', now()),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Farouk Al-Hassan', '+2348031234502', 'farouk@alhassan.com', 'VIP', 'Honorary', true, 4, true, 'k7FaroukAlHassanQx', 'Party of 4 dignitaries', now()),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Adaeze Okonkwo', '+2348031234503', 'adaeze@example.com', 'Bride', 'Friends', false, 1, true, 'k7AdaezeOkonkwoQx', 'Plus one requested', now()),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Bisi Adebayo', '+2348031234504', 'bisi@example.com', 'Bride', 'Family', false, 5, false, 'k7BisiAdebayoQx', 'Aunty Bisi and children', now()),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Emeka & Ifeoma Okafor', '+2348031234505', 'okafor@example.com', 'Groom', 'Friends', false, 2, false, 'k7EmekaOkaforQx', 'Couple attendance', now()),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Femi Adeyemi', '+2348031234506', 'femi@example.com', 'Groom', 'Friends', false, 2, true, 'k7FemiAdeyemiQx', 'Bringing partner', now()),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Ngozi Eze', '+2348031234507', 'ngozi@example.com', 'Bride', 'Colleagues', false, 2, false, 'k7NgoziEzeQx', null, now()),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Pastor & Mrs Adeola', '+2348031234508', 'pastor@church.ng', 'VIP', 'Ministers', true, 2, false, 'k7PastorAdeolaQx', 'Officiating minister', now())
on conflict (id) do nothing;

-- 4. Insert RSVPs
insert into public.rsvps (
  guest_id, status, attending_count, plus_one_name, dietary, note, responded_at, revision_count
) values
  ('20000000-0000-0000-0000-000000000001', 'accepted', 1, null, 'No shellfish', 'So proud of my boy Tunde!', now() - interval '2 hours', 1),
  ('20000000-0000-0000-0000-000000000002', 'accepted', 1, null, 'Strictly halal / no pork', 'Looking forward to the celebration!', now() - interval '5 hours', 1),
  ('20000000-0000-0000-0000-000000000003', 'pending', 0, null, null, null, null, 0),
  ('20000000-0000-0000-0000-000000000004', 'pending', 0, null, null, null, null, 0),
  ('20000000-0000-0000-0000-000000000005', 'accepted', 5, null, 'Standard Nigerian banquet', 'The whole family is coming from Ibadan', now() - interval '1 day', 1),
  ('20000000-0000-0000-0000-000000000006', 'accepted', 2, null, null, null, now() - interval '3 days', 1),
  ('20000000-0000-0000-0000-000000000007', 'accepted', 2, 'Kikelomo Adeyemi', 'Vegetarian for plus one', null, now() - interval '2 days', 1),
  ('20000000-0000-0000-0000-000000000008', 'accepted', 2, null, null, null, now() - interval '4 days', 1),
  ('20000000-0000-0000-0000-000000000009', 'accepted', 2, null, null, 'God bless this union.', now() - interval '6 days', 1)
on conflict (guest_id) do nothing;

-- 5. Insert Seat Assignments
insert into public.seat_assignments (guest_id, table_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'), -- Mama Ijeoma -> Table 1
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008'), -- Dr Folake -> Table 8
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003'), -- Bisi -> Table 3
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005'), -- Okafor -> Table 5
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002'), -- Femi -> Table 2
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000007'), -- Ngozi -> Table 7
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000000')  -- Pastor -> Head Table
on conflict (guest_id) do nothing;

-- 6. Insert Vendors & Tasks
insert into public.vendors (
  id, event_id, name, category, contact_name, contact_phone, contact_email, cost_kobo, deposit_kobo, status
) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Mama Put Royal Banqueting', 'Catering', 'Chef Ngozi', '+2348021112233', 'catering@mamaput.ng', 450000000, 250000000, 'confirmed'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Gele by Titi & Aṣọ-Ẹbí Hub', 'Aṣọ-Ẹbí', 'Titi Adebisi', '+2348032223344', 'titi@gelebytiti.ng', 180000000, 180000000, 'confirmed'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Grand Pavilion Operations Team', 'Venue', 'Mr. Babalola', '+2348053334455', 'events@grandpavilion.ng', 800000000, 500000000, 'contracted'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'DJ Kaycee Sound Rigging', 'Music & Sound', 'Kayode Cole', '+2348074445566', 'kaycee@deejay.ng', 120000000, 60000000, 'confirmed'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Lens & Light Visuals Studio', 'Photography', 'Femi Lens', '+2348085556677', 'femi@lenslight.ng', 300000000, 200000000, 'confirmed')
on conflict (id) do nothing;

insert into public.vendor_tasks (vendor_id, event_id, task, due_date, is_done) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Confirm final plate count & dietary requests', '2026-11-28', false),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Collect gele measurements for bridal train', '2026-11-15', true),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Send finalized table chart for floor layout', '2026-12-05', false),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Share entrance fanfare and couple processional songs', '2026-11-30', false)
on conflict do nothing;
