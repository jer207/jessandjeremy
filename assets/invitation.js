// Invitation page — renders household-specific content.

(async function () {
  const root = document.getElementById('root');
  const session = getSession();

  if (!session || session.isAdmin || !session.householdId) {
    window.location.href = 'index.html';
    return;
  }

  const h = await getHousehold(session.householdId);
  if (!h) {
    root.innerHTML = '<p>We couldn\'t find that invitation. <a href="index.html">Go back</a>.</p>';
    return;
  }

  const isBoth = h.tier === 'both';
  const householdName = householdDisplayName(h);

  const greetingSub = isBoth
    ? "You're invited to join us for both days of the weekend."
    : "You're invited to celebrate with us on Saturday.";

  // RSVP block goes near the top, above the schedule
  const rsvpTop = h.rsvp ? renderConfirmed(h) : `
    <div class="rsvp-cta">
      <a href="rsvp.html" class="btn">RSVP &rarr;</a>
      <p class="deadline">Please respond by ${WEDDING.rsvpDeadline}.</p>
    </div>`;

  // Events
  let eventsHtml = '';
  if (isBoth) eventsHtml += renderEvent(WEDDING.dayOne, 'Day One');
  eventsHtml += renderEvent(WEDDING.dayTwo, isBoth ? 'Day Two' : '');

  // Directions
  const directionsHtml = `
    <section class="section">
      <h3>Directions</h3>
      <div class="action-row">
        <a href="${WEDDING.directionsUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-small">
          Open in Google Maps &rarr;
        </a>
      </div>
      <p style="color: var(--ink-soft); margin: 0.75rem 0 0; font-size: 0.95rem;">
        Tops'l Farm &middot; Waldoboro, Maine. About 90 minutes north of Portland on Route 1.
      </p>
    </section>
  `;

  // Lodging — different content per tier
  const lodgingHtml = isBoth ? renderTopslLodging(h) : renderOffSiteLodging();

  // Registry CTA
  const registryHtml = `
    <section class="section">
      <h3>Registry</h3>
      <p style="color: var(--ink-soft); margin: 0 0 1rem; font-size: 0.95rem;">
        Your presence is the gift, truly. But if you'd like to send something, our registry is here.
      </p>
      <div class="action-row">
        <a href="${WEDDING.registryUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-small">
          View our registry &rarr;
        </a>
      </div>
    </section>
  `;

  // Things to do
  const activitiesHtml = renderActivities();

  root.innerHTML = `
    <div class="greeting">
      <p class="eyebrow">An invitation for</p>
      <h1>${escapeHtml(householdName)}</h1>
      <p style="color: var(--ink-soft); font-style: italic; margin-top: 1rem;">${greetingSub}</p>
    </div>

    ${rsvpTop}

    ${eventsHtml}

    ${directionsHtml}

    ${lodgingHtml}

    ${registryHtml}

    ${activitiesHtml}
  `;

  setupDemoBanner();
})();

function householdDisplayName(h) {
  const adults = h.adults;
  if (adults.length === 1) {
    return `${adults[0].firstName} ${adults[0].lastName}`;
  }
  // Two adults — share a last name? Use "Margaret & Daniel Carroll", else full names.
  if (adults[0].lastName === adults[1].lastName) {
    return `${adults[0].firstName} & ${adults[1].firstName} ${adults[0].lastName}`;
  }
  return `${adults[0].firstName} ${adults[0].lastName} & ${adults[1].firstName} ${adults[1].lastName}`;
}

function renderEvent(ev, dayLabel) {
  return `
    <div class="event-card">
      <div class="event-eyebrow">
        ${dayLabel ? `<span class="eyebrow">${dayLabel}</span>` : '<span></span>'}
        <span style="font-size: 0.85rem; color: var(--ink-faint); letter-spacing: 0.05em;">${ev.label}</span>
      </div>
      <h2>${ev.title}</h2>
      <p class="event-where">${ev.location}</p>
      <p class="event-details">${ev.details}</p>
    </div>
  `;
}

function renderTopslLodging(h) {
  const customNote = h && h.topslLodgingNote ? h.topslLodgingNote : '';
  const followup = customNote
    ? `<p>${escapeHtml(customNote)}</p>`
    : `<p style="font-size: 0.85rem; color: var(--ink-faint); margin-top: 0.75rem;">
         We'll follow up with specific instructions for your household closer to the date.
       </p>`;

  return `
    <section class="section">
      <h3>Where to Stay</h3>
      <div class="note-block">
        <p>You can book lodging on the farm directly through Tops'l. They handle the assignments and have a range of cabins, glamping tents, and rooms.</p>
        <p>
          <a href="${WEDDING.topslLodgingUrl}" target="_blank" rel="noopener">Book on-site lodging at Tops'l Farm &rarr;</a>
        </p>
        ${followup}
      </div>
    </section>
  `;
}

function renderOffSiteLodging() {
  const items = (WEDDING.accommodations || []).map(a => `
    <li class="lodging-item">
      <div class="name">${a.url && a.url !== '#'
        ? `<a href="${a.url}" target="_blank" rel="noopener">${escapeHtml(a.name)}</a>`
        : escapeHtml(a.name)}</div>
      ${a.distance ? `<div class="distance">${escapeHtml(a.distance)}</div>` : ''}
      ${a.note ? `<p class="note">${escapeHtml(a.note)}</p>` : ''}
    </li>
  `).join('');
  return `
    <section class="section">
      <h3>Where to Stay</h3>
      <p style="color: var(--ink-soft); margin: 0 0 1rem; font-size: 0.95rem;">
        A few places we recommend in the area. Book early &mdash; Midcoast Maine fills up in October.
      </p>
      <ul class="lodging-list">${items}</ul>
    </section>
  `;
}

function renderActivities() {
  const items = (WEDDING.thingsToDo || []).map(a => `
    <li class="activity-item">
      <div class="name">${escapeHtml(a.name)}</div>
      ${a.note ? `<p class="note">${escapeHtml(a.note)}</p>` : ''}
    </li>
  `).join('');
  return `
    <section class="section">
      <h3>Things to Do in Midcoast Maine</h3>
      <p style="color: var(--ink-soft); margin: 0 0 1rem; font-size: 0.95rem;">
        If you're making a weekend of it, here are a few of our favorites.
      </p>
      <ul class="activity-list">${items}</ul>
    </section>
  `;
}

function renderConfirmed(h) {
  const rsvp = h.rsvp;
  const yesCount = rsvp.attendees.filter(a => a.attending.day1 || a.attending.day2).length
    + (rsvp.plusOne && (rsvp.plusOne.attending.day1 || rsvp.plusOne.attending.day2) ? 1 : 0);
  const total = rsvp.attendees.length + (rsvp.plusOne ? 1 : 0);

  return `
    <div class="rsvp-confirmed">
      <h3>RSVP received</h3>
      <p>Thank you &mdash; we have your response logged on ${formatDate(rsvp.submittedAt)}.</p>
      <p>${yesCount} of ${total} attending.</p>
      <p style="margin-top: 1rem;">Need to make a change? Email <a href="mailto:${WEDDING.contactEmail}">${WEDDING.contactEmail}</a> and we'll update it.</p>
    </div>
  `;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
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
