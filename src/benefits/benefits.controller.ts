import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { BenefitsService } from './benefits.service';
@Controller('api/benefits')
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Get()
  async findAll(
    @Query('tag') tag?: string,
    @Query('platform') platform?: string,
    @Query('type') type?: 'free' | 'paid',
  ) {
    const results = await this.benefitsService.getAll({ tag, platform, type });
    return results.map((r) => ({
      id: r.benefit.id,
      name: r.benefit.name,
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
}
