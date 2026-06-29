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
exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
class StatusBarManager {
    constructor() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        // Click → show detail popup (not directly switch)
        this.item.command = 'githubSwitcher.showActiveProfile';
    }
    update(profile) {
        const show = vscode.workspace
            .getConfiguration('githubSwitcher')
            .get('showStatusBar', true);
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
        }
        else {
            this.item.text = `$(account) No GitHub Profile`;
            this.item.tooltip = 'No GitHub profile active — click to set one';
        }
        this.item.show();
    }
    setLoading() {
        this.item.text = `$(sync~spin) Switching…`;
        this.item.show();
    }
    dispose() {
        this.item.dispose();
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=statusBar.js.map