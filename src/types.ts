import * as vscode from 'vscode';

// ─── Core Profile Interface ───────────────────────────────────────────────────

export interface GitHubProfile {
  id: string;
  /** Human-readable label, e.g. "Work - Acme Corp" */
  label: string;
  /** git user.name */
  gitName: string;
  /** git user.email */
  gitEmail: string;
  /** GitHub username (for API validation) */
  githubUsername: string;
  /** Path to SSH private key, e.g. ~/.ssh/id_rsa_work */
  sshKeyPath?: string;
  /** Internal key used to look up token in SecretStorage */
  tokenSecretKey: string;
  /** Workspace folder URIs bound to this profile */
  boundWorkspaces: string[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last use */
  lastUsedAt?: string;
}

// ─── Profile Create / Edit DTO ────────────────────────────────────────────────

export interface ProfileFormData {
  label: string;
  gitName: string;
  gitEmail: string;
  githubUsername: string;
  sshKeyPath?: string;
  token?: string;
}

// ─── Webview Message Types ────────────────────────────────────────────────────

export type WebviewMessageType =
  | 'getProfiles'
  | 'saveProfile'
  | 'deleteProfile'
  | 'switchProfile'
  | 'testConnection'
  | 'bindWorkspace'
  | 'unbindWorkspace'
  | 'browseSshKey'
  | 'profilesUpdated'
  | 'activeProfileUpdated'
  | 'connectionResult'
  | 'copyProfilePublicKey'
  | 'generateSshKey'
  | 'copyToClipboard'
  | 'sshKeyGenerated'
  | 'sshKeySelected'
  | 'exportProfiles'
  | 'importProfiles'
  | 'convertToSsh'
  | 'error';

export interface WebviewMessage {
  type: WebviewMessageType;
  payload?: unknown;
}

// ─── SSH Config Types ─────────────────────────────────────────────────────────

export interface SshHostBlock {
  host: string;
  lines: string[];
}

// ─── Status ───────────────────────────────────────────────────────────────────

export interface ConnectionTestResult {
  success: boolean;
  username?: string;
  message: string;
}
