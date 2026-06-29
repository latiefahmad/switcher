import * as vscode from 'vscode';
import { GitHubProfile } from './types';

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    // Click → show detail popup (not directly switch)
    this.item.command = 'githubSwitcher.showActiveProfile';
  }

  update(profile: GitHubProfile | undefined): void {
    const show = vscode.workspace
      .getConfiguration('githubSwitcher')
      .get<boolean>('showStatusBar', true);

    if (!show) {
      this.item.hide();
      return;
    }

    if (profile) {
      // Show compact inline info — like the screenshot style
      // e.g. "⚡ Work Account | latief@work.com"
      this.item.text = `$(account) ${profile.label} | ${profile.gitEmail}`;
      this.item.backgroundColor = undefined;

      // Rich markdown tooltip shown on hover
      const tip = new vscode.MarkdownString('', true);
      tip.supportThemeIcons = true;
      tip.appendMarkdown(`### $(account) ${profile.label}\n\n`);
      tip.appendMarkdown(`| | |\n|---|---|\n`);
      tip.appendMarkdown(`| **git name** | \`${profile.gitName}\` |\n`);
      tip.appendMarkdown(`| **git email** | \`${profile.gitEmail}\` |\n`);
      if (profile.githubUsername) {
        tip.appendMarkdown(`| **GitHub** | [@${profile.githubUsername}](https://github.com/${profile.githubUsername}) |\n`);
      }
      tip.appendMarkdown(`| **SSH key** | \`${profile.sshKeyPath ?? 'not set'}\` |\n`);
      if (profile.boundWorkspaces.length > 0) {
        tip.appendMarkdown(`| **bound workspaces** | ${profile.boundWorkspaces.length} |\n`);
      }
      tip.appendMarkdown(`\n---\n*Click to see options*`);
      this.item.tooltip = tip;
    } else {
      this.item.text = `$(account) No GitHub Profile`;
      this.item.tooltip = 'No GitHub profile active — click to set one';
    }

    this.item.show();
  }

  setLoading(): void {
    this.item.text = `$(sync~spin) Switching…`;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
