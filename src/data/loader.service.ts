import { Injectable } from "@nestjs/common";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type {
  Platform,
  Category,
  Tag,
  UserData,
  SearchResult,
  Benefit,
} from "../common/types";

const DATA_DIR = join(__dirname, "../../data");
const isDev = process.env.NODE_ENV !== "production";

@Injectable()
export class LoaderService {
  private platformsCache: Platform[] | null = null;
  private categoriesCache: Category[] | null = null;
  private tagsCache: Tag[] | null = null;
  private userCache: UserData | null = null;

  clearCache() {
    this.platformsCache = null;
    this.categoriesCache = null;
    this.tagsCache = null;
    this.userCache = null;
  }

  loadPlatforms(): Platform[] {
    if (this.platformsCache) return this.platformsCache;
    const dir = join(DATA_DIR, "platforms");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    this.platformsCache = files.map((f) => {
      const data = JSON.parse(readFileSync(join(dir, f), "utf-8"));
      return data as Platform;
    });
    return this.platformsCache;
  }

  loadCategories(): Category[] {
    if (this.categoriesCache) return this.categoriesCache;
    const data = JSON.parse(
      readFileSync(join(DATA_DIR, "categories.json"), "utf-8")
    );
    this.categoriesCache = data.categories;
    return this.categoriesCache!;
  }

  loadTags(): Tag[] {
    if (this.tagsCache) return this.tagsCache;
    const data = JSON.parse(
      readFileSync(join(DATA_DIR, "tags.json"), "utf-8")
    );
    this.tagsCache = data.tags;
    return this.tagsCache!;
  }

  loadUser(): UserData {
    if (this.userCache) return this.userCache;
    this.userCache = JSON.parse(
      readFileSync(join(DATA_DIR, "user.json"), "utf-8")
    );
    return this.userCache!;
  }

  searchBenefits(
    query: string,
    filters?: { tag?: string; platform?: string; type?: string }
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

        const matchFields = [b.name, b.description, b.category, ...b.tags].map(
          (s) => s.toLowerCase()
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

  getAllBenefits(filters?: {
    tag?: string;
    platform?: string;
    type?: string;
  }): SearchResult[] {
    return this.searchBenefits("", filters);
  }

  getMyBenefits(): Array<{
    platform: string;
    platform_id: string;
    level: string;
    benefits: Benefit[];
  }> {
    if (isDev) this.clearCache();
    const user = this.loadUser();
    const platforms = this.loadPlatforms();
    const result: Array<{
      platform: string;
      platform_id: string;
      level: string;
      benefits: Benefit[];
    }> = [];

    for (const m of user.memberships) {
      const p = platforms.find((pp) => pp.platform_id === m.platform_id);
      if (!p) continue;
      const benefits = p.benefits.filter(
        (b) => b.active && m.level in b.level_details
      );
      result.push({
        platform: p.platform,
        platform_id: p.platform_id,
        level: m.level,
        benefits,
      });
    }
    return result;
  }

  compareBenefitAcrossPlatforms(query: string): SearchResult[] {
    return this.searchBenefits(query);
  }

  getBenefitById(
    id: string
  ): (SearchResult & { level_detail: Record<string, unknown> }) | undefined {
    if (isDev) this.clearCache();
    const platforms = this.loadPlatforms();
    for (const p of platforms) {
      const b = p.benefits.find((bb) => bb.id === id);
      if (b) {
        return {
          benefit: b,
          platform: p.platform,
          platform_id: p.platform_id,
          matched_keywords: [],
          level_detail: b.level_details,
        };
      }
    }
    return undefined;
  }
}
