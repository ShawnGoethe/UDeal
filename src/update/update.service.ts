import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoaderService } from '../data/loader.service';
import { WriterService } from '../data/writer.service';
import type { BenefitPreview, Platform, PlatformUpdateResult, UpdateTask } from '../common/types';

const MIMO_BASE_URL = process.env.MIMO_BASE_URL || '';
const MIMO_API_KEY = process.env.MIMO_API_KEY || '';
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5';

const BENEFIT_SCHEMA = `{
  "id": "string (英文短横线格式，如 jd-plus-free-shipping)",
  "name": "string (权益名称)",
  "category": "string (分类：购物/出行/餐饮/娱乐/生活/金融)",
  "tags": ["string (标签数组)"],
  "type": "free 或 paid",
  "description": "string (权益描述)",
  "level_details": { "等级名": { "times": "次数", "period": "周期", "note": "备注" } },
  "redeem_time": "string (兑换时间)",
  "limit": "string 或 null (限制说明)",
  "tips": "string (使用提示)",
  "action": "add 或 update 或 remove"
}`;

@Injectable()
export class UpdateService {
  private readonly logger = new Logger(UpdateService.name);
  private tasks = new Map<string, UpdateTask>();

  constructor(
    private readonly loader: LoaderService,
    private readonly writer: WriterService,
  ) {}

  /** 获取所有平台的基础信息（不含 benefits） */
  async getPlatforms(): Promise<Pick<Platform, 'platform' | 'platform_id' | 'levels'>[]> {
    const platforms = await this.loader.loadPlatforms();
    return platforms.map((p) => ({
      platform: p.platform,
      platform_id: p.platform_id,
      levels: p.levels,
    }));
  }

  /** 获取任务状态 */
  getTask(taskId: string): UpdateTask | undefined {
    return this.tasks.get(taskId);
  }

  /** 确认某个平台的权益并写入 */
  async confirmPlatform(
    taskId: string,
    platformId: string,
    benefits: BenefitPreview[],
  ): Promise<{ ok: boolean; count: number }> {
    const task = this.tasks.get(taskId);
    if (!task) return { ok: false, count: 0 };

    const count = await this.writer.replaceBenefits(platformId, benefits);

    // 更新 task 中该平台的状态
    const result = task.results.find((r) => r.platform_id === platformId);
    if (result) {
      result.benefits = benefits;
    }

    return { ok: true, count };
  }

  /**
   * 逐平台调用 mimo 生成权益，通过回调实时返回每个平台的结果。
   * 返回最终的 UpdateTask。
   */
  async generatePreviewsStreaming(
    platformIds: string[] | undefined,
    onPlatformStart: (platform: string, index: number, total: number) => void,
    onChunk: (text: string) => void,
  ): Promise<UpdateTask> {
    const taskId = randomUUID();
    const task: UpdateTask = {
      task_id: taskId,
      status: 'running',
      results: [],
    };
    this.tasks.set(taskId, task);

    try {
      const allPlatforms = await this.loader.loadPlatforms();
      const targets = platformIds?.length
        ? allPlatforms.filter((p) => platformIds.includes(p.platform_id))
        : allPlatforms;

      for (let i = 0; i < targets.length; i++) {
        const platform = targets[i];
        onPlatformStart(platform.platform, i, targets.length);
        this.logger.log(`Generating benefits for ${platform.platform} (${platform.platform_id})`);

        const benefits = await this.callMimoStreaming(platform, onChunk);
        task.results.push({
          platform_id: platform.platform_id,
          platform: platform.platform,
          benefits,
        });
      }

      task.status = 'done';
      this.logger.log(`Task ${task.task_id} completed`);
    } catch (err: any) {
      task.status = 'error';
      task.error = err.message;
      this.logger.error(`Task ${taskId} failed`, err.stack);
    }

    return task;
  }

  // ---- private ----

