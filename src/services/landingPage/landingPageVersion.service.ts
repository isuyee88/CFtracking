import { LandingPageVersionRepository } from '@/handlers/d1/landingPageVersion.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type {
  CreateLandingPageVersionInput,
  LandingPageVersion,
} from '@/types/landingPageVersion';

export class LandingPageVersionService {
  private readonly repo: LandingPageVersionRepository;

  constructor(env: Env) {
    this.repo = new LandingPageVersionRepository(getD1Connection(env));
  }

  async create(input: CreateLandingPageVersionInput): Promise<LandingPageVersion> {
    return this.repo.create(input);
  }

  async list(landingPageId: string): Promise<LandingPageVersion[]> {
    return this.repo.findByLandingPage(landingPageId);
  }

  async get(landingPageId: string, versionNumber: number): Promise<LandingPageVersion> {
    const version = await this.repo.findByVersionNumber(landingPageId, versionNumber);
    if (!version) throw new Error('Landing Page version not found');
    return version;
  }

  async publish(
    landingPageId: string,
    versionId: string,
    publishedBy?: string,
  ): Promise<LandingPageVersion> {
    return this.repo.publish(landingPageId, versionId, publishedBy);
  }

  async pause(versionId: string): Promise<LandingPageVersion> {
    return this.repo.updateStatus(versionId, 'paused');
  }

  async rollback(
    landingPageId: string,
    versionNumber: number,
    publishedBy?: string,
  ): Promise<LandingPageVersion> {
    const target = await this.get(landingPageId, versionNumber);
    const current = await this.repo.findPublished(landingPageId);
    return this.repo.publish(
      landingPageId,
      target.id,
      publishedBy,
      current && current.id !== target.id ? current.versionNumber : null,
    );
  }
}
