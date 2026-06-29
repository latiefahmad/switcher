import * as vscode from 'vscode';
import { ProfileManager } from './profileManager';
import { GitConfigManager } from './gitConfigManager';
import { SshConfigManager } from './sshConfigManager';
import { StatusBarManager } from './statusBar';
import { PanelProvider } from './webview/panelProvider';
import { testGitHubConnection } from './githubApi';
import { GitHubProfile } from './types';

// Separator helper for QuickPick
const SEP = { label: '', kind: vscode.QuickPickItemKind.Separator };

export class CommandRegistry {
  constructor(
    private context: vscode.ExtensionContext,
    private profileManager: ProfileManager,
    private gitConfig: GitConfigManager,
    private sshConfig: SshConfigManager,
    private statusBar: StatusBarManager,
    private panelProvider: PanelProvider
  ) {}

  registerAll(): void {
    const cmds: [string, (...args: unknown[]) => unknown][] = [
      ['githubSwitcher.showActiveProfile', () => this.showActiveProfile()],
      ['githubSwitcher.switchProfile',     () => this.switchProfile()],
      ['githubSwitcher.openPanel',         () => this.panelProvider.show()],
      ['githubSwitcher.addProfile',        () => this.panelProvider.show()],
      ['githubSwitcher.deleteProfile',     () => this.deleteProfile()],
      ['githubSwitcher.testConnection',    () => this.testConnection()],
      ['githubSwitcher.bindWorkspace',     () => this.bindWorkspace()],
      ['githubSwitcher.unbindWorkspace',   () => this.unbindWorkspace()],
    ];

    for (const [id, handler] of cmds) {
      this.context.subscriptions.push(
        vscode.commands.registerCommand(id, handler)
      );
    }
  }

  // ─── Show Active Profile Detail (status bar click) ─────────────────────────

