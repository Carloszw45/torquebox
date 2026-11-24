(() => {
  // The first catalog script owns search, category filters, the mobile menu and gallery.
  // This enhancement is loaded only by the catalog and the 15 upcoming product pages.
  const routineTabs = Array.from(document.querySelectorAll('[data-routine-tab]'));
  function selectRoutine(tab) {
    routineTabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
  }
  routineTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectRoutine(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % routineTabs.length;
      if (event.key === 'ArrowLeft') next = (index + routineTabs.length - 1) % routineTabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = routineTabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectRoutine(routineTabs[next]);
      routineTabs[next].focus();
    });
  });

  document.querySelectorAll('[data-need-category]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById('tb-search');
      if (input) input.value = '';
      const filter = document.querySelector(`[data-filter="${button.dataset.needCategory}"]`);
      filter?.click();
      document.getElementById('collection')?.scrollIntoView({ behavior: 'auto', block: 'start' });
      filter?.focus({ preventScroll: true });
    });
  });
})();
