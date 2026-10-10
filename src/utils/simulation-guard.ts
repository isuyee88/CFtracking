/**
 * Global guard for external platform side effects.
 *
 * The Phase 1 architecture baseline keeps simulation mode enabled by default.
 * Read operations are never blocked by this helper; every external write must
 * call this guard immediately before the network request.
 */
import type { Env } from '@/config/env';

function isSimulationEnabled(value: Env['SIMULATION_MODE']): boolean {
  if (typeof value === 'boolean') return value;
  return value.trim().toLowerCase() !== 'false';
}

export function simulationGuard(
  env: Pick<Env, 'SIMULATION_MODE'>,
  operation: string,
  platform: string,
  action: 'write' | 'read'
): void {
  if (action !== 'write' || !isSimulationEnabled(env.SIMULATION_MODE)) {
    return;
  }

  console.log(`[SIMULATION] Blocked ${operation} on ${platform}`);
  throw new Error(
    `Simulation mode: ${operation} blocked on ${platform}. Set SIMULATION_MODE=false to enable.`
  );
}

export function isSimulationMode(env: Pick<Env, 'SIMULATION_MODE'>): boolean {
  return isSimulationEnabled(env.SIMULATION_MODE);
}
