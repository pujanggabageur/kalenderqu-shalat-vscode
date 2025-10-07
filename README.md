# 🕌 KalenderQu Adzan

**KalenderQu Adzan** adalah ekstensi Visual Studio Code yang menampilkan **jadwal shalat harian** berdasarkan lokasi pengguna dan memberikan **notifikasi otomatis saat masuk waktu shalat**, lengkap dengan **suara adzan**.  
Didesain agar pengembang Muslim dapat tetap fokus bekerja tanpa melewatkan waktu ibadah.

---

## ✨ Fitur Utama

- 🕋 **Jadwal Shalat Lengkap:** Subuh, Dzuhur, Ashar, Maghrib, Isya, serta Imsak & Syuruq.  
- 🔔 **Notifikasi Otomatis:** Tampil setiap kali masuk waktu shalat.  
- 🔊 **Suara Adzan:** Bisa diaktifkan/nonaktifkan dari pengaturan.  
- 📍 **Pilih Kota:** Pilih lokasi secara interaktif dari daftar kota Indonesia.  
- ⚙️ **Konfigurasi Mudah:** Semua pengaturan tersimpan di `settings.json` (global).  
- 🕰️ **Perhitungan Akurat:** Menggunakan fungsi `Islam.Imsakiyah()` yang menyesuaikan zona waktu (`tz`).

---

## 🧭 Cara Penggunaan

### 1. Buka Command Palette
Tekan `Ctrl + Shift + P` (Windows/Linux) atau `Cmd + Shift + P` (macOS), lalu ketik:
KalenderQu: Jadwal Shalat

### 2. Pilih Kota
Pilih kota dari daftar. Data lokasi (latitude, longitude, dan timezone) akan tersimpan otomatis.

### 3. Aktifkan Notifikasi
Setelah memilih kota, ekstensi akan menampilkan pesan:

> 🕌 Notifikasi adzan aktif untuk wilayah [Nama Kota]

Ekstensi akan memantau waktu shalat dan memberi notifikasi setiap masuk waktu.

---

## ⚙️ Pengaturan

Buka `Settings` → ketik **KalenderQu Adzan**, atau edit langsung di `settings.json`:

```json
{
  "kalenderqu_adzan.city": "Bandung",
  "kalenderqu_adzan.lat": -6.914744,
  "kalenderqu_adzan.lon": 107.60981,
  "kalenderqu_adzan.tz": 7,
  "kalenderqu_adzan.playSound": true
}
```

## Situs Web
[KalenderQu.Com]([kalenderqu-url])

## Pengembang
[Agung Novian](mailto:pujanggabageur@gmail.com)


## Donasi
**PayPal**: [![PayPal](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/novian)

Bank:
**BCA**: 8105216927

[kalenderqu-url]: https://kalenderqu.com