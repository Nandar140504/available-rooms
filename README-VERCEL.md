# Available Rooms - versi Vercel (gratis, bisa diedit dari mana saja)

Struktur yang HARUS ada di akar repository GitHub (bukan di dalam folder lagi):
    api/  lib/  public/  package.json  vercel.json

## Langkah
1. Buat akun GitHub (github.com), lalu buat repository baru bernama `available-rooms`.
2. Di halaman repository klik "uploading an existing file", seret ISI folder ini
   (folder api, lib, public, dan file package.json, vercel.json), lalu klik Commit changes.
3. Buat akun Vercel (vercel.com) dengan "Continue with GitHub".
4. Add New -> Project -> pilih repository `available-rooms` -> Import.
   Framework Preset: Other. Kosongkan Build Command. Klik Deploy.
5. Buka proyek di Vercel -> tab Storage -> buat database Upstash Redis dari Marketplace
   (pilih paket gratis, wilayah terdekat misalnya Singapura) -> Connect ke proyek ini.
   Variabel lingkungan Redis akan ditambahkan otomatis.
6. Settings -> Environment Variables -> tambah:
       Name  : ADMIN_PASSWORD
       Value : (password panjang buatan Anda)
   Simpan.
7. Deployments -> deployment terbaru -> titik tiga -> Redeploy (supaya variabel terbaca).
8. Buka https://NAMA-PROYEK.vercel.app . Tekan ikon gerigi di kanan bawah (atau huruf E),
   login dengan ADMIN_PASSWORD, lalu isi jadwal.
9. Di TV, buka alamat yang sama.

## Jika bermasalah
- Pesan "Redis belum terhubung": langkah 5 atau 7 belum dilakukan.
- Alamat /api/data tidak ditemukan (404): folder api tidak berada di akar repository.
- Kartu muncul tapi jadwal tidak tersimpan: cek variabel Redis di Settings -> Environment Variables.

## Catatan
- Tampilan di layar lain diperbarui sekitar 30-60 detik setelah jadwal disimpan.
- Pastikan paket gratis Vercel dan Upstash boleh dipakai untuk keperluan Anda dan cukup kuotanya.
