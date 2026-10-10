/**
 * @fileoverview 前端构建编排：junction 场景下切到真实路径构建
 * @description 为什么不直接 npm --prefix frontend run build：frontend 是指向
 * github/CFtracking/frontend 的 junction，vite 6.4 build-html 阶段在 junction 两侧
 * realpath 不一致时 emit 出跨卷相对路径（../../../../github/...）导致构建失败（实测复现）；
 * 真实路径下构建成功，产物经 junction 双向透明可见，wrangler assets 无感知。
 * @module scripts/build-frontend
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const frontendDir = path.join(repoRoot, 'frontend');
// 支持指定 frontend 包内脚本名（build / verify），默认 build
const scriptName = process.argv[2] || 'build';

let realDir = frontendDir;
try {
    realDir = fs.realpathSync(frontendDir);
} catch {
    // frontend 目录不存在时交由下游 npm 报错，保持原有失败语义
}
const isJunction = path.relative(repoRoot, realDir).startsWith('..');

const prefix = isJunction ? realDir : frontendDir;
console.log(`[build-frontend] npm --prefix ${prefix} run ${scriptName}${isJunction ? ' (junction detected, build at realpath)' : ''}`);

const result = spawnSync('npm', ['--prefix', prefix, 'run', scriptName], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
