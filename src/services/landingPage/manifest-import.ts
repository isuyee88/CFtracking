import type { CreateLandingPageDTO, LandingPage, UpdateLandingPageDTO } from '@/types/landingPage';
import { normalizeLandingManifest } from './manifest';

interface LandingManifestStore {
  findBySourceSlug(sourceSlug: string): Promise<LandingPage | null>;
  create(data: CreateLandingPageDTO): Promise<LandingPage>;
  update(id: string, data: UpdateLandingPageDTO): Promise<LandingPage>;
}

export interface ImportLandingManifestInput {
  runtimeUrl: string;
  manifest: unknown;
}

export async function importLandingManifest(
  store: LandingManifestStore,
  input: ImportLandingManifestInput,
): Promise<{ created: boolean; landingPage: LandingPage }> {
  let runtimeUrl: URL;
  try {
    runtimeUrl = new URL(input.runtimeUrl);
  } catch {
    throw new Error('landing manifest runtimeUrl must be a valid URL');
  }
  if (!['http:', 'https:'].includes(runtimeUrl.protocol)) {
    throw new Error('landing manifest runtimeUrl must be http(s)');
  }

  const normalized = normalizeLandingManifest(input.manifest);
  const data: CreateLandingPageDTO = {
    name: normalized.name,
    url: runtimeUrl.toString(),
    sourceSlug: normalized.sourceSlug,
    hostingMode: normalized.hostingMode,
    manifestJson: normalized.manifestJson,
    notes: `Imported from workers-landing manifest (${normalized.offerCount} offers).`,
  };
  const existing = await store.findBySourceSlug(normalized.sourceSlug);
  if (!existing) {
    return { created: true, landingPage: await store.create(data) };
  }

  const updated = await store.update(existing.id, {
    name: data.name,
    url: data.url,
    sourceSlug: data.sourceSlug,
    hostingMode: data.hostingMode,
    manifestJson: data.manifestJson,
    notes: data.notes,
  });
  return { created: false, landingPage: updated };
}