  private async callMimoStreaming(
    platform: Platform,
    onChunk: (text: string) => void,
  ): Promise<BenefitPreview[]> {
    const existingSummary =
      platform.benefits.length > 0
        ? platform.benefits
            .map(
              (b) =>
                `- ${b.name} (${b.id}): ${b.description} [${b.type}] tags: ${b.tags.join(',')} | 等级: ${Object.keys(b.level_details).join(',')}`,
            )
            .join('\n')
        : '暂无数据，需要从零开始收集';

    const prompt = `你是一个中国互联网会员权益数据专家。你的任务是为「${platform.platform}」平台整理当前最新、最准确的会员权益信息。

## 平台信息
- 平台名称：${platform.platform}
- 会员等级：${platform.levels.join('、')}

## 已有权益（可能过时，供参考和去重）：
${existingSummary}

## 输出格式
请返回一个 JSON 数组，每条权益的结构：
${BENEFIT_SCHEMA}

## 具体要求

### 数据质量
1. 信息必须真实准确，不要编造不存在的权益
2. 每条权益的 description 要具体说明权益内容和使用方式，不要笼统
3. level_details 要准确对应各会员等级的差异化权益
4. tags 要从以下标签中选择：外卖、快递、视频、音乐、出行、酒店、餐饮、购物、娱乐、生活服务、金融、健康、教育、游戏、社交
5. redeem_time 说明兑换/领取方式（如"APP内领取"、"自动生效"、"每月1号"等）
6. limit 说明限制条件（如"每月1次"、"仅限指定门店"等），无限制填 null
7. tips 补充使用注意事项
8. 更新时间一个月内的权益不更新
9. 不要添加过于细节的羊毛，比如专属客服，新品优先购

### 分类规则
- type: "free" = 会员免费享受的权益（如免费配送、免费退换货）
- type: "paid" = 需要额外付费或积分兑换的权益（如特价商品、积分兑换）

### action 标记
- 已有权益仍然有效 → action: "update"（保留原 id）
- 新发现的权益 → action: "add"
- 已下架/不再有效的权益 → action: "remove"

### 数量要求
- 尽可能全面，至少收集 8-15 条核心权益
- 涵盖该平台的主要会员权益场景

## 输出规范
- 仅输出 JSON 数组，不要包含任何其他文字、解释或 markdown 标记
- 确保 JSON 格式正确，可被直接解析`;

    const res = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是会员权益数据专家。只输出 JSON 数组，不要任何其他文字。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`mimo API error ${res.status}: ${text}`);
    }

    // 流式读取 SSE（兼容 Node.js 和浏览器的 stream 类型）
    let fullText = '';
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    const body: any = res.body;
    if (!body) {
      throw new Error('mimo API returned empty body');
    }

    // 使用 async iterator，兼容 Node.js Readable 和 web ReadableStream
    try {
      for await (const chunk of body) {
        const bytes =
          chunk instanceof Buffer ? chunk : Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        buffer += decoder.decode(bytes, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;

          // 只处理 content delta 事件
          if (currentEvent && currentEvent !== 'message') {
            currentEvent = '';
            continue;
          }

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk(delta);
            }
          } catch {
            // 跳过无法解析的行
          }
          currentEvent = '';
        }
      }
    } catch (streamErr: any) {
      this.logger.error(`Stream read error: ${streamErr.message}`);
      // 降级：尝试一次性读取
      const text = await res.text();
      fullText = text;
    }

    // 从累积文本中提取 JSON
    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      this.logger.warn(
        `mimo returned non-JSON for ${platform.platform_id}: ${fullText.slice(0, 300)}`,
      );
      return [];
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as BenefitPreview[];
      return parsed.map((b) => ({
        ...b,
        action: b.action || 'add',
      }));
    } catch (e) {
      this.logger.error(`Failed to parse mimo response for ${platform.platform_id}`, e);
      return [];
    }
  }
}
