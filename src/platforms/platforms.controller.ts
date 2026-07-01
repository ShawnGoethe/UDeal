import { Controller, Get, Param } from '@nestjs/common';
import { PlatformsService } from './platforms.service';

@Controller('api/platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  findAll() {
    return this.platformsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const platform = this.platformsService.findOne(id);
    if (!platform) return { error: '平台未找到' };
    return platform;
  }
}
