/* Àríyá demo data layer.
   Everything here is SAMPLE DATA for the public demonstration. It lives only in this browser tab
   (sessionStorage), is never sent anywhere, and no messages, emails or payments are triggered.
   The shapes mirror the product's entities so a real backend can replace this file:
   events, guests, rsvps, tables, vendors. */
(function () {
  var KEY = "ariya-demo-v1";

  function seed() {
    var event = {
      id: "evt_demo",
      title: "Chidinma & Tunde's wedding",
      couple: "Chidinma & Tunde",
      date: "2026-12-12",
      time: "14:00",
      venue: "The Grand Pavilion",
      area: "Victoria Island, Lagos",
      rsvpBy: "2026-11-20",
      dressCode: "Aso ebi: emerald and gold"
    };
    var tables = [
      { id: "t_head", name: "Head table", capacity: 10 },
      { id: "t1", name: "Table 1", capacity: 8 }, { id: "t2", name: "Table 2", capacity: 8 },
      { id: "t3", name: "Table 3", capacity: 8 }, { id: "t4", name: "Table 4", capacity: 8 },
      { id: "t5", name: "Table 5", capacity: 8 }, { id: "t6", name: "Table 6", capacity: 8 },
      { id: "t7", name: "Table 7", capacity: 8 }, { id: "t8", name: "Table 8", capacity: 8 }
    ];
    var g = function (id, name, phone, email, party, plusOne, status, tableId, side) {
      return { id: id, token: id.replace("g_", "k7") + "Qx", name: name, phone: phone, email: email, party: party, plusOneAllowed: plusOne, status: status, tableId: tableId, side: side };
    };
    var guests = [
      g("g_01", "Adaeze Okonkwo", "+2348031234501", "adaeze@example.com", 1, true, "pending", null, "Bride"),
      g("g_02", "Bisi Adebayo", "+2348031234502", "", 5, false, "yes", "t3", "Bride"),
      g("g_03", "Emeka & Ifeoma Okafor", "+2348031234503", "okafor@example.com", 2, false, "yes", "t5", "Groom"),
      g("g_04", "Femi Adeyemi", "+2348031234504", "femi@example.com", 1, true, "yes", "t2", "Groom"),
      g("g_05", "Ngozi Eze", "+2348031234505", "", 2, false, "yes", "t7", "Bride"),
      g("g_06", "Dayo Ogunleye", "+2348031234506", "", 1, false, "yes", "t1", "Groom"),
      g("g_07", "Kemi Balogun", "+2348031234507", "kemi@example.com", 1, false, "yes", "t_head", "Planner"),
      g("g_08", "Tolu Bankole", "+2348031234508", "", 1, true, "pending", null, "Groom"),
      g("g_09", "Seun & Ronke Alade", "+2348031234509", "alade@example.com", 2, false, "yes", "t7", "Groom"),
      g("g_10", "Chiamaka Nwosu", "+2348031234510", "", 1, false, "no", null, "Bride"),
      g("g_11", "Ibrahim Musa", "+2348031234511", "ibrahim@example.com", 1, true, "yes", "t2", "Groom"),
      g("g_12", "Funke Akindele-Bello", "+2348031234512", "", 3, false, "pending", null, "Bride"),
      g("g_13", "Osaze Igbinedion", "+2348031234513", "osaze@example.com", 2, false, "yes", "t4", "Groom"),
      g("g_14", "Efe Omoregie", "+2348031234514", "", 1, false, "yes", "t4", "Bride"),
      g("g_15", "Halima Abubakar", "+2348031234515", "", 1, false, "pending", null, "Bride"),
      g("g_16", "Uche Nnaji", "+2348031234516", "uche@example.com", 1, false, "no", null, "Groom"),
      g("g_17", "Yemisi Coker", "+2348031234517", "", 4, false, "yes", "t1", "Bride"),
      g("g_18", "Babatunde Lawal", "+2348031234518", "", 1, true, "yes", null, "Groom"),
      g("g_19", "Amara Obi", "+2348031234519", "amara@example.com", 2, false, "yes", "t7", "Bride"),
      g("g_20", "Pastor & Mrs Adeola", "+2348031234520", "", 2, false, "yes", "t_head", "Bride"),
      g("g_21", "Zainab Yusuf", "+2348031234521", "", 1, false, "pending", null, "Groom"),
      g("g_22", "Obinna Chukwu", "+2348031234522", "", 1, false, "yes", "t7", "Groom"),
      g("g_23", "Mummy Chidinma (Mrs Okeke)", "+2348031234523", "", 1, false, "yes", "t_head", "Bride"),
      g("g_24", "Papa Tunde (Chief Ajayi)", "+2348031234524", "", 1, false, "yes", "t_head", "Groom")
    ];
    var vendors = [
      { id: "v1", name: "Mama Put Royal Catering", category: "Catering", task: "Confirm final plate count", due: "2026-11-28", done: false },
      { id: "v2", name: "Gele by Titi", category: "Aso ebi & gele", task: "Collect gele measurements", due: "2026-11-15", done: true },
      { id: "v3", name: "Pavilion events team", category: "Venue", task: "Send seating chart for table cards", due: "2026-12-05", done: false },
      { id: "v4", name: "DJ Kaycee", category: "Music", task: "Share processional and first dance songs", due: "2026-11-30", done: false },
      { id: "v5", name: "Lens & Light Studio", category: "Photography", task: "Agree shot list and family portraits", due: "2026-11-25", done: true },
      { id: "v6", name: "Blooms Lagos", category: "Decor", task: "Approve centrepiece sample", due: "2026-11-22", done: false },
      { id: "v7", name: "Sweet Tiers", category: "Cake", task: "Pay balance and confirm delivery time", due: "2026-12-08", done: false }
    ];
    return { version: 1, event: event, tables: tables, guests: guests, rsvps: [], vendors: vendors };
  }

  var state;
  function load() {
    try { var raw = sessionStorage.getItem(KEY); if (raw) { state = JSON.parse(raw); if (state && state.version === 1) return; } } catch (e) { /* storage unavailable: keep in memory */ }
    state = seed();
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* memory only */ } emit(); }
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }
  load();

  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function seatsUsed(tableId, exceptGuestId) {
    return state.guests.reduce(function (n, g) { return n + (g.tableId === tableId && g.status === "yes" && g.id !== exceptGuestId ? g.party : 0); }, 0);
  }
  function counts() {
    var c = { total: state.guests.length, yes: 0, no: 0, pending: 0, people: 0, seated: 0, unseated: 0 };
    state.guests.forEach(function (g) {
      c[g.status]++;
      if (g.status === "yes") { c.people += g.party; if (g.tableId) c.seated += g.party; else c.unseated++; }
    });
    return c;
  }
  function normPhone(p) {
    var d = String(p || "").replace(/[^\d+]/g, "");
    if (/^\+234\d{10}$/.test(d)) return d;
    if (/^234\d{10}$/.test(d)) return "+" + d;
    if (/^0\d{10}$/.test(d)) return "+234" + d.slice(1);
    return null;
  }
  function fmtPhone(p) { return p ? p.replace(/^\+234(\d{3})(\d{3})(\d{4})$/, "0$1 $2 $3") : ""; }
  function fmtDate(iso, opts) {
    var d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-GB", opts || { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function linkFor(g) {
    var base = location.href.replace(/[^/]*([?#].*)?$/, "");
    return base + "rsvp.html?g=" + encodeURIComponent(g.token);
  }

  // CSV: quoted fields, commas, CRLF. First row is the header.
  function parseCSV(text) {
    var rows = [], row = [], field = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (f) { return f.trim() !== ""; }); });
  }
  function previewImport(text) {
    var rows = parseCSV(text || "");
    if (!rows.length) return { error: "The file is empty. Add a header row (name, phone, email, party) and at least one guest." };
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var col = { name: head.indexOf("name"), phone: head.indexOf("phone"), email: head.indexOf("email"), party: head.indexOf("party") };
    if (col.name < 0 || col.phone < 0) return { error: "The header row needs at least a \"name\" and a \"phone\" column. Found: " + rows[0].join(", ") };
    var seenPhones = {}, seenNames = {};
    state.guests.forEach(function (g) { seenPhones[g.phone] = g.name; seenNames[g.name.toLowerCase()] = g.name; });
    var out = rows.slice(1).map(function (r, i) {
      var name = (r[col.name] || "").trim(), phoneRaw = (r[col.phone] || "").trim();
      var email = col.email >= 0 ? (r[col.email] || "").trim() : "";
      var partyRaw = col.party >= 0 ? (r[col.party] || "").trim() : "";
      var party = partyRaw === "" ? 1 : Number(partyRaw);
      var errors = [], dup = null, phone = normPhone(phoneRaw);
      if (!name) errors.push("Name is missing");
      if (!phoneRaw) errors.push("Phone is missing");
      else if (!phone) errors.push("Phone \"" + phoneRaw + "\" is not a Nigerian mobile number (e.g. 0803 123 4567)");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email \"" + email + "\" looks wrong");
      if (!Number.isInteger(party) || party < 1 || party > 10) errors.push("Party size must be a whole number from 1 to 10");
      if (!errors.length) {
        if (seenPhones[phone]) dup = "Same phone as " + seenPhones[phone];
        else if (seenNames[name.toLowerCase()]) dup = "Same name as an existing guest";
        seenPhones[phone] = name; seenNames[name.toLowerCase()] = name;
      }
      return { line: i + 2, name: name, phone: phone, phoneRaw: phoneRaw, email: email, party: party, errors: errors, duplicate: dup };
    });
    return { rows: out, valid: out.filter(function (r) { return !r.errors.length && !r.duplicate; }).length };
  }
  function commitImport(preview) {
    var added = 0;
    preview.rows.forEach(function (r) {
      if (r.errors.length || r.duplicate) return;
      var id = "g_i" + Date.now().toString(36) + added;
      state.guests.push({ id: id, token: id.replace("g_", "k7") + "Qx", name: r.name, phone: r.phone, email: r.email, party: r.party, plusOneAllowed: false, status: "pending", tableId: null, side: "Imported" });
      added++;
    });
    save();
    return added;
  }

  function assign(guestId, tableId) {
    var g = byId(state.guests, guestId), t = byId(state.tables, tableId);
    if (!g || !t) return { ok: false, msg: "That guest or table no longer exists." };
    if (g.status !== "yes") return { ok: false, msg: g.name + " hasn't confirmed yet. Only confirmed guests can be seated." };
    if (g.tableId === tableId) return { ok: false, msg: g.name + " is already at " + t.name + "." };
    var free = t.capacity - seatsUsed(tableId, g.id);
    if (g.party > free) return { ok: false, full: true, msg: t.name + " has " + free + " of " + t.capacity + " seats free. " + g.name + (g.party > 1 ? "'s party needs " + g.party + "." : " needs 1.") };
    g.tableId = tableId; save();
    var used = seatsUsed(tableId);
    return { ok: true, msg: g.name + " → " + t.name + ". " + used + " of " + t.capacity + " seats filled" + (used === t.capacity ? ", table full." : ".") };
  }
  function unassign(guestId) { var g = byId(state.guests, guestId); if (g) { g.tableId = null; save(); } }

  function respond(token, response, opts) {
    opts = opts || {};
    var g = null;
    state.guests.forEach(function (x) { if (x.token === token) g = x; });
    if (!g) return { ok: false, msg: "This invitation link isn't recognised." };
    g.status = response === "yes" ? "yes" : "no";
    var party = 1 + (response === "yes" && g.plusOneAllowed && opts.plusOne ? 1 : 0);
    if (g.plusOneAllowed) g.party = party;
    if (g.status === "no") g.tableId = null;
    state.rsvps.push({ guestId: g.id, response: g.status, partySize: g.status === "yes" ? g.party : 0, plusOneName: opts.plusOneName || "", note: opts.note || "", at: new Date().toISOString() });
    // Seat newly confirmed guests at the first table with room, the way the planner's auto-seat would.
    if (g.status === "yes" && !g.tableId && opts.autoSeat) {
      var pref = opts.preferTable ? [byId(state.tables, opts.preferTable)] : [];
      pref.concat(state.tables).some(function (t) { if (t && t.capacity - seatsUsed(t.id) >= g.party) { g.tableId = t.id; return true; } return false; });
    }
    save();
    return { ok: true, guest: g };
  }

  window.AriyaDemo = {
    get state() { return state; },
    on: function (fn) { listeners.push(fn); },
    save: save,
    reset: function () { state = seed(); save(); },
    byId: byId, seatsUsed: seatsUsed, counts: counts,
    normPhone: normPhone, fmtPhone: fmtPhone, fmtDate: fmtDate, linkFor: linkFor,
    previewImport: previewImport, commitImport: commitImport,
    assign: assign, unassign: unassign, respond: respond,
    guestByToken: function (t) { var f = null; state.guests.forEach(function (g) { if (g.token === t) f = g; }); return f; },
    sampleCSV: "name,phone,email,party\nAdunni Fashola,0803 555 0101,adunni@example.com,2\nChinedu Okoro,08035550102,,1\nAunty Bisi again,+234 803 123 4502,,4\nMaryam Bello,0803-555-0104,maryam@example,1\n,08035550105,,1\nGbenga Ajayi,555 0106,,3\nEsosa Osagie,0809 555 0107,esosa@example.com,12\nNkechi Udeh,0812 555 0108,,1\n"
  };
})();
