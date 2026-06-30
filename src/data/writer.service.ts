import { Injectable } from "@nestjs/common";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { LoaderService } from "./loader.service";
import type { Benefit, UserMembership } from "../common/types";

const DATA_DIR = join(__dirname, "../../data");

@Injectable()
export class WriterService {
  constructor(private readonly loader: LoaderService) {}

  addBenefit(
    platformId: string,
    benefit: Omit<Benefit, "active" | "last_updated">
  ): void {
    const filePath = join(DATA_DIR, "platforms", `${platformId}.json`);
    const platform = JSON.parse(readFileSync(filePath, "utf-8"));

    const idx = platform.benefits.findIndex(
      (b: Benefit) => b.id === benefit.id
    );
    const entry: Benefit = {
      ...benefit,
      active: true,
      last_updated: new Date().toISOString().split("T")[0],
    };

    if (idx >= 0) {
      platform.benefits[idx] = entry;
    } else {
      platform.benefits.push(entry);
    }

    writeFileSync(filePath, JSON.stringify(platform, null, 2), "utf-8");
    this.loader.clearCache();
  }

  updateMembership(
    platformId: string,
    level: string,
    since?: string,
    expires?: string
  ): void {
    const filePath = join(DATA_DIR, "user.json");
    const user = JSON.parse(readFileSync(filePath, "utf-8"));

    const idx = user.memberships.findIndex(
      (m: UserMembership) => m.platform_id === platformId
    );
    const entry: UserMembership = {
      platform_id: platformId,
      level,
      since: since || null,
      expires: expires || null,
      notes: "",
    };

    if (idx >= 0) {
      user.memberships[idx] = { ...user.memberships[idx], ...entry };
    } else {
      user.memberships.push(entry);
    }

    writeFileSync(filePath, JSON.stringify(user, null, 2), "utf-8");
    this.loader.clearCache();
  }
}
