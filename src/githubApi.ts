import * as https from 'https';
import { GitHubProfile, ConnectionTestResult } from './types';

/**
 * Test a GitHub token by calling the GitHub API /user endpoint.
 */
export async function testGitHubConnection(
  token: string
): Promise<ConnectionTestResult> {
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
          } catch {
            resolve({ success: false, message: '❌ Invalid response from GitHub API' });
          }
        } else if (res.statusCode === 401) {
          resolve({ success: false, message: '❌ Invalid token (401 Unauthorized)' });
        } else {
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
