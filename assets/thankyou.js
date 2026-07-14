// Lodging confirmation / thank-you page.
//
// Reached after Stripe checkout (set the payment link's after-payment redirect
// to this page). Names the room/venue from the browser session when available,
// and falls back to generic copy when the session is missing.

(async function () {
  const root = document.getElementById('root');
  const session = getSession();

  let lodging = null;
  if (session && session.householdId && !session.isAdmin) {
    try {
      const h = await getHousehold(session.householdId);
      if (h && h.lodging) lodging = h.lodging;
    } catch (e) { /* fall back to generic copy */ }
  }

  setupDemoBanner();

  root.innerHTML = renderNav() + renderMain(lodging) + renderFooter();
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

function renderMain(L) {
  const recap = L
    ? `We've received your booking for the <strong>${escapeHtml(L.room)}</strong> at <strong>${escapeHtml(L.venue)}</strong>. We can't wait to have you with us for the whole weekend.`
    : `We've received your booking. We can't wait to have you with us for the whole weekend.`;

  return `
    <main class="thanks-main">
      <div class="thanks-seal">&#10003;</div>
      <p class="eyebrow thanks-eyebrow">Reservation confirmed</p>
      <h1 class="thanks-title">Thank you — you're all set</h1>
      <p class="thanks-lead">${recap}</p>
      <div class="thanks-note">
        <p>One small note: your invitation page may take a few days to show your stay as
        confirmed. We check these by hand and mark each household as we go — so if it still
        looks unconfirmed for a little while, no need to worry. It's on our list, and we'll
        have it updated soon.</p>
      </div>
      <div class="thanks-actions">
        <a class="btn" href="invitation.html">&larr;&nbsp;Return to Invitation</a>
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

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
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
