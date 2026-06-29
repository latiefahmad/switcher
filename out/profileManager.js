"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileManager = void 0;
const crypto = __importStar(require("crypto"));
const PROFILES_KEY = 'githubSwitcher.profiles';
const ACTIVE_PROFILE_KEY = 'githubSwitcher.activeProfile';
class ProfileManager {
    constructor(context) {
        this.context = context;
    }
    // ─── Read ──────────────────────────────────────────────────────────────────
    getProfiles() {
        return this.context.globalState.get(PROFILES_KEY, []);
    }
    getProfileById(id) {
        return this.getProfiles().find((p) => p.id === id);
    }
    getActiveProfileId(workspaceUri) {
        // Check workspace-specific binding first
        if (workspaceUri) {
            const profiles = this.getProfiles();
            const bound = profiles.find((p) => p.boundWorkspaces.includes(workspaceUri));
            if (bound)
                return bound.id;
        }
        // Fall back to global active
        return this.context.globalState.get(ACTIVE_PROFILE_KEY);
    }
    getActiveProfile(workspaceUri) {
        const id = this.getActiveProfileId(workspaceUri);
        return id ? this.getProfileById(id) : undefined;
    }
    async getProfileToken(profile) {
        return this.context.secrets.get(profile.tokenSecretKey);
    }
    // ─── Write ─────────────────────────────────────────────────────────────────
    async addProfile(data) {
        const profiles = this.getProfiles();
        const id = crypto.randomUUID();
        const tokenSecretKey = `githubSwitcher.token.${id}`;
        const profile = {
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
    async updateProfile(id, data) {
        const profiles = this.getProfiles();
        const idx = profiles.findIndex((p) => p.id === id);
        if (idx === -1)
            throw new Error(`Profile ${id} not found`);
        const existing = profiles[idx];
        const updated = {
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
    async deleteProfile(id) {
        const profiles = this.getProfiles();
        const profile = profiles.find((p) => p.id === id);
        if (!profile)
            return;
        // Remove token from SecretStorage
        await this.context.secrets.delete(profile.tokenSecretKey);
        const filtered = profiles.filter((p) => p.id !== id);
        await this.context.globalState.update(PROFILES_KEY, filtered);
        // Clear active if deleted
        const activeId = this.context.globalState.get(ACTIVE_PROFILE_KEY);
        if (activeId === id) {
            await this.context.globalState.update(ACTIVE_PROFILE_KEY, undefined);
        }
    }
    async setActiveProfile(id) {
        const profile = this.getProfileById(id);
        if (!profile)
            throw new Error(`Profile ${id} not found`);
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
    async bindWorkspace(profileId, workspaceUri) {
        const profiles = this.getProfiles();
        // Remove binding from other profiles
        for (const p of profiles) {
            p.boundWorkspaces = p.boundWorkspaces.filter((w) => w !== workspaceUri);
        }
        // Add binding to the target profile
        const target = profiles.find((p) => p.id === profileId);
        if (!target)
            throw new Error(`Profile ${profileId} not found`);
        if (!target.boundWorkspaces.includes(workspaceUri)) {
            target.boundWorkspaces.push(workspaceUri);
        }
        await this.context.globalState.update(PROFILES_KEY, profiles);
    }
    async unbindWorkspace(workspaceUri) {
        const profiles = this.getProfiles();
        for (const p of profiles) {
            p.boundWorkspaces = p.boundWorkspaces.filter((w) => w !== workspaceUri);
        }
        await this.context.globalState.update(PROFILES_KEY, profiles);
    }
}
exports.ProfileManager = ProfileManager;
//# sourceMappingURL=profileManager.js.map