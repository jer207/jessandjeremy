// Lookup form handling for the landing page.

(function () {
  const form = document.getElementById('lookupForm');
  const input = document.getElementById('lookupQuery');
  const flash = document.getElementById('lookupFlash');

  // Auto-fill from previous session if available (so refresh keeps you in)
  const session = getSession();
  if (session) {
    // Don't auto-redirect — show a passive hint instead so people aren't trapped.
    showFlash('success', 'You looked up an invitation earlier. <a href="' +
      (session.isAdmin ? 'admin.html' : 'invitation.html') +
      '">Continue where you left off →</a>');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    flash.style.display = 'none';
    input.classList.remove('error');

    const query = input.value.trim();
    if (!query) return;

    const result = await findGuest(query);

    if (!result) {
      input.classList.add('error');
      showFlash('error',
        "We couldn't find that name. Please try your full name as it appears on your invitation " +
        "(e.g. \"Rachel Brennan\"), or email <a href='mailto:" + WEDDING.contactEmail + "'>" + WEDDING.contactEmail + "</a>.");
      return;
    }

    if (result.kind === 'ambiguous') {
      input.classList.add('error');
      showFlash('error',
        "More than one guest matches that. Please enter your full name " +
        "(first and last together), or email <a href='mailto:" + WEDDING.contactEmail + "'>" + WEDDING.contactEmail + "</a>.");
      return;
    }

    if (result.kind === 'admin') {
      setSession({ isAdmin: true, name: result.name });
      window.location.href = 'admin.html';
      return;
    }

    setSession({ isAdmin: false, householdId: result.household.id, name: query });
    window.location.href = 'invitation.html';
  });

  function showFlash(type, html) {
    flash.className = 'flash flash-' + type;
    flash.innerHTML = html;
    flash.style.display = 'block';
  }
})();

// Demo banner so it's obvious data is local-only in this mode.
(function () {
  const banner = document.getElementById('demoBanner');
  if (!banner) return;
  if (typeof MODE !== 'undefined' && MODE === 'demo') {
    document.body.classList.add('has-demo-banner');
    banner.innerHTML = 'Demo mode &mdash; RSVPs save to your browser only. ' +
      '<button onclick="resetDemoData(); location.reload();">Reset demo</button>';
  } else {
    banner.style.display = 'none';
  }
})();
