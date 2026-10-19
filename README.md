# rohis-sman2tarakan.github.io

Website Rohis Al Ihsan SMAN 2 Tarakan. Static site (HTML + Tailwind hasil build yang di-commit), siap deploy langsung ke GitHub Pages.

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
├── kelola/                 Admin workspace (login pengurus, lihat di bawah)
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
│   ├── data.js              ContentRepository dasar (membaca data/*.json)
│   ├── appwrite-repository.js  ContentRepository ke Appwrite + login pengurus
│   ├── app.js                Rendering & interaksi situs publik
│   ├── admin.js              Logika admin workspace (CRUD, preview, settings)
│   (tailwind.config.js di root = design tokens; css/tailwind.css = hasil build, wajib di-commit)
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

Semua halaman publik dan Kelola hanya berbicara dengan `ContentRepository`
(`js/data.js` + `js/appwrite-repository.js`) — tidak memanggil `fetch()` atau
`localStorage` untuk konten secara langsung.

```
Halaman publik ──► Appwrite (baca, tanpa login)  ──gagal──► data/*.json
Kelola          ──► Appwrite (login kode email, tulis hanya tim `pengurus`)
```

- **Sumber data utama: Appwrite** (project `6ace47c90031991e50c8`, wilayah Frankfurt,
  database `rohis`, tabel `site`, `programs`, `activities`, `articles`, bucket `media`).
- **`data/*.json` = data awal dan cadangan.** Halaman publik memakainya otomatis jika
  Appwrite tidak terjangkau. Perubahan lewat Kelola tidak mengubah file ini; gunakan
  tombol unduh di Kelola → Pengaturan jika ingin salinan cadangan.
- Tidak ada rahasia di kode. Project ID dan endpoint memang publik; yang menjaga data
  adalah izin di Appwrite: baca terbuka hanya untuk baris terbit, tulis hanya untuk tim
  `pengurus`, dan draf hanya terbaca oleh tim itu.
- Domain situs terdaftar sebagai Web platform di Appwrite
  (`rohis-sman2tarakan.github.io`). Domain baru perlu didaftarkan juga.

## Admin Workspace (`/kelola/`)

Login memakai **kode 6 angka yang dikirim ke email** (tanpa password). Hanya email yang
sudah menjadi anggota tim `pengurus` di Appwrite yang bisa menulis; email lain bisa
meminta kode tetapi ditolak dan tidak bisa mengubah apa pun.

Fitur:

- **Dashboard** — jumlah kegiatan/tulisan/program/media dan aktivitas terbaru.
- **Kegiatan** dan **Tulisan** — tambah/edit/hapus, draf atau terbitkan, pratinjau. Setiap item punya **Periode kepengurusan** (kolom `period`); jika dikosongkan, otomatis dari tahun tanggal (pergantian pengurus biasanya Desember–Januari). Halaman publik menampilkan periode terbaru lebih dulu, dengan pilihan periode sebelumnya sebagai arsip.
- **Program** — tambah/edit/hapus/aktifkan-nonaktifkan.
- **Media** — unggah gambar ke Appwrite Storage (foto besar otomatis diperkecil ke
  ±1600px sebelum diunggah; batas 5 MB), pilih sebagai cover.
- **Pengaturan** — identitas organisasi, teks hero, kontak, dan sosial media.

Menambah pengurus: Appwrite Console → Auth → Teams → `pengurus` → Create membership
(atau minta pengelola teknis).

Pratinjau membuka halaman publik yang sama persis di tab baru, membaca draf sementara
dari `sessionStorage` — belum tersimpan sampai ditekan Simpan.

## Data placeholder

Beberapa data belum diisi secara faktual (jumlah anggota, tahun berdiri, tautan
Instagram/TikTok resmi, dsb.) dan sengaja dikosongkan/ditandai sebagai placeholder
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

## Build CSS

Tailwind tidak lagi dimuat dari CDN. Setelah mengubah class di HTML/JS atau `tailwind.config.js`:

```
npm install
npm run build:css
```

lalu commit `css/tailwind.css`. CI akan gagal jika file ini tidak sinkron.

## Catatan data

Situs publik membaca dari Appwrite dan memakai `data/*.json` hanya sebagai cadangan. Perubahan di `/kelola/` langsung terlihat oleh pengunjung tanpa commit.
