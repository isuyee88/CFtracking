import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const preloadPaths = [
  path.join(repoRoot, '.wrangler-dns-bootstrap.cjs'),
  path.join(repoRoot, '.wrangler-dns-patch.cjs'),
];

const env = { ...process.env };
const requiredFlags = preloadPaths.map((preloadPath) => `--require=${preloadPath}`);

if (!env.CFTRACKING_PROXY_PORT && !env.CFTRACKING_PROXY_URL && !env.HTTP_PROXY && !env.HTTPS_PROXY) {
  env.CFTRACKING_PROXY_PORT = '7897';
}

for (const requiredFlag of requiredFlags) {
  env.NODE_OPTIONS = env.NODE_OPTIONS
    ? env.NODE_OPTIONS.includes(requiredFlag)
      ? env.NODE_OPTIONS
      : `${env.NODE_OPTIONS} ${requiredFlag}`
    : requiredFlag;
}

const child = spawn('npm', ['run', 'deploy'], {
  cwd: repoRoot,
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
