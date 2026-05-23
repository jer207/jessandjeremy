// Invitation page — renders household-specific content with sticky nav + section accordions.

(async function () {
  const root = document.getElementById('root');
  const modalRoot = document.getElementById('modalRoot');
  const session = getSession();

  if (!session || session.isAdmin || !session.householdId) {
    window.location.href = 'index.html';
    return;
  }

  const h = await getHousehold(session.householdId);
  if (!h) {
    root.innerHTML = '<p style="text-align:center; padding: 4rem 0;">We couldn\'t find that invitation. <a href="index.html">Go back</a>.</p>';
    return;
  }

  setupDemoBanner();

  const isBoth = h.tier === 'both';
  const householdName = householdDisplayName(h);
  const submitted = !!h.rsvp;

  const subhead = isBoth
    ? "You're invited to join us for the entire weekend."
    : "You're invited to celebrate with us on Saturday.";

  // ---------- Render ----------

  root.innerHTML = renderNav(submitted) + renderHero(householdName, subhead, h) + renderItinerary(isBoth)
    + renderDirections() + renderAccommodations(h) + renderRegistry()
    + renderThingsToDo() + renderFaq(isBoth) + renderFooter();

  bindNav();
  bindAccordions();
  setupScrollSpy();

  // ---------- Nav button wiring ----------

  document.querySelectorAll('[data-action="open-rsvp"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (submitted) {
        openContactModal();
      } else {
        window.RsvpModal.open(h, { onSuccess: () => location.reload() });
      }
    });
  });

  document.querySelectorAll('[data-action="open-contact"]').forEach(btn => {
    btn.addEventListener('click', openContactModal);
  });

  // ---------- Modal ----------

  function openContactModal() {
    modalRoot.innerHTML = renderContactModal(h);
    document.body.style.overflow = 'hidden';

    const close = () => {
      modalRoot.innerHTML = '';
      document.body.style.overflow = '';
    };
    modalRoot.querySelector('.modal-close').addEventListener('click', close);
    modalRoot.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) close();
    });

    const fields = {
      firstName: modalRoot.querySelector('#cmFirstName'),
      lastName: modalRoot.querySelector('#cmLastName'),
      email: modalRoot.querySelector('#cmEmail'),
      message: modalRoot.querySelector('#cmMessage')
    };
    const sendBtn = modalRoot.querySelector('#cmSendBtn');

    const checkValid = () => {
      const ok = fields.firstName.value.trim() && fields.lastName.value.trim() &&
                 fields.message.value.trim() && fields.email.value.includes('@');
      sendBtn.disabled = !ok;
    };
    Object.values(fields).forEach(f => f.addEventListener('input', checkValid));
    checkValid();

    sendBtn.addEventListener('click', () => {
      const body = encodeURIComponent(fields.message.value.trim() +
        '\n\n— ' + fields.firstName.value.trim() + ' ' + fields.lastName.value.trim() +
        '\n' + fields.email.value.trim());
      const subject = encodeURIComponent('Hello from ' + fields.firstName.value.trim() + ' ' + fields.lastName.value.trim());
      // Open the user's mail client; this matches the existing site pattern of falling
      // back to email since the Apps Script backend doesn't have a contact endpoint.
      window.location.href = 'mailto:' + WEDDING.contactEmail + '?subject=' + subject + '&body=' + body;

      // Swap to confirmation view
      modalRoot.querySelector('.modal-body').innerHTML = renderContactSent();
      modalRoot.querySelector('#cmCloseBtn').addEventListener('click', close);
    });
  }
})();

// ============================================================
// Renderers
// ============================================================

function renderNav(submitted) {
  const rightAction = submitted
    ? `<button class="btn btn-secondary btn-small" data-action="open-contact" type="button">
         <span aria-hidden="true">✉</span> Contact
       </button>`
    : `<button class="btn btn-small btn-coral" data-action="open-rsvp" type="button">RSVP</button>`;

  const navItems = [
    { id: 'itinerary-day-1', label: 'Itinerary', spy: 'itinerary' },
    { id: 'directions', label: 'How to Get There', spy: 'directions' },
    { id: 'accommodations', label: 'Where to Stay', spy: 'accommodations' },
    { id: 'registry', label: 'Registry', spy: 'registry' },
    { id: 'things-to-do', label: 'Things to Do', spy: 'things-to-do' },
    { id: 'faq', label: 'FAQs', spy: 'faq' }
  ];
  const linksHtml = navItems.map(it =>
    `<button type="button" data-target="${it.id}" data-spy="${it.spy}">${it.label}</button>`
  ).join('');

  return `
    <nav class="sticky-nav" id="stickyNav">
      <button type="button" class="sticky-nav-brand" id="navBrand">J&amp;J</button>
      <div class="sticky-nav-links" id="navLinks">${linksHtml}</div>
      <div class="sticky-nav-actions">
        ${rightAction}
        <button type="button" class="sticky-nav-burger" id="navBurger" aria-label="Menu">☰</button>
      </div>
    </nav>
    <div class="mobile-menu" id="mobileMenu">${linksHtml}</div>
  `;
}

