import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { LoaderService } from './loader.service';
import type { Benefit, BenefitPreview, UserMembership, SystemUser } from '../common/types';

const DATA_DIR = join(__dirname, '../../data');
const USERS_FILE = join(DATA_DIR, 'users.json');

@Injectable()
export class WriterService {
  constructor(private readonly loader: LoaderService) {}

  addBenefit(platformId: string, benefit: Omit<Benefit, 'active' | 'last_updated'>): void {
    const filePath = join(DATA_DIR, 'platforms', `${platformId}.json`);
    const platform = JSON.parse(readFileSync(filePath, 'utf-8'));

    const idx = platform.benefits.findIndex((b: Benefit) => b.id === benefit.id);
    const entry: Benefit = {
      ...benefit,
      active: true,
      last_updated: new Date().toISOString().split('T')[0],
    };

    if (idx >= 0) {
      platform.benefits[idx] = entry;
    } else {
      platform.benefits.push(entry);
    }

    writeFileSync(filePath, JSON.stringify(platform, null, 2), 'utf-8');
    this.loader.clearCache();
  }

  mergeBenefits(platformId: string, previews: BenefitPreview[]): { added: number; updated: number; removed: number } {
    const filePath = join(DATA_DIR, 'platforms', `${platformId}.json`);
    const platform = JSON.parse(readFileSync(filePath, 'utf-8'));
    const today = new Date().toISOString().split('T')[0];

    let added = 0, updated = 0, removed = 0;

    for (const preview of previews) {
      const { action, ...data } = preview;
      const idx = platform.benefits.findIndex((b: Benefit) => b.id === data.id);

      if (action === 'remove') {
        // 删除：移除已有权益
        if (idx >= 0) {
          platform.benefits.splice(idx, 1);
          removed++;
        }
      } else if (action === 'update') {
        // 更新：合并到已有权益
        if (idx >= 0) {
          platform.benefits[idx] = {
            ...platform.benefits[idx],
            ...data,
            active: true,
            last_updated: today,
          };
          updated++;
        } else {
          // 没找到原权益，当作新增
          platform.benefits.push({ ...data, active: true, last_updated: today } as Benefit);
          added++;
        }
      } else {
        // add：新增（如果 ID 已存在则更新）
        if (idx >= 0) {
          platform.benefits[idx] = {
            ...platform.benefits[idx],
            ...data,
            active: true,
            last_updated: today,
          };
          updated++;
        } else {
          platform.benefits.push({ ...data, active: true, last_updated: today } as Benefit);
          added++;
        }
      }
    }

    writeFileSync(filePath, JSON.stringify(platform, null, 2), 'utf-8');
    this.loader.clearCache();
    return { added, updated, removed };
  }

  updateMembership(platformId: string, level: string, since?: string, expires?: string): void {
    const filePath = join(DATA_DIR, 'user.json');
    const user = JSON.parse(readFileSync(filePath, 'utf-8'));

    const idx = user.memberships.findIndex((m: UserMembership) => m.platform_id === platformId);
    const entry: UserMembership = {
      platform_id: platformId,
      level,
      since: since || null,
      expires: expires || null,
      notes: '',
    };

    if (idx >= 0) {
      user.memberships[idx] = { ...user.memberships[idx], ...entry };
    } else {
      user.memberships.push(entry);
    }

    writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf-8');
    this.loader.clearCache();
  }

  removeMembership(platformId: string): void {
    const filePath = join(DATA_DIR, 'user.json');
    const user = JSON.parse(readFileSync(filePath, 'utf-8'));
    user.memberships = user.memberships.filter((m: UserMembership) => m.platform_id !== platformId);
    writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf-8');
    this.loader.clearCache();
  }

  updateBenefit(platformId: string, benefitId: string, updates: Partial<Benefit>): void {
    const filePath = join(DATA_DIR, 'platforms', `${platformId}.json`);
    const platform = JSON.parse(readFileSync(filePath, 'utf-8'));

    const idx = platform.benefits.findIndex((b: Benefit) => b.id === benefitId);
    if (idx >= 0) {
      platform.benefits[idx] = {
        ...platform.benefits[idx],
        ...updates,
        last_updated: new Date().toISOString().split('T')[0],
      };
      writeFileSync(filePath, JSON.stringify(platform, null, 2), 'utf-8');
      this.loader.clearCache();
    }
  }

  removeBenefit(platformId: string, benefitId: string): void {
    const filePath = join(DATA_DIR, 'platforms', `${platformId}.json`);
    const platform = JSON.parse(readFileSync(filePath, 'utf-8'));
    platform.benefits = platform.benefits.filter((b: Benefit) => b.id !== benefitId);
    writeFileSync(filePath, JSON.stringify(platform, null, 2), 'utf-8');
    this.loader.clearCache();
  }

  // ========== 系统用户管理 ==========

  private loadUsers(): SystemUser[] {
    if (!existsSync(USERS_FILE)) {
      writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    return JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
  }

  private saveUsers(users: SystemUser[]): void {
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  }

  getUsers(): SystemUser[] {
    return this.loadUsers();
  }

  async addUser(data: Omit<SystemUser, 'id' | 'created_at' | 'last_login'>): Promise<SystemUser> {
    const users = this.loadUsers();
    const hash = await bcrypt.hash(data.password, 10);
    const user: SystemUser = {
      ...data,
      password: hash,
      id: `user_${Date.now()}`,
      created_at: new Date().toISOString(),
      last_login: null,
    };
    users.push(user);
    this.saveUsers(users);
    return user;
  }

  async updateUser(id: string, updates: Partial<Omit<SystemUser, 'id' | 'created_at'>>): Promise<boolean> {
    const users = this.loadUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx < 0) return false;
    // Hash password if it's being updated and isn't already hashed
    if (updates.password && !updates.password.startsWith('$2a$') && !updates.password.startsWith('$2b$')) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    users[idx] = { ...users[idx], ...updates };
    this.saveUsers(users);
    return true;
  }

  deleteUser(id: string): boolean {
    const users = this.loadUsers();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    this.saveUsers(filtered);
    return true;
  }
}
