# GitHub Profile Switcher

> Switch between multiple GitHub accounts (git config, SSH key, token) with one click in VSCode.

## Features

- ⚡ **Quick Switch** — switch profil dari Status Bar atau Command Palette
- 🔑 **Token Storage** — GitHub token disimpan encrypted di OS keychain (via VSCode SecretStorage)
- 🔐 **SSH Key Switching** — otomatis update `~/.ssh/config` saat ganti profil
- 🔗 **Workspace Binding** — bind profil ke workspace tertentu, auto-switch saat buka folder
- 🎨 **Premium UI** — panel manajemen profil dengan dark mode & glassmorphism

## Cara Install

1. Download file `github-profile-switcher-1.0.0.vsix`
2. Buka VSCode → Extensions (`Ctrl+Shift+X`)
3. Klik `···` (menu) → **Install from VSIX...**
4. Pilih file `.vsix`

## Cara Pakai

### Tambah Profil
- Buka Command Palette (`Ctrl+Shift+P`) → **GitHub Switcher: Manage GitHub Profiles**
- Atau klik `+ Add Profile` di panel

### Switch Profil
- Klik nama profil di **Status Bar** (kiri bawah VSCode)
- Atau `Ctrl+Shift+G, Ctrl+Shift+S`
- Atau Command Palette → **GitHub Switcher: Switch GitHub Profile**

### Bind Workspace
Agar profil otomatis aktif saat membuka folder tertentu:
1. Buka folder/repo-nya di VSCode
2. Command Palette → **GitHub Switcher: Bind Current Workspace to Profile**
3. Pilih profil yang ingin di-bind

## Commands

| Command | Shortcut |
|---|---|
| Switch GitHub Profile | `Ctrl+Shift+G, Ctrl+Shift+S` |
| Manage GitHub Profiles | `Ctrl+Shift+G, Ctrl+Shift+P` |
| Bind Current Workspace | Command Palette |
| Test GitHub Connection | Command Palette |

## Settings

| Setting | Default | Description |
|---|---|---|
| `githubSwitcher.applyGlobally` | `false` | Apply git config `--global` |
| `githubSwitcher.showStatusBar` | `true` | Tampilkan profil di status bar |
| `githubSwitcher.autoSwitchOnWorkspaceOpen` | `true` | Auto-switch saat buka bound workspace |

## SSH Key Setup

Ekstensi ini mengelola blok berikut di `~/.ssh/config`:

```
# GitHub Profile Switcher - START
# Profile: Work Account
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_work
  IdentitiesOnly yes
# GitHub Profile Switcher - END
```

Blok ini diupdate otomatis saat ganti profil. Konfigurasi SSH lainnya tidak tersentuh.

## GitHub Token

Token membutuhkan scope: **`repo`** (untuk akses repository private).

Generate di: https://github.com/settings/tokens/new
