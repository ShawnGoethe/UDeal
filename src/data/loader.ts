import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Platform, Category, UserData, Benefit, SearchResult } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../../data");

let platformsCache: Platform[] | null = null;
let categoriesCache: Category[] | null = null;
let userCache: UserData | null = null;

export function loadPlatforms(): Platform[] {
  if (platformsCache) return platformsCache;
  const platformsDir = join(DATA_DIR, "platforms");
  const files = readdirSync(platformsDir).filter((f) => f.endsWith(".json"));
  platformsCache = files.map((f) => {
    const content = readFileSync(join(platformsDir, f), "utf-8");
    return JSON.parse(content) as Platform;
  });
  return platformsCache;
}

export function loadCategories(): Category[] {
  if (categoriesCache) return categoriesCache;
  const content = readFileSync(join(DATA_DIR, "categories.json"), "utf-8");
  categoriesCache = JSON.parse(content).categories as Category[];
  return categoriesCache;
}

export function loadUser(): UserData {
  if (userCache) return userCache;
  const content = readFileSync(join(DATA_DIR, "user.json"), "utf-8");
  userCache = JSON.parse(content) as UserData;
  return userCache;
}

export function clearCache(): void {
  platformsCache = null;
  categoriesCache = null;
  userCache = null;
}

export function searchBenefits(query: string): SearchResult[] {
  const platforms = loadPlatforms();
  const categories = loadCategories();
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  // Find matching categories
  const matchingCategoryIds = new Set<string>();
  for (const cat of categories) {
    if (
      cat.name.includes(query) ||
      cat.keywords.some((kw) => queryLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(queryLower))
    ) {
      matchingCategoryIds.add(cat.id);
    }
  }

  for (const platform of platforms) {
    for (const benefit of platform.benefits) {
      if (!benefit.active) continue;

      const matchedKeywords: string[] = [];
      let matched = false;

      // Direct name/description match
      if (benefit.name.toLowerCase().includes(queryLower) || benefit.description.toLowerCase().includes(queryLower)) {
        matched = true;
        matchedKeywords.push("name/description");
      }

      // Category match
      if (matchingCategoryIds.has(benefit.category)) {
        matched = true;
        matchedKeywords.push("category");
      }

      // Keyword match from categories
      for (const cat of categories) {
        if (cat.id === benefit.category) {
          for (const kw of cat.keywords) {
            if (queryLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(queryLower)) {
              matched = true;
              if (!matchedKeywords.includes(`keyword:${kw}`)) {
                matchedKeywords.push(`keyword:${kw}`);
              }
            }
          }
        }
      }

      if (matched) {
        results.push({
          benefit,
          platform: platform.platform,
          platform_id: platform.platform_id,
          matched_keywords: matchedKeywords,
        });
      }
    }
  }

  return results;
}

export function getPlatformBenefits(platformId: string): Platform | undefined {
  const platforms = loadPlatforms();
  return platforms.find((p) => p.platform_id === platformId);
}

export function getMyBenefits(): Array<{ platform: Platform; benefit: Benefit; level: string }> {
  const platforms = loadPlatforms();
  const user = loadUser();
  const results: Array<{ platform: Platform; benefit: Benefit; level: string }> = [];

  for (const membership of user.memberships) {
    const platform = platforms.find((p) => p.platform_id === membership.platform_id);
    if (!platform) continue;

    for (const benefit of platform.benefits) {
      if (!benefit.active) continue;
      if (benefit.level_details[membership.level]) {
        results.push({ platform, benefit, level: membership.level });
      }
    }
  }

  return results;
}

export function compareBenefitAcrossPlatforms(query: string): Array<{
  platform: string;
  benefit: Benefit;
  level: string;
  details: Record<string, unknown>;
}> {
  const searchResults = searchBenefits(query);
  const user = loadUser();

  return searchResults.map((sr) => {
    const membership = user.memberships.find((m) => m.platform_id === sr.platform_id);
    const level = membership?.level || Object.keys(sr.benefit.level_details)[0];
    return {
      platform: sr.platform,
      benefit: sr.benefit,
      level,
      details: (sr.benefit.level_details[level] || {}) as Record<string, unknown>,
    };
  });
}
