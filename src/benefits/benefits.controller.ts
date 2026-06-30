import { Controller, Get, Param, Query } from "@nestjs/common";
import { BenefitsService } from "./benefits.service";

@Controller("api/benefits")
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Get()
  findAll(
    @Query("tag") tag?: string,
    @Query("platform") platform?: string,
    @Query("type") type?: "free" | "paid"
  ) {
    const results = this.benefitsService.getAll({ tag, platform, type });
    return results.map((r) => ({
      id: r.benefit.id,
      name: r.benefit.name,
      category: r.benefit.category,
      tags: r.benefit.tags,
      type: r.benefit.type,
      description: r.benefit.description,
      platform: r.platform,
      platform_id: r.platform_id,
      level_details: r.benefit.level_details,
      redeem_time: r.benefit.redeem_time,
      limit: r.benefit.limit,
      tips: r.benefit.tips,
    }));
  }

  @Get("search")
  search(
    @Query("q") query: string,
    @Query("tag") tag?: string,
    @Query("platform") platform?: string,
    @Query("type") type?: "free" | "paid"
  ) {
    const results = this.benefitsService.search(query || "", {
      tag,
      platform,
      type,
    });
    return results.map((r) => ({
      id: r.benefit.id,
      name: r.benefit.name,
      description: r.benefit.description,
      tags: r.benefit.tags,
      type: r.benefit.type,
      platform: r.platform,
      platform_id: r.platform_id,
      level_details: r.benefit.level_details,
    }));
  }

  @Get("my")
  getMyBenefits() {
    return this.benefitsService.getMyBenefits();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    const result = this.benefitsService.getById(id);
    if (!result) return { error: "权益未找到" };
    return result;
  }
}