function renderHero(householdName, subhead, h) {
  const submitted = !!h.rsvp;
  let hero;
  if (submitted) {
    hero = renderConfirmedCard(h);
  } else {
    hero = `
      <button type="button" class="btn" data-action="open-rsvp">RSVP &rarr;</button>
      <div class="inv-hero-deadline">Please respond by ${escapeHtml(WEDDING.rsvpDeadline)}.</div>
    `;
  }
  return `
    <section class="inv-hero warm-backdrop warm-backdrop-strong">
      <div class="inv-hero-inner">
        <p class="eyebrow">An invitation for</p>
        <h1>${escapeHtml(householdName)}</h1>
        <div class="inv-hero-asterisk">*</div>
        <p class="inv-hero-subhead">${escapeHtml(subhead)}</p>
        ${hero}
      </div>
    </section>
  `;
}

function renderConfirmedCard(h) {
  const summary = attendingSummary(h);
  const submittedDate = formatLongDate(h.rsvp.submittedAt);
  return `
    <div class="confirmed-card">
      <div class="confirmed-card-header">
        <span class="confirmed-check">&#10003;</span>
        <h3>RSVP received</h3>
      </div>
      <p>Thank you — we have your response logged on ${escapeHtml(submittedDate)}.</p>
      <p class="attending-summary">${escapeHtml(summary)}</p>
      <p class="footnote">Need to make a change? Email <a href="mailto:${WEDDING.contactEmail}">${WEDDING.contactEmail}</a> and we'll update it.</p>
    </div>
  `;
}

function renderItinerary(isBoth) {
  const days = [];
  if (isBoth) {
    days.push({
      anchor: 'itinerary-day-1',
      label: 'Day One',
      data: WEDDING.dayOne,
      accent: 'olive'
    });
  }
  days.push({
    anchor: 'itinerary-day-1',
    label: isBoth ? 'Day Two' : 'Saturday',
    data: WEDDING.dayTwo,
    accent: 'coral',
    anchorDayTwo: isBoth ? 'itinerary-day-2' : 'itinerary-day-1'
  });

  // Re-key anchors so day 1 always has itinerary-day-1
  if (isBoth) {
    days[0].anchor = 'itinerary-day-1';
    days[1].anchor = 'itinerary-day-2';
  } else {
    days[0].anchor = 'itinerary-day-1';
  }

  const cardsHtml = days.map(d => {
    const coral = d.accent === 'coral';
    return `
      <article class="day-card ${coral ? 'coral' : ''}" id="${d.anchor}">
        <div class="day-eyebrow">
          <span class="day-pill ${coral ? 'day-pill-coral' : ''}">${escapeHtml(d.label)}</span>
          <span class="day-date">${escapeHtml(d.data.label)}</span>
        </div>
        <h2>${escapeHtml(d.data.title)}</h2>
        <div class="day-place">${pinIcon()} ${escapeHtml(d.data.location)}</div>
        <p class="day-body">${escapeHtml(d.data.details)}</p>
      </article>
    `;
  }).join('');

  return `
    <section id="itinerary" class="itinerary">
      <div class="itinerary-grid">${cardsHtml}</div>
    </section>
  `;
}

function renderDirections() {
  return `
    <section id="directions" class="inv-section directions">
      <div class="inv-section-narrow" style="text-align:center;">
        <div class="section-head">
          <p class="eyebrow">How to get there</p>
          <h2>Directions</h2>
        </div>
        <p class="directions-body">
          <strong>Tops'l Farm</strong> &middot; Waldoboro, Maine.
          About 90 minutes north of Portland on Route 1.
        </p>
        <div class="btn-row">
          <a class="btn" href="${WEDDING.directionsUrl}" target="_blank" rel="noopener">
            Open in Google Maps &rarr;
          </a>
        </div>
      </div>
    </section>
  `;
}

