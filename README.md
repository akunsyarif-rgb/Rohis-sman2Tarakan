# rohis-sman2tarakan.github.io

Website Rohis SMAN 2 Tarakan. Static site (HTML + Tailwind CDN), tanpa build step, siap deploy langsung ke GitHub Pages.

## Struktur

```
/
├── index.html              Beranda
├── kegiatan.html           Arsip kegiatan (dengan filter kategori)
├── kegiatan-detail.html    Detail kegiatan (?id=...)
├── tulisan.html            Rohis Journal — arsip tulisan
├── tulisan-detail.html     Detail tulisan (?id=...)
├── tentang.html            Tentang kami
│
├── kelola/                 Admin workspace (prototype lokal, lihat di bawah)
│   └── index.html
│
├── data/                   Content layer — sumber data situs publik
│   ├── site.json           Identitas organisasi, hero, kontak, sosial media
│   ├── programs.json       Program kerja (Kajian Tematik, Aksi Sosial, dst.)
│   ├── activities.json     Kegiatan
│   └── articles.json       Tulisan / artikel
│
├── css/
│   ├── style.css           Design tokens + animasi (scroll reveal, navbar, dst.)
│   └── admin.css           Style khusus admin workspace
│
├── js/
│   ├── data.js              ContentRepository — satu-satunya jalur akses data
│   ├── app.js                Rendering & interaksi situs publik
│   ├── admin.js              Logika admin workspace (CRUD, preview, settings)
│   └── tailwind-config.js    Design tokens Tailwind (warna & font bersama)
│
└── .github/
    ├── workflows/validate.yml   CI: validasi JSON, field wajib, tautan internal
    └── scripts/validate.js
```

## Menjalankan secara lokal

Situs ini murni statis — jalankan server statis apa saja dari root folder, misalnya:

```
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

## Content layer & arsitektur data

Semua halaman publik dan admin workspace **hanya** berbicara dengan `ContentRepository`
(`js/data.js`) — tidak pernah memanggil `fetch()` atau `localStorage` secara langsung.

Cara kerja `LocalStorageRepository` (implementasi saat ini):

1. Saat pertama kali dibuka, data dibaca dari `data/*.json` (seed data di repo ini).
2. Data tersebut disalin ke `localStorage` sebagai working copy.
3. Admin workspace membaca/menulis working copy ini melalui `ContentRepository`.

Ini berarti perubahan yang dibuat lewat `/kelola/` **tersimpan lokal di browser
tersebut saja** — belum tersinkron ke semua pengunjung situs. Ini disengaja untuk
fase sekarang (lihat bagian Admin Workspace di bawah).

### Migrasi ke backend nanti

```
SEKARANG                          NANTI
JSON / localStorage                Supabase (Auth, DB, Storage)
       │                                  │
       ▼                                  ▼
  ContentRepository  ────────────►  ContentRepository (impl baru)
       │                                  │
       ▼                                  ▼
   Public UI / Admin UI  (tidak berubah sama sekali)
```

Untuk migrasi: buat class baru (mis. `SupabaseRepository`) yang mengimplementasikan
method async yang sama (`getSite`, `saveActivity`, `deleteArticle`, dst.), lalu ganti
baris `global.ContentRepository = new LocalStorageRepository()` di `js/data.js`.
Tidak ada kode UI yang perlu disentuh.

## Admin Workspace (`/kelola/`)

**Ini adalah prototipe lokal/statis, bukan sistem produksi.** Tidak ada autentikasi,
tidak ada password hard-coded, tidak ada backend. Siapa pun yang membuka `/kelola/`
di browser mereka bisa mengedit — perubahan hanya tersimpan di browser itu.

Fitur:

- **Dashboard** — jumlah kegiatan/tulisan/program/media aktual (bukan angka statis) + aktivitas terbaru.
- **Kegiatan** — tambah/edit/hapus, status draft/published, preview.
- **Tulisan** — tambah/edit/hapus, simpan draft atau terbitkan, preview.
- **Program** — tambah/edit/hapus/aktifkan-nonaktifkan; dibaca langsung oleh beranda.
- **Media** — unggah gambar (disimpan sebagai data URL di `localStorage`, maksimum
  ~350KB per gambar untuk fase prototipe ini), pilih gambar untuk cover kegiatan/tulisan.
- **Pengaturan** — ubah identitas organisasi, teks hero, dan tautan kontak/sosial media.

Preview membuka halaman publik yang sama persis (bukan tampilan admin) di tab baru,
membaca draft sementara dari `sessionStorage` — belum tersimpan sampai ditekan Simpan.

## Data placeholder

Beberapa data belum diisi secara faktual (jumlah anggota, tahun berdiri, tautan
Instagram/WhatsApp resmi, dsb.) dan sengaja dikosongkan/ditandai sebagai placeholder
alih-alih dikarang. Isi melalui `/kelola/` → Pengaturan, atau langsung edit `data/*.json`.

## Design tokens

| Token     | Nilai      |
|-----------|------------|
| Forest    | `#234233`  |
| Ivory     | `#FBFBF9`  |
| Charcoal  | `#1E211F`  |
| Muted     | `#6E736F`  |
| Line      | `#E5E3DE`  |

Font display: **Playfair Display** (headline, judul artikel). Font UI: **Plus Jakarta Sans**
(body, navigasi, form, admin).