  async showActiveProfile(): Promise<void> {
    const workspaceUri = this.getCurrentWorkspaceUri();
    const active = this.profileManager.getActiveProfile(workspaceUri);
    const profiles = this.profileManager.getProfiles();

    // ── Build QuickPick items ──────────────────────────────────────────────────

    const items: (vscode.QuickPickItem & { action?: string; profileId?: string })[] = [];

    if (active) {
      // ── Active profile detail block ─────────────────────────────────────────
      items.push({
        label: `$(account) ${active.label}`,
        description: `ACTIVE`,
        detail: `  git: ${active.gitName} <${active.gitEmail}>   ${active.githubUsername ? '  @' + active.githubUsername : ''}`,
        kind: vscode.QuickPickItemKind.Default,
        action: 'noop',
      });

      items.push({
        label: `$(mail) ${active.gitEmail}`,
        description: `git user.email`,
        kind: vscode.QuickPickItemKind.Default,
        action: 'noop',
      });

      items.push({
        label: `$(person) ${active.gitName}`,
        description: `git user.name`,
        kind: vscode.QuickPickItemKind.Default,
        action: 'noop',
      });

      if (active.githubUsername) {
        items.push({
          label: `$(github) @${active.githubUsername}`,
          description: `GitHub username`,
          kind: vscode.QuickPickItemKind.Default,
          action: 'noop',
        });
      }

      items.push({
        label: `$(key) ${active.sshKeyPath ?? 'No SSH key configured'}`,
        description: active.sshKeyPath ? `SSH key` : '',
        kind: vscode.QuickPickItemKind.Default,
        action: 'noop',
      });

      if (active.boundWorkspaces.length > 0) {
        items.push({
          label: `$(link) Bound to ${active.boundWorkspaces.length} workspace(s)`,
          description: `auto-switches on open`,
          kind: vscode.QuickPickItemKind.Default,
          action: 'noop',
        });
      }

      // ── Actions ─────────────────────────────────────────────────────────────
      items.push({ label: 'Actions', kind: vscode.QuickPickItemKind.Separator } as vscode.QuickPickItem);

      items.push({
        label: `$(arrow-swap) Switch Profile`,
        description: `Choose a different profile`,
        action: 'switch',
      });

      items.push({
        label: `$(settings-gear) Manage Profiles`,
        description: `Open profile panel`,
        action: 'manage',
      });

      items.push({
        label: `$(plug) Test Connection`,
        description: `Verify GitHub token for ${active.label}`,
        action: 'test',
      });

      if (active.boundWorkspaces.length === 0) {
        items.push({
          label: `$(link) Bind This Workspace`,
          description: `Auto-switch to ${active.label} when opening this folder`,
          action: 'bind',
        });
      } else {
        items.push({
          label: `$(link-external) Unbind Workspace`,
          description: `Remove auto-switch for this folder`,
          action: 'unbind',
        });
      }

    } else {
      // No active profile
      items.push({
        label: `$(warning) No active GitHub profile`,
        description: `Set one up to get started`,
        action: 'noop',
      });
      items.push({ label: 'Actions', kind: vscode.QuickPickItemKind.Separator } as vscode.QuickPickItem);
      items.push({
        label: `$(add) Add Profile`,
        description: `Create your first GitHub profile`,
        action: 'manage',
      });
    }

    // ── Other profiles (quick switch) ──────────────────────────────────────────
    const others = profiles.filter((p) => p.id !== active?.id);
    if (others.length > 0) {
      items.push({ label: 'Switch to', kind: vscode.QuickPickItemKind.Separator } as vscode.QuickPickItem);
      for (const p of others) {
        items.push({
          label: `$(account) ${p.label}`,
          description: `${p.gitName} <${p.gitEmail}>`,
          detail: p.githubUsername ? `@${p.githubUsername}` : undefined,
          action: 'applyProfile',
          profileId: p.id,
        });
      }
    }

    // ── Show QuickPick ─────────────────────────────────────────────────────────
    const pick = await vscode.window.showQuickPick(items, {
      title: `GitHub Profile Switcher`,
      placeHolder: active ? `Active: ${active.label}` : 'No active profile',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!pick || !pick.action || pick.action === 'noop') return;

    switch (pick.action) {
      case 'switch':   await this.switchProfile(); break;
      case 'manage':   this.panelProvider.show(); break;
      case 'test':     await this.testConnection(); break;
      case 'bind':     await this.bindWorkspace(); break;
      case 'unbind':   await this.unbindWorkspace(); break;
      case 'applyProfile': {
        if (pick.profileId) {
          const profile = this.profileManager.getProfileById(pick.profileId);
          if (profile) await this.applyProfile(profile);
        }
        break;
      }
    }
  }

  // ─── Switch Profile (QuickPick list) ───────────────────────────────────────

  async switchProfile(): Promise<void> {
    const profiles = this.profileManager.getProfiles();

    if (profiles.length === 0) {
      const action = await vscode.window.showInformationMessage(
        'No GitHub profiles configured.',
        'Add Profile'
      );
      if (action === 'Add Profile') this.panelProvider.show();
      return;
    }

    const workspaceUri = this.getCurrentWorkspaceUri();
    const activeId = this.profileManager.getActiveProfileId(workspaceUri);

    const items = profiles.map((p) => ({
      label: p.id === activeId ? `$(check) ${p.label}` : `$(account) ${p.label}`,
      description: `${p.gitName} <${p.gitEmail}>`,
      detail: [
        p.githubUsername ? `@${p.githubUsername}` : '',
        p.sshKeyPath ? `SSH ✓` : 'No SSH key',
        p.boundWorkspaces.length > 0
          ? `Bound to ${p.boundWorkspaces.length} workspace(s)`
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
      profileId: p.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a GitHub profile to activate',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) return;

    const profile = this.profileManager.getProfileById(selected.profileId);
    if (!profile) return;

    await this.applyProfile(profile);
  }

  async applyProfile(profile: GitHubProfile): Promise<void> {
    this.statusBar.setLoading();

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

      await this.gitConfig.applyProfile(profile, workspaceFolder);
      await this.sshConfig.applyProfile(profile);
      await this.profileManager.setActiveProfile(profile.id);

      this.statusBar.update(profile);
      this.panelProvider.notifyProfilesChanged();

      vscode.window.showInformationMessage(
        `✅ Switched to: ${profile.label} (${profile.gitEmail})`
      );
    } catch (err) {
      this.statusBar.update(this.profileManager.getActiveProfile());
      vscode.window.showErrorMessage(
        `Failed to switch profile: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ─── Delete Profile ────────────────────────────────────────────────────────

  async deleteProfile(): Promise<void> {
    const profiles = this.profileManager.getProfiles();
    if (profiles.length === 0) {
      vscode.window.showInformationMessage('No profiles to delete.');
      return;
    }

    const items = profiles.map((p) => ({
      label: `$(account) ${p.label}`,
      description: `${p.gitName} <${p.gitEmail}>`,
      profileId: p.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a profile to delete',
    });
    if (!selected) return;

    const confirm = await vscode.window.showWarningMessage(
      `Delete profile "${selected.label.replace('$(account) ', '')}"?`,
      { modal: true },
      'Delete'
    );
    if (confirm !== 'Delete') return;

    await this.profileManager.deleteProfile(selected.profileId);
    this.statusBar.update(this.profileManager.getActiveProfile());
    this.panelProvider.notifyProfilesChanged();
    vscode.window.showInformationMessage('Profile deleted.');
  }

  // ─── Test Connection ───────────────────────────────────────────────────────

  async testConnection(): Promise<void> {
    const profiles = this.profileManager.getProfiles();
    if (profiles.length === 0) {
      vscode.window.showInformationMessage('No profiles configured.');
      return;
    }

    const workspaceUri = this.getCurrentWorkspaceUri();
    const active = this.profileManager.getActiveProfile(workspaceUri);
    const profileToTest = active ?? profiles[0];

    const token = await this.profileManager.getProfileToken(profileToTest);
    if (!token) {
      vscode.window.showWarningMessage(
        `Profile "${profileToTest.label}" has no GitHub token. Add one in Manage Profiles.`
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Testing connection for ${profileToTest.label}…`,
        cancellable: false,
      },
      async () => {
        const result = await testGitHubConnection(token);
        if (result.success) {
          vscode.window.showInformationMessage(result.message);
        } else {
          vscode.window.showErrorMessage(result.message);
        }
      }
    );
  }

  // ─── Workspace Binding ─────────────────────────────────────────────────────

  async bindWorkspace(): Promise<void> {
    const workspaceUri = this.getCurrentWorkspaceUri();
    if (!workspaceUri) {
      vscode.window.showWarningMessage('No workspace folder open.');
      return;
    }

    const profiles = this.profileManager.getProfiles();
    if (profiles.length === 0) {
      vscode.window.showInformationMessage('No profiles to bind.');
      return;
    }

    const items = profiles.map((p) => ({
      label: `$(account) ${p.label}`,
      description: `${p.gitName} <${p.gitEmail}>`,
      profileId: p.id,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Bind this workspace to which profile?',
    });
    if (!selected) return;

    await this.profileManager.bindWorkspace(selected.profileId, workspaceUri);
    this.panelProvider.notifyProfilesChanged();
    vscode.window.showInformationMessage(
      `Workspace bound to "${selected.label.replace('$(account) ', '')}". It will auto-switch on open.`
    );
  }

  async unbindWorkspace(): Promise<void> {
    const workspaceUri = this.getCurrentWorkspaceUri();
    if (!workspaceUri) {
      vscode.window.showWarningMessage('No workspace folder open.');
      return;
    }

    await this.profileManager.unbindWorkspace(workspaceUri);
    this.panelProvider.notifyProfilesChanged();
    vscode.window.showInformationMessage('Workspace unbound from profile.');
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private getCurrentWorkspaceUri(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.toString();
  }
}
