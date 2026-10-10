import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const landingsSource = readFileSync(resolve(process.cwd(), 'frontend/src/pages/Landings.tsx'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'frontend/src/components/GrapesVisualEditor.tsx'), 'utf8');

describe('GrapesJS lazy-loading UI contract', () => {
  it('keeps GrapesJS behind a dynamic import instead of the Landings static graph', () => {
    expect(landingsSource).toContain("React.lazy(() => import('../components/GrapesVisualEditor'))");
    expect(landingsSource).not.toMatch(/import\s+\{?\s*GrapesVisualEditor\s*\}?\s+from\s+['"]\.\.\/components\/GrapesVisualEditor['"]/);
    expect(editorSource).toContain("import grapesjs from 'grapesjs';");
  });

  it('mounts the heavy editor only after the explicit Pro Studio action', () => {
    expect(landingsSource).toContain("useState<'none' | 'quick' | 'pro'>('none')");
    expect(landingsSource).toContain("onClick={() => setMode('pro')}");
    expect(landingsSource).toContain("mode === 'quick' ? (");
    expect(landingsSource).toContain('<GrapesVisualEditor');
  });
});
