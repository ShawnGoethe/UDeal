import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('api')
export class SkillController {
  private skillContent: string | null = null;

  @Get('skill')
  getSkill() {
    if (!this.skillContent) {
      try {
        this.skillContent = readFileSync(join(__dirname, '../../clawhub/SKILL.md'), 'utf-8');
      } catch {
        return { error: 'SKILL.md not found' };
      }
    }
    return { content: this.skillContent };
  }
}
