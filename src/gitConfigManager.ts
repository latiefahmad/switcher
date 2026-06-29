import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitHubProfile } from './types';

const execAsync = promisify(exec);

export class GitConfigManager {
  /**
   * Apply git user.name, user.email, AND credential username for the given profile.
   * The credential.username config tells Git Credential Manager (GCM) which
   * stored account to use for HTTPS push/pull — fixing the "wrong account" problem.
   */
  async applyProfile(
    profile: GitHubProfile,
    workspaceFolder?: vscode.WorkspaceFolder
  ): Promise<void> {
    const applyGlobally = vscode.workspace
      .getConfiguration('githubSwitcher')
      .get<boolean>('applyGlobally', false);

    if (applyGlobally) {
      await this.setGlobalConfig('user.name', profile.gitName);
      await this.setGlobalConfig('user.email', profile.gitEmail);
      // Also set credential username globally so GCM picks the right account
      if (profile.githubUsername) {
        await this.setGlobalConfig(
          'credential.https://github.com.username',
          profile.githubUsername
        ).catch(() => {/* non-fatal */});
      }
    } else if (workspaceFolder) {
      const cwd = workspaceFolder.uri.fsPath;

      // Check if this is actually a git repo before applying local config
      const isRepo = await this.isGitRepo(cwd);

      if (isRepo) {
        await this.setLocalConfig('user.name', profile.gitName, cwd);
        await this.setLocalConfig('user.email', profile.gitEmail, cwd);

        // ── HTTPS credential switching ───────────────────────────────────────
        // Tell GCM which GitHub account to use for this repo.
        // This is the key fix: without this, git uses whatever account is
        // cached in Windows Credential Manager (usually the last-used one).
        if (profile.githubUsername) {
          await this.setLocalConfig(
            'credential.https://github.com.username',
            profile.githubUsername,
            cwd
          ).catch(() => {/* non-fatal if GCM not installed */});
        }

        // ── SSH remote detection ─────────────────────────────────────────────
        // If the profile has an SSH key, check if the remote uses HTTPS.
        // If so, offer to convert it to SSH for seamless auth.
        if (profile.sshKeyPath) {
          await this.checkAndSuggestSshRemote(cwd, profile.githubUsername);
        }
      } else {
        // Not a git repo — fall back to global config
        await this.setGlobalConfig('user.name', profile.gitName);
        await this.setGlobalConfig('user.email', profile.gitEmail);
      }
    } else {
      await this.setGlobalConfig('user.name', profile.gitName);
      await this.setGlobalConfig('user.email', profile.gitEmail);
    }
  }

  /**
   * Detect if the remote origin uses HTTPS for github.com.
   * If so, suggest converting to SSH (more reliable for multi-account).
   */
  private async checkAndSuggestSshRemote(
    cwd: string,
    githubUsername: string
  ): Promise<void> {
    try {
      const { stdout } = await execAsync(
        `git -C "${cwd}" remote get-url origin`
      );
      const remoteUrl = stdout.trim();

      // If it's HTTPS github.com, offer to convert to SSH
      const httpsMatch = remoteUrl.match(
        /^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/
      );
      if (httpsMatch) {
        const [, org, repo] = httpsMatch;
        const sshUrl = `git@github.com:${org}/${repo}.git`;

        const action = await vscode.window.showInformationMessage(
          `This repo uses HTTPS remote. Convert to SSH (${sshUrl}) for seamless multi-account auth?`,
          'Convert to SSH',
          'Keep HTTPS'
        );

        if (action === 'Convert to SSH') {
          await execAsync(
            `git -C "${cwd}" remote set-url origin "${sshUrl}"`
          );
          vscode.window.showInformationMessage(
            `✅ Remote changed to SSH: ${sshUrl}`
          );
        }
      }
    } catch {
      // No remote or not a git repo — ignore
    }
  }

  /** Get current remote URL for the workspace */
  async getRemoteUrl(cwd: string): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(
        `git -C "${cwd}" remote get-url origin`
      );
      return stdout.trim();
    } catch {
      return undefined;
    }
  }

  /** Detect whether remote uses SSH or HTTPS */
  async getRemoteType(cwd: string): Promise<'ssh' | 'https' | 'none'> {
    const url = await this.getRemoteUrl(cwd);
    if (!url) return 'none';
    if (url.startsWith('git@') || url.startsWith('ssh://')) return 'ssh';
    if (url.startsWith('https://') || url.startsWith('http://')) return 'https';
    return 'none';
  }

  async getCurrentGitConfig(
    cwd?: string
  ): Promise<{ name: string; email: string }> {
    try {
      const nameCmd = cwd
        ? `git -C "${cwd}" config user.name`
        : 'git config --global user.name';
      const emailCmd = cwd
        ? `git -C "${cwd}" config user.email`
        : 'git config --global user.email';

      const [nameResult, emailResult] = await Promise.all([
        execAsync(nameCmd).catch(() => ({ stdout: '' })),
        execAsync(emailCmd).catch(() => ({ stdout: '' })),
      ]);

      return {
        name: nameResult.stdout.trim(),
        email: emailResult.stdout.trim(),
      };
    } catch {
      return { name: '', email: '' };
    }
  }

  private async setGlobalConfig(key: string, value: string): Promise<void> {
    const safeValue = value.replace(/"/g, '\\"');
    await execAsync(`git config --global ${key} "${safeValue}"`);
  }

  private async setLocalConfig(
    key: string,
    value: string,
    cwd: string
  ): Promise<void> {
    const safeValue = value.replace(/"/g, '\\"');
    await execAsync(`git -C "${cwd}" config ${key} "${safeValue}"`);
  }

  /** Check if the current directory is a git repo */
  async isGitRepo(cwd: string): Promise<boolean> {
    try {
      await execAsync(`git -C "${cwd}" rev-parse --git-dir`);
      return true;
    } catch {
      return false;
    }
  }
}
