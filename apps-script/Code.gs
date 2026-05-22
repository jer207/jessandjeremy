/**
 * Wedding RSVP backend — Google Apps Script.
 *
 * Setup:
 *   1. Create a Google Sheet with three tabs: Households, RSVPs, Admins.
 *      See README for the exact column headers.
 *   2. Extensions → Apps Script. Paste this file in as Code.gs.
 *   3. Set the script properties (Project Settings → Script Properties):
 *        SHEET_ID            the ID from your sheet URL
 *        ADMIN_EMAIL         where RSVP alert emails go
 *        COUPLE_NAMES        e.g. "Jeremy & Jess"
 *   4. Deploy → New deployment → Web app.
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy the resulting URL into assets/store.js as APPS_SCRIPT_URL,
 *      and set MODE = 'remote'.
 *
 * Why "text/plain" on POST?
 *   It avoids a CORS preflight from the browser. Apps Script doesn't
 *   set the Access-Control-Allow-* headers needed for an OPTIONS request,
 *   so we sidestep preflight by using a "simple" content type and
 *   parsing JSON ourselves.
 */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    let out;
    if (action === 'findGuest') out = findGuest(body.query);
    else if (action === 'getHousehold') out = getHousehold(body.householdId);
    else if (action === 'submitRsvp') out = submitRsvp(body.householdId, body.rsvpData);
    else if (action === 'getAllHouseholds') out = getAllHouseholds(body.adminName);
    else out = { error: 'Unknown action' };

    return jsonResponse(out);
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function doGet() {
  return ContentService.createTextOutput('Wedding RSVP API is running.');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- Sheet access ----------

function sheet(name) {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return SpreadsheetApp.openById(id).getSheetByName(name);
}

function readAll(sheetName) {
  const sh = sheet(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function loadHouseholds() {
  const rows = readAll('Households');
  return rows.filter(r => r.id).map(r => ({
    id: String(r.id).trim(),
    tier: String(r.tier).trim(),
    adults: [
      r.adult1_first ? {
        firstName: String(r.adult1_first).trim(),
        lastName: String(r.adult1_last || '').trim(),
        email: String(r.adult1_email || '').trim()
      } : null,
      r.adult2_first ? {
        firstName: String(r.adult2_first).trim(),
        lastName: String(r.adult2_last || '').trim(),
        email: String(r.adult2_email || '').trim()
      } : null
    ].filter(Boolean),
    children: r.children ? String(r.children).split(/[;,]/).map(s => s.trim()).filter(Boolean) : [],
    plusOneAllowed: r.plus_one_allowed === true || String(r.plus_one_allowed).toLowerCase() === 'true' ||
                    Number(r.plus_one_allowed) === 1,
    topslLodgingNote: r.topsl_lodging_note ? String(r.topsl_lodging_note).trim() : ''
  }));
}

function loadAdmins() {
  const rows = readAll('Admins');
  return rows.map(r => String(r.name || '').trim()).filter(Boolean);
}

function loadRsvps() {
  const rows = readAll('RSVPs');
  // Group rows by household_id into nested structure
  const map = {};
  rows.forEach(r => {
    const id = String(r.household_id);
    if (!map[id]) map[id] = { attendees: [], plusOne: null, notes: '', contactEmail: '', submittedAt: '' };
    const person = {
      name: r.person_name,
      role: r.person_role,
      attending: { day1: r.attending_day1 === 'yes', day2: r.attending_day2 === 'yes' },
      dietary: r.dietary || ''
    };
    if (r.person_role === 'plus_one') map[id].plusOne = person;
    else map[id].attendees.push(person);
    if (r.notes) map[id].notes = r.notes;
    if (r.contact_email) map[id].contactEmail = r.contact_email;
    if (r.submitted_at) map[id].submittedAt = new Date(r.submitted_at).toISOString();
  });
  return map;
}

// ---------- Actions ----------

function findGuest(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;

  const admins = loadAdmins();
  if (admins.some(a => a.toLowerCase() === q || q.startsWith(a.toLowerCase() + ' '))) {
    return { kind: 'admin', name: q };
  }

  const households = loadHouseholds();
  const emailMatches = [];
  const fullNameMatches = [];
  const partialMatches = [];

  for (var i = 0; i < households.length; i++) {
    var h = households[i];
    for (var j = 0; j < h.adults.length; j++) {
      var a = h.adults[j];
      var first = a.firstName.toLowerCase();
      var last = a.lastName.toLowerCase();
      var full = first + ' ' + last;
      var email = a.email.toLowerCase();

      if (email === q) emailMatches.push(h);
      if (full === q) fullNameMatches.push(h);
      if (first === q || last === q) partialMatches.push(h);
    }
  }

  if (emailMatches.length === 1) return { kind: 'household', household: emailMatches[0] };
  if (fullNameMatches.length === 1) return { kind: 'household', household: fullNameMatches[0] };
  if (fullNameMatches.length > 1) return { kind: 'ambiguous' };
  if (partialMatches.length === 1) return { kind: 'household', household: partialMatches[0] };
  if (partialMatches.length > 1) return { kind: 'ambiguous' };
  return null;
}

function getHousehold(householdId) {
  const h = loadHouseholds().find(x => x.id === householdId);
  if (!h) return null;
  const rsvps = loadRsvps();
  return Object.assign({}, h, { rsvp: rsvps[householdId] || null });
}

function submitRsvp(householdId, rsvpData) {
  // Basic validation
  if (!householdId || typeof householdId !== 'string') {
    return { ok: false, error: 'Missing householdId' };
  }
  if (!rsvpData || !Array.isArray(rsvpData.attendees)) {
    return { ok: false, error: 'Invalid RSVP data' };
  }

  const households = loadHouseholds();
  const h = households.find(x => x.id === householdId);
  if (!h) return { ok: false, error: 'Household not found' };

  // Cap free-text fields to keep storage sane
  const cap = (s, n) => String(s == null ? '' : s).slice(0, n);
  const notes = cap(rsvpData.notes, 1000);
  const contactEmail = cap(rsvpData.contactEmail, 200);

  // Acquire a lock so two simultaneous submissions can't interleave
  const lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) {
    return { ok: false, error: 'Server busy, please try again.' };
  }

  try {
    const sh = sheet('RSVPs');
    const nowIso = new Date().toISOString();

    // Remove any existing rows for this household (overwrite behavior)
    const all = sh.getDataRange().getValues();
    for (let i = all.length - 1; i >= 1; i--) {
      if (String(all[i][1]) === householdId) sh.deleteRow(i + 1);
    }

    // Append new rows. Validate each attendee minimally.
    rsvpData.attendees.forEach(a => {
      if (!a || !a.name) return;
      sh.appendRow([
        nowIso, householdId, cap(a.name, 200), cap(a.role || 'adult', 20),
        a.attending && a.attending.day1 ? 'yes' : 'no',
        a.attending && a.attending.day2 ? 'yes' : 'no',
        cap(a.dietary, 500),
        notes, contactEmail
      ]);
    });
    if (rsvpData.plusOne && rsvpData.plusOne.name) {
      const po = rsvpData.plusOne;
      sh.appendRow([
        nowIso, householdId, cap(po.name, 200), 'plus_one',
        po.attending && po.attending.day1 ? 'yes' : 'no',
        po.attending && po.attending.day2 ? 'yes' : 'no',
        cap(po.dietary, 500),
        notes, contactEmail
      ]);
    }

    // Send admin alert (don't fail the submission if email errors)
    try { sendAlert(h, rsvpData); } catch (e) { /* swallow */ }

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function getAllHouseholds(adminName) {
  // The findGuest call already verified admin status before the dashboard loads,
  // but double-check here in case someone POSTs directly.
  const admins = loadAdmins().map(a => a.toLowerCase());
  const name = String(adminName || '').toLowerCase().trim();
  if (!name || !admins.some(a => a === name || name.startsWith(a + ' '))) {
    return { error: 'Not authorized' };
  }

  const households = loadHouseholds();
  const rsvps = loadRsvps();
  return households.map(h => Object.assign({}, h, { rsvp: rsvps[h.id] || null }));
}

// ---------- Email alert ----------

function sendAlert(h, rsvp) {
  const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  const coupleNames = PropertiesService.getScriptProperties().getProperty('COUPLE_NAMES') || 'You';
  if (!adminEmail) return;

  const householdName = h.adults.map(a => a.firstName + ' ' + a.lastName).join(' & ');
  const lines = [];
  rsvp.attendees.forEach(a => {
    const days = [];
    if (a.attending.day1) days.push('Fri');
    if (a.attending.day2) days.push('Sat');
    const status = days.length ? days.join('+') : 'not attending';
    lines.push(`  ${a.name} — ${status}${a.dietary ? ' (' + a.dietary + ')' : ''}`);
  });
  if (rsvp.plusOne) {
    const days = [];
    if (rsvp.plusOne.attending.day1) days.push('Fri');
    if (rsvp.plusOne.attending.day2) days.push('Sat');
    lines.push(`  ${rsvp.plusOne.name} (guest) — ${days.join('+')}${rsvp.plusOne.dietary ? ' (' + rsvp.plusOne.dietary + ')' : ''}`);
  }

  const subject = `RSVP from ${householdName}`;
  const body = [
    `${householdName} just responded:`,
    '',
    ...lines,
    '',
    rsvp.notes ? 'Note: ' + rsvp.notes : '',
    '',
    `Contact: ${rsvp.contactEmail || '(none)'}`
  ].join('\n');

  MailApp.sendEmail(adminEmail, subject, body);
}
