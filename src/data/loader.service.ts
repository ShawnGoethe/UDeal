import { Injectable } from '@nestjs/common';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { Platform, Tag, SearchResult, UserMembership } from '../common/types';

const DATA_DIR = join(__dirname, '../../data');
const isDev = process.env.NODE_ENV !== 'production';

interface UserData {
  memberships: UserMembership[];
}

@Injectable()
export class LoaderService {
  private platformsCache: Platform[] | null = null;
  private tagsCache: Tag[] | null = null;
  private userCache: UserData | null = null;

  clearCache() {
    this.platformsCache = null;
    this.tagsCache = null;
    this.userCache = null;
  }

  loadPlatforms(): Platform[] {
    if (this.platformsCache) return this.platformsCache;
    const dir = join(DATA_DIR, 'platforms');
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    this.platformsCache = files.map((f) => {
      const data = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      return data as Platform;
    });
    return this.platformsCache;
  }

  loadTags(): Tag[] {
    if (this.tagsCache) return this.tagsCache;
    const data = JSON.parse(readFileSync(join(DATA_DIR, 'tags.json'), 'utf-8'));
    this.tagsCache = data.tags;
    return this.tagsCache!;
  }

  searchBenefits(
    query: string,
    filters?: { tag?: string; platform?: string; type?: string },
  ): SearchResult[] {
    if (isDev) this.clearCache();
    const platforms = this.loadPlatforms();
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const p of platforms) {
      if (filters?.platform && p.platform_id !== filters.platform) continue;
      for (const b of p.benefits) {
        if (!b.active) continue;
        if (filters?.tag && !b.tags.includes(filters.tag)) continue;
        if (filters?.type && b.type !== filters.type) continue;

        const matchFields = [b.name, b.description, ...b.tags].map((s) =>
          s.toLowerCase(),
        );

        const matched = matchFields.some((f) => f.includes(q));
        if (matched || !query) {
          results.push({
            benefit: b,
            platform: p.platform,
            platform_id: p.platform_id,
            matched_keywords: query ? [query] : [],
          });
        }
      }
    }
    return results;
  }

  getPlatformBenefits(platformId: string): Platform | undefined {
    if (isDev) this.clearCache();
    return this.loadPlatforms().find((p) => p.platform_id === platformId);
  }

  getAllBenefits(filters?: { tag?: string; platform?: string; type?: string }): SearchResult[] {
    return this.searchBenefits('', filters);
  }

  loadUser(): UserData {
    if (this.userCache) return this.userCache;
    this.userCache = JSON.parse(readFileSync(join(DATA_DIR, 'user.json'), 'utf-8'));
    return this.userCache!;
  }
}
