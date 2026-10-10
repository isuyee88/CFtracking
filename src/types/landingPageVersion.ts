/**
 * @fileoverview Landing Page version domain types.
 * @module types/landingPageVersion
 */

export type LandingPageVersionStatus = 'draft' | 'preview' | 'published' | 'paused' | 'archived';

export interface LandingPageVersion {
  id: string;
  landingPageId: string;
  versionNumber: number;
  assetId: string | null;
  manifestSnapshot: Record<string, unknown> | null;
  status: LandingPageVersionStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  rollbackFromVersion: number | null;
  contentHash: string | null;
  etag: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandingPageVersionInput {
  landingPageId: string;
  assetId?: string | null;
  manifestSnapshot?: Record<string, unknown> | null;
  status?: Exclude<LandingPageVersionStatus, 'archived'>;
  publishedAt?: string | null;
  publishedBy?: string | null;
  rollbackFromVersion?: number | null;
  contentHash?: string | null;
  etag?: string | null;
}
