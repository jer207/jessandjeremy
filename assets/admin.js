// Admin dashboard.

(async function () {
  const root = document.getElementById('root');
  const session = getSession();

  if (!session || !session.isAdmin) {
    window.location.href = 'index.html';
    return;
  }

  setupDemoBanner();

  const households = await getAllHouseholdsForAdmin();

  // Compute stats
  const stats = {
    households: households.length,
    responded: households.filter(h => h.rsvp).length,
    invited: 0,
    attendingDay1: 0,
    attendingDay2: 0
  };

  households.forEach(h => {
    stats.invited += h.adults.length + h.children.length + (h.plusOneAllowed ? 1 : 0);
    if (!h.rsvp) return;
    h.rsvp.attendees.forEach(a => {
      if (a.attending.day1) stats.attendingDay1++;
      if (a.attending.day2) stats.attendingDay2++;
    });
    if (h.rsvp.plusOne) {
      if (h.rsvp.plusOne.attending.day1) stats.attendingDay1++;
      if (h.rsvp.plusOne.attending.day2) stats.attendingDay2++;
    }
  });

  const tableRows = households.map(h => renderRow(h)).join('');

  root.innerHTML = `
    <div class="admin-header">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>RSVPs</h1>
        <p class="subtle">${WEDDING.coupleDisplay} &middot; ${WEDDING.dayOne.location.split(',')[0]}</p>
      </div>
      <div class="admin-actions">
        <button class="btn btn-secondary btn-small" id="exportBtn">Export CSV</button>
        <button class="btn btn-ghost btn-small" id="refreshBtn">Refresh</button>
      </div>
    </div>

    <div class="admin-stats">
      ${stat(stats.responded + ' / ' + stats.households, 'Households responded')}
      ${stat(stats.attendingDay1, 'Attending Friday')}
      ${stat(stats.attendingDay2, 'Attending Saturday')}
      ${stat(stats.invited, 'Total invited')}
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Household</th>
            <th>Tier</th>
            <th>Status</th>
            <th>Attendees</th>
            <th>Dietary</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('exportBtn').addEventListener('click', () => exportCsv(households));
  document.getElementById('refreshBtn').addEventListener('click', () => location.reload());
})();

function stat(num, label) {
  return `<div class="stat"><div class="num">${num}</div><div class="label">${label}</div></div>`;
}

function renderRow(h) {
  const householdName = h.adults.map(a => `${a.firstName} ${a.lastName}`).join(' &amp; ');
  const tierTag = h.tier === 'both'
    ? '<span class="tier-tag both">Both Days</span>'
    : '<span class="tier-tag">Day 2</span>';

  if (!h.rsvp) {
    return `
      <tr>
        <td><strong>${householdName}</strong>${childList(h.children)}</td>
        <td>${tierTag}</td>
        <td><span class="status-tag pending">Pending</span></td>
        <td colspan="3" style="color: var(--fg-3); font-style: italic;">No response yet</td>
      </tr>
    `;
  }

  const r = h.rsvp;
  const attendeeLis = r.attendees.map(a => attendeeLine(a, h.tier === 'both'));
  if (r.plusOne) attendeeLis.push(attendeeLine(r.plusOne, h.tier === 'both', true));
  const dietary = [...r.attendees, r.plusOne].filter(Boolean)
    .filter(a => a.dietary && a.dietary.trim())
    .map(a => `${a.name || h.adults[0].firstName + "'s guest"}: ${a.dietary}`)
    .join('<br>');

  return `
    <tr>
      <td>
        <strong>${householdName}</strong>${childList(h.children)}
        <div class="admin-meta">Submitted ${formatDate(r.submittedAt)}</div>
      </td>
      <td>${tierTag}</td>
      <td><span class="status-tag responded">Responded</span></td>
      <td><ul class="attendee-list">${attendeeLis.join('')}</ul></td>
      <td>${dietary || '<span style="color: var(--fg-3);">—</span>'}</td>
      <td>${r.notes ? escapeHtml(r.notes) : '<span style="color: var(--fg-3);">—</span>'}</td>
    </tr>
  `;
}

function attendeeLine(a, isBoth, isPlusOne) {
  const attending = a.attending.day1 || a.attending.day2;
  const name = (a.name || '') + (isPlusOne ? ' <em>(guest)</em>' : '');
  if (!attending) return `<li class="not-coming">${name}</li>`;
  if (isBoth) {
    const days = [];
    if (a.attending.day1) days.push('Fri');
    if (a.attending.day2) days.push('Sat');
    return `<li>${name} <span style="color: var(--fg-3); font-size: 12px;">(${days.join('+')})</span></li>`;
  }
  return `<li>${name}</li>`;
}

function childList(children) {
  if (!children || !children.length) return '';
  return `<div class="admin-child-list">+ ${children.join(', ')}</div>`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---------- CSV Export ----------

function exportCsv(households) {
  const headers = [
    'household_id', 'household_name', 'tier', 'status',
    'person_name', 'person_role',
    'attending_day1', 'attending_day2',
    'dietary', 'notes', 'contact_email', 'submitted_at'
  ];
  const rows = [headers];

  households.forEach(h => {
    const householdName = h.adults.map(a => `${a.firstName} ${a.lastName}`).join(' & ');

    if (!h.rsvp) {
      // One row per invited person showing pending
      const people = [
        ...h.adults.map(a => ({ name: `${a.firstName} ${a.lastName}`, role: 'adult' })),
        ...h.children.map(c => ({ name: c, role: 'child' }))
      ];
      if (h.plusOneAllowed) people.push({ name: '(guest)', role: 'plus_one' });
      people.forEach(p => {
        rows.push([h.id, householdName, h.tier, 'pending', p.name, p.role, '', '', '', '', h.adults[0].email || '', '']);
      });
      return;
    }

    const r = h.rsvp;
    r.attendees.forEach(a => {
      rows.push([
        h.id, householdName, h.tier, 'responded',
        a.name, a.role,
        a.attending.day1 ? 'yes' : 'no',
        a.attending.day2 ? 'yes' : 'no',
        a.dietary || '',
        r.notes || '',
        r.contactEmail || '',
        r.submittedAt
      ]);
    });
    if (r.plusOne) {
      rows.push([
        h.id, householdName, h.tier, 'responded',
        r.plusOne.name, 'plus_one',
        r.plusOne.attending.day1 ? 'yes' : 'no',
        r.plusOne.attending.day2 ? 'yes' : 'no',
        r.plusOne.dietary || '',
        '', r.contactEmail || '', r.submittedAt
      ]);
    }
  });

  const csv = rows.map(row =>
    row.map(cell => {
      const s = String(cell == null ? '' : cell);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `rsvps-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupDemoBanner() {
  const banner = document.getElementById('demoBanner');
  if (!banner) return;
  if (typeof MODE !== 'undefined' && MODE === 'demo') {
    document.body.classList.add('has-demo-banner');
    banner.innerHTML = 'Demo mode &mdash; RSVPs save to your browser only. ' +
      '<button onclick="resetDemoData(); location.href=\'index.html\';">Reset demo</button>';
  } else {
    banner.style.display = 'none';
  }
}
