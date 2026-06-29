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
exports.GitConfigManager = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitConfigManager {
    /**
     * Apply git user.name and user.email for the given profile.
     * If a workspace folder is provided, applies locally (per-repo).
     * If `applyGlobally` setting is true, applies --global.
     */
    async applyProfile(profile, workspaceFolder) {
        const applyGlobally = vscode.workspace
            .getConfiguration('githubSwitcher')
            .get('applyGlobally', false);
        if (applyGlobally) {
            await this.setGlobalConfig('user.name', profile.gitName);
            await this.setGlobalConfig('user.email', profile.gitEmail);
        }
        else if (workspaceFolder) {
            const cwd = workspaceFolder.uri.fsPath;
            await this.setLocalConfig('user.name', profile.gitName, cwd);
            await this.setLocalConfig('user.email', profile.gitEmail, cwd);
        }
        else {
            // Fallback: apply globally if no workspace
            await this.setGlobalConfig('user.name', profile.gitName);
            await this.setGlobalConfig('user.email', profile.gitEmail);
        }
    }
    async getCurrentGitConfig(cwd) {
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
        }
        catch {
            return { name: '', email: '' };
        }
    }
    async setGlobalConfig(key, value) {
        const safeValue = value.replace(/"/g, '\\"');
        await execAsync(`git config --global ${key} "${safeValue}"`);
    }
    async setLocalConfig(key, value, cwd) {
        const safeValue = value.replace(/"/g, '\\"');
        await execAsync(`git -C "${cwd}" config ${key} "${safeValue}"`);
    }
    /** Check if the current directory is a git repo */
    async isGitRepo(cwd) {
        try {
            await execAsync(`git -C "${cwd}" rev-parse --git-dir`);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.GitConfigManager = GitConfigManager;
//# sourceMappingURL=gitConfigManager.js.map