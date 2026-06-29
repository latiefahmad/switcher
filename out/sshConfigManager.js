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
exports.SshConfigManager = void 0;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const SSH_CONFIG_PATH = path.join(os.homedir(), '.ssh', 'config');
const GITHUB_HOST = 'github.com';
const BLOCK_START = '# GitHub Profile Switcher - START';
const BLOCK_END = '# GitHub Profile Switcher - END';
class SshConfigManager {
    /**
     * Update (or insert) the github.com Host block in ~/.ssh/config
     * to use the SSH key from the given profile.
     */
    async applyProfile(profile) {
        this.ensureSshDirExists();
        const existing = this.readConfig();
        // Remove old managed block
        const stripped = this.removeManagedBlock(existing);
        if (!profile.sshKeyPath) {
            // No SSH key → just remove the managed block, leave the rest
            this.writeConfig(stripped);
            return;
        }
        // Expand ~ in sshKeyPath and convert backslashes to forward slashes for Windows OpenSSH
        const keyPath = profile.sshKeyPath
            .replace(/^~/, os.homedir())
            .replace(/\\/g, '/');
        const newBlock = [
            BLOCK_START,
            `# Profile: ${profile.label}`,
            `Host ${GITHUB_HOST}`,
            `  HostName ${GITHUB_HOST}`,
            `  User git`,
            `  IdentityFile "${keyPath}"`,
            `  IdentitiesOnly yes`,
            BLOCK_END,
        ].join('\n');
        // Prepend managed block
        const newConfig = `${newBlock}\n\n${stripped}`.trimStart();
        this.writeConfig(newConfig);
    }
    /**
     * Generate a new Ed25519 SSH Key automatically for a profile
     */
    async generateSshKey(profileLabel, email) {
        this.ensureSshDirExists();
        // Sanitize label to create safe filename
        const safeLabel = profileLabel.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
        const keyName = `id_ed25519_${safeLabel}`;
        const privateKeyPath = path.join(os.homedir(), '.ssh', keyName);
        const publicKeyPath = `${privateKeyPath}.pub`;
        if (fs.existsSync(privateKeyPath)) {
            throw new Error(`SSH Key file already exists: ${privateKeyPath}`);
        }
        // Run ssh-keygen (built-in on Windows 10/11)
        const cmd = `ssh-keygen -t ed25519 -C "${email}" -f "${privateKeyPath}" -N ""`;
        await execAsync(cmd);
        if (!fs.existsSync(publicKeyPath)) {
            throw new Error('Failed to generate public SSH Key file.');
        }
        const publicKeyContent = fs.readFileSync(publicKeyPath, 'utf8').trim();
        return {
            privateKeyPath,
            publicKeyContent
        };
    }
    /** Check if a public key file exists for a given private key path */
    getPublicKey(privateKeyPath) {
        const expanded = privateKeyPath.replace(/^~/, os.homedir());
        const pubPath = `${expanded}.pub`;
        if (fs.existsSync(pubPath)) {
            return fs.readFileSync(pubPath, 'utf8').trim();
        }
        return undefined;
    }
    /** Remove the managed block and return the rest of the config */
    removeManagedBlock(content) {
        const startIdx = content.indexOf(BLOCK_START);
        const endIdx = content.indexOf(BLOCK_END);
        if (startIdx === -1 || endIdx === -1) {
            return content;
        }
        const before = content.substring(0, startIdx);
        const after = content.substring(endIdx + BLOCK_END.length);
        return (before + after).replace(/\n{3,}/g, '\n\n').trim();
    }
    /** Read current ~/.ssh/config content, returns '' if not exists */
    readConfig() {
        if (!fs.existsSync(SSH_CONFIG_PATH))
            return '';
        return fs.readFileSync(SSH_CONFIG_PATH, 'utf8');
    }
    /** Write to ~/.ssh/config */
    writeConfig(content) {
        fs.writeFileSync(SSH_CONFIG_PATH, content + '\n', { encoding: 'utf8', mode: 0o600 });
    }
    /** Create ~/.ssh directory if it doesn't exist */
    ensureSshDirExists() {
        const sshDir = path.dirname(SSH_CONFIG_PATH);
        if (!fs.existsSync(sshDir)) {
            fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
        }
    }
    /** Get currently active SSH key path for github.com (if managed) */
    getActiveKeyPath() {
        const content = this.readConfig();
        const startIdx = content.indexOf(BLOCK_START);
        const endIdx = content.indexOf(BLOCK_END);
        if (startIdx === -1 || endIdx === -1)
            return undefined;
        const block = content.substring(startIdx, endIdx);
        const match = block.match(/IdentityFile\s+(.+)/);
        return match ? match[1].replace(/"/g, '').trim() : undefined;
    }
}
exports.SshConfigManager = SshConfigManager;
//# sourceMappingURL=sshConfigManager.js.map