function renderAccommodations(h) {
  const parsed = parseLodgingNote(h.topslLodgingNote);
  if (parsed) {
    return `
      <section id="accommodations" class="inv-section inv-section-soft">
        <div class="inv-section-wide">
          <div class="section-head">
            <p class="eyebrow">Where to stay</p>
            <h2>Accommodations</h2>
          </div>
          <div class="acc-grid">
            <div class="lodging-card featured">
              <div class="reserved-pill">${tentIcon()} Reserved for you</div>
              <h3>${escapeHtml(parsed.heading)}</h3>
              <p>${escapeHtml(parsed.body).replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')}</p>
              <a class="btn" href="${WEDDING.topslLodgingUrl}" target="_blank" rel="noopener">
                Book on-site lodging at Tops'l Farm &rarr;
              </a>
            </div>
            <div class="lodging-card">
              <p class="eyebrow" style="margin-bottom: 16px;">Staying off-farm?</p>
              <h3 style="font-size: clamp(22px, 2.6vw, 28px); line-height: 1.2;">Let us know so we can offer your site to another guest.</h3>
              <p>You can mark this when you RSVP. There are a handful of inns in nearby Damariscotta and Rockland; we're happy to share favorites — just ask.</p>
              <a class="btn btn-secondary btn-small" href="mailto:${WEDDING.contactEmail}">
                Ask us for ideas &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // No on-site assignment: show off-site recommendations as full-width cards within the narrow container.
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
    <section id="accommodations" class="inv-section inv-section-soft">
      <div class="inv-section-narrow">
        <div class="section-head">
          <p class="eyebrow">Where to stay</p>
          <h2>Accommodations</h2>
          <p class="intro">A few places we recommend in the area. Book early — Midcoast Maine fills up in October.</p>
        </div>
        <ul class="lodging-list">${items}</ul>
      </div>
    </section>
  `;
}

function parseLodgingNote(note) {
  if (!note || !String(note).trim()) return null;
  const text = String(note);
  const idx = text.indexOf(';');
  if (idx < 0) return { heading: 'Your reserved site', body: text.trim() };
  return { heading: text.slice(0, idx).trim(), body: text.slice(idx + 1).trim() };
}

function renderRegistry() {
  return `
    <section id="registry" class="inv-section registry">
      <div class="inv-section-narrow">
        <div class="section-head">
          <p class="eyebrow">If you'd like</p>
          <h2>Registry</h2>
          <p class="intro">Your presence is the gift, truly. But if you'd like to send something, our registry is here.</p>
        </div>
        <a class="btn btn-coral" href="${WEDDING.registryUrl}" target="_blank" rel="noopener">
          View our registry &rarr;
        </a>
      </div>
    </section>
  `;
}

function renderThingsToDo() {
  const items = (WEDDING.thingsToDo || []).map((it, i) => renderAccordionItem(it.name, it.note, it.tags, it.meta, i === 0));
  return `
    <section id="things-to-do" class="inv-section inv-section-soft">
      <div class="inv-section-wide">
        <div class="section-head">
          <p class="eyebrow">Things to do</p>
          <h2>Things to Do in Midcoast Maine</h2>
          <p class="intro">A few favorites if you're coming a day early or making a long weekend of it.</p>
        </div>
        <div class="accordion">${items.join('')}</div>
      </div>
    </section>
  `;
}

function renderFaq(isBoth) {
  const list = isBoth ? (WEDDING.faqBoth || []) : (WEDDING.faqDay2 || []);
  const items = list.map(it => renderAccordionItem(it.title, it.body, null, null, false));
  return `
    <section id="faq" class="inv-section">
      <div class="inv-section-wide">
        <div class="faq-head">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div class="accordion">${items.join('')}</div>
      </div>
    </section>
  `;
}

function renderAccordionItem(title, body, tags, meta, open) {
  const tagsHtml = tags && tags.length
    ? `<span class="accordion-tags">${tags.map(t => `<span class="accordion-tag">${escapeHtml(t)}</span>`).join('')}</span>`
    : '';
  const metaHtml = meta ? `<div class="accordion-meta">${escapeHtml(meta)}</div>` : '';
  return `
    <div class="accordion-item ${open ? 'open' : ''}">
      <button class="accordion-button" type="button">
        <span class="accordion-title">${escapeHtml(title)}</span>
        ${tagsHtml}
        <span class="accordion-toggle">${open ? '−' : '+'}</span>
      </button>
      <div class="accordion-panel">
        <div class="accordion-panel-inner">
          ${metaHtml}
          <div class="accordion-body">${escapeHtml(body)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      Questions? Email <a href="mailto:${WEDDING.contactEmail}">${WEDDING.contactEmail}</a>
    </footer>
  `;
}

function renderContactModal(h) {
  const defaultEmail = (h.adults[0] && h.adults[0].email) || '';
  return `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card contact narrow">
        <div class="modal-topbar">
          <div class="modal-title">Contact</div>
          <button type="button" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <h2>Need to update or have a question?</h2>
          <div class="contact-fields">
            <div class="contact-row">
              <label class="field">
                <span class="field-label">First name</span>
                <input type="text" id="cmFirstName" class="field-input" placeholder="">
              </label>
              <label class="field">
                <span class="field-label">Last name</span>
                <input type="text" id="cmLastName" class="field-input" placeholder="">
              </label>
            </div>
            <label class="field">
              <span class="field-label">Your email</span>
              <input type="email" id="cmEmail" class="field-input" placeholder="you@example.com" value="${escapeAttr(defaultEmail)}">
            </label>
            <label class="field">
              <span class="field-label">Message</span>
              <textarea id="cmMessage" class="field-textarea" rows="5" placeholder="Hi Jess &amp; Jeremy…"></textarea>
            </label>
          </div>
          <div class="contact-actions">
            <a class="or-email" href="mailto:${WEDDING.contactEmail}">Or email ${WEDDING.contactEmail} directly</a>
            <button type="button" class="btn btn-small" id="cmSendBtn">Send &rarr;</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderContactSent() {
  return `
    <div class="success">
      <div class="success-check">&#10003;</div>
      <h2>Got it!</h2>
      <p>Thanks for the note — we've opened your email client. Send when you're ready and we'll reply soon.</p>
      <button type="button" class="btn btn-secondary" id="cmCloseBtn">Close</button>
    </div>
  `;
}

// ============================================================
// Wiring
// ============================================================

function bindNav() {
  const stickyNav = document.getElementById('stickyNav');
  const brand = document.getElementById('navBrand');
  const burger = document.getElementById('navBurger');
  const mobile = document.getElementById('mobileMenu');

  brand.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  burger.addEventListener('click', () => mobile.classList.toggle('open'));

  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top, behavior: 'smooth' });
    mobile.classList.remove('open');
  }
  document.querySelectorAll('.sticky-nav-links button, .mobile-menu button').forEach(btn => {
    btn.addEventListener('click', () => jumpTo(btn.getAttribute('data-target')));
  });

  const onScroll = () => stickyNav.classList.toggle('scrolled', window.scrollY > 16);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function bindAccordions() {
  document.querySelectorAll('.accordion').forEach(acc => {
    acc.querySelectorAll('.accordion-item').forEach(item => {
      const btn = item.querySelector('.accordion-button');
      const toggle = item.querySelector('.accordion-toggle');
      btn.addEventListener('click', () => {
        const open = item.classList.toggle('open');
        toggle.textContent = open ? '−' : '+';
      });
    });
  });
}

function setupScrollSpy() {
  const ids = ['itinerary-day-1', 'itinerary-day-2', 'directions', 'accommodations', 'registry', 'things-to-do', 'faq'];
  const links = Array.from(document.querySelectorAll('.sticky-nav-links button'));
  if (!('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!visible.length) return;
    let id = visible[0].target.id;
    if (id.startsWith('itinerary-day')) id = 'itinerary';
    links.forEach(b => b.classList.toggle('active', b.getAttribute('data-spy') === id));
  }, { rootMargin: '-110px 0px -55% 0px', threshold: [0, 0.2, 0.6] });

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) obs.observe(el);
  });
}

// ============================================================
// Utilities
// ============================================================

function householdDisplayName(h) {
  const adults = h.adults;
  if (adults.length === 1) {
    return `${adults[0].firstName} ${adults[0].lastName}`;
  }
  if (adults[0].lastName === adults[1].lastName) {
    return `${adults[0].firstName} & ${adults[1].firstName} ${adults[0].lastName}`;
  }
  return `${adults[0].firstName} ${adults[0].lastName} & ${adults[1].firstName} ${adults[1].lastName}`;
}

function attendingSummary(h) {
  const rsvp = h.rsvp;
  if (!rsvp || !rsvp.attendees) return '';
  const isBoth = h.tier === 'both';
  const attending = rsvp.attendees.filter(a => a.attending && (a.attending.day1 || a.attending.day2));
  const plusOne = rsvp.plusOne && (rsvp.plusOne.attending.day1 || rsvp.plusOne.attending.day2) ? rsvp.plusOne : null;
  const total = rsvp.attendees.length + (rsvp.plusOne ? 1 : 0);
  const going = attending.length + (plusOne ? 1 : 0);
  if (going === 0) return 'Regrets — sending love from afar.';
  if (isBoth) {
    const hasFri = [...attending, plusOne].filter(Boolean).some(a => a.attending.day1);
    const hasSat = [...attending, plusOne].filter(Boolean).some(a => a.attending.day2);
    if (hasFri && hasSat) return `${going} of ${total} attending Friday & Saturday`;
    if (hasFri) return `${going} of ${total} attending Friday`;
    return `${going} of ${total} attending Saturday`;
  }
  return `${going} of ${total} attending Saturday`;
}

function formatLongDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function escapeAttr(s) { return escapeHtml(s); }

function pinIcon() {
  return '<svg class="icn" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
}

function tentIcon() {
  return '<svg class="icn" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 21 12 4l8.5 17z"/><path d="M12 4v17"/><path d="M8.5 21l3.5-5 3.5 5"/></svg>';
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
