# GitHub Profile Switcher

> Switch between multiple GitHub accounts (git config, SSH key, token, credentials) with one click in VSCode or Antigravity.

---

### Language / Bahasa
* 🌍 [English](#english)
* 🇮🇩 [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## 🌍 English

Easy-to-use extension to manage and switch between multiple GitHub identities within VSCode or Antigravity.

### ⚡ Features
- 🌟 **Inline Status Bar Info** — Shows active profile name and email directly in the status bar (`⚡ Work | latief@work.com`).
- 📋 **Rich Detail Popup** — Click the status bar to view active profile details (Git Name, Email, SSH status, Remote URL details) and quick actions.
- ⚡ **Auto Gen SSH Key** — Automatically generate a secure `Ed25519` SSH key with a single click, complete with a button to copy public key and open GitHub settings.
- 🔗 **Convert to SSH** — Detects HTTPS remotes and suggests one-click conversion to SSH (`git@github.com:...`) to resolve credential collision issues.
- 🔑 **Secure Token Storage** — Stored safely in your OS keychain (via VSCode SecretStorage).
- 🔗 **Workspace Binding** — Bind profiles to specific folders/repos for automatic switching when opened.
- 📤 **Export & Import** — Easily backup and migrate all profiles + encrypted tokens using secure `.json` configurations.
- 🎨 **Premium UI** — Glassmorphism UI panel design with responsive micro-interactions.

### 🚀 Installation
1. Download the latest VSIX file: [github-profile-switcher-1.9.0.vsix](https://github.com/latiefahmad/github-switcher/releases/download/v1.9.0/github-profile-switcher-1.9.0.vsix) (or visit [GitHub Releases](https://github.com/latiefahmad/github-switcher/releases)).
2. Open VSCode/Antigravity → go to Extensions (`Ctrl+Shift+X`).
3. Click the `···` menu at the top-right of the Extensions panel → select **Install from VSIX...**.
4. Choose the downloaded `github-profile-switcher-1.9.0.vsix` file.
5. Reload the IDE if prompted.

### 📖 How to Use
#### 1. Setup Profile & SSH Key
- Open the panel: `Ctrl+Shift+P` → **GitHub Switcher: Manage GitHub Profiles**.
- Click **+ Add Profile**.
- Under **SSH Private Key**, click **⚡ Auto Gen** to create a secure SSH key instantly.
- Click **📋 Copy & Go to GitHub** to copy your public key and register it under your GitHub account SSH settings.
- Enter your Personal Access Token (PAT) with `repo` scope ticked.
- Save the profile.

#### 2. Fixing Push/Pull Errors (Permission Denied)
If your repository remote uses HTTPS, multiple accounts can clash with Windows Credentials.
- Click the active profile name in the Status Bar.
- Under actions, select **Convert Remote to SSH**.
- The extension changes the remote URL automatically. Pulling/pushing will now authenticate seamlessly using the profile's SSH key!

#### 3. Migration (Export/Import)
- Click **📤 Export Profiles** to save your configurations.
- On your new machine, open the panel and click **📥 Import Profiles** to load all accounts instantly.

---

<a name="bahasa-indonesia"></a>
## 🇮🇩 Bahasa Indonesia

Ekstensi sederhana untuk mengelola dan beralih di antara beberapa akun GitHub secara instan di VSCode atau Antigravity.

### ⚡ Fitur Utama
- 🌟 **Inline Status Bar Info** — Menampilkan profil aktif dan email langsung di status bar (`⚡ Work | latief@work.com`).
- 📋 **Rich Detail Popup** — Klik status bar untuk melihat detail profile (Git Name, Email, SSH status, Remote URL info) beserta menu cepat.
- ⚡ **Auto Gen SSH Key** — Generate kunci SSH (`Ed25519`) instan langsung dari panel edit, lengkap dengan tombol copy key & link daftarkan ke GitHub.
- 🔗 **Convert to SSH** — Deteksi remote HTTPS dan tawarkan konversi sekali klik ke SSH (`git@github.com:...`) untuk mengatasi masalah autentikasi multi-akun.
- 🔑 **Token Storage** — GitHub token disimpan terenkripsi di OS keychain (via VSCode SecretStorage).
- 🔗 **Workspace Binding** — Bind profil ke folder proyek tertentu, otomatis switch saat workspace dibuka.
- 📤 **Export & Import** — Backup dan pindahkan semua profil + token rahasia antar IDE atau komputer menggunakan file `.json`.
- 🎨 **Premium UI** — Panel manajemen profil modern berbasis Glassmorphism dengan animasi micro-interaction.

### 🚀 Cara Install
1. Download file VSIX versi terbaru: [github-profile-switcher-1.9.0.vsix](https://github.com/latiefahmad/github-switcher/releases/download/v1.9.0/github-profile-switcher-1.9.0.vsix) (atau kunjungi halaman [GitHub Releases](https://github.com/latiefahmad/github-switcher/releases))
2. Buka VSCode / Antigravity → Extensions (`Ctrl+Shift+X`)
3. Klik tombol `···` (Menu) di kanan atas panel Extensions → pilih **Install from VSIX...**
4. Pilih file `github-profile-switcher-1.9.0.vsix` yang telah didownload.
5. Jalankan perintah `Developer: Reload Window` jika diperlukan.

### 📖 Cara Penggunaan
#### 1. Membuat Profil & SSH Key Baru
* Buka Panel Manager lewat Command Palette (`Ctrl+Shift+P` → **GitHub Switcher: Manage GitHub Profiles**).
* Klik **+ Add Profile**.
* Isi label, Git Name, Email, dan Username GitHub.
* Pada kolom **SSH Private Key**:
  * Klik tombol **⚡ Auto Gen** untuk membuat kunci SSH otomatis secara instan.
  * Klik **📋 Copy & Go to GitHub** untuk menyalin kunci publik ke clipboard dan membuka halaman setting SSH GitHub untuk mendaftarkannya.
* Isi token (PAT) dengan mencentang scope `repo`.
* Klik **Save Profile**.

#### 2. Mengatasi Error Push/Pull (Permission Denied)
Jika repositorimu menggunakan HTTPS, koneksi multi-akun sering mengalami bentrok credential di Windows.
* Klik status bar di bawah → lihat bagian remote URL.
* Jika bertipe HTTPS, pilih **Convert Remote to SSH** pada menu popup Actions.
* Ekstensi akan mengubah remote URL ke SSH secara otomatis. Push/pull akan berjalan lancar menggunakan SSH key yang sesuai dengan profil aktif!

#### 3. Migrasi Profil ke IDE / Komputer Lain
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

---

## ☕ Support & Donation / Dukungan & Donasi

If this extension has helped you work faster and resolve authentication conflicts, consider buying me a coffee!
Jika ekstensi ini membantu mempermudah pekerjaanmu, dukung pengembangannya lewat:

<p align="left">
  <a href="https://saweria.co/latiefahmad" target="_blank">
    <img src="https://img.shields.io/badge/SAWERIA-DUKUNG%20SAYA-orange?style=for-the-badge&labelColor=555555&color=fa6400" alt="Saweria" />
  </a>
  &nbsp;&nbsp;
  <a href="https://trakteer.id/latiefahmad/tip" target="_blank">
    <img src="https://img.shields.io/badge/TRAKTEER-TRAKTIR%20KOPI-red?style=for-the-badge&logo=ko-fi&logoColor=white&labelColor=555555&color=cc1818" alt="Trakteer" />
  </a>
</p>

Thank you for your support! / Terima kasih banyak atas dukungannya!
