/**
 * Àríyá Demo Celebration Seed Script
 * Generates a realistic high-society Nigerian Owambe celebration:
 * - 1 Event: Folake Adeleke & Demola Alakija
 * - Roles: Owner, Planner, Staff
 * - 7 Banquet Tables (~64 seats total)
 * - 60 Guests with realistic statuses, check-in codes, and party sizes
 * - 6 Curated High-Society Vendors with milestones & tasks
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        process.env[k.trim()] = v
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:57321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateToken(length = 24): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  const bytes = crypto.randomBytes(length);
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars[bytes[i] % chars.length];
  }
  return res;
}

function generateCheckInCode(name: string): string {
  const clean = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  const initials = (clean.slice(0, 3) || "GUE").padEnd(3, "X");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `ARY-${initials}-${rand}`;
}

async function seed() {
  console.log("🌱 Starting Àríyá demo celebration seeding...");

  // 1. Create or retrieve demo owner user
  const demoEmail = "demo@owambe.ng";
  const demoPassword = "Celebration2026!";
  let userId: string;

  const { data: listData } = await supabase.auth.admin.listUsers();
  const existingUser = listData?.users?.find((u) => u.email === demoEmail);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`✓ Using existing demo user: ${demoEmail} (${userId})`);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: "Folake Adeleke (Demo Host)" },
    });
    if (error || !created.user) {
      throw new Error(`Failed to create demo user: ${error?.message}`);
    }
    userId = created.user.id;
    console.log(`✓ Created demo user: ${demoEmail} (${userId})`);
  }

  // 2. Clear old demo events with matching slug
  const demoSlug = "folake-demola-2026";
  const { data: existingEvents } = await supabase
    .from("events")
    .select("id")
    .eq("slug", demoSlug);

  if (existingEvents && existingEvents.length > 0) {
    for (const ev of existingEvents) {
      await supabase.from("events").delete().eq("id", ev.id);
    }
    console.log(`✓ Cleared previous celebration data for '${demoSlug}'`);
  }

  // 3. Insert Celebration Event
  const eventDate = new Date(
    Date.now() + 45 * 24 * 60 * 60 * 1000
  ).toISOString();
  const rsvpDeadline = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .insert({
      title: "The Regal Nuptials of Folake Adeleke & Demola Alakija",
      couple: "Folake & Demola",
      date: eventDate,
      venue:
        "The Grand Monarch Ballroom & Imperial Pavilion, Plot 14 Water Corporation Dr",
      area: "Victoria Island, Lagos",
      dress_code:
        "Aṣọ-Ẹbí: Imperial Wine Velvet with Champagne Gold Gele and Fila",
      slug: demoSlug,
      status: "active",
      is_public: true,
      rsvp_by: rsvpDeadline,
      paid_at: new Date().toISOString(),
      registry_code: generateToken(22),
    })
    .select()
    .single();

  if (eventErr || !event) {
    throw new Error(`Failed to insert event: ${eventErr?.message}`);
  }
  const eventId = event.id;
  console.log(`✓ Created celebration suite: ${event.title} (ID: ${eventId})`);

  // 4. Attach Event Members (Owner, Planner, Couple, Staff)
  await supabase.from("event_members").insert({
    event_id: eventId,
    user_id: userId,
    role: "owner",
  });

  const collaborators = [
    { email: "bisola@owambe.ng", fullName: "Bisola Bankole", role: "planner" },
    { email: "demola@owambe.ng", fullName: "Demola Alakija", role: "couple" },
    { email: "tolu@owambe.ng", fullName: "Tolu Adeyemi", role: "staff" },
  ];

  for (const person of collaborators) {
    const { data: created, error: userError } =
      await supabase.auth.admin.createUser({
        email: person.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: person.fullName },
      });

    if (userError || !created?.user) {
      console.error(
        `[seed-demo] Collaborator "${person.email}" failed:`,
        userError
      );
      continue;
    }

    const { error: memberError } = await supabase.from("event_members").insert({
      event_id: eventId,
      user_id: created.user.id,
      role: person.role,
    });

    if (memberError) {
      console.error(
        `[seed-demo] Membership for "${person.email}" failed:`,
        memberError
      );
    }
  }

  const { error: inviteError } = await supabase.from("event_invites").insert({
    event_id: eventId,
    email: "yetunde@owambe.ng",
    role: "staff",
    invited_by: userId,
    expires_at: new Date(Date.now() + 6 * 86_400_000).toISOString(),
  });

  if (inviteError) {
    console.error("[seed-demo] Pending invite failed:", inviteError);
  }

  // 4b. Billing history: one settled celebration pass and one abandoned attempt
  const { data: settledPayment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      event_id: eventId,
      user_id: userId,
      paystack_reference: `ARY-DEMO-${generateToken(10)}`,
      amount_kobo: 5_000_000,
      status: "success",
      channel: "card",
      paid_at: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    })
    .select()
    .single();

  if (paymentError || !settledPayment) {
    console.error("[seed-demo] Settled payment failed:", paymentError);
  } else {
    const { error: invoiceError } = await supabase.from("invoices").insert({
      payment_id: settledPayment.id,
      event_id: eventId,
      invoice_number: `ARY-2026-${String(Date.now()).slice(-5)}`,
      amount_kobo: 5_000_000,
      issued_at: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      paid_at: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      status: "paid",
    });

    if (invoiceError) {
      console.error("[seed-demo] Invoice failed:", invoiceError);
    }
  }

  const { error: failedPaymentError } = await supabase.from("payments").insert({
    event_id: eventId,
    user_id: userId,
    paystack_reference: `ARY-DEMO-${generateToken(10)}`,
    amount_kobo: 5_000_000,
    status: "failed",
    channel: "bank_transfer",
    paid_at: null,
  });

  if (failedPaymentError) {
    console.error("[seed-demo] Failed payment failed:", failedPaymentError);
  }

  // 5. Insert Banquet Tables
  const tableData = [
    {
      name: "High Table / Royal Dais",
      capacity: 10,
      shape: "head",
      position_x: 100,
      position_y: 50,
    },
    {
      name: "Bride's Family Table",
      capacity: 10,
      shape: "rectangular",
      position_x: 50,
      position_y: 150,
    },
    {
      name: "Groom's Family Table",
      capacity: 10,
      shape: "rectangular",
      position_x: 150,
      position_y: 150,
    },
    {
      name: "Island Friends & Alumni",
      capacity: 8,
      shape: "round",
      position_x: 50,
      position_y: 250,
    },
    {
      name: "Mainland Elite Society",
      capacity: 8,
      shape: "round",
      position_x: 150,
      position_y: 250,
    },
    {
      name: "Bridal Party & Groomsmen",
      capacity: 10,
      shape: "round",
      position_x: 100,
      position_y: 350,
    },
    {
      name: "Dignitaries & Royal Guests",
      capacity: 8,
      shape: "oval",
      position_x: 100,
      position_y: 450,
    },
  ];

  const { data: createdTables, error: tableErr } = await supabase
    .from("tables")
    .insert(tableData.map((t) => ({ ...t, event_id: eventId })))
    .select();

  if (tableErr || !createdTables) {
    throw new Error(`Failed to create tables: ${tableErr?.message}`);
  }
  console.log(
    `✓ Provisioned ${createdTables.length} ceremonial banquet tables`
  );

  // 6. Curated 60 Guest Roster
  const guestRoster = [
    // High Table Dignitaries (10)
    {
      name: "Kabiyesi Oba Adedotun Aremu Gbadebo",
      side: "vip",
      group: "Monarchs",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Olori Tokunbo Gbadebo",
      side: "vip",
      group: "Monarchs",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Chief Olusegun Obasanjo",
      side: "vip",
      group: "Statesmen",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Dr. Ngozi Okonjo-Iweala",
      side: "vip",
      group: "Statesmen",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Otunba Mike Adenuga",
      side: "vip",
      group: "Dignitaries",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Chief (Mrs.) Kemi Adenuga",
      side: "vip",
      group: "Dignitaries",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Aliko Dangote GCON",
      side: "vip",
      group: "Dignitaries",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Femi Otedola CON",
      side: "vip",
      group: "Dignitaries",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Nana Otedola",
      side: "vip",
      group: "Dignitaries",
      isVip: true,
      table: 0,
      status: "accepted",
    },
    {
      name: "Herbert Wigwe Legacy Trust Envoy",
      side: "vip",
      group: "Dignitaries",
      isVip: true,
      table: 0,
      status: "accepted",
    },

    // Bride's Family (10)
    {
      name: "Dr. Babatunde Adeleke",
      side: "bride",
      group: "Elders",
      isVip: true,
      table: 1,
      status: "accepted",
    },
    {
      name: "Mrs. Folashade Adeleke",
      side: "bride",
      group: "Elders",
      isVip: true,
      table: 1,
      status: "accepted",
    },
    {
      name: "Chief Adeleke Adeleke",
      side: "bride",
      group: "Elders",
      isVip: false,
      table: 1,
      status: "accepted",
    },
    {
      name: "Olumide Adeleke",
      side: "bride",
      group: "Siblings",
      isVip: false,
      table: 1,
      status: "accepted",
    },
    {
      name: "Titilayo Adeleke",
      side: "bride",
      group: "Siblings",
      isVip: false,
      table: 1,
      status: "accepted",
    },
    {
      name: "Aunty Biodun Shonowo",
      side: "bride",
      group: "Maternal Aunts",
      isVip: false,
      table: 1,
      status: "accepted",
    },
    {
      name: "Uncle Kayode Shonowo",
      side: "bride",
      group: "Maternal Uncles",
      isVip: false,
      table: 1,
      status: "accepted",
    },
    {
      name: "Ronke Adeleke-Peters",
      side: "bride",
      group: "Cousins",
      isVip: false,
      table: 1,
      status: "accepted",
    },
    {
      name: "Engr. Dapo Peters",
      side: "bride",
      group: "Cousins",
      isVip: false,
      table: 1,
      status: "accepted",
    },
    {
      name: "Grandma Abigail Adeleke",
      side: "bride",
      group: "Matriarchs",
      isVip: true,
      table: 1,
      status: "accepted",
    },

    // Groom's Family (10)
    {
      name: "Chief Demola Alakija Snr",
      side: "groom",
      group: "Elders",
      isVip: true,
      table: 2,
      status: "accepted",
    },
    {
      name: "Chief (Mrs.) Modupe Alakija",
      side: "groom",
      group: "Elders",
      isVip: true,
      table: 2,
      status: "accepted",
    },
    {
      name: "Rotimi Alakija",
      side: "groom",
      group: "Siblings",
      isVip: false,
      table: 2,
      status: "accepted",
    },
    {
      name: "Ladi Alakija",
      side: "groom",
      group: "Siblings",
      isVip: false,
      table: 2,
      status: "accepted",
    },
    {
      name: "Ayo Alakija",
      side: "groom",
      group: "Siblings",
      isVip: false,
      table: 2,
      status: "accepted",
    },
    {
      name: "Senator Gbenga Ashafa",
      side: "groom",
      group: "Paternal Uncles",
      isVip: true,
      table: 2,
      status: "accepted",
    },
    {
      name: "Mrs. Folake Ashafa",
      side: "groom",
      group: "Paternal Aunts",
      isVip: false,
      table: 2,
      status: "accepted",
    },
    {
      name: "Deji Alakija",
      side: "groom",
      group: "Cousins",
      isVip: false,
      table: 2,
      status: "accepted",
    },
    {
      name: "Bimbo Alakija",
      side: "groom",
      group: "Cousins",
      isVip: false,
      table: 2,
      status: "accepted",
    },
    {
      name: "Uncle Kunle Doherty",
      side: "groom",
      group: "Elders",
      isVip: false,
      table: 2,
      status: "accepted",
    },

    // Island Friends & Alumni (8)
    {
      name: "Farooq Oreagba",
      side: "mutual",
      group: "Island Guild",
      isVip: true,
      table: 3,
      status: "accepted",
    },
    {
      name: "Tunde Fowler",
      side: "mutual",
      group: "Island Guild",
      isVip: false,
      table: 3,
      status: "accepted",
    },
    {
      name: "Segun Agbaje",
      side: "mutual",
      group: "Banking Guild",
      isVip: true,
      table: 3,
      status: "accepted",
    },
    {
      name: "Aigboje Aig-Imoukhuede",
      side: "mutual",
      group: "Banking Guild",
      isVip: true,
      table: 3,
      status: "accepted",
    },
    {
      name: "Bolu Akin-Olugbade Jr.",
      side: "groom",
      group: "King's College",
      isVip: false,
      table: 3,
      status: "accepted",
    },
    {
      name: "Kunle Coker",
      side: "groom",
      group: "King's College",
      isVip: false,
      table: 3,
      status: "accepted",
    },
    {
      name: "Somi Dokpesi",
      side: "bride",
      group: "Queen's College",
      isVip: false,
      table: 3,
      status: "accepted",
    },
    {
      name: "Zainab Balogun",
      side: "bride",
      group: "Queen's College",
      isVip: false,
      table: 3,
      status: "accepted",
    },

    // Bridal Party & Groomsmen (10)
    {
      name: "Chidinma Okeke (Chief Bridesmaid)",
      side: "bride",
      group: "Bridal Party",
      isVip: true,
      table: 5,
      status: "accepted",
    },
    {
      name: "Somtochukwu Eke",
      side: "bride",
      group: "Bridal Party",
      isVip: false,
      table: 5,
      status: "accepted",
    },
    {
      name: "Nengi Hampson",
      side: "bride",
      group: "Bridal Party",
      isVip: false,
      table: 5,
      status: "accepted",
    },
    {
      name: "Kemi Adetiba",
      side: "bride",
      group: "Bridal Party",
      isVip: true,
      table: 5,
      status: "accepted",
    },
    {
      name: "Osas Ighodaro",
      side: "bride",
      group: "Bridal Party",
      isVip: false,
      table: 5,
      status: "accepted",
    },
    {
      name: "Bankole Wellington (Best Man)",
      side: "groom",
      group: "Groomsmen",
      isVip: true,
      table: 5,
      status: "accepted",
    },
    {
      name: "Ebuka Obi-Uchendu",
      side: "groom",
      group: "Groomsmen",
      isVip: true,
      table: 5,
      status: "accepted",
    },
    {
      name: "Noble Igwe",
      side: "groom",
      group: "Groomsmen",
      isVip: false,
      table: 5,
      status: "accepted",
    },
    {
      name: "Timini Egbuson",
      side: "groom",
      group: "Groomsmen",
      isVip: false,
      table: 5,
      status: "accepted",
    },
    {
      name: "Do2dtun Kayode",
      side: "groom",
      group: "Groomsmen",
      isVip: false,
      table: 5,
      status: "accepted",
    },

    // Mainland Society (8)
    {
      name: "Alhaji Lai Mohammed",
      side: "mutual",
      group: "Mainland Elite",
      isVip: false,
      table: 4,
      status: "accepted",
    },
    {
      name: "Hajia Bintu Yar'adua",
      side: "mutual",
      group: "Mainland Elite",
      isVip: false,
      table: 4,
      status: "accepted",
    },
    {
      name: "Dr. Oladipo Diya Jr.",
      side: "mutual",
      group: "Mainland Elite",
      isVip: false,
      table: 4,
      status: "accepted",
    },
    {
      name: "Chief Jubril Martins-Kuye",
      side: "mutual",
      group: "Mainland Elite",
      isVip: false,
      table: 4,
      status: "accepted",
    },
    {
      name: "Alhaja Sinatu Ojikutu",
      side: "mutual",
      group: "Mainland Elite",
      isVip: false,
      table: 4,
      status: "declined",
    },
    {
      name: "Otunba Gbenga Daniel",
      side: "mutual",
      group: "Mainland Elite",
      isVip: true,
      table: 4,
      status: "declined",
    },
    {
      name: "Yele Sowore",
      side: "mutual",
      group: "Media Guild",
      isVip: false,
      table: null,
      status: "declined",
    },
    {
      name: "Femi Falana SAN",
      side: "mutual",
      group: "Legal Guild",
      isVip: true,
      table: null,
      status: "declined",
    },

    // Awaiting Response (Unseated) (4)
    {
      name: "Professor Wole Soyinka",
      side: "vip",
      group: "Literary Giants",
      isVip: true,
      table: null,
      status: "awaiting",
    },
    {
      name: "Chimamanda Ngozi Adichie",
      side: "vip",
      group: "Literary Giants",
      isVip: true,
      table: null,
      status: "awaiting",
    },
    {
      name: "Burna Boy (Damini Ogulu)",
      side: "groom",
      group: "Musical Icons",
      isVip: true,
      table: null,
      status: "awaiting",
    },
    {
      name: "Wizkid (Ayodeji Balogun)",
      side: "groom",
      group: "Musical Icons",
      isVip: true,
      table: null,
      status: "awaiting",
    },
  ];

  let seatedCount = 0;
  for (let i = 0; i < guestRoster.length; i++) {
    const item = guestRoster[i];
    const phone = `+23480${String(30000000 + i).padStart(8, "0")}`;
    const email = `${item.name.toLowerCase().replace(/[^a-z]/g, "")}@owambe.ng`;
    const token = generateToken(24);
    const passCode = generateCheckInCode(item.name);

    const { data: guest, error: gErr } = await supabase
      .from("guests")
      .insert({
        event_id: eventId,
        name: item.name,
        phone,
        email,
        side: item.side,
        group_name: item.group,
        is_vip: item.isVip,
        party_size: 1,
        plus_ones_allowed: true,
        rsvp_token: token,
        notes: item.isVip
          ? "Imperial VVIP guest. Special wax-seal escort."
          : null,
      })
      .select()
      .single();

    if (gErr || !guest) {
      console.error(`Error inserting guest ${item.name}:`, gErr?.message);
      continue;
    }

    // Insert RSVP record
    if (item.status === "accepted" || item.status === "declined") {
      await supabase.from("rsvps").insert({
        guest_id: guest.id,
        event_id: eventId,
        status: item.status,
        attending_count: item.status === "accepted" ? 1 : 0,
        dietary_preferences:
          item.status === "accepted"
            ? "Authentic Lagos Jollof, Moin Moin & Asun"
            : null,
        note:
          item.status === "accepted"
            ? "Joyfully attending! May your union be crowned with glory."
            : "Regretfully unavailable due to official travel. Sending prayers.",
        check_in_code: item.status === "accepted" ? passCode : null,
        contact_email: email,
        created_at: new Date().toISOString(),
      });
    }

    // Seat guest if table specified
    if (item.table !== null && createdTables[item.table]) {
      const tableId = createdTables[item.table].id;
      await supabase.from("seat_assignments").insert({
        guest_id: guest.id,
        table_id: tableId,
      });
      seatedCount++;
    }
  }
  console.log(`✓ Inserted 60 guests (${seatedCount} seated to banquet tables)`);

  // 7. Vendors and Milestones
  const vendorsData = [
    {
      name: "Chef Fregz Artisanal Banquets",
      category: "Catering",
      contact_name: "Gbubemi Fregene",
      phone: "+2348021113344",
      email: "fregz@lagos.ng",
      status: "confirmed",
      notes:
        "5-course curated West African menu featuring smoked goat jollof and truffle plantain.",
    },
    {
      name: "King Sunny Ade Heritage Orchestra",
      category: "Music & Live Band",
      contact_name: "Sunday Adeniyi",
      phone: "+2348035559988",
      email: "ksa@juju.ng",
      status: "confirmed",
      notes: "30-piece live Jùjú orchestra and talking drummers.",
    },
    {
      name: "Kelechi Amadi-Obi Fine Art Studios",
      category: "Photography & Film",
      contact_name: "Kelechi Amadi-Obi",
      phone: "+2348039992211",
      email: "kelechi@studios.ng",
      status: "confirmed",
      notes:
        "Cinematography with dual aerial drones and royal velvet photobooks.",
    },
    {
      name: "Deola Sagoe Imperial Atelier",
      category: "Aṣọ-Ẹbí & Styling",
      contact_name: "Deola Sagoe",
      phone: "+2348027771122",
      email: "couture@deolasagoe.ng",
      status: "confirmed",
      notes:
        "Custom Komole Iro & Buba lace fabrication for 120 bridal family members.",
    },
    {
      name: "The Cocktail Maestros Lagos",
      category: "Bar & Mixology",
      contact_name: "Tobi Adebayo",
      phone: "+2348094443322",
      email: "drinks@maestros.ng",
      status: "confirmed",
      notes:
        "Open champagne and signature palm wine martini bar throughout reception.",
    },
    {
      name: "Halogen Security VIP Sovereign Guard",
      category: "Security & Escorts",
      contact_name: "Col. Mike Danjuma",
      phone: "+2348052228899",
      email: "vip@halogen.ng",
      status: "confirmed",
      notes:
        "VIP entrance management, digital QR scanners, and sovereign motorcade escort.",
    },
  ];

  const vendorDossiers = [
    { cost: 4_800_000_00, deposit: 4_800_000_00 },
    { cost: 3_500_000_00, deposit: 2_100_000_00 },
    { cost: 2_200_000_00, deposit: 2_200_000_00 },
    { cost: 6_500_000_00, deposit: 3_900_000_00 },
    { cost: 1_450_000_00, deposit: 725_000_00 },
    { cost: 1_100_000_00, deposit: 550_000_00 },
  ];

  for (const [index, v] of vendorsData.entries()) {
    const dossier = vendorDossiers[index];
    const { data: createdVendor, error: vendorError } = await supabase
      .from("vendors")
      .insert({
        event_id: eventId,
        name: v.name,
        category: v.category,
        contact_name: v.contact_name,
        contact_phone: v.phone,
        contact_email: v.email,
        cost_kobo: dossier.cost,
        deposit_kobo: dossier.deposit,
        status: v.status,
      })
      .select()
      .single();

    if (vendorError || !createdVendor) {
      console.error(`[seed-demo] Vendor "${v.name}" failed:`, vendorError);
      continue;
    }

    const { error: taskError } = await supabase.from("vendor_tasks").insert([
      {
        vendor_id: createdVendor.id,
        event_id: eventId,
        task: "Initial ceremonial dossier & scope signoff",
        is_done: true,
      },
      {
        vendor_id: createdVendor.id,
        event_id: eventId,
        task: "Onsite technical rehearsal at Grand Monarch Ballroom",
        due_date: "2026-12-08",
        is_done: false,
      },
      {
        vendor_id: createdVendor.id,
        event_id: eventId,
        task: "Final day-of coordinator briefing & access passes",
        due_date: "2026-12-11",
        is_done: false,
      },
    ]);

    if (taskError) {
      console.error(`[seed-demo] Tasks for "${v.name}" failed:`, taskError);
    }
  }
  console.log(`✓ Provisioned 6 vendors with coordination task dossiers`);

  console.log(`
🎉 DEMO CELEBRATION READY!
-----------------------------------------------------------
Event:       Folake & Demola's Regal Nuptials
URL:         /events/${eventId}
Public Page: /e/${demoSlug}
Credentials: ${demoEmail} / ${demoPassword}
-----------------------------------------------------------
`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
