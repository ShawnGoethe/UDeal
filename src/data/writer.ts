import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { clearCache } from "./loader.js";
import type { Benefit, UserMembership } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../../data");

export function addBenefit(platformId: string, benefit: Benefit): { success: boolean; message: string } {
  const filePath = join(DATA_DIR, "platforms", `${platformId}.json`);

  if (!existsSync(filePath)) {
    return { success: false, message: `平台 ${platformId} 不存在` };
  }

  const content = readFileSync(filePath, "utf-8");
  const platform = JSON.parse(content);

  // Check if benefit already exists
  const existingIndex = platform.benefits.findIndex((b: Benefit) => b.id === benefit.id);

  if (existingIndex >= 0) {
    platform.benefits[existingIndex] = { ...benefit, last_updated: new Date().toISOString().split("T")[0] };
  } else {
    platform.benefits.push({ ...benefit, last_updated: new Date().toISOString().split("T")[0] });
  }

  writeFileSync(filePath, JSON.stringify(platform, null, 2), "utf-8");
  clearCache();

  return {
    success: true,
    message: existingIndex >= 0 ? `权益 ${benefit.name} 已更新` : `权益 ${benefit.name} 已添加`,
  };
}

export function updateMembership(
  platformId: string,
  level: string,
  since?: string,
  expires?: string
): { success: boolean; message: string } {
  const filePath = join(DATA_DIR, "user.json");
  const content = readFileSync(filePath, "utf-8");
  const userData = JSON.parse(content);

  const existingIndex = userData.memberships.findIndex((m: UserMembership) => m.platform_id === platformId);

  const membership: UserMembership = {
    platform_id: platformId,
    level,
    since: since || null,
    expires: expires || null,
    notes: "",
  };

  if (existingIndex >= 0) {
    userData.memberships[existingIndex] = membership;
  } else {
    userData.memberships.push(membership);
  }

  writeFileSync(filePath, JSON.stringify(userData, null, 2), "utf-8");
  clearCache();

  return {
    success: true,
    message:
      existingIndex >= 0
        ? `会员 ${platformId} 已更新为 ${level}`
        : `已添加会员 ${platformId} - ${level}`,
  };
}
