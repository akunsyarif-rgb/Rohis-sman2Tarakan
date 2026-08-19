/**
 * Admin workspace (prototype). All persistence goes through
 * ContentRepository (js/data.js) — this file only handles UI wiring,
 * so swapping the localStorage-backed repository for a Supabase one
 * later does not require touching this file's structure.
 *
 * This is a local/static prototype: there is no authentication and
 * no server. Changes made here are stored in this browser only.
 */

(function () {
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function toast(message) {
    const el = qs('#admin-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function badge(status, activeLabel, inactiveLabel) {
    const isActive = status === 'published' || status === 'active';
    const label = isActive ? activeLabel : inactiveLabel;
    return `<span class="admin-badge status-${status}">${label}</span>`;
  }

  // --------------------------------------------------------------------
  // View routing
  // --------------------------------------------------------------------
  const VIEWS = ['dashboard', 'kegiatan', 'tulisan', 'program', 'media', 'pengaturan'];

  function currentView() {
    const hash = (window.location.hash || '#dashboard').replace('#', '');
    return VIEWS.includes(hash) ? hash : 'dashboard';
  }

  function renderView() {
    const view = currentView();
    qsa('[data-view-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.viewPanel === view);
    });
    qsa('[data-nav-view]').forEach((link) => {
      const isActive = link.dataset.navView === view;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    const sidebar = qs('#sidebar');
    if (sidebar && window.innerWidth < 768) {
      sidebar.classList.add('hidden');
      qs('#sidebar-toggle')?.setAttribute('aria-expanded', 'false');
    }

    if (view === 'dashboard') loadDashboard();
    if (view === 'kegiatan') { showSubview('kegiatan', 'kegiatan-list'); loadActivityList(); }
    if (view === 'tulisan') { showSubview('tulisan', 'tulisan-list'); loadArticleList(); }
    if (view === 'program') { showSubview('program', 'program-list'); loadProgramList(); }
    if (view === 'media') loadMediaList();
    if (view === 'pengaturan') loadSettingsForm();
  }

  function showSubview(panelView, subviewName) {
    const panel = qs(`[data-view-panel="${panelView}"]`);
    qsa('[data-subview]', panel).forEach((el) => {
      el.classList.toggle('hidden', el.dataset.subview !== subviewName);
    });
  }

  // --------------------------------------------------------------------
  // Dashboard
  // --------------------------------------------------------------------
  async function loadDashboard() {
    const [activities, articles, programs, media] = await Promise.all([
      ContentRepository.getActivities(),
      ContentRepository.getArticles(),
      ContentRepository.getPrograms(),
      ContentRepository.getMedia(),
    ]);

    qs('[data-stat="kegiatan"]').textContent = activities.length;
    qs('[data-stat="tulisan"]').textContent = articles.length;
    qs('[data-stat="program"]').textContent = programs.filter((p) => p.status === 'active').length;
    qs('[data-stat="media"]').textContent = media.length;

    const recent = [
      ...activities.map((a) => ({ ...a, _type: 'Kegiatan', _sort: a.updatedAt || a.createdAt || a.date })),
      ...articles.map((a) => ({ ...a, _type: 'Tulisan', _sort: a.updatedAt || a.createdAt || a.date })),
    ]
      .sort((a, b) => new Date(b._sort || 0) - new Date(a._sort || 0))
      .slice(0, 6);

    const list = qs('[data-list="recent-activity"]');
    list.innerHTML = recent.length
      ? recent
          .map(
            (item) => `
        <button type="button" class="admin-row w-full text-left py-4 flex items-center justify-between gap-4 hover:bg-surface px-2 -mx-2 rounded-lg" data-open="${item._type === 'Kegiatan' ? 'activity' : 'article'}" data-id="${item.id}">
          <div class="min-w-0">
            <p class="text-xs text-muted uppercase tracking-widest mb-1">${item._type}</p>
            <p class="text-sm font-medium truncate">${item.title}</p>
          </div>
          ${badge(item.status, 'Published', 'Draft')}
        </button>`
          )
          .join('')
      : '<p class="text-sm text-muted py-4">Belum ada aktivitas.</p>';

    qsa('[data-open]', list).forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.open === 'activity') {
          window.location.hash = '#kegiatan';
          setTimeout(() => openActivityForm(btn.dataset.id), 0);
        } else {
          window.location.hash = '#tulisan';
          setTimeout(() => openArticleForm(btn.dataset.id), 0);
        }
      });
    });
  }

  // --------------------------------------------------------------------
  // Kegiatan (Activities)
  // --------------------------------------------------------------------
  async function loadActivityList() {
    const activities = await ContentRepository.getActivities();
    const list = qs('[data-list="activities"]');
    list.innerHTML = activities.length
      ? activities
          .map(
            (a) => `
        <div class="admin-row py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">${badge(a.status, 'Published', 'Draft')}<span class="text-xs text-muted">${formatDate(a.date)}</span></div>
            <p class="font-medium truncate">${a.title}</p>
            <p class="text-xs text-muted truncate">${a.category || ''}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full hover:border-forest" data-edit="${a.id}">Edit</button>
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full hover:border-forest" data-preview="${a.id}">Preview</button>
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full text-red-700 hover:border-red-700" data-delete="${a.id}">Hapus</button>
          </div>
        </div>`
          )
          .join('')
      : '<p class="text-sm text-muted py-8">Belum ada kegiatan. Klik "+ Tambah Kegiatan" untuk mulai.</p>';

    qsa('[data-edit]', list).forEach((btn) => btn.addEventListener('click', () => openActivityForm(btn.dataset.edit)));
    qsa('[data-preview]', list).forEach((btn) => btn.addEventListener('click', () => previewSavedActivity(btn.dataset.preview)));
    qsa('[data-delete]', list).forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (confirm('Hapus kegiatan ini? Tindakan ini tidak dapat dibatalkan.')) {
          await ContentRepository.deleteActivity(btn.dataset.delete);
          toast('Kegiatan dihapus.');
          loadActivityList();
        }
      })
    );
  }

  async function previewSavedActivity(id) {
    const activity = await ContentRepository.getActivity(id);
    if (!activity) return;
    ContentRepository.setPreviewDraft('activity', activity);
    window.open('/kegiatan-detail.html?preview=true', '_blank');
  }

  async function openActivityForm(id) {
    const form = qs('[data-form="activity"]');
    form.reset();
    qs('[data-form-title="kegiatan"]').textContent = id ? 'Edit Kegiatan' : 'Kegiatan Baru';

    if (id) {
      const activity = await ContentRepository.getActivity(id);
      if (activity) {
        form.elements.id.value = activity.id;
        form.elements.title.value = activity.title || '';
        form.elements.date.value = (activity.date || '').slice(0, 10);
        form.elements.category.value = activity.category || '';
        form.elements.excerpt.value = activity.excerpt || '';
        form.elements.cover.value = activity.cover || '';
        form.elements.content.value = activity.content || '';
        form.elements.status.value = activity.status || 'draft';
      }
    }
    showSubview('kegiatan', 'kegiatan-form');
  }

  function readForm(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  function activityDraftFromForm(form) {
    const data = readForm(form);
    return {
      id: data.id || undefined,
      title: data.title,
      date: data.date,
      category: data.category,
      excerpt: data.excerpt,
      cover: data.cover,
      content: data.content,
      status: data.status,
    };
  }

  function initActivityForm() {
    const form = qs('[data-form="activity"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const activity = activityDraftFromForm(form);
      await ContentRepository.saveActivity(activity);
      toast('Kegiatan disimpan.');
      showSubview('kegiatan', 'kegiatan-list');
      loadActivityList();
    });

    qs('[data-action="preview-activity"]').addEventListener('click', () => {
      const draft = activityDraftFromForm(form);
      ContentRepository.setPreviewDraft('activity', draft);
      window.open('/kegiatan-detail.html?preview=true', '_blank');
    });
  }

  // --------------------------------------------------------------------
  // Tulisan (Articles)
  // --------------------------------------------------------------------
  async function loadArticleList() {
    const articles = await ContentRepository.getArticles();
    const list = qs('[data-list="articles"]');
    list.innerHTML = articles.length
      ? articles
          .map(
            (a) => `
        <div class="admin-row py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">${badge(a.status, 'Published', 'Draft')}<span class="text-xs text-muted">${formatDate(a.date)}</span></div>
            <p class="font-medium truncate">${a.title}</p>
            <p class="text-xs text-muted truncate">${a.author || ''} &middot; ${a.category || ''}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full hover:border-forest" data-edit="${a.id}">Edit</button>
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full hover:border-forest" data-preview="${a.id}">Preview</button>
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full text-red-700 hover:border-red-700" data-delete="${a.id}">Hapus</button>
          </div>
        </div>`
          )
          .join('')
      : '<p class="text-sm text-muted py-8">Belum ada tulisan. Klik "+ Tulisan Baru" untuk mulai.</p>';

    qsa('[data-edit]', list).forEach((btn) => btn.addEventListener('click', () => openArticleForm(btn.dataset.edit)));
    qsa('[data-preview]', list).forEach((btn) => btn.addEventListener('click', () => previewSavedArticle(btn.dataset.preview)));
    qsa('[data-delete]', list).forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (confirm('Hapus tulisan ini? Tindakan ini tidak dapat dibatalkan.')) {
          await ContentRepository.deleteArticle(btn.dataset.delete);
          toast('Tulisan dihapus.');
          loadArticleList();
        }
      })
    );
  }

  async function previewSavedArticle(id) {
    const article = await ContentRepository.getArticle(id);
    if (!article) return;
    ContentRepository.setPreviewDraft('article', article);
    window.open('/tulisan-detail.html?preview=true', '_blank');
  }

  async function openArticleForm(id) {
    const form = qs('[data-form="article"]');
    form.reset();
    qs('[data-form-title="tulisan"]').textContent = id ? 'Edit Tulisan' : 'Tulisan Baru';

    if (id) {
      const article = await ContentRepository.getArticle(id);
      if (article) {
        form.elements.id.value = article.id;
        form.elements.title.value = article.title || '';
        form.elements.author.value = article.author || '';
        form.elements.date.value = (article.date || '').slice(0, 10);
        form.elements.category.value = article.category || '';
        form.elements.cover.value = article.cover || '';
        form.elements.excerpt.value = article.excerpt || '';
        form.elements.content.value = article.content || '';
        form.elements.status.value = article.status || 'draft';
      }
    }
    showSubview('tulisan', 'tulisan-form');
  }

  function articleDraftFromForm(form, statusOverride) {
    const data = readForm(form);
    return {
      id: data.id || undefined,
      title: data.title,
      author: data.author,
      date: data.date,
      category: data.category,
      cover: data.cover,
      excerpt: data.excerpt,
      content: data.content,
      status: statusOverride || data.status,
    };
  }

  function initArticleForm() {
    const form = qs('[data-form="article"]');
    let pendingStatus = null;

    qsa('button[data-submit-status]', form).forEach((btn) => {
      btn.addEventListener('click', () => { pendingStatus = btn.dataset.submitStatus; });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const article = articleDraftFromForm(form, pendingStatus);
      pendingStatus = null;
      await ContentRepository.saveArticle(article);
      toast(article.status === 'published' ? 'Tulisan diterbitkan.' : 'Draft tersimpan.');
      showSubview('tulisan', 'tulisan-list');
      loadArticleList();
    });

    qs('[data-action="preview-article"]').addEventListener('click', () => {
      const draft = articleDraftFromForm(form);
      ContentRepository.setPreviewDraft('article', draft);
      window.open('/tulisan-detail.html?preview=true', '_blank');
    });
  }

  // --------------------------------------------------------------------
  // Program
  // --------------------------------------------------------------------
  async function loadProgramList() {
    const programs = (await ContentRepository.getPrograms()).sort((a, b) => (a.order || 0) - (b.order || 0));
    const list = qs('[data-list="programs"]');
    list.innerHTML = programs.length
      ? programs
          .map(
            (p) => `
        <div class="admin-row py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 justify-between">
          <div class="min-w-0 flex items-start gap-3">
            <span class="text-xs font-mono text-muted mt-0.5">${p.number || ''}</span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">${badge(p.status, 'Aktif', 'Nonaktif')}</div>
              <p class="font-medium truncate">${p.title}</p>
              <p class="text-xs text-muted truncate">${p.description || ''}</p>
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full hover:border-forest" data-edit="${p.id}">Edit</button>
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full hover:border-forest" data-toggle="${p.id}">${p.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</button>
            <button type="button" class="tap-target text-sm px-3 border border-line rounded-full text-red-700 hover:border-red-700" data-delete="${p.id}">Hapus</button>
          </div>
        </div>`
          )
          .join('')
      : '<p class="text-sm text-muted py-8">Belum ada program.</p>';

    qsa('[data-edit]', list).forEach((btn) => btn.addEventListener('click', () => openProgramForm(btn.dataset.edit)));
    qsa('[data-toggle]', list).forEach((btn) =>
      btn.addEventListener('click', async () => {
        const program = programs.find((p) => p.id === btn.dataset.toggle);
        program.status = program.status === 'active' ? 'inactive' : 'active';
        await ContentRepository.saveProgram(program);
        loadProgramList();
      })
    );
    qsa('[data-delete]', list).forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (confirm('Hapus program ini?')) {
          await ContentRepository.deleteProgram(btn.dataset.delete);
          toast('Program dihapus.');
          loadProgramList();
        }
      })
    );
  }

  async function openProgramForm(id) {
    const form = qs('[data-form="program"]');
    form.reset();
    qs('[data-form-title="program"]').textContent = id ? 'Edit Program' : 'Program Baru';

    if (id) {
      const programs = await ContentRepository.getPrograms();
      const program = programs.find((p) => p.id === id);
      if (program) {
        form.elements.id.value = program.id;
        form.elements.number.value = program.number || '';
        form.elements.order.value = program.order || '';
        form.elements.title.value = program.title || '';
        form.elements.description.value = program.description || '';
        form.elements.status.value = program.status || 'active';
      }
    } else {
      const programs = await ContentRepository.getPrograms();
      const nextOrder = programs.reduce((max, p) => Math.max(max, p.order || 0), 0) + 1;
      form.elements.order.value = nextOrder;
      form.elements.number.value = String(nextOrder).padStart(2, '0');
    }
    showSubview('program', 'program-form');
  }

  function initProgramForm() {
    const form = qs('[data-form="program"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = readForm(form);
      await ContentRepository.saveProgram({
        id: data.id || undefined,
        number: data.number,
        title: data.title,
        description: data.description,
        status: data.status,
        order: Number(data.order) || 0,
      });
      toast('Program disimpan.');
      showSubview('program', 'program-list');
      loadProgramList();
    });
  }

  // --------------------------------------------------------------------
  // Media library (prototype: dataURL stored in localStorage)
  // --------------------------------------------------------------------
  const MAX_MEDIA_BYTES = 350 * 1024;

  function mediaThumbHTML(item, selectable) {
    return `
      <div class="border border-line rounded-lg overflow-hidden group relative" data-media-id="${item.id}">
        <img src="${item.dataUrl}" alt="${item.name}" class="w-full aspect-square object-cover ${selectable ? 'cursor-pointer' : ''}" ${selectable ? 'data-select="1"' : ''}>
        ${
          selectable
            ? ''
            : `<div class="p-2">
                <p class="text-xs truncate">${item.name}</p>
                <button type="button" class="text-xs text-red-700 mt-1" data-delete-media="${item.id}">Hapus</button>
              </div>`
        }
      </div>`;
  }

  async function loadMediaList() {
    const media = await ContentRepository.getMedia();
    const list = qs('[data-list="media"]');
    list.innerHTML = media.length
      ? media.map((m) => mediaThumbHTML(m, false)).join('')
      : '<p class="text-sm text-muted col-span-full py-8">Belum ada gambar yang diunggah.</p>';

    qsa('[data-delete-media]', list).forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (confirm('Hapus gambar ini dari media library?')) {
          await ContentRepository.deleteMedia(btn.dataset.deleteMedia);
          loadMediaList();
        }
      })
    );
  }

  function initMediaUpload() {
    qs('[data-action="upload-media"]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > MAX_MEDIA_BYTES) {
        toast(`Gambar terlalu besar (maks ${Math.round(MAX_MEDIA_BYTES / 1024)}KB untuk prototipe lokal).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await ContentRepository.saveMedia({ name: file.name, dataUrl: reader.result, size: file.size });
          toast('Gambar diunggah.');
          loadMediaList();
        } catch (err) {
          toast('Gagal menyimpan gambar — penyimpanan lokal penuh.');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // ---- Media picker modal (used from Kegiatan/Tulisan cover field) -----
  let mediaPickerTargetId = null;

  function initMediaPicker() {
    qsa('[data-action="pick-media"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        mediaPickerTargetId = btn.dataset.targetInput;
        const media = await ContentRepository.getMedia();
        const grid = qs('[data-list="media-picker-grid"]');
        const empty = qs('[data-empty="media-picker"]');
        grid.innerHTML = media.map((m) => mediaThumbHTML(m, true)).join('');
        empty.classList.toggle('hidden', media.length > 0);
        qsa('[data-select]', grid).forEach((img) => {
          img.addEventListener('click', () => {
            const wrapper = img.closest('[data-media-id]');
            const item = media.find((m) => m.id === wrapper.dataset.mediaId);
            if (item && mediaPickerTargetId) {
              qs(`#${mediaPickerTargetId}`).value = item.dataUrl;
            }
            closeMediaPicker();
          });
        });
        qs('#media-picker').classList.remove('hidden');
      });
    });

    qs('[data-action="close-media-picker"]').addEventListener('click', closeMediaPicker);
    qs('#media-picker').addEventListener('click', (e) => {
      if (e.target.id === 'media-picker') closeMediaPicker();
    });
  }

  function closeMediaPicker() {
    qs('#media-picker').classList.add('hidden');
  }

  // --------------------------------------------------------------------
  // Pengaturan (Settings)
  // --------------------------------------------------------------------
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    keys.slice(0, -1).forEach((k) => {
      cur[k] = cur[k] || {};
      cur = cur[k];
    });
    cur[keys[keys.length - 1]] = value;
  }

  async function loadSettingsForm() {
    const site = await ContentRepository.getSite();
    const form = qs('[data-form="settings"]');
    qsa('input, textarea', form).forEach((el) => {
      const value = getPath(site, el.name);
      if (value != null) el.value = value;
    });
  }

  function initSettingsForm() {
    const form = qs('[data-form="settings"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const site = await ContentRepository.getSite();
      qsa('input, textarea', form).forEach((el) => setPath(site, el.name, el.value));
      await ContentRepository.saveSite(site);
      toast('Pengaturan disimpan.');
    });
  }

  // --------------------------------------------------------------------
  // Dashboard quick actions + sidebar toggle
  // --------------------------------------------------------------------
  function initQuickActions() {
    qsa('[data-action="new-activity"]').forEach((btn) =>
      btn.addEventListener('click', () => {
        window.location.hash = '#kegiatan';
        openActivityForm(null);
      })
    );
    qsa('[data-action="new-article"]').forEach((btn) =>
      btn.addEventListener('click', () => {
        window.location.hash = '#tulisan';
        openArticleForm(null);
      })
    );
    qsa('[data-action="new-program"]').forEach((btn) =>
      btn.addEventListener('click', () => openProgramForm(null))
    );
    qsa('[data-action="back-to-list"]').forEach((btn) =>
      btn.addEventListener('click', () => showSubview(btn.dataset.target, `${btn.dataset.target}-list`))
    );
  }

  function initSidebarToggle() {
    const toggle = qs('#sidebar-toggle');
    const sidebar = qs('#sidebar');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', () => {
      const isHidden = sidebar.classList.toggle('hidden');
      sidebar.classList.toggle('flex', !isHidden);
      toggle.setAttribute('aria-expanded', String(!isHidden));
    });
  }

  // --------------------------------------------------------------------
  // Boot
  // --------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    initSidebarToggle();
    initQuickActions();
    initActivityForm();
    initArticleForm();
    initProgramForm();
    initMediaUpload();
    initMediaPicker();
    initSettingsForm();
    window.addEventListener('hashchange', renderView);
    renderView();
  });
})();
