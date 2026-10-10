import { promises as fs } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const targetDir = path.resolve(process.cwd(), process.argv[2] || 'frontend/dist');
const exts = new Set(['.js', '.css', '.html', '.svg', '.json', '.txt']);

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath);
      }
      return [fullPath];
    }),
  );

  return files.flat();
}

async function writeCompressedVariant(filePath, extension, data) {
  const outputPath = `${filePath}.${extension}`;
  await fs.writeFile(outputPath, data);
  return outputPath;
}

async function main() {
  const files = await collectFiles(targetDir);
  const targets = files.filter((filePath) => {
    const parsed = path.parse(filePath);
    if (!exts.has(parsed.ext)) {
      return false;
    }

    return !filePath.endsWith('.br') && !filePath.endsWith('.gz');
  });

  const results = [];

  for (const filePath of targets) {
    const source = await fs.readFile(filePath);
    const brotli = brotliCompressSync(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
      },
    });
    const gzip = gzipSync(source, { level: 9 });

    const [brPath, gzPath] = await Promise.all([
      writeCompressedVariant(filePath, 'br', brotli),
      writeCompressedVariant(filePath, 'gz', gzip),
    ]);

    results.push({
      file: path.relative(targetDir, filePath),
      brotli: path.relative(targetDir, brPath),
      gzip: path.relative(targetDir, gzPath),
      originalBytes: source.byteLength,
      brotliBytes: brotli.byteLength,
      gzipBytes: gzip.byteLength,
    });
  }

  console.log(JSON.stringify({ targetDir, compressed: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error('[precompress-assets] Failed:', error);
  process.exitCode = 1;
});
