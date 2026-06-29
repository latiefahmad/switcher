import * as vscode from 'vscode';
import { ProfileManager } from './profileManager';
import { GitConfigManager } from './gitConfigManager';
import { SshConfigManager } from './sshConfigManager';
import { StatusBarManager } from './statusBar';
import { CommandRegistry } from './commands';
import { PanelProvider } from './webview/panelProvider';

// Output channel for debugging
let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel first so errors are always visible
  outputChannel = vscode.window.createOutputChannel('GitHub Profile Switcher');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[GitHub Profile Switcher] Activating v1.2.0...');

  try {
    // ── Initialize managers ──────────────────────────────────────────────────
    const profileManager = new ProfileManager(context);
    const gitConfig = new GitConfigManager();
    const sshConfig = new SshConfigManager();
    const statusBar = new StatusBarManager();

    outputChannel.appendLine('[GitHub Profile Switcher] Managers initialized');

    // ── Webview panel ────────────────────────────────────────────────────────
    const panelProvider = new PanelProvider(
      context,
      profileManager,
      async (profile) => {
        await commands.applyProfile(profile);
      }
    );

    // ── Commands ─────────────────────────────────────────────────────────────
    const commands = new CommandRegistry(
      context,
      profileManager,
      gitConfig,
      sshConfig,
      statusBar,
      panelProvider
    );
    commands.registerAll();

    outputChannel.appendLine('[GitHub Profile Switcher] Commands registered');

    // ── Status bar initial render ────────────────────────────────────────────
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    const activeProfile = profileManager.getActiveProfile(workspaceUri);
    statusBar.update(activeProfile);
    context.subscriptions.push({ dispose: () => statusBar.dispose() });

    outputChannel.appendLine(
      `[GitHub Profile Switcher] Status bar shown — active profile: ${activeProfile?.label ?? 'none'}`
    );

    // ── Auto-switch on workspace open ────────────────────────────────────────
    const autoSwitch = vscode.workspace
      .getConfiguration('githubSwitcher')
      .get<boolean>('autoSwitchOnWorkspaceOpen', true);

    if (autoSwitch && workspaceUri) {
      const bound = profileManager.getActiveProfile(workspaceUri);
      const globalActive = profileManager.getActiveProfile();

      if (bound && bound.id !== globalActive?.id) {
        try {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          await gitConfig.applyProfile(bound, workspaceFolder);
          await sshConfig.applyProfile(bound);
          await profileManager.setActiveProfile(bound.id);
          statusBar.update(bound);
          vscode.window.showInformationMessage(
            `🔀 Auto-switched to GitHub profile: ${bound.label}`
          );
          outputChannel.appendLine(`[GitHub Profile Switcher] Auto-switched to: ${bound.label}`);
        } catch (err) {
          outputChannel.appendLine(`[GitHub Profile Switcher] Auto-switch failed: ${err}`);
        }
      }
    }

    // ── Watch for workspace folder changes ──────────────────────────────────
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        const uri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
        const profile = profileManager.getActiveProfile(uri);
        statusBar.update(profile);
      })
    );

    // ── Watch config changes (show/hide status bar) ─────────────────────────
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('githubSwitcher.showStatusBar')) {
          const profile = profileManager.getActiveProfile(
            vscode.workspace.workspaceFolders?.[0]?.uri.toString()
          );
          statusBar.update(profile);
        }
      })
    );

    outputChannel.appendLine('[GitHub Profile Switcher] Activated ✅');

  } catch (err) {
    // Make crash visible to user so they can report it
    const msg = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`[GitHub Profile Switcher] ACTIVATION ERROR: ${msg}`);
    outputChannel.show(true);
    vscode.window.showErrorMessage(
      `GitHub Profile Switcher failed to start: ${msg}. Check Output → "GitHub Profile Switcher" for details.`
    );
  }
}

export function deactivate(): void {
  outputChannel?.appendLine('[GitHub Profile Switcher] Deactivated');
}
