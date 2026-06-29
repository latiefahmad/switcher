import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitHubProfile } from './types';

const execAsync = promisify(exec);

export class GitConfigManager {
  /**
   * Apply git user.name and user.email for the given profile.
   * If a workspace folder is provided, applies locally (per-repo).
   * If `applyGlobally` setting is true, applies --global.
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
    } else if (workspaceFolder) {
      const cwd = workspaceFolder.uri.fsPath;
      await this.setLocalConfig('user.name', profile.gitName, cwd);
      await this.setLocalConfig('user.email', profile.gitEmail, cwd);
    } else {
      // Fallback: apply globally if no workspace
      await this.setGlobalConfig('user.name', profile.gitName);
      await this.setGlobalConfig('user.email', profile.gitEmail);
    }
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
