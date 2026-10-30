(() => {
  // Discourage casual saving of display copies; original masters stay outside the public site.
  document.querySelectorAll('.work-link picture, .image-open, .viewer-image').forEach(photo => {
    photo.addEventListener('contextmenu', event => event.preventDefault());
    photo.addEventListener('dragstart', event => event.preventDefault());
  });
  const controls = document.querySelector('.filters');
  if (controls) {
    const buttons = [...controls.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('.more-grid .work-card')];
    const status = document.querySelector('#filter-status');
    const params = new URLSearchParams(location.search);
    const apply = (category, updateUrl = false) => {
      if (!buttons.some(button => button.dataset.filter === category)) category = 'all';
      let count = 0;
      for (const card of cards) {
        card.hidden = category !== 'all' && card.dataset.category !== category;
        if (!card.hidden) count++;
      }
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
      status.textContent = `${count} ${count === 1 ? 'work' : 'works'} shown.`;
      if (updateUrl) {
        const current = new URL(location.href);
        if (category === 'all') current.searchParams.delete('category');
        else current.searchParams.set('category', category);
        history.replaceState(null, '', current);
      }
    };
    controls.hidden = false;
    apply(params.get('category') || 'all');
    for (const button of buttons) button.addEventListener('click', () => apply(button.dataset.filter, true));
    // Keep the selected category in "All work" links without storing identifying information.
    document.querySelectorAll('.work-link').forEach(link => link.addEventListener('click', () => {
      try { sessionStorage.setItem('andi-work-index', location.pathname + location.search + '#more-work'); } catch {}
    }));
  }
  document.querySelectorAll('.all-work').forEach(link => {
    try {
      const saved = sessionStorage.getItem('andi-work-index');
      if (saved) {
        const target = new URL(saved, location.origin);
        const expectedPath = new URL(link.href).pathname;
        if (target.origin === location.origin && target.pathname === expectedPath) link.href = target.href;
      }
    } catch {}
  });

  const dialog = document.querySelector('.viewer');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const triggers = [...document.querySelectorAll('[data-viewer-image]')];
  const photo = dialog.querySelector('.viewer-image');
  const title = dialog.querySelector('.viewer-title');
  const count = dialog.querySelector('.viewer-count');
  const error = dialog.querySelector('.viewer-error');
  const close = dialog.querySelector('.viewer-close');
  const previous = dialog.querySelector('.viewer-prev');
  const next = dialog.querySelector('.viewer-next');
  let current = 0;
  let opener;
  let originalOverflow = '';
  let touchStart = null;
  let multitouch = false;
  const show = index => {
    current = (index + triggers.length) % triggers.length;
    const trigger = triggers[current];
    error.hidden = true;
    photo.alt = trigger.querySelector('img').alt;
    photo.src = trigger.dataset.full;
    title.textContent = trigger.dataset.title;
    count.textContent = `${current + 1} / ${triggers.length}`;
    previous.hidden = next.hidden = triggers.length < 2;
    count.hidden = triggers.length < 2;
  };
  photo.addEventListener('error', () => { error.hidden = false; });
  photo.addEventListener('load', () => { error.hidden = true; });
  const openViewer = (index, source) => {
    opener = source;
    show(index);
    originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    close.focus({ preventScroll: true });
  };
  triggers.forEach((trigger, index) => {
    trigger.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openViewer(index, trigger);
    });
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = originalOverflow;
    photo.removeAttribute('src');
    error.hidden = true;
    touchStart = null;
    opener?.focus({ preventScroll: true });
  });
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const buttons = [...dialog.querySelectorAll('button')].filter(button => !button.hidden && !button.disabled);
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (triggers.length < 2 || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  // Passive listeners leave scrolling and native pinch-to-zoom under browser control.
  photo.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { multitouch = true; touchStart = null; return; }
    multitouch = false;
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  photo.addEventListener('touchend', event => {
    if (!touchStart || multitouch || triggers.length < 2 || event.touches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50 && (!window.visualViewport || window.visualViewport.scale <= 1)) {
      show(current + (dx < 0 ? 1 : -1));
    }
    touchStart = null;
  }, { passive: true });
  photo.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
})();
