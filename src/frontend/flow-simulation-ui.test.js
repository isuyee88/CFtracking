import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'frontend/src/pages/TrafficFilter.tsx'), 'utf8');

describe('Traffic Filter simulation UI contract', () => {
  it('exposes simulation input, run action, and explainable result fields', () => {
    expect(source).toContain('Flow Simulation');
    expect(source).toContain('Run Simulation');
    expect(source).toContain('Simulation Context JSON');
    expect(source).toContain('Flow Schemas JSON');
    expect(source).toContain('decision');
    expect(source).toContain('trace');
  });

  it('keeps simulation states visible and prevents accidental empty submissions', () => {
    expect(source).toContain('simulationError');
    expect(source).toContain('simulationResult');
    expect(source).toContain('contextJson.trim()');
    expect(source).toContain('schemasJson.trim()');
  });
});
