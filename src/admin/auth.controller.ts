import { Controller, Post, Get, Body, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { WriterService } from '../data/writer.service';

const JWT_SECRET = process.env.JWT_SECRET || 'udeal-admin-secret-2026';
const TOKEN_EXPIRY = '7d'; // 1 week

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly writer: WriterService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const { username, password } = body;

    if (!username || !password) {
      throw new UnauthorizedException('请输入用户名和密码');
    }

    const users = this.writer.getUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('账户已被禁用');
    }

    // Verify password with bcrypt (supports both hashed and legacy plaintext)
    const stored = user.password;
    let passwordOk = false;

    if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
      // bcrypt hashed
      passwordOk = await bcrypt.compare(password, stored);
    } else {
      // Legacy plaintext — verify then upgrade to hash
      passwordOk = password === stored;
      if (passwordOk) {
        const hash = await bcrypt.hash(password, 10);
        await this.writer.updateUser(user.id, { password: hash });
      }
    }

    if (!passwordOk) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // Update last_login
    await this.writer.updateUser(user.id, { last_login: new Date().toISOString() });

    const token = jwt.sign(
      { id: user.id, username: user.username, type: user.type },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
    );

    return {
      ok: true,
      token,
      user: { id: user.id, username: user.username, type: user.type },
    };
  }

  @Get('verify')
  verify(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录');
    }

    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      return { ok: true, user: { id: decoded.id, username: decoded.username, type: decoded.type } };
    } catch {
      throw new UnauthorizedException('登录已过期');
    }
  }
}
