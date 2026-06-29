# GitHub Profile Switcher

> Switch between multiple GitHub accounts (git config, SSH key, token, credentials) with one click in VSCode or Antigravity.

---

## ⚡ Features

- 🌟 **Inline Status Bar Info** — Menampilkan profil aktif dan email langsung di status bar (`⚡ Work | latief@work.com`).
- 📋 **Rich Detail Popup** — Klik status bar untuk melihat detail profile (Git Name, Email, SSH status, Remote URL info) beserta menu cepat.
- ⚡ **Auto Gen SSH Key** — Generate kunci SSH (`Ed25519`) instan langsung dari panel edit, lengkap dengan tombol copy key & link daftarkan ke GitHub.
- 🔗 **Convert to SSH** — Deteksi remote HTTPS dan tawarkan konversi sekali klik ke SSH (`git@github.com:...`) untuk mengatasi masalah autentikasi multi-akun.
- 🔑 **Token Storage** — GitHub token disimpan terenkripsi di OS keychain (via VSCode SecretStorage).
- 🔗 **Workspace Binding** — Bind profil ke folder proyek tertentu, otomatis switch saat workspace dibuka.
- 📤 **Export & Import** — Backup dan pindahkan semua profil + token rahasia antar IDE atau komputer menggunakan file `.json`.
- 🎨 **Premium UI** — Panel manajemen profil modern berbasis Glassmorphism dengan animasi micro-interaction.

---

## 🚀 Cara Install

1. Download file VSIX versi terbaru: [github-profile-switcher-1.8.0.vsix]
2. Buka VSCode / Antigravity → Extensions (`Ctrl+Shift+X`)
3. Klik tombol `···` (Menu) di kanan atas panel Extensions → pilih **Install from VSIX...**
4. Pilih file `github-profile-switcher-1.8.0.vsix` yang telah didownload.
5. Jalankan perintah `Developer: Reload Window` jika diperlukan.

---

## 📖 Cara Penggunaan

### 1. Membuat Profil & SSH Key Baru
* Buka Panel Manager lewat Command Palette (`Ctrl+Shift+P` → **GitHub Switcher: Manage GitHub Profiles**).
* Klik **+ Add Profile**.
* Isi label, Git Name, Email, dan Username GitHub.
* Pada kolom **SSH Private Key**:
  * Klik tombol **⚡ Auto Gen** untuk membuat kunci SSH otomatis secara instan.
  * Klik **📋 Copy & Go to GitHub** untuk menyalin kunci publik ke clipboard dan membuka halaman setting SSH GitHub untuk mendaftarkannya.
* Isi token (PAT) dengan mencentang scope `repo`.
* Klik **Save Profile**.

### 2. Mengatasi Error Push/Pull (Permission Denied)
Jika repositorimu menggunakan HTTPS, koneksi multi-akun sering mengalami bentrok credential di Windows.
* Klik status bar di bawah → lihat bagian remote URL.
* Jika bertipe HTTPS, pilih **Convert Remote to SSH** pada menu popup Actions.
* Ekstensi akan mengubah remote URL ke SSH secara otomatis. Push/pull akan berjalan lancar menggunakan SSH key yang sesuai dengan profil aktif!

### 3. Migrasi Profil ke IDE / Komputer Lain
* Di panel utama **Manage GitHub Profiles**, klik tombol **📤 Export Profiles** di header untuk menyimpan file backup `.json`.
* Di IDE/komputer tujuan, buka panel yang sama lalu klik **📥 Import Profiles** dan pilih file `.json` tersebut. Seluruh profil dan token rahasia akan berpindah instan!

---

## 🛠️ Commands

| Command | Shortcut / Letak | Kegunaan |
|---|---|---|
| **Show Active Profile** | Klik Status Bar / Palette | Memunculkan popup detail info profil aktif & menu aksi |
| **Switch GitHub Profile** | `Ctrl+Shift+G, Ctrl+Shift+S` | Menu QuickPick cepat untuk ganti profil |
| **Manage GitHub Profiles** | `Ctrl+Shift+G, Ctrl+Shift+P` | Membuka Panel UI utama manajemen profil |
| **Convert Remote to SSH** | Status Bar Klik → Actions | Mengubah URL git remote HTTPS menjadi SSH |
| **Bind Current Workspace** | Command Palette | Mengunci folder proyek aktif ke profil tertentu |

---

## ⚙️ Settings

* `githubSwitcher.applyGlobally` (default: `false`): Jika `true`, setelan `git config` akan diterapkan secara global (`--global`), bukan lokal per-repositori.
* `githubSwitcher.showStatusBar` (default: `true`): Menampilkan status bar profil aktif di kiri bawah.
* `githubSwitcher.autoSwitchOnWorkspaceOpen` (default: `true`): Otomatis mengganti profil ketika membuka folder proyek yang telah di-bind.
