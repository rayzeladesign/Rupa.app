# Sub Rupa — Web App (Firebase + GitHub Pages)

## Yang sudah disiapkan
- Kode React (Vite) di folder `src/`, sudah pakai Firebase Firestore untuk data **realtime** (semua device lihat data yang sama, live, tanpa refresh).
- Login sederhana (nama + PIN) untuk Kasub / Wakasub / Humas — lihat & edit di `src/users.js`.
- Config Firebase kamu sudah ditempel di `src/firebase.js`.
- GitHub Actions (`.github/workflows/deploy.yml`) yang otomatis build & deploy tiap kali kamu push ke branch `main`.

## Langkah upload ke GitHub

1. **Hapus isi lama repo `Rupa.app`** (file `sub-rupa-app.jsx` yang lama), lalu upload semua isi folder ini menggantikannya. Cara termudah lewat terminal:
   ```bash
   git clone https://github.com/rayzeladesign/Rupa.app.git
   cd Rupa.app
   git rm -rf .
   # copy semua file dari folder subrupa/ (yang aku siapkan) ke sini
   git add .
   git commit -m "Setup Sub Rupa web app dengan Firebase realtime"
   git push
   ```
   (Kalau kamu lebih nyaman upload manual lewat github.com, aku juga bisa siapin file .zip — tinggal bilang.)

2. **Aktifkan GitHub Pages lewat Actions:**
   Buka repo di GitHub → **Settings** → **Pages** → di bagian **Build and deployment**, ubah **Source** jadi **GitHub Actions** (bukan "Deploy from a branch").

3. Setelah push, buka tab **Actions** di repo — tunggu sampai workflow selesai (centang hijau), lalu buka:
   👉 **https://rayzeladesign.github.io/Rupa.app/**

## Sebelum dipakai bertiga

Edit `src/users.js`, ganti nama & PIN sesuai kalian bertiga:
```js
export const USERS = [
  { name: "Nama Kasub", role: "Kasub", pin: "1234" },
  { name: "Nama Wakasub", role: "Wakasub", pin: "2345" },
  { name: "Nama Humas", role: "Humas", pin: "3456" },
];
```
Commit & push lagi, workflow akan otomatis build ulang.

## Catatan penting
- Data tersimpan di **Firestore** (project `subrupa-6eaf1`), realtime untuk semua yang login — kasub isi data, wakasub & humas langsung lihat perubahan tanpa refresh.
- Firestore rules saat ini terbuka (siapa saja yang tahu PIN bisa akses) — cukup untuk skala UKM. Kalau ke depannya butuh keamanan lebih ketat, bisa upgrade ke Firebase Authentication asli.
- Kalau butuh nambah anggota login lagi (lebih dari 3), tinggal tambah baris di `USERS`.

## Development lokal (opsional)
```bash
npm install
npm run dev
```
