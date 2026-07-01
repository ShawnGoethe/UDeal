import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { BenefitsService } from '../benefits/benefits.service';
import { WriterService } from '../data/writer.service';
import { LoaderService } from '../data/loader.service';
import { UpdateService } from '../update/update.service';

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private server!: FastMCP;

  constructor(
    private readonly benefitsService: BenefitsService,
    private readonly writerService: WriterService,
    private readonly loaderService: LoaderService,
  ) {}

  onModuleInit() {
    this.server = new FastMCP({
      name: 'udeal',
      version: '3.0.0',
    });
    this.registerTools();
    this.logger.log('MCP Server initialized with 8 tools');
  }

  getServer(): FastMCP {
    return this.server;
  }

  async onModuleDestroy() {
    this.logger.log('Stopping MCP Server...');
    await this.server.stop();
    this.logger.log('MCP Server stopped');
  }

  private registerTools() {
    // 1. search_benefits
    this.server.addTool({
      name: 'search_benefits',
      description: '搜索会员权益，支持按关键词、标签、平台、类型筛选',
      parameters: z.object({
        query: z.string().describe('搜索关键词'),
        tag: z.string().optional().describe('标签ID筛选，如 dental-cleaning'),
        platform: z.string().optional().describe('平台ID筛选，如 meituan'),
        type: z.enum(['free', 'paid']).optional().describe('权益类型：free 或 paid'),
      }),
      execute: async (args) => {
        const results = this.benefitsService.search(args.query, {
          tag: args.tag,
          platform: args.platform,
          type: args.type,
        });
        if (results.length === 0) return '未找到相关权益';
        return results
          .map(
            (r) =>
              `【${r.platform}】${r.benefit.name} (${r.benefit.type === 'free' ? '免费' : '付费'})\n` +
              `  ${r.benefit.description}\n` +
              `  标签: ${r.benefit.tags.join(', ') || '无'}\n` +
              `  兑换: ${r.benefit.redeem_time}` +
              (r.benefit.limit ? `\n  限制: ${r.benefit.limit}` : ''),
          )
          .join('\n\n');
      },
    });

    // 2. list_platform_benefits
    this.server.addTool({
      name: 'list_platform_benefits',
      description: '列出指定平台的所有会员权益',
      parameters: z.object({
        platform_id: z.string().describe('平台ID，如 meituan, jd, taobao-88vip'),
      }),
      execute: async (args) => {
        const platform = this.loaderService.getPlatformBenefits(args.platform_id);
        if (!platform) return `未找到平台: ${args.platform_id}`;
        return (
          `${platform.platform} (${platform.levels.join('/')})\n` +
          platform.benefits
            .filter((b) => b.active)
            .map(
              (b) =>
                `• ${b.name} [${b.type === 'free' ? '免费' : '付费'}]\n` +
                `  ${b.description}\n` +
                Object.entries(b.level_details)
                  .map(([level, detail]) => `  ${level}: ${JSON.stringify(detail)}`)
                  .join('\n'),
            )
            .join('\n\n')
        );
      },
    });

    // 3. get_my_benefits
    this.server.addTool({
      name: 'get_my_benefits',
      description: '根据我的会员信息，展示可用权益',
      parameters: z.object({}),
      execute: async () => {
        const myBenefits = this.benefitsService.getMyBenefits();
        if (myBenefits.length === 0) return '暂无会员信息，请先添加会员';
        return myBenefits
          .map(
            (m) =>
              `== ${m.platform} (${m.level}) ==\n` +
              m.benefits
                .map(
                  (b) =>
                    `• ${b.name} [${b.type === 'free' ? '免费' : '付费'}]\n` +
                    `  ${b.description}\n` +
                    `  ${JSON.stringify(b.level_details[m.level] || {})}`,
                )
                .join('\n'),
          )
          .join('\n\n');
      },
    });

    // 4. compare_benefits
    this.server.addTool({
      name: 'compare_benefits',
      description: '跨平台对比同类权益',
      parameters: z.object({
        query: z.string().describe('要对比的权益关键词，如 洁牙、机场贵宾厅'),
      }),
      execute: async (args) => {
        const results = this.benefitsService.compare(args.query);
        if (results.length === 0) return '未找到相关权益进行对比';
        return (
          `对比「${args.query}」相关权益：\n\n` +
          results
            .map(
              (r) =>
                `【${r.platform}】${r.benefit.name}\n` +
                `  ${r.benefit.description}\n` +
                Object.entries(r.benefit.level_details)
                  .map(([level, d]) => `  ${level}: ${JSON.stringify(d)}`)
                  .join('\n'),
            )
            .join('\n\n')
        );
      },
    });

    // 5. add_benefit
    this.server.addTool({
      name: 'add_benefit',
      description: '新增或更新一个平台权益',
      parameters: z.object({
        platform_id: z.string().describe('平台ID'),
        benefit_id: z.string().describe('权益ID'),
        name: z.string().describe('权益名称'),
        category: z.string().describe('分类ID'),
        tags: z.array(z.string()).describe('标签ID列表'),
        type: z.enum(['free', 'paid']).describe('权益类型'),
        description: z.string().describe('权益描述'),
        redeem_time: z.string().describe('兑换时间'),
        level_details_json: z.string().describe('等级详情JSON字符串'),
        limit: z.string().optional().describe('限制说明'),
        tips: z.string().optional().describe('使用提示'),
      }),
      execute: async (args) => {
        try {
          const levelDetails = JSON.parse(args.level_details_json);
          this.writerService.addBenefit(args.platform_id, {
            id: args.benefit_id,
            name: args.name,
            category: args.category,
            tags: args.tags,
            type: args.type,
            description: args.description,
            level_details: levelDetails,
            redeem_time: args.redeem_time,
            limit: args.limit || null,
            tips: args.tips || '',
          });
          return `已添加/更新权益: ${args.name}`;
        } catch (e) {
          return `添加失败: ${e}`;
        }
      },
    });

    // 6. update_membership
    this.server.addTool({
      name: 'update_membership',
      description: '更新用户的会员信息',
      parameters: z.object({
        platform_id: z.string().describe('平台ID'),
        level: z.string().describe('会员等级'),
        since: z.string().optional().describe('开通日期 YYYY-MM-DD'),
        expires: z.string().optional().describe('到期日期 YYYY-MM-DD'),
      }),
      execute: async (args) => {
        this.writerService.updateMembership(args.platform_id, args.level, args.since, args.expires);
        return `已更新会员: ${args.platform_id} -> ${args.level}`;
      },
    });

    // 7. get_categories
    this.server.addTool({
      name: 'get_categories',
      description: '获取所有分类和标签',
      parameters: z.object({}),
      execute: async () => {
        const categories = this.loaderService.loadCategories();
        const tags = this.loaderService.loadTags();
        return (
          '分类：\n' +
          categories.map((c) => `${c.icon} ${c.name} (${c.id})`).join('\n') +
          '\n\n标签：\n' +
          tags.map((t) => `${t.icon} ${t.name} (${t.id})`).join('\n')
        );
      },
    });

    // 8. get_expiring_soon
    this.server.addTool({
      name: 'get_expiring_soon',
      description: '查看即将到期的会员（30天内）',
      parameters: z.object({}),
      execute: async () => {
        const user = this.loaderService.loadUser();
        const platforms = this.loaderService.loadPlatforms();
        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 86400000);

        const expiring = user.memberships
          .filter((m) => {
            if (!m.expires) return false;
            const exp = new Date(m.expires);
            return exp <= in30 && exp >= now;
          })
          .map((m) => {
            const p = platforms.find((pp) => pp.platform_id === m.platform_id);
            return `${p?.platform || m.platform_id} (${m.level}) - 到期: ${m.expires}`;
          });

        return expiring.length > 0
          ? '即将到期的会员：\n' + expiring.join('\n')
          : '暂无即将到期的会员';
      },
    });
  }
}
