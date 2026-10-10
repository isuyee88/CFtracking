import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'frontend/src/pages/Landings.tsx'), 'utf8');

describe('Landings version management UI contract', () => {
  it('exposes version list and draft/publish/pause/rollback/copy actions', () => {
    expect(source).toContain('Version Management');
    expect(source).toContain('Create Draft');
    expect(source).toContain('Publish');
    expect(source).toContain('Pause');
    expect(source).toContain('Rollback');
    expect(source).toContain('Copy');
    expect(source).toContain('Preview');
  });

  it('wires confirmation, action loading, and narrow-screen-safe modal classes', () => {
    expect(source).toContain('useConfirmDialog');
    expect(source).toContain('versionActionLoading');
    expect(source).toContain('max-w-3xl w-[calc(100%-2rem)]');
    expect(source).toContain('overflow-x-auto');
  });
});
