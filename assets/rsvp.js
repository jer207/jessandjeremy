// RSVP modal — multi-step form. Renders a full-screen modal shell with a progress bar.

(async function () {
  const root = document.getElementById('root');
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

  // If already submitted, send them back to the confirmation view.
  if (h.rsvp) {
    window.location.href = 'invitation.html';
    return;
  }

  setupDemoBanner();

  const isBoth = h.tier === 'both';

  // ---------- State ----------

  const attendees = [
    ...h.adults.map(a => ({
      name: `${a.firstName} ${a.lastName}`,
      firstName: a.firstName,
      role: 'adult',
      attending: { day1: isBoth, day2: true },
      dietary: ''
    })),
    ...h.children.map(name => ({
      name,
      firstName: name,
      role: 'child',
      attending: { day1: isBoth, day2: true },
      dietary: ''
    }))
  ];

  const plusOne = h.plusOneAllowed
    ? { bringing: false, name: '', attending: { day1: isBoth, day2: true }, dietary: '' }
    : null;

  const state = {
    attendees,
    plusOne,
    accommodations: isBoth ? 'onsite' : null,
    notes: '',
    contactEmail: (h.adults[0] && h.adults[0].email) || ''
  };

  // ---------- Step plan ----------
  //   0..N-1                attendees (and children)
  //   then (optional)       plus-one
  //   then (if both-day)    accommodations
  //   then                  notes / message
  //   then                  review
  //   then                  success
  const steps = [];
  attendees.forEach((_, i) => steps.push({ type: 'attendee', index: i }));
  if (plusOne) steps.push({ type: 'plusOne' });
  if (isBoth) steps.push({ type: 'accommodations' });
  steps.push({ type: 'notes' });
  steps.push({ type: 'review' });

  let currentStep = 0;
  const totalInputSteps = steps.length;

  function render() {
    if (currentStep >= totalInputSteps) {
      renderSuccess();
      return;
    }
    const step = steps[currentStep];

    const progress = Math.min(1, currentStep / (totalInputSteps - 1));
    const stepCount = `${currentStep + 1} of ${totalInputSteps}`;

    let stepLabel, body;
    if (step.type === 'attendee') {
      const att = attendees[step.index];
      stepLabel = `Step ${currentStep + 1} · ${att.firstName}`;
      body = renderAttendee(att, isBoth);
    } else if (step.type === 'plusOne') {
      stepLabel = 'Plus one';
      body = renderPlusOne(plusOne, isBoth);
    } else if (step.type === 'accommodations') {
      stepLabel = 'Accommodations';
      body = renderAccommodations(state.accommodations);
    } else if (step.type === 'notes') {
      stepLabel = 'Household message';
      body = renderNotes(state);
    } else {
      stepLabel = 'Review';
      body = renderReview(state, isBoth, h);
    }

    root.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-topbar">
            <div class="modal-title">RSVP · ${escapeHtml(householdDisplayName(h))}</div>
            <a class="modal-close" href="invitation.html" aria-label="Close">×</a>
          </div>
          <div class="modal-progress-wrap">
            <div class="modal-progress">
              <div class="modal-progress-bar" style="width: ${Math.max(2, progress * 100)}%;"></div>
            </div>
          </div>
          <div class="modal-body">
            <div class="step">
              <div class="step-header">
                <span>${escapeHtml(stepLabel)}</span>
                <span class="step-count">${stepCount}</span>
              </div>
              ${body}
              <div class="step-nav">
                ${currentStep > 0
                  ? '<button type="button" class="btn btn-ghost" id="backBtn">← Back</button>'
                  : '<span></span>'}
                <button type="button" class="btn" id="nextBtn">
                  ${step.type === 'review' ? 'Submit RSVP ✓' : 'Continue →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindStep(step);
    const backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', () => { currentStep--; render(); });

    const nextBtn = document.getElementById('nextBtn');
    if (step.type === 'review') {
      nextBtn.addEventListener('click', handleSubmit);
    } else {
      nextBtn.addEventListener('click', () => {
        if (validateStep(step)) { currentStep++; render(); }
      });
      nextBtn.disabled = !isStepValid(step);
    }
  }

  // ---------- Renderers ----------

  function renderAttendee(att, isBoth) {
    const attendingAny = att.attending.day1 || att.attending.day2;
    const attendingState = attendingAny ? 'yes' : (att._answered === false ? 'no' : 'yes');

    const yesNoHtml = `
      <div class="choice-grid-2" id="attYesNo">
        <button type="button" class="choice radio ${attendingState === 'yes' ? 'checked' : ''}" data-attending="yes">
          <span class="choice-mark"><span class="choice-mark-dot"></span></span>
          <span class="choice-body">
            <div class="choice-title">Yes, joyfully</div>
            <div class="choice-sub">Count me in</div>
          </span>
        </button>
        <button type="button" class="choice radio ${attendingState === 'no' ? 'checked' : ''}" data-attending="no">
          <span class="choice-mark"><span class="choice-mark-dot"></span></span>
          <span class="choice-body">
            <div class="choice-title">Sadly no</div>
            <div class="choice-sub">Will miss the day</div>
          </span>
        </button>
      </div>
    `;

    let daysHtml = '';
    if (isBoth && attendingState === 'yes') {
      daysHtml = `
        <label class="field" style="margin-top: 22px; display: block;">
          <span class="field-label">Which days?</span>
          <div class="choice-grid-2">
            <button type="button" class="choice ${att.attending.day1 ? 'checked' : ''}" data-day="day1">
              <span class="choice-mark"><span class="choice-mark-tick">✓</span></span>
              <span class="choice-body">
                <div class="choice-title">Friday, October 2</div>
                <div class="choice-sub">Ceremony &amp; Dinner</div>
              </span>
            </button>
            <button type="button" class="choice ${att.attending.day2 ? 'checked' : ''}" data-day="day2">
              <span class="choice-mark"><span class="choice-mark-tick">✓</span></span>
              <span class="choice-body">
                <div class="choice-title">Saturday, October 3</div>
                <div class="choice-sub">Lobster Bake &amp; Celebration</div>
              </span>
            </button>
          </div>
          <span class="field-helper">Select all that apply.</span>
        </label>
      `;
    }

    const dietaryHtml = attendingState === 'yes' ? `
      <label class="field" style="margin-top: 22px; display: block;">
        <span class="field-label">Dietary restrictions or allergies (optional)</span>
        <input type="text" id="dietary" class="field-input" value="${escapeAttr(att.dietary)}" placeholder="e.g. vegetarian, gluten-free, nut allergy">
      </label>
    ` : '';

    return `
      <h2>${escapeHtml(att.name)}</h2>
      <p class="step-question">Will ${escapeHtml(att.firstName)} be able to make it?</p>
      ${yesNoHtml}
      ${daysHtml}
      ${dietaryHtml}
    `;
  }

  function renderPlusOne(po, isBoth) {
    const dayLabel = isBoth ? 'the weekend' : 'Saturday';
    const daysHtml = (po.bringing && isBoth) ? `
      <label class="field" style="margin-top: 22px; display: block;">
        <span class="field-label">Which days?</span>
        <div class="choice-grid-2">
          <button type="button" class="choice ${po.attending.day1 ? 'checked' : ''}" data-po-day="day1">
            <span class="choice-mark"><span class="choice-mark-tick">✓</span></span>
            <span class="choice-body">
              <div class="choice-title">Friday, October 2</div>
              <div class="choice-sub">Ceremony &amp; Dinner</div>
            </span>
          </button>
          <button type="button" class="choice ${po.attending.day2 ? 'checked' : ''}" data-po-day="day2">
            <span class="choice-mark"><span class="choice-mark-tick">✓</span></span>
            <span class="choice-body">
              <div class="choice-title">Saturday, October 3</div>
              <div class="choice-sub">Lobster Bake &amp; Celebration</div>
            </span>
          </button>
        </div>
      </label>
    ` : '';

    const dietaryHtml = po.bringing ? `
      <label class="field" style="margin-top: 22px; display: block;">
        <span class="field-label">Guest's dietary restrictions (optional)</span>
        <input type="text" id="poDietary" class="field-input" value="${escapeAttr(po.dietary)}" placeholder="e.g. vegan">
      </label>
    ` : '';

    return `
      <h2>Bringing a guest?</h2>
      <p class="step-question">You're welcome to bring a plus-one to ${dayLabel}. Let us know their name so we can plan accordingly.</p>

      <label class="field" style="display: block;">
        <span class="field-label">Guest's full name</span>
        <input type="text" id="poName" class="field-input" value="${escapeAttr(po.name)}" placeholder="Leave blank if you won't be bringing one">
        <span class="field-helper">Typing a name will check the box automatically.</span>
      </label>

      <button type="button" class="choice ${po.bringing ? 'checked' : ''}" id="poBringingToggle" style="margin-top: 16px;">
        <span class="choice-mark"><span class="choice-mark-tick">✓</span></span>
        <span class="choice-body">
          <div class="choice-title">Yes, I'm bringing a guest</div>
        </span>
      </button>
      ${daysHtml}
      ${dietaryHtml}
    `;
  }

  function renderAccommodations(value) {
    return `
      <h2>Will you be staying with us overnight?</h2>
      <p class="step-question tight">
        Glamping sites at Tops'l Farm are limited, so we've assigned one per household. Your site is reserved and waiting — let us know if you'll use it, or if you'll be making other arrangements so we can offer it to another guest.
      </p>
      <div style="margin-bottom: 28px;">
        <a class="btn btn-secondary btn-small" href="${WEDDING.topslLodgingUrl}" target="_blank" rel="noopener">
          Details &amp; booking at Tops'l Farm &rarr;
        </a>
      </div>
      <label class="field" style="display: block;">
        <span class="field-label">Please check one:</span>
        <div class="choice-grid">
          <button type="button" class="choice radio ${value === 'onsite' ? 'checked' : ''}" data-acc="onsite">
            <span class="choice-mark"><span class="choice-mark-dot"></span></span>
            <span class="choice-body">
              <div class="choice-title">Yes, we have or plan to book at Tops'l Farm</div>
              <div class="choice-sub">We'll save your reserved site</div>
            </span>
          </button>
          <button type="button" class="choice radio ${value === 'offsite' ? 'checked' : ''}" data-acc="offsite">
            <span class="choice-mark"><span class="choice-mark-dot"></span></span>
            <span class="choice-body">
              <div class="choice-title">No, we will make other overnight arrangements</div>
              <div class="choice-sub">We'll offer the site to another guest</div>
            </span>
          </button>
        </div>
      </label>
    `;
  }

  function renderNotes(s) {
    return `
      <h2>Anything else?</h2>
      <p class="step-question">A note for us, song request, accessibility need, or just hello.</p>
      <label class="field" style="display: block;">
        <span class="field-label">Message (optional)</span>
        <textarea id="notes" class="field-textarea" rows="4" placeholder="We can't wait to celebrate with you both…">${escapeHtml(s.notes)}</textarea>
      </label>
      <label class="field" style="display: block;">
        <span class="field-label">Best email to reach you</span>
        <input type="email" id="contactEmail" class="field-input" value="${escapeAttr(s.contactEmail)}" placeholder="you@example.com">
      </label>
    `;
  }

  function renderReview(s, isBoth, h) {
    const rows = [];
    s.attendees.forEach(a => rows.push(reviewRow(a.name, a, isBoth)));
    if (s.plusOne && s.plusOne.bringing && s.plusOne.name.trim()) {
      rows.push(reviewRow(s.plusOne.name + ' (guest)', s.plusOne, isBoth));
    }

    const lodgingRow = isBoth ? `
      <div class="review-row lodging-row">
        <div class="meta-label">Lodging</div>
        <div class="status">${s.accommodations === 'onsite' ? "Tops'l Farm site" : 'Off-site'}</div>
      </div>
    ` : '';

    const noteRow = s.notes ? `
      <div class="review-row note-row">
        <div class="review-note-label">Note for the couple</div>
        <div class="review-note-body">"${escapeHtml(s.notes)}"</div>
      </div>
    ` : '';

    return `
      <h2>Review &amp; submit</h2>
      <p class="step-question">Make sure everything looks right.</p>
      <div class="review-list">
        ${rows.join('')}
        ${lodgingRow}
        ${noteRow}
      </div>
      <p class="review-footnote">
        After submitting, you can change anything by emailing
        <a href="mailto:${WEDDING.contactEmail}">${WEDDING.contactEmail}</a>.
      </p>
    `;
  }

  function reviewRow(name, person, isBoth) {
    const attending = person.attending.day1 || person.attending.day2;
    let summary;
    if (!attending) {
      summary = 'Regrets';
    } else if (isBoth) {
      if (person.attending.day1 && person.attending.day2) summary = 'Friday &amp; Saturday';
      else if (person.attending.day1) summary = 'Friday only';
      else summary = 'Saturday only';
    } else {
      summary = 'Attending Saturday';
    }
    const dietHtml = person.dietary ? `<div class="diet">Diet: ${escapeHtml(person.dietary)}</div>` : '';
    return `
      <div class="review-row">
        <div>
          <div class="person">${escapeHtml(name)}</div>
          ${dietHtml}
        </div>
        <div class="status ${attending ? '' : 'not-attending'}">${summary}</div>
      </div>
    `;
  }

  function renderSuccess() {
    const going = state.attendees.filter(a => a.attending.day1 || a.attending.day2).length
      + (state.plusOne && state.plusOne.bringing && (state.plusOne.attending.day1 || state.plusOne.attending.day2) ? 1 : 0);
    const total = state.attendees.length + (state.plusOne && state.plusOne.bringing ? 1 : 0);
    root.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-topbar">
            <div class="modal-title">RSVP · ${escapeHtml(householdDisplayName(h))}</div>
            <a class="modal-close" href="invitation.html" aria-label="Close">×</a>
          </div>
          <div class="modal-body">
            <div class="success">
              <div class="success-check">&#10003;</div>
              <h2>Thank you!</h2>
              <p>Your RSVP is in. We've logged <strong>${going} of ${total}</strong> attending from your household — we can't wait.</p>
              <p class="small">Need to make a change? Email <a href="mailto:${WEDDING.contactEmail}">${WEDDING.contactEmail}</a>.</p>
              <a class="btn" href="invitation.html">Back to invitation</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Step bindings ----------

  function bindStep(step) {
    if (step.type === 'attendee') {
      const att = attendees[step.index];

      document.querySelectorAll('#attYesNo .choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const yes = btn.getAttribute('data-attending') === 'yes';
          att._answered = !yes;
          if (yes) {
            // Default to all days they're invited to
            att.attending.day1 = isBoth;
            att.attending.day2 = true;
          } else {
            att.attending.day1 = false;
            att.attending.day2 = false;
          }
          render();
        });
      });

      document.querySelectorAll('.choice[data-day]').forEach(btn => {
        btn.addEventListener('click', () => {
          const day = btn.getAttribute('data-day');
          att.attending[day] = !att.attending[day];
          render();
        });
      });

      const dietary = document.getElementById('dietary');
      if (dietary) dietary.addEventListener('input', e => { att.dietary = e.target.value; });
    }

    if (step.type === 'plusOne') {
      const po = state.plusOne;
      const nameInput = document.getElementById('poName');
      const bringingToggle = document.getElementById('poBringingToggle');

      nameInput.addEventListener('input', e => {
        po.name = e.target.value;
        if (po.name.trim() && !po.bringing) {
          po.bringing = true;
          render();
        }
      });

      bringingToggle.addEventListener('click', () => {
        po.bringing = !po.bringing;
        render();
      });

      document.querySelectorAll('.choice[data-po-day]').forEach(btn => {
        btn.addEventListener('click', () => {
          const day = btn.getAttribute('data-po-day');
          po.attending[day] = !po.attending[day];
          render();
        });
      });

      const dietary = document.getElementById('poDietary');
      if (dietary) dietary.addEventListener('input', e => { po.dietary = e.target.value; });
    }

    if (step.type === 'accommodations') {
      document.querySelectorAll('.choice[data-acc]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.accommodations = btn.getAttribute('data-acc');
          render();
        });
      });
    }

    if (step.type === 'notes') {
      document.getElementById('notes').addEventListener('input', e => { state.notes = e.target.value; });
      const emailInput = document.getElementById('contactEmail');
      emailInput.addEventListener('input', e => {
        state.contactEmail = e.target.value;
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) nextBtn.disabled = !isStepValid({ type: 'notes' });
      });
    }
  }

  function isStepValid(step) {
    if (step.type === 'notes') return (state.contactEmail || '').includes('@');
    if (step.type === 'accommodations') return state.accommodations === 'onsite' || state.accommodations === 'offsite';
    return true;
  }

  function validateStep(step) {
    if (step.type === 'plusOne') {
      const po = state.plusOne;
      if (po.bringing && !po.name.trim()) {
        alert("Please enter your guest's name, or uncheck the box if you're not bringing one.");
        return false;
      }
    }
    return isStepValid(step);
  }

  async function handleSubmit() {
    const btn = document.getElementById('nextBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const payload = {
      attendees: state.attendees,
      plusOne: (state.plusOne && state.plusOne.bringing && state.plusOne.name.trim()) ? state.plusOne : null,
      accommodations: isBoth ? state.accommodations : null,
      notes: state.notes,
      contactEmail: state.contactEmail
    };

    try {
      const res = await submitRsvp(session.householdId, payload);
      if (res && res.ok !== false) {
        currentStep = totalInputSteps; // success
        render();
      } else {
        throw new Error('Submit failed');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Submit RSVP ✓';
      alert('Something went wrong. Please try again or email ' + WEDDING.contactEmail);
    }
  }

  // ---------- Helpers ----------

  function householdDisplayName(h) {
    const adults = h.adults;
    if (adults.length === 1) return `${adults[0].firstName} ${adults[0].lastName}`;
    if (adults[0].lastName === adults[1].lastName) {
      return `${adults[0].firstName} & ${adults[1].firstName} ${adults[0].lastName}`;
    }
    return `${adults[0].firstName} ${adults[0].lastName} & ${adults[1].firstName} ${adults[1].lastName}`;
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

  render();
})();
