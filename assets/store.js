// Storage layer.
//
// MODE: 'demo' uses in-memory + localStorage so the prototype works without a backend.
// MODE: 'remote' POSTs to an Apps Script web app. Set APPS_SCRIPT_URL and switch MODE.
//
// The four functions below are the entire data contract. Both modes implement them.

const MODE = 'remote'; // 'demo' or 'remote'
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx6AkQYFDfCyUT2GUNeNoIIV0Pf904Zipuc8KmYNXeHWUldidPHOI-RT03ODij14qJ3sA/exec'; // paste deployment URL when going live, e.g. https://script.google.com/macros/s/.../exec

const LS_RSVP_KEY = 'wedding.rsvps.v1';
const LS_SESSION_KEY = 'wedding.session.v1';

// ---- Session (which household the visitor is viewing) ----

function setSession(payload) {
  // payload: { householdId, isAdmin, name }
  localStorage.setItem(LS_SESSION_KEY, JSON.stringify(payload));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(LS_SESSION_KEY);
}

// ---- Data contract ----

async function findGuest(query) {
  if (MODE === 'remote') return remoteCall('findGuest', { query });

  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Admin check first — admins log in with just their first name
  if (typeof ADMINS !== 'undefined' && ADMINS.some(a => a.toLowerCase() === q || q.startsWith(a.toLowerCase() + ' '))) {
    return { kind: 'admin', name: q };
  }

  if (typeof HOUSEHOLDS === 'undefined') return null;

  // Collect all matches for: email (exact), full name (exact), first-name (exact),
  // last-name (exact). Then decide based on how many we got.
  const emailMatches = [];
  const fullNameMatches = [];
  const firstNameMatches = [];
  const lastNameMatches = [];

  for (const h of HOUSEHOLDS) {
    for (const a of h.adults) {
      const first = a.firstName.toLowerCase();
      const last = a.lastName.toLowerCase();
      const full = first + ' ' + last;
      const email = a.email.toLowerCase();

      if (email === q) emailMatches.push(h);
      if (full === q) fullNameMatches.push(h);
      if (first === q) firstNameMatches.push(h);
      if (last === q) lastNameMatches.push(h);
    }
  }

  if (emailMatches.length === 1) return { kind: 'household', household: emailMatches[0] };
  if (fullNameMatches.length === 1) return { kind: 'household', household: fullNameMatches[0] };
  if (fullNameMatches.length > 1) return { kind: 'ambiguous' };

  const partialMatches = [...firstNameMatches, ...lastNameMatches];
  if (partialMatches.length === 1) return { kind: 'household', household: partialMatches[0] };
  if (partialMatches.length > 1) return { kind: 'ambiguous' };

  return null;
}

async function getHousehold(householdId) {
  if (MODE === 'remote') return remoteCall('getHousehold', { householdId });
  const h = HOUSEHOLDS.find(x => x.id === householdId);
  if (!h) return null;
  const rsvp = getAllRsvps()[householdId] || null;
  return { ...h, rsvp };
}

async function submitRsvp(householdId, rsvpData) {
  if (MODE === 'remote') return remoteCall('submitRsvp', { householdId, rsvpData });
  const all = getAllRsvps();
  all[householdId] = { ...rsvpData, submittedAt: new Date().toISOString() };
  localStorage.setItem(LS_RSVP_KEY, JSON.stringify(all));
  return { ok: true };
}

async function getAllHouseholdsForAdmin() {
  if (MODE === 'remote') {
    const session = getSession();
    return remoteCall('getAllHouseholds', { adminName: session ? session.name : '' });
  }
  const rsvps = getAllRsvps();
  return HOUSEHOLDS.map(h => ({ ...h, rsvp: rsvps[h.id] || null }));
}

// ---- Demo helpers ----

function getAllRsvps() {
  try {
    return JSON.parse(localStorage.getItem(LS_RSVP_KEY)) || {};
  } catch {
    return {};
  }
}

function resetDemoData() {
  localStorage.removeItem(LS_RSVP_KEY);
  localStorage.removeItem(LS_SESSION_KEY);
}

// ---- Remote (Apps Script) ----

async function remoteCall(action, payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight
    body: JSON.stringify({ action, ...payload })
  });
  if (!res.ok) throw new Error('Network error');
  return res.json();
}
