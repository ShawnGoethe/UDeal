import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoaderService } from '../data/loader.service';
import { WriterService } from '../data/writer.service';
import type { BenefitPreview, Platform, PlatformUpdateResult, UpdateTask } from '../common/types';

const BENEFIT_SCHEMA = `{
  "id": "string (英文短横线格式，如 jd-plus-free-shipping)",
  "name": "string (权益名称)",
  "tags": ["string (标签数组)"],
  "type": "free 或 paid",
  "description": "string (权益描述)",
  "level_details": { "等级名": { "times": "次数", "period": "周期", "note": "备注" } },
  "redeem_time": "string (兑换时间)",
  "limit": "string 或 null (限制说明)",
  "tips": "string (使用提示)",
  "action": "add 或 update 或 remove",
  "platform_id": "string (平台ID，如 jd, meituan, taobao-88vip)"
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
  ): Promise<{ ok: boolean; added: number; updated: number; removed: number }> {
    const task = this.tasks.get(taskId);
    if (!task) return { ok: false, added: 0, updated: 0, removed: 0 };

    const result = this.writer.mergeBenefits(platformId, benefits);

    // 更新 task 中该平台的状态
    const taskResult = task.results.find((r) => r.platform_id === platformId);
    if (taskResult) {
      taskResult.benefits = benefits;
    }

    return { ok: true, ...result };
  }

  /**
   * 生成权益预览。
   * - 有备注：跳过平台循环，一次调用直接生成
   * - 无备注：逐平台调用生成
   */
  async generatePreviewsStreaming(
    platformIds: string[] | undefined,
    notes: string | undefined,
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
      if (notes && notes.trim()) {
        // 有备注：一次调用，不限定平台
        onPlatformStart('自定义查询', 0, 1);
        this.logger.log(`Generating benefits from notes: ${notes.slice(0, 100)}`);

        const benefits = await this.callMimoWithNotes(notes, onChunk);

        // 按 platform_id 分组
        const grouped = new Map<string, BenefitPreview[]>();
        for (const b of benefits) {
          const pid = (b as any).platform_id || 'unknown';
          if (!grouped.has(pid)) grouped.set(pid, []);
          grouped.get(pid)!.push(b);
        }

        for (const [platformId, platformBenefits] of grouped) {
          const platform = (await this.loader.loadPlatforms()).find(p => p.platform_id === platformId);
          task.results.push({
            platform_id: platformId,
            platform: platform?.platform || platformId,
            benefits: platformBenefits,
          });
        }

        // 如果没有 platform_id 字段，放到 "自定义" 分组
        if (task.results.length === 0 && benefits.length > 0) {
          task.results.push({
            platform_id: 'custom',
            platform: '自定义',
            benefits,
          });
        }
      } else {
        // 无备注：逐平台生成（原逻辑）
        const allPlatforms = await this.loader.loadPlatforms();
        const targets = platformIds?.length
          ? allPlatforms.filter((p) => platformIds.includes(p.platform_id))
          : allPlatforms;

        for (let i = 0; i < targets.length; i++) {
          const platform = targets[i];
          onPlatformStart(platform.platform, i, targets.length);
          this.logger.log(`Generating benefits for ${platform.platform} (${platform.platform_id})`);

          const benefits = await this.callMimoForPlatform(platform, onChunk);
          task.results.push({
            platform_id: platform.platform_id,
            platform: platform.platform,
            benefits,
          });
        }
      }

      task.status = 'done';
      this.logger.log(`Task ${task.task_id} completed, ${task.results.length} platform(s)`);
    } catch (err: any) {
      task.status = 'error';
      task.error = err.message;
      this.logger.error(`Task ${taskId} failed`, err.stack);
    }

    return task;
  }

  // ---- private ----

  /** 基于备注生成（不限平台） */
  private async callMimoWithNotes(
    notes: string,
    onChunk: (text: string) => void,
  ): Promise<BenefitPreview[]> {
    const allPlatforms = await this.loader.loadPlatforms();
    const platformList = allPlatforms.map(p => `- ${p.platform} (${p.platform_id})`).join('\n');

    const prompt = `你是一个中国互联网会员权益数据专家。用户需要你帮忙查找和整理特定的会员权益信息。

## 用户需求
${notes}

## 可用平台
${platformList}

## 输出格式
请返回一个 JSON 数组，每条权益的结构：
${BENEFIT_SCHEMA}

## 要求
1. 根据用户需求，查找对应平台的相关权益
2. 信息必须真实准确，不要编造
3. 每条权益要包含 platform_id 字段，标识属于哪个平台
4. tags 从以下标签中选择：外卖、快递、视频、音乐、出行、酒店、餐饮、购物、娱乐、生活服务、金融、健康、教育、游戏、社交
5. action 统一用 "add"
6. 仅输出 JSON 数组，不要任何其他文字`;

    return this.callMimo(prompt, onChunk);
  }

  /** 为单个平台生成权益 */
  private async callMimoForPlatform(
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

    return this.callMimo(prompt, onChunk);
  }

  /** 调用 mimo API 的通用方法 */
  private async callMimo(
    prompt: string,
    onChunk: (text: string) => void,
  ): Promise<BenefitPreview[]> {
    // 运行时读取环境变量（避免模块加载时 ConfigModule 还没初始化）
    const baseUrl = process.env.MIMO_BASE_URL || '';
    const apiKey = process.env.MIMO_API_KEY || '';
    const model = process.env.MIMO_MODEL || 'mimo-v2.5';

    if (!baseUrl || !apiKey) {
      throw new Error('MIMO_BASE_URL 或 MIMO_API_KEY 未配置，请检查 .env 文件');
    }

    const apiUrl = `${baseUrl}/chat/completions`;

    // 日志：输出调用信息
    this.logger.log(`--- MIMO API Call ---`);
    this.logger.log(`URL: ${apiUrl}`);
    this.logger.log(`Model: ${model}`);
    this.logger.log(`API Key: ${apiKey.slice(0, 8)}...`);
    this.logger.log(`Prompt length: ${prompt.length} chars`);
    this.logger.log(`Prompt preview: ${prompt.slice(0, 200)}...`);

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
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
      this.logger.error(`MIMO API error ${res.status}: ${text}`);
      this.logger.error(`Request was: model=${model}, url=${apiUrl}`);
      throw new Error(`mimo API error ${res.status}: ${text.slice(0, 200)}`);
    }

    // 流式读取 SSE
    let fullText = '';
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    const body: any = res.body;
    if (!body) {
      throw new Error('mimo API returned empty body');
    }

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
      const text = await res.text();
      fullText = text;
    }

    this.logger.log(`MIMO response length: ${fullText.length} chars`);
    this.logger.log(`MIMO response preview: ${fullText.slice(0, 300)}`);

    // 从累积文本中提取 JSON
    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      this.logger.warn(`mimo returned non-JSON: ${fullText.slice(0, 500)}`);
      throw new Error(`AI 返回内容无法解析为 JSON，原始内容: ${fullText.slice(0, 300)}`);
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as BenefitPreview[];
      return parsed.map((b) => ({
        ...b,
        action: b.action || 'add',
      }));
    } catch (e: any) {
      this.logger.error(`Failed to parse JSON: ${e.message}`);
      throw new Error(`JSON 解析失败: ${e.message}，原始内容: ${jsonMatch[0].slice(0, 300)}`);
    }
  }
}
