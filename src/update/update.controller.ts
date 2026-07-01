import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UpdateService } from './update.service';
import type { BenefitPreview } from '../common/types';

@Controller('api/updateBenefits')
export class UpdateController {
  constructor(private readonly updateService: UpdateService) {}

  /** 获取平台列表（前端展示用） */
  @Get('platforms')
  getPlatforms() {
    return this.updateService.getPlatforms();
  }

  /** 获取任务状态 */
  @Get('task/:taskId')
  getTask(@Param('taskId') taskId: string) {
    const task = this.updateService.getTask(taskId);
    if (!task) return { error: 'Task not found' };
    return task;
  }

  /** 触发 mimo 生成权益预览（SSE 流式返回） */
  @Post()
  async generatePreviews(@Body() body: { platforms?: string[] }, @Res() res: Response) {
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const task = await this.updateService.generatePreviewsStreaming(
      body?.platforms,
      // onPlatformStart
      (platform, index, total) => {
        send('platform_start', { platform, index, total });
      },
      // onChunk
      (text) => {
        send('chunk', { text });
      },
    );

    // 发送最终结果
    send('done', {
      task_id: task.task_id,
      status: task.status,
      results: task.results,
      error: task.error,
    });
    res.end();
  }

  /** 确认某个平台的权益变更 */
  @Post('confirm')
  confirmPlatform(
    @Body()
    body: {
      task_id: string;
      platform_id: string;
      benefits: BenefitPreview[];
    },
  ) {
    return this.updateService.confirmPlatform(body.task_id, body.platform_id, body.benefits);
  }
}
