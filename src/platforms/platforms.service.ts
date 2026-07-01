import { Injectable } from '@nestjs/common';
import { LoaderService } from '../data/loader.service';

@Injectable()
export class PlatformsService {
  constructor(private readonly loader: LoaderService) {}

  findAll() {
    return this.loader.loadPlatforms().map((p) => ({
      platform: p.platform,
      platform_id: p.platform_id,
      levels: p.levels,
      benefit_count: p.benefits.filter((b) => b.active).length,
    }));
  }

  findOne(id: string) {
    return this.loader.getPlatformBenefits(id);
  }
}
