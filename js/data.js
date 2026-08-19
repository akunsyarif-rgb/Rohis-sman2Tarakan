/**
 * Content layer for the Rohis SMADA Tarakan website.
 *
 * Public pages and the admin workspace never touch localStorage or
 * fetch() directly — they only call `ContentRepository`. Today that
 * repository is backed by JSON seed files + localStorage (so the
 * site keeps working as a static GitHub Pages deploy with a local
 * admin prototype). When a real backend is ready, swap
 * `LocalStorageRepository` for a `SupabaseRepository` implementing
 * the same async methods; nothing above this file needs to change.
 */

(function (global) {
  const STORAGE_KEYS = {
    site: 'rohis:site',
    programs: 'rohis:programs',
    activities: 'rohis:activities',
    articles: 'rohis:articles',
    media: 'rohis:media',
  };

  const SEED_PATHS = {
    site: '/data/site.json',
    programs: '/data/programs.json',
    activities: '/data/activities.json',
    articles: '/data/articles.json',
  };

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Gagal membaca cache lokal untuk', key, err);
      return null;
    }
  }

  function writeCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('Gagal menyimpan ke localStorage (kemungkinan penuh):', err);
      throw err;
    }
  }

  async function loadSeed(seedPath) {
    const res = await fetch(seedPath);
    if (!res.ok) {
      throw new Error(`Gagal memuat ${seedPath}: ${res.status}`);
    }
    return res.json();
  }

  async function loadCollection(key) {
    const cached = readCache(key);
    if (cached !== null) return cached;
    const seed = await loadSeed(SEED_PATHS[key]);
    writeCache(key, seed);
    return seed;
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
  }

  function makeId(existing, title) {
    const base = slugify(title) || 'item';
    let candidate = base;
    let n = 2;
    const ids = new Set(existing.map((item) => item.id));
    while (ids.has(candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  }

  class LocalStorageRepository {
    // ---- Site settings -------------------------------------------------
    async getSite() {
      return loadCollection('site');
    }

    async saveSite(site) {
      writeCache(STORAGE_KEYS.site, site);
      return site;
    }

    // ---- Programs --------------------------------------------------------
    async getPrograms() {
      return loadCollection('programs');
    }

    async saveProgram(program) {
      const list = await this.getPrograms();
      const isNew = !program.id;
      if (isNew) {
        program.id = makeId(list, program.title);
      }
      const idx = list.findIndex((p) => p.id === program.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...program };
      } else {
        list.push(program);
      }
      writeCache(STORAGE_KEYS.programs, list);
      return program;
    }

    async deleteProgram(id) {
      const list = await this.getPrograms();
      const next = list.filter((p) => p.id !== id);
      writeCache(STORAGE_KEYS.programs, next);
    }

    // ---- Activities (Kegiatan) -------------------------------------------
    async getActivities() {
      return loadCollection('activities');
    }

    async getActivity(id) {
      const list = await this.getActivities();
      return list.find((a) => a.id === id) || null;
    }

    async saveActivity(activity) {
      const list = await this.getActivities();
      const isNew = !activity.id;
      if (isNew) {
        activity.id = makeId(list, activity.title);
        activity.createdAt = new Date().toISOString();
      }
      activity.updatedAt = new Date().toISOString();
      const idx = list.findIndex((a) => a.id === activity.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...activity };
      } else {
        list.unshift(activity);
      }
      writeCache(STORAGE_KEYS.activities, list);
      return activity;
    }

    async deleteActivity(id) {
      const list = await this.getActivities();
      const next = list.filter((a) => a.id !== id);
      writeCache(STORAGE_KEYS.activities, next);
    }

    // ---- Articles (Tulisan / Journal) ------------------------------------
    async getArticles() {
      return loadCollection('articles');
    }

    async getArticle(id) {
      const list = await this.getArticles();
      return list.find((a) => a.id === id) || null;
    }

    async saveArticle(article) {
      const list = await this.getArticles();
      const isNew = !article.id;
      if (isNew) {
        article.id = makeId(list, article.title);
        article.createdAt = new Date().toISOString();
      }
      article.updatedAt = new Date().toISOString();
      const idx = list.findIndex((a) => a.id === article.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...article };
      } else {
        list.unshift(article);
      }
      writeCache(STORAGE_KEYS.articles, list);
      return article;
    }

    async deleteArticle(id) {
      const list = await this.getArticles();
      const next = list.filter((a) => a.id !== id);
      writeCache(STORAGE_KEYS.articles, next);
    }

    // ---- Media library (prototype: dataURL in localStorage) --------------
    async getMedia() {
      return readCache(STORAGE_KEYS.media) || [];
    }

    async saveMedia(item) {
      const list = await this.getMedia();
      item.id = item.id || `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      item.createdAt = item.createdAt || new Date().toISOString();
      list.unshift(item);
      writeCache(STORAGE_KEYS.media, list);
      return item;
    }

    async deleteMedia(id) {
      const list = await this.getMedia();
      const next = list.filter((m) => m.id !== id);
      writeCache(STORAGE_KEYS.media, next);
    }

    // ---- Prototype utilities ----------------------------------------------
    async resetToSeed() {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    }

    // ---- Preview drafts (session-only, never "published") -----------------
    setPreviewDraft(type, data) {
      try {
        sessionStorage.setItem(`rohis:preview:${type}`, JSON.stringify(data));
      } catch (err) {
        console.warn('Gagal menyimpan draft pratinjau', err);
      }
    }

    getPreviewDraft(type) {
      try {
        const raw = sessionStorage.getItem(`rohis:preview:${type}`);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        return null;
      }
    }
  }

  global.ContentRepository = new LocalStorageRepository();
  global.RohisUtil = { slugify };
})(window);
