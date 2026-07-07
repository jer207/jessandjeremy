// RSVP modal — multi-step form rendered as a full-screen modal over invitation.html.
//
// Public API:
//   window.RsvpModal.open(household, { onSuccess })
//     - Opens the modal mounted on #modalRoot
//     - Calls onSuccess() after the user finishes the success step and clicks "Back"

(function () {

  function open(household, opts) {
    opts = opts || {};
    const modalRoot = document.getElementById('modalRoot') || mountFallbackRoot();

    const isBoth = household.tier === 'both';

    const attendees = [
      ...household.adults.map(a => ({
        name: `${a.firstName} ${a.lastName}`,
        firstName: a.firstName,
        role: 'adult',
        attending: { day1: isBoth, day2: true },
        dietary: ''
      })),
      ...household.children.map(name => ({
        name,
        firstName: name,
        role: 'child',
        attending: { day1: isBoth, day2: true },
        dietary: ''
      }))
    ];

    const plusOne = household.plusOneAllowed
      ? { bringing: false, name: '', attending: { day1: isBoth, day2: true }, dietary: '' }
      : null;

    const state = {
      attendees,
      plusOne,
      notes: '',
      contactEmail: (household.adults[0] && household.adults[0].email) || ''
    };

    const steps = [];
    attendees.forEach((_, i) => steps.push({ type: 'attendee', index: i }));
    if (plusOne) steps.push({ type: 'plusOne' });
    steps.push({ type: 'notes' });
    steps.push({ type: 'review' });
    const totalInputSteps = steps.length;

    let currentStep = 0;
    let submitted = false;
    let shellMounted = false;
    const visited = [];
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function close() {
      modalRoot.innerHTML = '';
      document.body.style.overflow = prevBodyOverflow;
    }

    function finishWithSuccess() {
      close();
      if (opts.onSuccess) opts.onSuccess();
    }

    function adultEntries() {
      return state.attendees.filter(a => a.role === 'adult');
    }

    function allAdultsRegret() {
      const adults = adultEntries();
      return adults.length > 0 && adults.every(a => a._answered === true);
    }

    function isLastAdultStep(step) {
      return step.type === 'attendee' && attendees[step.index].role === 'adult'
        && step.index === household.adults.length - 1;
    }

    function computeNextStep() {
      const step = steps[currentStep];
      if (isLastAdultStep(step) && allAdultsRegret()) {
        // Mark all children as not attending; jump to review.
        state.attendees.forEach(a => {
          if (a.role === 'child') {
            a.attending = { day1: false, day2: false };
            a._answered = true;
          }
        });
        return steps.findIndex(s => s.type === 'review');
      }
      return currentStep + 1;
    }

    function ensureShell() {
      if (shellMounted) return;
      modalRoot.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-card">
            <div class="modal-topbar">
              <div class="modal-title">RSVP · ${escapeHtml(displayName(household))}</div>
              <button type="button" class="modal-close" aria-label="Close" id="rsvpCloseBtn">×</button>
            </div>
            <div class="modal-progress-wrap" id="rsvpProgressWrap">
              <div class="modal-progress">
                <div class="modal-progress-bar" id="rsvpProgressBar" style="width: 2%;"></div>
              </div>
            </div>
            <div class="modal-body" id="rsvpBody"></div>
          </div>
        </div>
      `;
      document.getElementById('rsvpCloseBtn').addEventListener('click', () => close());
      shellMounted = true;
    }

    function render() {
      ensureShell();
      const body = document.getElementById('rsvpBody');
      const progressWrap = document.getElementById('rsvpProgressWrap');

      if (currentStep >= totalInputSteps) {
        progressWrap.style.display = 'none';
        body.innerHTML = buildSuccessBody();
        // After submit, the close × also dismisses to invitation
        document.getElementById('rsvpCloseBtn').onclick = finishWithSuccess;
        document.getElementById('successBackBtn').addEventListener('click', finishWithSuccess);
        return;
      }

      progressWrap.style.display = '';
      const progress = Math.min(1, currentStep / Math.max(1, totalInputSteps - 1));
      document.getElementById('rsvpProgressBar').style.width = Math.max(2, progress * 100) + '%';

      const step = steps[currentStep];
      body.innerHTML = buildStepBody(step);

      bindStep(step);

      const backBtn = document.getElementById('backBtn');
      if (backBtn) backBtn.addEventListener('click', goBack);

      const nextBtn = document.getElementById('nextBtn');
      if (step.type === 'review') {
        nextBtn.addEventListener('click', handleSubmit);
      } else {
        nextBtn.addEventListener('click', () => {
          if (validateStep(step)) goNext();
        });
        nextBtn.disabled = !isStepValid(step);
      }
    }

    function goNext() {
      const next = computeNextStep();
      visited.push(currentStep);
      currentStep = next;
      render();
    }

    function goBack() {
      if (visited.length === 0) return;
      currentStep = visited.pop();
      render();
    }

    function buildStepBody(step) {
      let stepLabel, contents;
      if (step.type === 'attendee') {
        const att = attendees[step.index];
        stepLabel = `Step ${currentStep + 1} · ${att.firstName}`;
        contents = renderAttendee(att, isBoth);
      } else if (step.type === 'plusOne') {
        stepLabel = 'Plus one';
        contents = renderPlusOne(plusOne, isBoth);
      } else if (step.type === 'notes') {
        stepLabel = 'Household message';
        contents = renderNotes(state);
      } else {
        stepLabel = 'Review';
        contents = renderReview(state, isBoth, household);
      }
      const stepCount = `${currentStep + 1} of ${totalInputSteps}`;
      return `
        <div class="step">
          <div class="step-header">
            <span>${escapeHtml(stepLabel)}</span>
            <span class="step-count">${stepCount}</span>
          </div>
          ${contents}
          <div class="step-nav">
            ${visited.length > 0
              ? '<button type="button" class="btn btn-ghost" id="backBtn">← Back</button>'
              : '<span></span>'}
            <button type="button" class="btn" id="nextBtn">
              ${step.type === 'review' ? 'Submit RSVP ✓' : 'Continue →'}
            </button>
          </div>
        </div>
      `;
    }

    function buildSuccessBody() {
      const anyAttending = state.attendees.some(a => a.attending.day1 || a.attending.day2)
        || (state.plusOne && state.plusOne.bringing && (state.plusOne.attending.day1 || state.plusOne.attending.day2));
      const going = state.attendees.filter(a => a.attending.day1 || a.attending.day2).length
        + (state.plusOne && state.plusOne.bringing && (state.plusOne.attending.day1 || state.plusOne.attending.day2) ? 1 : 0);
      const total = state.attendees.length + (state.plusOne && state.plusOne.bringing ? 1 : 0);
      const heading = anyAttending ? 'Thank you!' : "Sorry we won't see you!";
      const message = anyAttending
        ? `Your RSVP is in. We've logged <strong>${going} of ${total}</strong> attending from your household.`
        : `Thanks for letting us know — we'll miss you. Hope to celebrate together another time.`;
      return `
        <div class="success">
          <div class="success-check">&#10003;</div>
          <h2>${heading}</h2>
          <p>${message}</p>
          <p class="small">Need to make a change? Email <a href="mailto:${WEDDING.contactEmail}">${WEDDING.contactEmail}</a>.</p>
          <button type="button" class="btn" id="successBackBtn">Back to invitation</button>
        </div>
      `;
    }

    // ---------- Renderers ----------

    function renderAttendee(att, isBoth) {
      const attendingAny = att.attending.day1 || att.attending.day2;
      const attendingState = attendingAny ? 'yes' : (att._answered ? 'no' : 'yes');

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

    // ---------- Step bindings ----------

    function bindStep(step) {
      if (step.type === 'attendee') {
        const att = attendees[step.index];

        document.querySelectorAll('#attYesNo .choice').forEach(btn => {
          btn.addEventListener('click', () => {
            const yes = btn.getAttribute('data-attending') === 'yes';
            att._answered = !yes;
            if (yes) {
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
      if (submitted) return;
      submitted = true;
      const btn = document.getElementById('nextBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting…';

      const payload = {
        attendees: state.attendees,
        plusOne: (state.plusOne && state.plusOne.bringing && state.plusOne.name.trim()) ? state.plusOne : null,
        notes: state.notes,
        contactEmail: state.contactEmail
      };

      try {
        const session = getSession();
        const res = await submitRsvp(session.householdId, payload);
        if (res && res.ok !== false) {
          currentStep = totalInputSteps;
          render();
        } else {
          throw new Error('Submit failed');
        }
      } catch (err) {
        submitted = false;
        btn.disabled = false;
        btn.textContent = 'Submit RSVP ✓';
        alert('Something went wrong. Please try again or email ' + WEDDING.contactEmail);
      }
    }

    // Initial render
    render();
  }

  // ---------- Helpers ----------

  function displayName(h) {
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

  function mountFallbackRoot() {
    const div = document.createElement('div');
    div.id = 'modalRoot';
    document.body.appendChild(div);
    return div;
  }

  window.RsvpModal = { open: open };
})();
