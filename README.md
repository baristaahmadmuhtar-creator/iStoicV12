# IStoicAI v13.5 Platinum Cognitive Terminal

Selamat datang di masa depan produktivitas kognitif. Project ini adalah terminal pribadi yang menggabungkan filsafat Stoikisme dengan kecerdasan buatan multi-engine (Gemini, Llama, DeepSeek).

## 🚀 Persiapan Menjalankan di Localhost

### 1. Prasyarat
- **Node.js LTS** (v20.x atau terbaru)
- **Koneksi Internet**

### 2. Instalasi
Ekstrak project ini, buka terminal di folder project, lalu jalankan:
```bash
npm install
```

### 3. Konfigurasi API Key (.env.local)
Aplikasi ini membutuhkan API Key untuk berfungsi. Buat file bernama `.env.local` di folder utama project dan isi sebagai berikut:

```env
# Gemini API Key (Utama - Diperlukan untuk Neural Link & Tools)
VITE_GEMINI_API_KEY=GANTI_DENGAN_KEY_ANDA

# Opsional (Untuk Arsenal View / Multi-Engine)
VITE_GROQ_API_KEY=GANTI_DENGAN_KEY_GROQ
VITE_DEEPSEEK_API_KEY=GANTI_DENGAN_KEY_DEEPSEEK
```

### 4. Menjalankan Aplikasi
Ketik perintah berikut di terminal:
```bash
npm run dev
```
Buka browser dan buka alamat: `http://localhost:3000`

---

## 📱 Menjalankan di Mobile (Android/iOS)

Untuk menjalankan IStoicAI di HP Anda melalui koneksi lokal:
1. Pastikan PC dan HP terhubung ke **Wi-Fi yang sama**.
2. Cari alamat IP Lokal PC Anda (Windows: ketik `ipconfig` di CMD, cari `IPv4 Address`).
3. Di HP Anda, buka browser (Chrome/Safari) dan ketik: `http://[IP-PC-ANDA]:3000`.

---

## 🛠 Troubleshooting (Solusi Masalah)

### Error: "Command not recognized"
Pastikan Node.js sudah terinstal dengan benar. Coba restart terminal atau jalankan `npm install` kembali.

### Fitur Neural Link Tidak Bisa Digunakan
Fitur suara (Neural Link) memerlukan **HTTPS** atau akses **localhost**. Di browser mobile, fitur ini mungkin diblokir jika tidak menggunakan HTTPS. Namun, di localhost PC, fitur ini akan berjalan normal.

### Gambar Tidak Muncul di Arsenal
Pastikan Gemini API Key Anda valid. Fitur `generate_visual` membutuhkan akses ke model `gemini-2.5-flash-image` atau `gemini-3-pro-image-preview`.

---

## 💎 Status Akhir
- ✅ **SIAP PRODUKSI**: Build optimal & stable.
- ✅ **SIAP LOCALHOST**: Mendukung Windows, Mac, Linux.
- ✅ **SIAP MOBILE**: Layout responsif untuk Android & iOS.
- ✅ **SIAP SEMUA BROWSER**: Kompatibel dengan Chrome, Safari, Edge.

---
**IStoicAI Team | Platinum Edition v13.5**
*"Efficiency is the foundation of ataraxia."*