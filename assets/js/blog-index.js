// Blog listing: category filters and pagination.
// Progressive enhancement: every article is already in the HTML, so crawlers and
// no-JS visitors see the full list. This script only narrows and pages it.
(() => {
  const PAGE_SIZE = 6;
  const root = document.querySelector('[data-blog-index]');
  if (!root) return;

  const chips = [...root.querySelectorAll('.filter-chip')];
  const featured = root.querySelector('[data-featured]');
  const items = [...root.querySelectorAll('.post-grid > li')];
  const pagination = root.querySelector('.pagination');
  const status = root.querySelector('.filter-status');
  const empty = root.querySelector('.empty-state');
  const categories = new Set(chips.map((chip) => chip.dataset.filter));

  let category = 'all';
  let page = 1;

  const params = new URLSearchParams(window.location.search);
  if (categories.has(params.get('category'))) category = params.get('category');
  const requestedPage = parseInt(params.get('page'), 10);
  if (requestedPage > 0) page = requestedPage;

  function render() {
    const matches = (el) => category === 'all' || el.dataset.category === category;
    const showFeatured = featured && matches(featured);
    const visible = items.filter(matches);
    const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    page = Math.min(Math.max(page, 1), pages);

    if (featured) featured.hidden = !showFeatured;
    const start = (page - 1) * PAGE_SIZE;
    const shown = new Set(visible.slice(start, start + PAGE_SIZE));
    items.forEach((li) => { li.hidden = !shown.has(li); });

    chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.filter === category)));

    const total = visible.length + (showFeatured ? 1 : 0);
    empty.hidden = total > 0;
    status.textContent = total + (total === 1 ? ' article' : ' articles');

    pagination.hidden = pages <= 1;
    pagination.replaceChildren();
    if (pages > 1) {
      const button = (label, target, opts = {}) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        if (opts.aria) b.setAttribute('aria-label', opts.aria);
        if (opts.current) b.setAttribute('aria-current', 'page');
        b.disabled = Boolean(opts.disabled);
        b.addEventListener('click', () => { page = target; render(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        pagination.append(b);
      };
      button('Previous', page - 1, { disabled: page === 1 });
      for (let n = 1; n <= pages; n += 1) button(String(n), n, { current: n === page, aria: 'Page ' + n });
      button('Next', page + 1, { disabled: page === pages });
    }

    const next = new URLSearchParams();
    if (category !== 'all') next.set('category', category);
    if (page > 1) next.set('page', String(page));
    const query = next.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : ''));
  }

  chips.forEach((chip) => chip.addEventListener('click', () => {
    category = chip.dataset.filter;
    page = 1;
    render();
  }));

  root.classList.add('is-enhanced');
  render();
})();
