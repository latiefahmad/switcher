import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { GitHubProfile, ProfileFormData } from './types';

const PROFILES_KEY = 'githubSwitcher.profiles';
const ACTIVE_PROFILE_KEY = 'githubSwitcher.activeProfile';

export class ProfileManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  getProfiles(): GitHubProfile[] {
    return this.context.globalState.get<GitHubProfile[]>(PROFILES_KEY, []);
  }

  getProfileById(id: string): GitHubProfile | undefined {
    return this.getProfiles().find((p) => p.id === id);
  }

  getActiveProfileId(workspaceUri?: string): string | undefined {
    // Check workspace-specific binding first
    if (workspaceUri) {
      const profiles = this.getProfiles();
      const bound = profiles.find((p) =>
        p.boundWorkspaces.includes(workspaceUri)
      );
      if (bound) return bound.id;
    }
    // Fall back to global active
    return this.context.globalState.get<string>(ACTIVE_PROFILE_KEY);
  }

  getActiveProfile(workspaceUri?: string): GitHubProfile | undefined {
    const id = this.getActiveProfileId(workspaceUri);
    return id ? this.getProfileById(id) : undefined;
  }

  async getProfileToken(profile: GitHubProfile): Promise<string | undefined> {
    return this.context.secrets.get(profile.tokenSecretKey);
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  async addProfile(data: ProfileFormData): Promise<GitHubProfile> {
    const profiles = this.getProfiles();
    const id = crypto.randomUUID();
    const tokenSecretKey = `githubSwitcher.token.${id}`;

    const profile: GitHubProfile = {
      id,
      label: data.label,
      gitName: data.gitName,
      gitEmail: data.gitEmail,
      githubUsername: data.githubUsername,
      sshKeyPath: data.sshKeyPath,
      tokenSecretKey,
      boundWorkspaces: [],
      createdAt: new Date().toISOString(),
    };

    if (data.token) {
      await this.context.secrets.store(tokenSecretKey, data.token);
    }

    profiles.push(profile);
    await this.context.globalState.update(PROFILES_KEY, profiles);
    return profile;
  }

  async updateProfile(
    id: string,
    data: ProfileFormData
  ): Promise<GitHubProfile> {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Profile ${id} not found`);

    const existing = profiles[idx];
    const updated: GitHubProfile = {
      ...existing,
      label: data.label,
      gitName: data.gitName,
      gitEmail: data.gitEmail,
      githubUsername: data.githubUsername,
      sshKeyPath: data.sshKeyPath,
    };

    if (data.token !== undefined && data.token !== '') {
      await this.context.secrets.store(existing.tokenSecretKey, data.token);
    }

    profiles[idx] = updated;
    await this.context.globalState.update(PROFILES_KEY, profiles);
    return updated;
  }

  async deleteProfile(id: string): Promise<void> {
    const profiles = this.getProfiles();
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;

    // Remove token from SecretStorage
    await this.context.secrets.delete(profile.tokenSecretKey);

    const filtered = profiles.filter((p) => p.id !== id);
    await this.context.globalState.update(PROFILES_KEY, filtered);

    // Clear active if deleted
    const activeId = this.context.globalState.get<string>(ACTIVE_PROFILE_KEY);
    if (activeId === id) {
      await this.context.globalState.update(ACTIVE_PROFILE_KEY, undefined);
    }
  }

  async setActiveProfile(id: string): Promise<void> {
    const profile = this.getProfileById(id);
    if (!profile) throw new Error(`Profile ${id} not found`);

    const profiles = this.getProfiles();
    const idx = profiles.findIndex((p) => p.id === id);
    profiles[idx] = {
      ...profile,
      lastUsedAt: new Date().toISOString(),
    };

    await this.context.globalState.update(PROFILES_KEY, profiles);
    await this.context.globalState.update(ACTIVE_PROFILE_KEY, id);
  }

  // ─── Workspace Binding ─────────────────────────────────────────────────────

  async bindWorkspace(profileId: string, workspaceUri: string): Promise<void> {
    const profiles = this.getProfiles();

    // Remove binding from other profiles
    for (const p of profiles) {
      p.boundWorkspaces = p.boundWorkspaces.filter(
        (w) => w !== workspaceUri
      );
    }

    // Add binding to the target profile
    const target = profiles.find((p) => p.id === profileId);
    if (!target) throw new Error(`Profile ${profileId} not found`);
    if (!target.boundWorkspaces.includes(workspaceUri)) {
      target.boundWorkspaces.push(workspaceUri);
    }

    await this.context.globalState.update(PROFILES_KEY, profiles);
  }

  async unbindWorkspace(workspaceUri: string): Promise<void> {
    const profiles = this.getProfiles();
    for (const p of profiles) {
      p.boundWorkspaces = p.boundWorkspaces.filter((w) => w !== workspaceUri);
    }
    await this.context.globalState.update(PROFILES_KEY, profiles);
  }
}
