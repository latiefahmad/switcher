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
exports.testGitHubConnection = testGitHubConnection;
const https = __importStar(require("https"));
/**
 * Test a GitHub token by calling the GitHub API /user endpoint.
 */
async function testGitHubConnection(token) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: '/user',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'User-Agent': 'github-profile-switcher-vscode',
                Accept: 'application/vnd.github+json',
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({
                            success: true,
                            username: parsed.login,
                            message: `✅ Connected as @${parsed.login}`,
                        });
                    }
                    catch {
                        resolve({ success: false, message: '❌ Invalid response from GitHub API' });
                    }
                }
                else if (res.statusCode === 401) {
                    resolve({ success: false, message: '❌ Invalid token (401 Unauthorized)' });
                }
                else {
                    resolve({ success: false, message: `❌ GitHub API error: ${res.statusCode}` });
                }
            });
        });
        req.on('error', (err) => {
            resolve({ success: false, message: `❌ Network error: ${err.message}` });
        });
        req.setTimeout(10000, () => {
            req.destroy();
            resolve({ success: false, message: '❌ Request timed out' });
        });
        req.end();
    });
}
//# sourceMappingURL=githubApi.js.map