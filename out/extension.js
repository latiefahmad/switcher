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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const profileManager_1 = require("./profileManager");
const gitConfigManager_1 = require("./gitConfigManager");
const sshConfigManager_1 = require("./sshConfigManager");
const statusBar_1 = require("./statusBar");
const commands_1 = require("./commands");
const panelProvider_1 = require("./webview/panelProvider");
// Output channel for debugging
let outputChannel;
async function activate(context) {
    // Create output channel first so errors are always visible
    outputChannel = vscode.window.createOutputChannel('GitHub Profile Switcher');
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine('[GitHub Profile Switcher] Activating v1.8.0...');
    try {
        // ── Initialize managers ──────────────────────────────────────────────────
        const profileManager = new profileManager_1.ProfileManager(context);
        const gitConfig = new gitConfigManager_1.GitConfigManager();
        const sshConfig = new sshConfigManager_1.SshConfigManager();
        const statusBar = new statusBar_1.StatusBarManager();
        outputChannel.appendLine('[GitHub Profile Switcher] Managers initialized');
        // ── Webview panel ────────────────────────────────────────────────────────
        const panelProvider = new panelProvider_1.PanelProvider(context, profileManager, async (profile) => {
            await commands.applyProfile(profile);
        }, () => {
            const active = profileManager.getActiveProfile(vscode.workspace.workspaceFolders?.[0]?.uri.toString());
            statusBar.update(active);
        });
        // ── Commands ─────────────────────────────────────────────────────────────
        const commands = new commands_1.CommandRegistry(context, profileManager, gitConfig, sshConfig, statusBar, panelProvider);
        commands.registerAll();
        outputChannel.appendLine('[GitHub Profile Switcher] Commands registered');
        // ── Status bar initial render ────────────────────────────────────────────
        const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
        const activeProfile = profileManager.getActiveProfile(workspaceUri);
        statusBar.update(activeProfile);
        context.subscriptions.push({ dispose: () => statusBar.dispose() });
        outputChannel.appendLine(`[GitHub Profile Switcher] Status bar shown — active profile: ${activeProfile?.label ?? 'none'}`);
        // ── Auto-switch on workspace open ────────────────────────────────────────
        const autoSwitch = vscode.workspace
            .getConfiguration('githubSwitcher')
            .get('autoSwitchOnWorkspaceOpen', true);
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
                    vscode.window.showInformationMessage(`🔀 Auto-switched to GitHub profile: ${bound.label}`);
                    outputChannel.appendLine(`[GitHub Profile Switcher] Auto-switched to: ${bound.label}`);
                }
                catch (err) {
                    outputChannel.appendLine(`[GitHub Profile Switcher] Auto-switch failed: ${err}`);
                }
            }
        }
        // ── Watch for workspace folder changes ──────────────────────────────────
        context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
            const uri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
            const profile = profileManager.getActiveProfile(uri);
            statusBar.update(profile);
        }));
        // ── Watch config changes (show/hide status bar) ─────────────────────────
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('githubSwitcher.showStatusBar')) {
                const profile = profileManager.getActiveProfile(vscode.workspace.workspaceFolders?.[0]?.uri.toString());
                statusBar.update(profile);
            }
        }));
        outputChannel.appendLine('[GitHub Profile Switcher] Activated ✅');
    }
    catch (err) {
        // Make crash visible to user so they can report it
        const msg = err instanceof Error ? err.message : String(err);
        outputChannel.appendLine(`[GitHub Profile Switcher] ACTIVATION ERROR: ${msg}`);
        outputChannel.show(true);
        vscode.window.showErrorMessage(`GitHub Profile Switcher failed to start: ${msg}. Check Output → "GitHub Profile Switcher" for details.`);
    }
}
function deactivate() {
    outputChannel?.appendLine('[GitHub Profile Switcher] Deactivated');
}
//# sourceMappingURL=extension.js.map