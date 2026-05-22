// RSVP wizard — progressive form, one question per screen.

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

  // If already submitted, send them back to the confirmation view.
  if (h.rsvp) {
    window.location.href = 'invitation.html';
    return;
  }

  setupDemoBanner();

  const isBoth = h.tier === 'both';

  // Build attendee list (adults + children, in order)
  const attendees = [
    ...h.adults.map(a => ({
      name: `${a.firstName} ${a.lastName}`,
      firstName: a.firstName,
      role: 'adult',
      attending: { day1: isBoth, day2: true }, // default attending all days they're invited
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
    ? { bringing: false, name: '', attending: { day1: false, day2: true }, dietary: '' }
    : null;

  const state = {
    attendees,
    plusOne,
    notes: '',
    contactEmail: h.adults[0].email || ''
  };

  // Build step list
  const steps = [];
  attendees.forEach((_, idx) => steps.push({ type: 'attendee', index: idx }));
  if (plusOne) steps.push({ type: 'plusOne' });
  steps.push({ type: 'notes' });
  steps.push({ type: 'review' });

  let currentStep = 0;

  function render() {
    const step = steps[currentStep];
    const total = steps.length;

    const progressBars = steps.map((_, i) => {
      const cls = i < currentStep ? 'done' : (i === currentStep ? 'active' : '');
      return `<div class="step ${cls}"></div>`;
    }).join('');

    let bodyHtml = '';
    if (step.type === 'attendee') bodyHtml = renderAttendeeStep(state.attendees[step.index], isBoth);
    else if (step.type === 'plusOne') bodyHtml = renderPlusOneStep(state.plusOne, isBoth);
    else if (step.type === 'notes') bodyHtml = renderNotesStep(state);
    else if (step.type === 'review') bodyHtml = renderReviewStep(state, isBoth, h);

    root.innerHTML = `
      <div class="wizard">
        <div class="wizard-progress">
          ${progressBars}
          <span class="count">Step ${currentStep + 1} of ${total}</span>
        </div>
        <div class="wizard-body">${bodyHtml}</div>
        <div class="wizard-nav">
          ${currentStep > 0
            ? '<button type="button" class="btn btn-ghost btn-small" id="backBtn">← Back</button>'
            : '<div></div>'}
          <div class="spacer"></div>
          ${step.type === 'review'
            ? '<button type="button" class="btn" id="submitBtn">Submit RSVP</button>'
            : '<button type="button" class="btn" id="nextBtn">Continue →</button>'}
        </div>
      </div>
    `;

    bindStep(step);

    const backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', () => { currentStep--; render(); });

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => { if (validateStep(step)) { currentStep++; render(); } });

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
  }

  // ---------- Step renderers ----------

  function renderAttendeeStep(att, isBoth) {
    const isChild = att.role === 'child';
    const subhead = isChild
      ? `Let us know if ${att.firstName} will be joining.`
      : `Will ${att.firstName} be able to make it?`;

    let attendingHtml;
    if (isBoth) {
      attendingHtml = `
        <p class="eyebrow" style="margin-top: 1.5rem;">Which days?</p>
        <div class="day-toggles">
          <label class="day-toggle ${att.attending.day1 ? 'checked' : ''}" data-day="day1">
            <input type="checkbox" ${att.attending.day1 ? 'checked' : ''}>
            <span class="day-toggle-label">
              <strong>Friday, October 2</strong>
              <span>Ceremony &amp; welcome dinner</span>
            </span>
          </label>
          <label class="day-toggle ${att.attending.day2 ? 'checked' : ''}" data-day="day2">
            <input type="checkbox" ${att.attending.day2 ? 'checked' : ''}>
            <span class="day-toggle-label">
              <strong>Saturday, October 3</strong>
              <span>Reception</span>
            </span>
          </label>
        </div>
      `;
    } else {
      attendingHtml = `
        <div class="toggle-group" style="margin-top: 1.5rem;">
          <button type="button" class="toggle-pill ${att.attending.day2 ? 'selected' : ''}" data-attending="yes">Yes, joining us</button>
          <button type="button" class="toggle-pill ${!att.attending.day2 ? 'selected' : ''}" data-attending="no">Unable to attend</button>
        </div>
      `;
    }

    const attending = att.attending.day1 || att.attending.day2;
    const dietaryHtml = attending ? `
      <div class="field" style="margin-top: 1.5rem;">
        <label for="dietary">Dietary restrictions or allergies (optional)</label>
        <input type="text" id="dietary" value="${escapeAttr(att.dietary)}" placeholder="e.g. vegetarian, gluten-free, nut allergy">
      </div>
    ` : '';

    return `
      <h2>${escapeHtml(att.name)}</h2>
      <p class="question-sub">${subhead}</p>
      ${attendingHtml}
      ${dietaryHtml}
    `;
  }

  function renderPlusOneStep(po, isBoth) {
    const dayLabel = isBoth ? 'the weekend' : 'Saturday';
    return `
      <h2>Bringing a guest?</h2>
      <p class="question-sub">You're welcome to bring a plus-one to ${dayLabel}. Let us know their name so we can plan accordingly.</p>

      <div class="field" style="margin-top: 1.5rem;">
        <label for="poName">Guest's full name</label>
        <input type="text" id="poName" value="${escapeAttr(po.name)}" placeholder="Leave blank if you won't be bringing one">
        <span class="help">Typing a name will check the box automatically.</span>
      </div>

      <label class="day-toggle ${po.bringing ? 'checked' : ''}" id="poBringingToggle" style="margin-top: 0.5rem;">
        <input type="checkbox" ${po.bringing ? 'checked' : ''} id="poBringing">
        <span class="day-toggle-label">
          <strong>Yes, I'm bringing a guest</strong>
        </span>
      </label>

      <div id="poDietaryWrap" style="display:${po.bringing ? 'block' : 'none'}; margin-top: 1.25rem;">
        <div class="field">
          <label for="poDietary">Guest's dietary restrictions (optional)</label>
          <input type="text" id="poDietary" value="${escapeAttr(po.dietary)}" placeholder="e.g. vegan">
        </div>
      </div>
    `;
  }

  function renderNotesStep(s) {
    return `
      <h2>Anything else?</h2>
      <p class="question-sub">A note for us, song request, accessibility need, or just hello.</p>
      <div class="field" style="margin-top: 1.5rem;">
        <label for="notes">Message (optional)</label>
        <textarea id="notes" rows="4">${escapeHtml(s.notes)}</textarea>
      </div>
      <div class="field" style="margin-top: 1rem;">
        <label for="contactEmail">Best email to reach you</label>
        <input type="email" id="contactEmail" value="${escapeAttr(s.contactEmail)}">
      </div>
    `;
  }

  function renderReviewStep(s, isBoth, h) {
    const items = s.attendees.map(a => reviewItem(a.name, a, isBoth));
    if (s.plusOne && s.plusOne.bringing && s.plusOne.name.trim()) {
      items.push(reviewItem(s.plusOne.name + ' (guest)', s.plusOne, isBoth));
    }

    return `
      <h2>Review &amp; submit</h2>
      <p class="question-sub">Make sure everything looks right.</p>
      <div class="review" style="margin-top: 1.5rem;">
        ${items.join('')}
      </div>
      ${s.notes ? `<div class="review-item" style="margin-top: 1rem;"><div class="name">Note for the couple</div><div class="meta">${escapeHtml(s.notes)}</div></div>` : ''}
      <p style="margin-top: 1.5rem; color: var(--ink-faint); font-size: 0.9rem;">
        After submitting, you can change anything by emailing ${WEDDING.contactEmail}.
      </p>
    `;
  }

  function reviewItem(name, person, isBoth) {
    const attending = person.attending.day1 || person.attending.day2;
    const cls = attending ? 'attending' : 'not-attending';
    let detail;
    if (!attending) {
      detail = 'Not attending';
    } else if (isBoth) {
      const days = [];
      if (person.attending.day1) days.push('Friday');
      if (person.attending.day2) days.push('Saturday');
      detail = days.join(' &amp; ');
      if (person.dietary) detail += ` &middot; ${escapeHtml(person.dietary)}`;
    } else {
      detail = 'Attending Saturday';
      if (person.dietary) detail += ` &middot; ${escapeHtml(person.dietary)}`;
    }
    return `
      <div class="review-item ${cls}">
        <div class="name">${escapeHtml(name)}</div>
        <div class="meta">${detail}</div>
      </div>
    `;
  }

  // ---------- Bindings ----------

  function bindStep(step) {
    if (step.type === 'attendee') {
      const att = state.attendees[step.index];

      // Day toggles (both-days households)
      document.querySelectorAll('.day-toggle[data-day]').forEach(label => {
        label.addEventListener('click', (e) => {
          // Let native checkbox handle the click; we sync state after a tick.
          setTimeout(() => {
            const day = label.getAttribute('data-day');
            const cb = label.querySelector('input');
            att.attending[day] = cb.checked;
            label.classList.toggle('checked', cb.checked);
            // Re-render to show/hide dietary field
            const attending = att.attending.day1 || att.attending.day2;
            const hasDietary = document.getElementById('dietary');
            if (attending && !hasDietary) render();
            else if (!attending && hasDietary) render();
          }, 0);
        });
      });

      // Yes/no pills (day-2 only households)
      document.querySelectorAll('.toggle-pill[data-attending]').forEach(btn => {
        btn.addEventListener('click', () => {
          const yes = btn.getAttribute('data-attending') === 'yes';
          att.attending.day2 = yes;
          att.attending.day1 = false;
          render();
        });
      });

      const dietary = document.getElementById('dietary');
      if (dietary) dietary.addEventListener('input', e => { att.dietary = e.target.value; });
    }

    if (step.type === 'plusOne') {
      const po = state.plusOne;
      const nameInput = document.getElementById('poName');
      const bringingCb = document.getElementById('poBringing');
      const bringingLabel = document.getElementById('poBringingToggle');
      const dietaryWrap = document.getElementById('poDietaryWrap');
      const dietaryInput = document.getElementById('poDietary');

      nameInput.addEventListener('input', e => {
        po.name = e.target.value;
        if (po.name.trim() && !po.bringing) {
          po.bringing = true;
          bringingCb.checked = true;
          bringingLabel.classList.add('checked');
          dietaryWrap.style.display = 'block';
        }
      });

      bringingCb.addEventListener('change', () => {
        po.bringing = bringingCb.checked;
        bringingLabel.classList.toggle('checked', bringingCb.checked);
        dietaryWrap.style.display = bringingCb.checked ? 'block' : 'none';
      });

      if (dietaryInput) dietaryInput.addEventListener('input', e => { po.dietary = e.target.value; });
    }

    if (step.type === 'notes') {
      document.getElementById('notes').addEventListener('input', e => { state.notes = e.target.value; });
      document.getElementById('contactEmail').addEventListener('input', e => { state.contactEmail = e.target.value; });
    }
  }

  function validateStep(step) {
    // For attendees, ensure at least the attending toggles are set (already defaulted)
    // For +1, if bringing then name required.
    if (step.type === 'plusOne') {
      const po = state.plusOne;
      if (po.bringing && !po.name.trim()) {
        alert("Please enter your guest's name, or uncheck the box if you're not bringing one.");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    // Clean +1: if not bringing, null it out for storage.
    const payload = {
      attendees: state.attendees,
      plusOne: (state.plusOne && state.plusOne.bringing && state.plusOne.name.trim()) ? state.plusOne : null,
      notes: state.notes,
      contactEmail: state.contactEmail
    };

    try {
      const res = await submitRsvp(session.householdId, payload);
      if (res && res.ok !== false) {
        window.location.href = 'invitation.html';
      } else {
        throw new Error('Submit failed');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Submit RSVP';
      alert('Something went wrong. Please try again or email ' + WEDDING.contactEmail);
    }
  }

  // ---------- Utilities ----------

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
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

  // Initial render
  render();
})();
