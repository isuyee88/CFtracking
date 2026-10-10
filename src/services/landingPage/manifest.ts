import type { LandingHostingMode } from '@/types/landingPage';

const MAX_MANIFEST_BYTES = 256 * 1024;

export interface NormalizedLandingManifest {
  sourceSlug: string;
  name: string;
  hostingMode: LandingHostingMode;
  offerCount: number;
  disclosure: string;
  manifestJson: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function normalizeLandingManifest(input: unknown): NormalizedLandingManifest {
  const manifest = asRecord(input);
  const page = asRecord(manifest.page);
  const compliance = asRecord(manifest.compliance);
  const sourceSlug = asString(manifest.name);
  const disclosure = asString(compliance.disclosure);
  const offers = Array.isArray(manifest.offers) ? manifest.offers : [];
  const normalizedJson = JSON.stringify(manifest);

  if (!sourceSlug || !/^[a-z0-9][a-z0-9-]*$/.test(sourceSlug)) {
    throw new Error('landing manifest name must be a lowercase slug');
  }
  if (!disclosure) {
    throw new Error('landing manifest compliance.disclosure is required');
  }
  if (utf8ByteLength(normalizedJson) > MAX_MANIFEST_BYTES) {
    throw new Error(`landing manifest exceeds max size ${MAX_MANIFEST_BYTES} bytes`);
  }

  for (const offer of offers) {
    const click = asRecord(asRecord(offer).click);
    const clickUrl = asString(click.url);
    if (!isHttpUrl(clickUrl)) {
      throw new Error('landing manifest offer URL must be http(s)');
    }
  }

  const title = asString(page.title) || sourceSlug;
  return {
    sourceSlug,
    name: title,
    hostingMode: 'remote',
    offerCount: offers.length,
    disclosure,
    manifestJson: normalizedJson,
  };
}
