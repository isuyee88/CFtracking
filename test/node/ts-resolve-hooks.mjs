/**
 * @file resolve .ts graph edges for offline node tests.
 * @description The router sources use bundler-style imports (no extension) and
 * the `@/` alias, both resolved by tsc/vite but not by Node's ESM loader. This
 * sync hook only rewrites those specifiers to real files so node --test can
 * import the production sources without a bundler.
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const srcRoot = path.join(repoRoot, 'src');

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = path.join(srcRoot, specifier.slice(2));
      for (const ext of ['.ts', '.tsx', '.js']) {
        if (existsSync(target + ext)) {
          return nextResolve(pathToFileURL(target + ext).href, context);
        }
      }
      for (const ext of ['.ts', '.tsx', '.js']) {
        if (existsSync(path.join(target, 'index' + ext))) {
          return nextResolve(pathToFileURL(path.join(target, 'index' + ext)).href, context);
        }
      }
      return nextResolve(specifier, context);
    }

    const hasKnownExtension = /\.(?:ts|tsx|js|mjs|cjs|json)$/.test(specifier);
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !hasKnownExtension) {
      if (context.parentURL && context.parentURL.startsWith('file:')) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        const target = path.resolve(parentDir, specifier);
        for (const ext of ['.ts', '.tsx', '.js']) {
          if (existsSync(target + ext)) {
            return nextResolve(pathToFileURL(target + ext).href, context);
          }
        }
        for (const ext of ['.ts', '.tsx', '.js']) {
          if (existsSync(path.join(target, 'index' + ext))) {
            return nextResolve(pathToFileURL(path.join(target, 'index' + ext)).href, context);
          }
        }
      }
    }

    return nextResolve(specifier, context);
  },
});
