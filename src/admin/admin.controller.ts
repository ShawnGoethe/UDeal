import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { LoaderService } from '../data/loader.service';
import { WriterService } from '../data/writer.service';
import type { Benefit, UserMembership, SystemUser } from '../common/types';

@Controller('admin')
export class AdminController {
  @Get()
  serveAdminPage(@Res() res: Response) {
    res.sendFile(join(__dirname, '../../public/admin.html'));
  }

  @Get('login')
  serveLoginPage(@Res() res: Response) {
    res.sendFile(join(__dirname, '../../public/login.html'));
  }

  constructor(
    private readonly loader: LoaderService,
    private readonly writer: WriterService,
  ) {}

  // ========== 系统用户管理 ==========

  @Get('users')
  getUsers() {
    return this.writer.getUsers();
  }

  @Post('users')
  async addUser(@Body() body: Omit<SystemUser, 'id' | 'created_at' | 'last_login'>) {
    const user = await this.writer.addUser(body);
    return { ok: true, user };
  }

  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: Partial<Omit<SystemUser, 'id' | 'created_at'>>,
  ) {
    const ok = await this.writer.updateUser(id, body);
    return { ok };
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    const ok = this.writer.deleteUser(id);
    return { ok };
  }

  // ========== 会员管理 ==========

  @Get('memberships')
  getMemberships() {
    const user = this.loader.loadUser();
    return user.memberships;
  }

  @Post('memberships')
  addMembership(@Body() body: { platform_id: string; level: string; since?: string; expires?: string; notes?: string }) {
    this.writer.updateMembership(body.platform_id, body.level, body.since, body.expires);
    return { ok: true };
  }

  @Put('memberships/:platformId')
  updateMembership(
    @Param('platformId') platformId: string,
    @Body() body: { level: string; since?: string; expires?: string },
  ) {
    this.writer.updateMembership(platformId, body.level, body.since, body.expires);
    return { ok: true };
  }

  // ========== 权益管理 ==========

  @Get('benefits')
  getBenefits(@Query('platform') platform?: string) {
    const platforms = this.loader.loadPlatforms();
    const results: Array<{ platform: string; platform_id: string; benefit: Benefit }> = [];

    for (const p of platforms) {
      if (platform && p.platform_id !== platform) continue;
      for (const b of p.benefits) {
        results.push({
          platform: p.platform,
          platform_id: p.platform_id,
          benefit: b,
        });
      }
    }
    return results;
  }

  @Post('benefits')
  addBenefit(
    @Body() body: { platform_id: string; benefit: Omit<Benefit, 'active' | 'last_updated'> },
  ) {
    this.writer.addBenefit(body.platform_id, body.benefit);
    return { ok: true };
  }

  @Put('benefits/:id')
  updateBenefit(
    @Param('id') id: string,
    @Body() body: { platform_id: string; benefit: Partial<Benefit> },
  ) {
    this.writer.updateBenefit(body.platform_id, id, body.benefit);
    return { ok: true };
  }

  @Delete('benefits/:id')
  deleteBenefit(
    @Param('id') id: string,
    @Query('platform') platformId: string,
  ) {
    this.writer.removeBenefit(platformId, id);
    return { ok: true };
  }

  // ========== 辅助数据 ==========

  @Get('platforms')
  getPlatforms() {
    const platforms = this.loader.loadPlatforms();
    return platforms.map((p) => ({
      platform: p.platform,
      platform_id: p.platform_id,
      levels: p.levels,
      benefit_count: p.benefits.length,
    }));
  }

  @Get('categories')
  getCategories() {
    return this.loader.loadCategories();
  }

  @Get('tags')
  getTags() {
    return this.loader.loadTags();
  }
}
