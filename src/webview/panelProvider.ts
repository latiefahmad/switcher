import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { ProfileManager } from '../profileManager';
import { GitHubProfile, WebviewMessage } from '../types';
import { testGitHubConnection } from '../githubApi';

export class PanelProvider {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private profileManager: ProfileManager,
    private onSwitchProfile: (profile: GitHubProfile) => Promise<void>
  ) {}

  show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'githubSwitcherPanel',
      'GitHub Profile Switcher',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      'images',
      'icon.png'
    );

    this.panel.webview.html = this.getHtml();

    this.panel.webview.onDidReceiveMessage(
      (msg: WebviewMessage) => this.handleMessage(msg),
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Send initial data
    setTimeout(() => this.sendProfiles(), 300);
  }

  notifyProfilesChanged(): void {
    if (!this.panel) return;
    this.sendProfiles();
  }

  private async sendProfiles(): Promise<void> {
    if (!this.panel) return;

    const profiles = this.profileManager.getProfiles();
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    const activeId = this.profileManager.getActiveProfileId(workspaceUri);

    // Map profiles with hasToken flag (don't send actual tokens to webview)
    const profilesWithMeta = await Promise.all(
      profiles.map(async (p) => {
        const token = await this.profileManager.getProfileToken(p);
        return { ...p, hasToken: !!token };
      })
    );

    this.panel?.webview.postMessage({
      type: 'profilesUpdated',
      payload: { profiles: profilesWithMeta, activeId },
    });
  }

  private async handleMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.type) {
      case 'getProfiles':
        await this.sendProfiles();
        break;

      case 'saveProfile': {
        const data = msg.payload as {
          id?: string;
          label: string;
          gitName: string;
          gitEmail: string;
          githubUsername: string;
          sshKeyPath?: string;
          token?: string;
        };

        try {
          if (data.id) {
            await this.profileManager.updateProfile(data.id, data);
          } else {
            await this.profileManager.addProfile(data);
          }
          await this.sendProfiles();
          this.panel?.webview.postMessage({
            type: 'saveSuccess',
            payload: { message: data.id ? 'Profile updated!' : 'Profile added!' },
          });
        } catch (err) {
          this.panel?.webview.postMessage({
            type: 'error',
            payload: { message: `Failed: ${err instanceof Error ? err.message : String(err)}` },
          });
        }
        break;
      }

      case 'deleteProfile': {
        const { id } = msg.payload as { id: string };
        await this.profileManager.deleteProfile(id);
        await this.sendProfiles();
        break;
      }

      case 'switchProfile': {
        const { id } = msg.payload as { id: string };
        const profile = this.profileManager.getProfileById(id);
        if (profile) {
          await this.onSwitchProfile(profile);
          await this.sendProfiles();
        }
        break;
      }

      case 'testConnection': {
        const { id } = msg.payload as { id: string };
        const profile = this.profileManager.getProfileById(id);
        if (!profile) break;

        const token = await this.profileManager.getProfileToken(profile);
        if (!token) {
          this.panel?.webview.postMessage({
            type: 'connectionResult',
            payload: { id, success: false, message: 'No token stored for this profile.' },
          });
          break;
        }

        const result = await testGitHubConnection(token);
        this.panel?.webview.postMessage({
          type: 'connectionResult',
          payload: { id, ...result },
        });
        break;
      }

      case 'browseSshKey': {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          defaultUri: vscode.Uri.file(path.join(os.homedir(), '.ssh')),
          title: 'Select SSH Private Key',
        });
        if (uris && uris[0]) {
          this.panel?.webview.postMessage({
            type: 'sshKeySelected',
            payload: { path: uris[0].fsPath },
          });
        }
        break;
      }

      case 'bindWorkspace': {
        const { id } = msg.payload as { id: string };
        const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
        if (!workspaceUri) {
          this.panel?.webview.postMessage({
            type: 'error',
            payload: { message: 'No workspace folder open.' },
          });
          break;
        }
        await this.profileManager.bindWorkspace(id, workspaceUri);
        await this.sendProfiles();
        break;
      }

      case 'unbindWorkspace': {
        const { workspaceUri } = msg.payload as { workspaceUri: string };
        await this.profileManager.unbindWorkspace(workspaceUri);
        await this.sendProfiles();
        break;
      }
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GitHub Profile Switcher</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --surface2: #21262d;
      --border: #30363d;
      --accent: #58a6ff;
      --accent-hover: #79b8ff;
      --accent-dim: rgba(88, 166, 255, 0.12);
      --green: #3fb950;
      --red: #f85149;
      --yellow: #d29922;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --radius: 12px;
      --shadow: 0 8px 32px rgba(0,0,0,0.4);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #1c2128 0%, #161b22 100%);
      border-bottom: 1px solid var(--border);
      padding: 24px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(12px);
    }
    .header-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, var(--accent), #a371f7);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 20px rgba(88, 166, 255, 0.3);
    }
    .header-text h1 { font-size: 18px; font-weight: 600; }
    .header-text p { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .header-actions { margin-left: auto; display: flex; gap: 8px; }

    /* ── Buttons ── */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px; font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .btn-primary {
      background: var(--accent);
      color: #0d1117;
    }
    .btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); }
    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { background: var(--surface2); color: var(--text); }
    .btn-danger { background: rgba(248, 81, 73, 0.15); color: var(--red); border: 1px solid rgba(248,81,73,0.3); }
    .btn-danger:hover { background: rgba(248, 81, 73, 0.25); }
    .btn-success { background: rgba(63,185,80,0.15); color: var(--green); border: 1px solid rgba(63,185,80,0.3); }
    .btn-success:hover { background: rgba(63,185,80,0.25); }
    .btn-sm { padding: 5px 10px; font-size: 12px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

    /* ── Layout ── */
    .main { display: flex; gap: 0; min-height: calc(100vh - 89px); }
    .sidebar {
      width: 300px; min-width: 300px;
      border-right: 1px solid var(--border);
      padding: 20px;
      display: flex; flex-direction: column; gap: 8px;
      overflow-y: auto;
    }
    .content { flex: 1; padding: 24px 32px; overflow-y: auto; }

    /* ── Profile Cards ── */
    .profile-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
    }
    .profile-card:hover { border-color: var(--accent); background: var(--surface2); }
    .profile-card.active {
      border-color: var(--accent);
      background: var(--accent-dim);
      box-shadow: 0 0 0 1px var(--accent);
    }
    .profile-card.active::before {
      content: '';
      position: absolute; left: 0; top: 12px; bottom: 12px;
      width: 3px; border-radius: 0 4px 4px 0;
      background: var(--accent);
    }
    .profile-card-label {
      font-size: 14px; font-weight: 600;
      display: flex; align-items: center; gap: 8px;
    }
    .active-badge {
      font-size: 10px; font-weight: 600;
      background: var(--accent); color: #0d1117;
      padding: 1px 6px; border-radius: 99px;
    }
    .profile-card-meta {
      font-size: 11px; color: var(--text-muted);
      margin-top: 4px; line-height: 1.5;
    }
    .profile-card-indicators {
      display: flex; gap: 4px; margin-top: 8px;
    }
    .indicator {
      font-size: 10px; padding: 2px 6px;
      border-radius: 99px; font-weight: 500;
    }
    .ind-token { background: rgba(63,185,80,0.15); color: var(--green); }
    .ind-ssh { background: rgba(210,153,34,0.15); color: var(--yellow); }
    .ind-bound { background: rgba(163,113,247,0.15); color: #a371f7; }
    .ind-no-token { background: rgba(248,81,73,0.1); color: var(--text-muted); }

    /* ── Empty State ── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 48px 24px; text-align: center;
      color: var(--text-muted);
    }
    .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
    .empty-state h3 { font-size: 16px; color: var(--text); margin-bottom: 8px; }
    .empty-state p { font-size: 13px; margin-bottom: 20px; }

    /* ── Detail Panel ── */
    .detail-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px;
    }
    .detail-title { font-size: 22px; font-weight: 700; }
    .detail-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    .detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.8px; color: var(--text-muted);
      margin-bottom: 12px; padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item label {
      font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;
    }
    .info-item .value {
      font-size: 13px; font-weight: 500;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 6px; padding: 8px 12px;
      word-break: break-all;
    }
    .value.mono { font-family: monospace; font-size: 12px; }

    /* ── Connection Test Result ── */
    .conn-result {
      padding: 12px 16px; border-radius: 8px;
      font-size: 13px; font-weight: 500;
      animation: slideIn 0.2s ease;
    }
    .conn-result.success { background: rgba(63,185,80,0.15); color: var(--green); border: 1px solid rgba(63,185,80,0.3); }
    .conn-result.fail { background: rgba(248,81,73,0.12); color: var(--red); border: 1px solid rgba(248,81,73,0.3); }

    /* ── Form ── */
    .form-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
      animation: fadeIn 0.15s ease;
    }
    .form-dialog {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      width: 520px; max-width: 90vw;
      box-shadow: var(--shadow);
      animation: scaleIn 0.15s ease;
      max-height: 90vh; overflow-y: auto;
    }
    .form-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block; font-size: 12px; font-weight: 500;
      color: var(--text-muted); margin-bottom: 6px;
    }
    .form-group .required { color: var(--red); margin-left: 2px; }
    .form-control {
      width: 100%; padding: 10px 14px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text);
      font-family: inherit; font-size: 13px;
      transition: border-color 0.15s;
    }
    .form-control:focus { outline: none; border-color: var(--accent); }
    .form-control.mono { font-family: monospace; }
    .form-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    .form-row { display: flex; gap: 8px; }
    .form-row .form-control { flex: 1; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }

    /* ── Toast ── */
    .toast {
      position: fixed; bottom: 24px; right: 24px;
      padding: 12px 20px; border-radius: 10px;
      font-size: 13px; font-weight: 500;
      z-index: 200;
      animation: slideUp 0.2s ease;
      box-shadow: var(--shadow);
    }
    .toast.success { background: var(--surface); border: 1px solid var(--green); color: var(--green); }
    .toast.error { background: var(--surface); border: 1px solid var(--red); color: var(--red); }

    /* ── Welcome / No-selection ── */
    .welcome {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; text-align: center;
      color: var(--text-muted); padding: 48px;
    }
    .welcome-icon { font-size: 64px; margin-bottom: 20px; opacity: 0.3; }
    .welcome h2 { font-size: 18px; color: var(--text); margin-bottom: 8px; }
    .welcome p { font-size: 13px; line-height: 1.6; }

    /* ── Animations ── */
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    @keyframes slideIn { from { transform: translateY(-4px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    @keyframes slideUp { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    @keyframes spin { to { transform: rotate(360deg) } }
    .spin { display: inline-block; animation: spin 0.8s linear infinite; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-icon">⚡</div>
    <div class="header-text">
      <h1>GitHub Profile Switcher</h1>
      <p>Manage and switch between multiple GitHub identities</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary" onclick="openForm()">
        + Add Profile
      </button>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="main">
    <!-- Sidebar: Profile List -->
    <div class="sidebar" id="sidebar">
      <div class="empty-state" id="emptyState" style="display:none">
        <div class="empty-icon">👤</div>
        <h3>No Profiles Yet</h3>
        <p>Add your first GitHub profile to get started.</p>
        <button class="btn btn-primary" onclick="openForm()">+ Add Profile</button>
      </div>
      <div id="profileList"></div>
    </div>

    <!-- Content: Profile Detail -->
    <div class="content" id="content">
      <div class="welcome" id="welcomeMsg">
        <div class="welcome-icon">🔀</div>
        <h2>Select a Profile</h2>
        <p>Choose a profile from the left panel<br>to view details and actions.</p>
      </div>
      <div id="detailPanel" style="display:none"></div>
    </div>
  </div>

  <!-- Add/Edit Form -->
  <div class="form-overlay" id="formOverlay" style="display:none" onclick="closeFormOnBackdrop(event)">
    <div class="form-dialog">
      <h2 class="form-title" id="formTitle">Add GitHub Profile</h2>
      <input type="hidden" id="editId" />

      <div class="form-group">
        <label>Profile Name <span class="required">*</span></label>
        <input class="form-control" id="fLabel" placeholder='e.g. "Work - Acme Corp"' />
        <p class="form-hint">A friendly label to identify this profile.</p>
      </div>

      <div class="info-grid" style="gap:12px; margin-bottom:16px">
        <div class="form-group" style="margin:0">
          <label>Git Name <span class="required">*</span></label>
          <input class="form-control" id="fGitName" placeholder="Your Name" />
        </div>
        <div class="form-group" style="margin:0">
          <label>Git Email <span class="required">*</span></label>
          <input class="form-control" id="fGitEmail" placeholder="you@example.com" />
        </div>
      </div>

      <div class="form-group">
        <label>GitHub Username <span class="required">*</span></label>
        <input class="form-control" id="fGithubUsername" placeholder="octocat" />
      </div>

      <div class="form-group">
        <label>GitHub Token (PAT) <span id="tokenLabel"></span></label>
        <input class="form-control mono" id="fToken" type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off" />
        <p class="form-hint">
          Stored encrypted in OS keychain. Needs <code>repo</code> scope.
          <a href="https://github.com/settings/tokens/new" style="color:var(--accent)">Generate →</a>
        </p>
      </div>

      <div class="form-group">
        <label>SSH Private Key Path</label>
        <div class="form-row">
          <input class="form-control mono" id="fSshKeyPath" placeholder="~/.ssh/id_rsa_work" />
          <button class="btn btn-ghost" onclick="browseSshKey()">Browse</button>
        </div>
        <p class="form-hint">Optional. Enables SSH switching for git push/pull.</p>
      </div>

      <div class="form-actions">
        <button class="btn btn-ghost" onclick="closeForm()">Cancel</button>
        <button class="btn btn-primary" onclick="saveProfile()" id="saveBtn">Save Profile</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let profiles = [];
    let activeId = null;
    let selectedId = null;

    // ── Init ──────────────────────────────────────────────────────────────────
    window.addEventListener('load', () => {
      vscode.postMessage({ type: 'getProfiles' });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'profilesUpdated':
          profiles = msg.payload.profiles;
          activeId = msg.payload.activeId;
          renderSidebar();
          if (selectedId) renderDetail(selectedId);
          break;
        case 'connectionResult':
          handleConnectionResult(msg.payload);
          break;
        case 'sshKeySelected':
          document.getElementById('fSshKeyPath').value = msg.payload.path;
          break;
        case 'saveSuccess':
          closeForm();
          showToast(msg.payload.message, 'success');
          break;
        case 'error':
          showToast(msg.payload.message, 'error');
          break;
      }
    });

    // ── Sidebar ───────────────────────────────────────────────────────────────
    function renderSidebar() {
      const list = document.getElementById('profileList');
      const empty = document.getElementById('emptyState');

      if (profiles.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        showWelcome();
        return;
      }

      empty.style.display = 'none';
      list.innerHTML = profiles.map(p => {
        const isActive = p.id === activeId;
        const indicators = [];
        if (p.hasToken) indicators.push('<span class="indicator ind-token">Token ✓</span>');
        else indicators.push('<span class="indicator ind-no-token">No Token</span>');
        if (p.sshKeyPath) indicators.push('<span class="indicator ind-ssh">SSH ✓</span>');
        if (p.boundWorkspaces && p.boundWorkspaces.length > 0)
          indicators.push('<span class="indicator ind-bound">Bound</span>');

        return \`
          <div class="profile-card \${isActive ? 'active' : ''} \${p.id === selectedId ? 'selected-card' : ''}"
               onclick="selectProfile('\${p.id}')">
            <div class="profile-card-label">
              <span>⚡ \${esc(p.label)}</span>
              \${isActive ? '<span class="active-badge">Active</span>' : ''}
            </div>
            <div class="profile-card-meta">
              \${esc(p.gitName)} · \${esc(p.gitEmail)}
            </div>
            <div class="profile-card-indicators">
              \${indicators.join('')}
            </div>
          </div>
        \`;
      }).join('');
    }

    // ── Detail ────────────────────────────────────────────────────────────────
    function selectProfile(id) {
      selectedId = id;
      renderSidebar();
      renderDetail(id);
    }

    function renderDetail(id) {
      const p = profiles.find(x => x.id === id);
      if (!p) { showWelcome(); return; }

      document.getElementById('welcomeMsg').style.display = 'none';
      const detail = document.getElementById('detailPanel');
      detail.style.display = 'block';
      const isActive = p.id === activeId;

      detail.innerHTML = \`
        <div class="detail-header">
          <div>
            <div class="detail-title">⚡ \${esc(p.label)}</div>
            <div class="detail-subtitle">\${esc(p.gitName)} · @\${esc(p.githubUsername)}</div>
          </div>
          <div class="detail-actions">
            \${!isActive
              ? \`<button class="btn btn-primary" onclick="switchToProfile('\${p.id}')">⚡ Activate</button>\`
              : \`<span class="btn btn-success" style="cursor:default">✅ Active</span>\`
            }
            <button class="btn btn-ghost" onclick="openForm('\${p.id}')">✏️ Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="testConn('\${p.id}', this)"
              \${!p.hasToken ? 'disabled title="No token"' : ''}>
              🔌 Test
            </button>
            <button class="btn btn-danger" onclick="deleteProfile('\${p.id}')">🗑 Delete</button>
          </div>
        </div>

        <div id="connResult-\${p.id}"></div>

        <div class="section">
          <div class="section-title">Git Configuration</div>
          <div class="info-grid">
            <div class="info-item">
              <label>user.name</label>
              <div class="value">\${esc(p.gitName)}</div>
            </div>
            <div class="info-item">
              <label>user.email</label>
              <div class="value">\${esc(p.gitEmail)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">GitHub Identity</div>
          <div class="info-grid">
            <div class="info-item">
              <label>GitHub Username</label>
              <div class="value">@\${esc(p.githubUsername)}</div>
            </div>
            <div class="info-item">
              <label>Access Token</label>
              <div class="value \${p.hasToken ? '' : 'ind-no-token'}">
                \${p.hasToken ? '🔑 Stored (encrypted)' : '⚠️ Not set'}
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">SSH Configuration</div>
          <div class="info-item">
            <label>SSH Key Path</label>
            <div class="value mono">\${p.sshKeyPath ? esc(p.sshKeyPath) : '— Not configured'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Workspace Binding</div>
          \${p.boundWorkspaces && p.boundWorkspaces.length > 0
            ? p.boundWorkspaces.map(w => \`
              <div style="display:flex; align-items:center; justify-content:space-between;
                          background:var(--surface2); border:1px solid var(--border);
                          border-radius:8px; padding:10px 14px; margin-bottom:8px;">
                <span class="mono" style="font-size:12px; color:var(--text-muted)">\${esc(w)}</span>
                <button class="btn btn-danger btn-sm" onclick="unbindWs('\${esc(w)}')">Unbind</button>
              </div>
            \`).join('')
            : '<p style="color:var(--text-muted); font-size:13px;">No workspaces bound. <button class=\\"btn btn-ghost btn-sm\\" onclick=\\"bindCurrentWs(\\''+p.id+'\\')\\">Bind Current Workspace</button></p>'
          }
          \${p.boundWorkspaces && p.boundWorkspaces.length > 0
            ? \`<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="bindCurrentWs('\${p.id}')">+ Bind Current Workspace</button>\`
            : ''
          }
        </div>

        <div class="section">
          <div class="section-title">Metadata</div>
          <div class="info-grid">
            <div class="info-item">
              <label>Created</label>
              <div class="value">\${formatDate(p.createdAt)}</div>
            </div>
            <div class="info-item">
              <label>Last Used</label>
              <div class="value">\${p.lastUsedAt ? formatDate(p.lastUsedAt) : '—'}</div>
            </div>
          </div>
        </div>
      \`;
    }

    function showWelcome() {
      selectedId = null;
      document.getElementById('welcomeMsg').style.display = 'flex';
      document.getElementById('detailPanel').style.display = 'none';
    }

    // ── Actions ───────────────────────────────────────────────────────────────
    function switchToProfile(id) {
      vscode.postMessage({ type: 'switchProfile', payload: { id } });
    }

    function deleteProfile(id) {
      const p = profiles.find(x => x.id === id);
      if (!confirm(\`Delete profile "\${p?.label}"? This cannot be undone.\`)) return;
      vscode.postMessage({ type: 'deleteProfile', payload: { id } });
      selectedId = null;
      showWelcome();
    }

    function testConn(id, btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Testing…';
      vscode.postMessage({ type: 'testConnection', payload: { id } });
    }

    function handleConnectionResult(payload) {
      const el = document.getElementById(\`connResult-\${payload.id}\`);
      if (!el) return;
      el.innerHTML = \`<div class="conn-result \${payload.success ? 'success' : 'fail'}" style="margin-bottom:16px">
        \${esc(payload.message)}
      </div>\`;
      // Re-enable test button
      const btn = document.querySelector(\`button[onclick*="testConn('\${payload.id}'"]\`);
      if (btn) { btn.disabled = false; btn.textContent = '🔌 Test'; }
    }

    function bindCurrentWs(profileId) {
      vscode.postMessage({ type: 'bindWorkspace', payload: { id: profileId } });
    }

    function unbindWs(workspaceUri) {
      vscode.postMessage({ type: 'unbindWorkspace', payload: { workspaceUri } });
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    function openForm(editId) {
      document.getElementById('editId').value = editId || '';
      document.getElementById('formTitle').textContent = editId ? 'Edit Profile' : 'Add GitHub Profile';

      if (editId) {
        const p = profiles.find(x => x.id === editId);
        if (p) {
          document.getElementById('fLabel').value = p.label;
          document.getElementById('fGitName').value = p.gitName;
          document.getElementById('fGitEmail').value = p.gitEmail;
          document.getElementById('fGithubUsername').value = p.githubUsername;
          document.getElementById('fSshKeyPath').value = p.sshKeyPath || '';
          document.getElementById('fToken').value = '';
          document.getElementById('fToken').placeholder = p.hasToken ? '(leave blank to keep existing)' : 'ghp_xxxxxxxxxxxxxxxxxxxx';
          document.getElementById('tokenLabel').textContent = p.hasToken ? '(stored)' : '';
        }
      } else {
        ['fLabel','fGitName','fGitEmail','fGithubUsername','fSshKeyPath','fToken'].forEach(id => {
          document.getElementById(id).value = '';
        });
        document.getElementById('fToken').placeholder = 'ghp_xxxxxxxxxxxxxxxxxxxx';
        document.getElementById('tokenLabel').textContent = '';
      }

      document.getElementById('formOverlay').style.display = 'flex';
      setTimeout(() => document.getElementById('fLabel').focus(), 100);
    }

    function closeForm() {
      document.getElementById('formOverlay').style.display = 'none';
    }

    function closeFormOnBackdrop(e) {
      if (e.target === document.getElementById('formOverlay')) closeForm();
    }

    function browseSshKey() {
      vscode.postMessage({ type: 'browseSshKey' });
    }

    function saveProfile() {
      const id = document.getElementById('editId').value;
      const label = document.getElementById('fLabel').value.trim();
      const gitName = document.getElementById('fGitName').value.trim();
      const gitEmail = document.getElementById('fGitEmail').value.trim();
      const githubUsername = document.getElementById('fGithubUsername').value.trim();
      const sshKeyPath = document.getElementById('fSshKeyPath').value.trim();
      const token = document.getElementById('fToken').value.trim();

      if (!label || !gitName || !gitEmail || !githubUsername) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      btn.textContent = 'Saving…';

      vscode.postMessage({
        type: 'saveProfile',
        payload: { id: id || undefined, label, gitName, gitEmail, githubUsername,
                   sshKeyPath: sshKeyPath || undefined, token: token || undefined }
      });

      setTimeout(() => { btn.disabled = false; btn.textContent = 'Save Profile'; }, 2000);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function esc(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatDate(iso) {
      try {
        return new Date(iso).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric'
        });
      } catch { return iso; }
    }

    function showToast(msg, type = 'success') {
      const el = document.createElement('div');
      el.className = \`toast \${type}\`;
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeForm();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.getElementById('formOverlay').style.display !== 'none') saveProfile();
      }
    });
  </script>
</body>
</html>`;
  }
}
