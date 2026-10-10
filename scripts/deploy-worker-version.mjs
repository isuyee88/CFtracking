import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const messagePath = path.join(repoRoot, 'dist', 'deploy-message.txt');
const wranglerBin = path.join(repoRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const preloadPaths = [path.join(repoRoot, '.wrangler-dns-bootstrap.cjs')];

function buildEnv() {
  const env = { ...process.env };
  const requiredFlags = preloadPaths.map((preloadPath) => `--require=${preloadPath}`);

  for (const requiredFlag of requiredFlags) {
    env.NODE_OPTIONS = env.NODE_OPTIONS
      ? env.NODE_OPTIONS.includes(requiredFlag)
        ? env.NODE_OPTIONS
        : `${env.NODE_OPTIONS} ${requiredFlag}`
      : requiredFlag;
  }

  const proxyUrl =
    env.CFTRACKING_PROXY_URL ||
    (env.CFTRACKING_PROXY_PORT ? `http://127.0.0.1:${env.CFTRACKING_PROXY_PORT}` : '');

  if (proxyUrl) {
    env.HTTP_PROXY = env.HTTP_PROXY || proxyUrl;
    env.HTTPS_PROXY = env.HTTPS_PROXY || proxyUrl;
    env.NO_PROXY = env.NO_PROXY || '127.0.0.1,localhost';
  }

  return env;
}

function runCommand(args, env) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(process.execPath, [wranglerBin, ...args], {
      cwd: repoRoot,
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`Wrangler command failed (${args.join(' ')}) with exit code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  const message = (await fs.readFile(messagePath, 'utf8')).trim();
  if (!message) {
    throw new Error(`Deployment message is empty at ${messagePath}`);
  }

  const env = buildEnv();

  const upload = await runCommand(['versions', 'upload', '--message', message], env);
  const versionIdMatch = upload.stdout.match(/Worker Version ID:\s*([a-f0-9-]+)/i);
  if (!versionIdMatch) {
    throw new Error('Unable to parse Worker Version ID from wrangler versions upload output');
  }

  const versionId = versionIdMatch[1];
  await runCommand(
    ['versions', 'deploy', '--version-id', versionId, '--percentage', '100', '--message', message, '-y'],
    env
  );
}

await main();
