/**
 * Public site behaviour: renders JSON-driven content into the
 * editorial templates, plus the small interaction system (navbar,
 * mobile menu, scroll reveal). Every page sets <body data-page="...">
 * so this single script can decide what to render.
 */

(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function setText(el, value) {
    if (el && value != null) el.textContent = value;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  // ------------------------------------------------------------------
  // Navbar: transparent -> ivory on scroll, mobile menu toggle
  // ------------------------------------------------------------------
  function initNav() {
    const page = document.body.dataset.page;
    const rootPage = page === 'kegiatan-detail' ? 'kegiatan' : page === 'tulisan-detail' ? 'tulisan' : page;
    qsa('[data-nav]').forEach((link) => {
      if (link.dataset.nav === rootPage) link.setAttribute('aria-current', 'page');
    });

    const nav = qs('#site-nav');
    if (nav) {
      const onScroll = () => {
        nav.classList.toggle('is-scrolled', window.scrollY > 12);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    const toggle = qs('#nav-toggle');
    const menu = qs('#nav-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('flex');
        menu.classList.toggle('hidden');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
      qsa('a', menu).forEach((link) => {
        link.addEventListener('click', () => {
          menu.classList.add('hidden');
          menu.classList.remove('flex');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  // ------------------------------------------------------------------
  // Scroll reveal
  // ------------------------------------------------------------------
  function initReveal() {
    const items = qsa('[data-reveal]');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    items.forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${Math.min(i % 4, 3) * 80}ms`);
      observer.observe(el);
    });
  }

  // ------------------------------------------------------------------
  // Footer + social (shared across every page)
  // ------------------------------------------------------------------
  function renderFooter(site) {
    setText(qs('[data-field="footer-org"]'), site.organization);
    setText(qs('[data-field="footer-school"]'), site.school);
    setText(qs('[data-field="footer-address"]'), site.contact && site.contact.address);

    const ig = qs('[data-field="social-instagram"]');
    if (ig) {
      if (site.social && site.social.instagram) {
        ig.href = site.social.instagram;
        ig.classList.remove('pointer-events-none', 'text-muted/50');
      } else {
        ig.href = '#';
        ig.setAttribute('aria-disabled', 'true');
        ig.classList.add('pointer-events-none', 'text-muted/50');
        ig.textContent = 'Instagram (segera hadir)';
      }
    }

    const wa = qs('[data-field="social-whatsapp"]');
    if (wa) {
      if (site.social && site.social.whatsapp) {
        wa.href = site.social.whatsapp;
        wa.classList.remove('pointer-events-none', 'text-muted/50');
      } else {
        wa.href = '#';
        wa.setAttribute('aria-disabled', 'true');
        wa.classList.add('pointer-events-none', 'text-muted/50');
        wa.textContent = 'WhatsApp (segera hadir)';
      }
    }

    const email = qs('[data-field="footer-email"]');
    if (email) {
      if (site.contact && site.contact.email) {
        email.href = `mailto:${site.contact.email}`;
        email.textContent = site.contact.email;
        email.classList.remove('hidden');
      } else {
        email.classList.add('hidden');
      }
    }
  }

  // ------------------------------------------------------------------
  // Homepage sections
  // ------------------------------------------------------------------
  function renderHero(site) {
    const hero = site.hero || {};
    setText(qs('[data-field="hero-eyebrow"]'), hero.eyebrow);
    setText(qs('[data-field="hero-headline"]'), hero.headline);
    setText(qs('[data-field="hero-description"]'), hero.description);
    setText(qs('[data-field="hero-meta"]'), hero.meetingNote);

    const cta = qs('[data-field="hero-cta"]');
    if (cta) {
      setText(cta, hero.ctaLabel);
      cta.href = hero.ctaUrl || '#kontak';
    }
  }

  function renderAbout(site) {
    const about = site.about || {};
    setText(qs('[data-field="about-eyebrow"]'), about.eyebrow);
    setText(qs('[data-field="about-lead"]'), about.lead);
    setText(qs('[data-field="about-body"]'), about.body);
  }

  function renderJoin(site) {
    const join = site.join || {};
    setText(qs('[data-field="join-eyebrow"]'), join.eyebrow);
    setText(qs('[data-field="join-headline"]'), join.headline);
    const cta = qs('[data-field="join-cta"]');
    if (cta) {
      setText(cta, join.ctaLabel);
      cta.href = join.ctaUrl || '#kontak';
    }
  }

  function programItemHTML(program) {
    return `
      <div class="border-l border-forest pl-4 md:pl-6 py-1" data-reveal>
        <span class="text-xs font-mono text-neutral-400">${program.number}</span>
        <h3 class="font-serif-custom text-xl mt-1 mb-2">${program.title}</h3>
        <p class="text-sm text-muted leading-relaxed max-w-md">${program.description}</p>
      </div>`;
  }

  async function renderPrograms() {
    const container = qs('[data-list="programs"]');
    if (!container) return;
    const programs = await ContentRepository.getPrograms();
    const active = programs
      .filter((p) => p.status === 'active')
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    container.innerHTML = active.length
      ? active.map(programItemHTML).join('')
      : '<p class="text-sm text-muted">Program sedang disusun ulang.</p>';
  }

  // ------------------------------------------------------------------
  // Activities (Kegiatan)
  // ------------------------------------------------------------------
  function activityCoverHTML(activity, aspect) {
    if (activity.cover) {
      return `<img src="${activity.cover}" alt="${activity.title}" class="w-full ${aspect} object-cover" loading="lazy">`;
    }
    return `<div class="w-full ${aspect} bg-surface flex items-center justify-center text-xs text-muted uppercase tracking-widest">Foto kegiatan</div>`;
  }

  function featuredActivityHTML(activity) {
    return `
      <a href="/kegiatan-detail.html?id=${encodeURIComponent(activity.id)}" class="group grid md:grid-cols-2 gap-6 md:gap-10 items-center" data-reveal>
        <div class="media-frame">${activityCoverHTML(activity, 'aspect-[4/3]')}</div>
        <div>
          <div class="flex items-center gap-3 text-xs text-muted mb-3">
            <span class="uppercase tracking-widest text-forest font-medium">${activity.category || 'Kegiatan'}</span>
            <span>&middot;</span>
            <time datetime="${activity.date}">${formatDate(activity.date)}</time>
          </div>
          <h3 class="font-serif-custom text-2xl md:text-3xl mb-3 group-hover:underline decoration-1 underline-offset-4">${activity.title}</h3>
          <p class="text-sm text-muted leading-relaxed line-clamp-3 max-w-md">${activity.excerpt || ''}</p>
          <span class="inline-block mt-4 text-sm font-medium text-forest">Baca selengkapnya &rarr;</span>
        </div>
      </a>`;
  }

  function activityListItemHTML(activity) {
    return `
      <a href="/kegiatan-detail.html?id=${encodeURIComponent(activity.id)}" class="group flex gap-4 items-start py-5 border-t border-line" data-reveal data-category="${activity.category || ''}">
        <div class="media-frame w-24 h-24 md:w-28 md:h-28 shrink-0">${activityCoverHTML(activity, 'w-full h-full')}</div>
        <div class="min-w-0">
          <div class="flex items-center gap-3 text-xs text-muted mb-1.5">
            <span class="uppercase tracking-widest text-forest font-medium">${activity.category || 'Kegiatan'}</span>
            <span>&middot;</span>
            <time datetime="${activity.date}">${formatDate(activity.date)}</time>
          </div>
          <h3 class="font-serif-custom text-lg md:text-xl mb-1 group-hover:underline decoration-1 underline-offset-4">${activity.title}</h3>
          <p class="text-sm text-muted line-clamp-2">${activity.excerpt || ''}</p>
        </div>
      </a>`;
  }

  function publishedSortedByDate(list) {
    return list
      .filter((item) => item.status === 'published')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function renderActivitiesPreview() {
    const container = qs('[data-list="activities-preview"]');
    if (!container) return;
    const activities = publishedSortedByDate(await ContentRepository.getActivities());

    if (!activities.length) {
      container.innerHTML = '<p class="text-sm text-muted" data-reveal>Belum ada kegiatan yang dipublikasikan. Nantikan kabar terbaru dari kami.</p>';
      return;
    }

    const [featured, ...rest] = activities;
    const supporting = rest.slice(0, 3);
    container.innerHTML = `
      ${featuredActivityHTML(featured)}
      <div class="mt-10">${supporting.map(activityListItemHTML).join('')}</div>
    `;
  }

  async function renderActivitiesFull() {
    const container = qs('[data-list="activities-full"]');
    if (!container) return;
    const activities = publishedSortedByDate(await ContentRepository.getActivities());

    if (!activities.length) {
      container.innerHTML = '<p class="text-sm text-muted py-10" data-reveal>Belum ada kegiatan yang dipublikasikan.</p>';
      return;
    }

    container.innerHTML = activities.map(activityListItemHTML).join('');
    initCategoryFilter(activities, container, 'activities-category');
  }

  // ------------------------------------------------------------------
  // Articles (Tulisan / Rohis Journal)
  // ------------------------------------------------------------------
  function articleCardHTML(article) {
    return `
      <a href="/tulisan-detail.html?id=${encodeURIComponent(article.id)}" class="group block p-6 bg-surface rounded-xl" data-reveal data-category="${article.category || ''}">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="min-w-0">
            <span class="text-xs text-forest font-medium uppercase tracking-widest">${article.category || 'Tulisan'}</span>
            <h3 class="font-serif-custom text-xl mt-1.5 group-hover:underline decoration-1 underline-offset-4">${article.title}</h3>
            <p class="text-xs text-muted mt-1.5">Ditulis oleh ${article.author || 'Rohis'} &middot; ${article.readTime || ''}</p>
          </div>
          <span class="text-sm font-medium text-forest shrink-0">Baca selengkapnya &rarr;</span>
        </div>
      </a>`;
  }

  async function renderArticlesPreview() {
    const container = qs('[data-list="articles-preview"]');
    if (!container) return;
    const articles = publishedSortedByDate(await ContentRepository.getArticles()).slice(0, 3);

    container.innerHTML = articles.length
      ? articles.map(articleCardHTML).join('')
      : '<p class="text-sm text-muted" data-reveal>Belum ada tulisan yang diterbitkan.</p>';
  }

  async function renderArticlesFull() {
    const container = qs('[data-list="articles-full"]');
    if (!container) return;
    const articles = publishedSortedByDate(await ContentRepository.getArticles());

    if (!articles.length) {
      container.innerHTML = '<p class="text-sm text-muted py-10" data-reveal>Belum ada tulisan yang diterbitkan.</p>';
      return;
    }

    container.innerHTML = `<div class="space-y-4">${articles.map(articleCardHTML).join('')}</div>`;
    initCategoryFilter(articles, container, 'articles-category');
  }

  // ------------------------------------------------------------------
  // Category filter (shared, lightweight)
  // ------------------------------------------------------------------
  function initCategoryFilter(items, listContainer, filterName) {
    const filterBar = qs(`[data-filter="${filterName}"]`);
    if (!filterBar) return;

    const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
    filterBar.innerHTML = ['Semua', ...categories]
      .map(
        (cat, i) => `
        <button type="button" class="tap-target px-4 py-2 rounded-full text-xs font-medium border border-line transition ${
          i === 0 ? 'bg-forest text-white border-forest' : 'text-muted hover:border-forest hover:text-forest'
        }" data-cat="${cat === 'Semua' ? '' : cat}">${cat}</button>`
      )
      .join('');

    qsa('button', filterBar).forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('button', filterBar).forEach((b) => {
          b.classList.remove('bg-forest', 'text-white', 'border-forest');
          b.classList.add('text-muted');
        });
        btn.classList.add('bg-forest', 'text-white', 'border-forest');
        btn.classList.remove('text-muted');

        const cat = btn.dataset.cat;
        qsa('[data-category]', listContainer).forEach((el) => {
          const match = !cat || el.dataset.category === cat;
          el.classList.toggle('hidden', !match);
        });
      });
    });
  }

  // ------------------------------------------------------------------
  // Detail pages
  // ------------------------------------------------------------------
  function getQueryId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function isPreview() {
    return new URLSearchParams(window.location.search).get('preview') === 'true';
  }

  function renderNotFound(root, backHref, label) {
    root.innerHTML = `
      <div class="text-center py-24">
        <p class="text-sm text-muted mb-4">${label} tidak ditemukan.</p>
        <a href="${backHref}" class="text-forest font-medium text-sm">&larr; Kembali ke daftar</a>
      </div>`;
  }

  async function renderActivityDetail() {
    const root = qs('[data-detail="activity"]');
    if (!root) return;

    let activity = isPreview() ? ContentRepository.getPreviewDraft('activity') : null;
    if (!activity) {
      const id = getQueryId();
      activity = id ? await ContentRepository.getActivity(id) : null;
    }

    if (!activity) {
      renderNotFound(root, '/kegiatan.html', 'Kegiatan');
      return;
    }

    document.title = `${activity.title} — Rohis SMADA Tarakan`;

    const gallery = Array.isArray(activity.gallery) ? activity.gallery : [];
    root.innerHTML = `
      ${isPreview() ? '<p class="mb-6 text-xs uppercase tracking-widest text-forest bg-surface inline-block px-3 py-1.5 rounded-full" data-reveal>Mode pratinjau — belum tersimpan</p>' : ''}
      <a href="/kegiatan.html" class="text-sm text-muted hover:text-forest inline-block mb-8" data-reveal>&larr; Kembali ke daftar kegiatan</a>
      <div class="flex items-center gap-3 text-xs text-muted mb-4" data-reveal>
        <span class="uppercase tracking-widest text-forest font-medium">${activity.category || 'Kegiatan'}</span>
        <span>&middot;</span>
        <time datetime="${activity.date}">${formatDate(activity.date)}</time>
      </div>
      <h1 class="font-serif-custom text-3xl md:text-5xl leading-tight mb-8" data-reveal>${activity.title}</h1>
      <div class="media-frame mb-10" data-reveal>${activityCoverHTML(activity, 'aspect-[16/9] rounded-xl')}</div>
      <div class="prose-content max-w-2xl text-neutral-800 leading-relaxed space-y-4 whitespace-pre-line" data-reveal>${activity.content || ''}</div>
      ${
        gallery.length
          ? `<div class="mt-12 grid grid-cols-2 md:grid-cols-3 gap-3" data-reveal>${gallery
              .map((src) => `<div class="media-frame"><img src="${src}" alt="" loading="lazy" class="w-full aspect-square object-cover rounded-lg"></div>`)
              .join('')}</div>`
          : ''
      }
    `;
  }

  async function renderArticleDetail() {
    const root = qs('[data-detail="article"]');
    if (!root) return;

    let article = isPreview() ? ContentRepository.getPreviewDraft('article') : null;
    if (!article) {
      const id = getQueryId();
      article = id ? await ContentRepository.getArticle(id) : null;
    }

    if (!article) {
      renderNotFound(root, '/tulisan.html', 'Tulisan');
      return;
    }

    document.title = `${article.title} — Rohis SMADA Tarakan`;

    root.innerHTML = `
      ${isPreview() ? '<p class="mb-6 text-xs uppercase tracking-widest text-forest bg-surface inline-block px-3 py-1.5 rounded-full" data-reveal>Mode pratinjau — belum tersimpan</p>' : ''}
      <a href="/tulisan.html" class="text-sm text-muted hover:text-forest inline-block mb-8" data-reveal>&larr; Kembali ke Rohis Journal</a>
      <span class="text-xs text-forest font-medium uppercase tracking-widest" data-reveal>${article.category || 'Tulisan'}</span>
      <h1 class="font-serif-custom text-3xl md:text-5xl leading-tight mt-3 mb-4" data-reveal>${article.title}</h1>
      <p class="text-sm text-muted mb-10" data-reveal>Ditulis oleh ${article.author || 'Rohis'} &middot; ${formatDate(article.date)}${
      article.readTime ? ` &middot; ${article.readTime}` : ''
    }</p>
      ${article.cover ? `<div class="media-frame mb-10" data-reveal><img src="${article.cover}" alt="${article.title}" class="w-full aspect-[16/9] object-cover rounded-xl" loading="lazy"></div>` : ''}
      <div class="prose-content max-w-2xl text-neutral-800 leading-relaxed space-y-4 whitespace-pre-line" data-reveal>${article.content || ''}</div>
    `;
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  async function boot() {
    initNav();

    const page = document.body.dataset.page;
    const site = await ContentRepository.getSite();
    renderFooter(site);

    if (page === 'home') {
      renderHero(site);
      renderAbout(site);
      renderJoin(site);
      await Promise.all([renderPrograms(), renderActivitiesPreview(), renderArticlesPreview()]);
    } else if (page === 'kegiatan') {
      await renderActivitiesFull();
    } else if (page === 'kegiatan-detail') {
      await renderActivityDetail();
    } else if (page === 'tulisan') {
      await renderArticlesFull();
    } else if (page === 'tulisan-detail') {
      await renderArticleDetail();
    } else if (page === 'tentang') {
      renderAbout(site);
      await renderPrograms();
    }

    initReveal();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
