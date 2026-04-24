import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const bootstrapPath = path.join(repoRoot, '.wrangler-dns-bootstrap.cjs');

const env = { ...process.env };
const stableRequire = `--require=${bootstrapPath}`;

env.NODE_OPTIONS = env.NODE_OPTIONS
  ? env.NODE_OPTIONS.includes(stableRequire)
    ? env.NODE_OPTIONS
    : `${env.NODE_OPTIONS} ${stableRequire}`
  : stableRequire;

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
