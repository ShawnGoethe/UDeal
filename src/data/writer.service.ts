import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
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

  replaceBenefits(platformId: string, previews: BenefitPreview[]): number {
    const filePath = join(DATA_DIR, 'platforms', `${platformId}.json`);
    const platform = JSON.parse(readFileSync(filePath, 'utf-8'));
    const today = new Date().toISOString().split('T')[0];

    const benefits: Benefit[] = previews
      .filter((p) => p.action !== 'remove')
      .map(({ action, ...rest }) => ({
        ...rest,
        active: true,
        last_updated: today,
      }));

    platform.benefits = benefits;
    writeFileSync(filePath, JSON.stringify(platform, null, 2), 'utf-8');
    this.loader.clearCache();
    return benefits.length;
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

  addUser(data: Omit<SystemUser, 'id' | 'created_at' | 'last_login'>): SystemUser {
    const users = this.loadUsers();
    const user: SystemUser = {
      ...data,
      id: `user_${Date.now()}`,
      created_at: new Date().toISOString(),
      last_login: null,
    };
    users.push(user);
    this.saveUsers(users);
    return user;
  }

  updateUser(id: string, updates: Partial<Omit<SystemUser, 'id' | 'created_at'>>): boolean {
    const users = this.loadUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx < 0) return false;
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
