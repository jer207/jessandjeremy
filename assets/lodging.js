// Lodging detail + booking page.
//
// Reads the logged-in household's assigned room (joined from the Room Specs
// sheet / demo ROOM_SPECS) and renders the booking page in the site's style.
// Guests with no assignment are bounced back to their invitation.

const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/6oU3cx74H7rP7uB0lVew801';

(async function () {
  const root = document.getElementById('root');
  const session = getSession();

  if (!session || session.isAdmin || !session.householdId) {
    window.location.href = 'index.html';
    return;
  }

  const h = await getHousehold(session.householdId);
  if (!h) {
    window.location.href = 'index.html';
    return;
  }
  if (!h.lodging) {
    // No room assigned — the lodging page has nothing to show.
    window.location.href = 'invitation.html';
    return;
  }

  setupDemoBanner();

  root.innerHTML = renderNav() + renderMain(h, h.lodging) + renderFooter();
  bindNav();
})();

function renderNav() {
  return `
    <nav class="lodge-nav" id="lodgeNav">
      <a class="lodge-nav-brand" href="invitation.html">J&amp;J</a>
      <div class="lodge-nav-title">Accommodations</div>
      <div class="lodge-nav-actions">
        <a class="btn btn-secondary btn-small" href="invitation.html">&larr;&nbsp;<span class="lodge-return-label">Return to Invitation</span></a>
      </div>
    </nav>
  `;
}

function renderMain(h, L) {
  const eyebrow = 'Reserved for ' + escapeHtml(adultFirstNames(h)) + ' · ' + escapeHtml(L.venue);
  const price = formatPrice(L.price);
  const roomWord = L.imageKey === 'aframe' ? 'Your Cabin' : 'Your Room';

  const gallery = [1, 2, 3].map(n => `
    <div class="lodge-shot">
      <img src="assets/lodging-images/${escapeAttr(L.imageKey)}${n}.webp" alt="${escapeAttr(L.room)} — photo ${n}" loading="lazy">
    </div>
  `).join('');

  const inclusions = (L.inclusions || []).map(i =>
    `<li>${checkIcon()} <span>${escapeHtml(i)}</span></li>`
  ).join('');

  return `
    <main class="lodge-main">
      <header class="lodge-head">
        <p class="eyebrow lodge-eyebrow">${eyebrow}</p>
        <h1 class="lodge-room-title">${escapeHtml(L.room)}</h1>
        <div class="lodge-meta">
          <span class="lodge-price">$${price}<span class="lodge-price-unit">/ for the weekend</span></span>
          <span class="lodge-assigned">${tentIcon()} Assigned to your household</span>
        </div>
      </header>

      <div class="lodge-gallery">${gallery}</div>

      <div class="lodge-cols">
        <div class="lodge-body">
          <section class="lodge-sec">
            <h2>About ${escapeHtml(L.venue)}</h2>
            <p>${escapeHtml(L.venueDescription || '')}</p>
          </section>
          <div class="lodge-rule"></div>
          <section class="lodge-sec">
            <h2>${escapeHtml(roomWord)}</h2>
            <p>${escapeHtml(L.roomDescription || '')}</p>
          </section>
          <div class="lodge-rule"></div>
          <section class="lodge-sec">
            <h2>Specifications &amp; included amenities</h2>
            <ul class="lodge-incl">${inclusions}</ul>
          </section>
        </div>

        <aside class="lodge-aside">
          <div class="lodge-book">
            <div class="lodge-book-room">${escapeHtml(L.room)}</div>
            <div class="lodge-book-venue">${escapeHtml(L.venue)}</div>
            <div class="lodge-inout">
              <div class="lodge-inout-cell">
                <div class="lbl">Check-in</div>
                <div class="val">${escapeHtml(L.checkIn || '')}</div>
              </div>
              <div class="lodge-inout-cell">
                <div class="lbl">Check-out</div>
                <div class="val">${escapeHtml(L.checkOut || '')}</div>
              </div>
            </div>
            <div class="lodge-total">
              <span>Total for the weekend</span>
              <span class="lodge-total-num">$${price}</span>
            </div>
            <a class="btn lodge-book-btn" href="${STRIPE_CHECKOUT_URL}">Reserve &amp; check out &rarr;</a>
            <div class="lodge-secure">${lockIcon()} Secure payment via Stripe</div>
          </div>
        </aside>
      </div>
    </main>
  `;
}

function renderFooter() {
  return `
    <footer class="lodge-footer">
      Questions? Email <a href="mailto:${WEDDING.contactEmail}">${WEDDING.contactEmail}</a>
    </footer>
  `;
}

function bindNav() {
  const nav = document.getElementById('lodgeNav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 16);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ---------- Utilities ----------

function adultFirstNames(h) {
  const names = (h.adults || []).map(a => a.firstName).filter(Boolean);
  if (names.length <= 1) return names[0] || 'you';
  return names.join(' & ');
}

function formatPrice(v) {
  const n = Math.round(Number(v));
  return isFinite(n) ? n.toLocaleString('en-US') : String(v);
}

function tentIcon() {
  return '<svg class="icn" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 21 12 4l8.5 17z"/><path d="M12 4v17"/><path d="M8.5 21l3.5-5 3.5 5"/></svg>';
}

function checkIcon() {
  return '<svg class="icn" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"/></svg>';
}

function lockIcon() {
  return '<svg class="icn" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.4"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

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
