#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  loadPlatforms,
  loadCategories,
  loadUser,
  searchBenefits,
  getPlatformBenefits,
  getMyBenefits,
  compareBenefitAcrossPlatforms,
} from "./data/loader.js";
import { addBenefit, updateMembership } from "./data/writer.js";
import type { Benefit } from "./types.js";

const server = new McpServer({
  name: "udeal",
  version: "1.0.0",
});

// Tool: search_benefits - 按关键词搜索权益
server.tool(
  "search_benefits",
  "按关键词搜索各平台会员权益，如洁牙、体检、外卖优惠等",
  { query: z.string().describe("搜索关键词，如洁牙、体检、外卖、酒店等") },
  async ({ query }) => {
    const results = searchBenefits(query);

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: `未找到与"${query}"相关的权益。请尝试其他关键词。` }],
      };
    }

    const lines = [`🔍 搜索"${query}"找到 ${results.length} 个相关权益：\n`];

    for (const r of results) {
      const levelEntries = Object.entries(r.benefit.level_details);
      const levelInfo = levelEntries
        .map(([level, detail]) => {
          const parts: string[] = [];
          if (detail.times) parts.push(`${detail.times}次`);
          if (detail.amount) parts.push(detail.amount);
          if (detail.discount) parts.push(detail.discount);
          if (detail.period) parts.push(`/${detail.period}`);
          if (detail.note) parts.push(`(${detail.note})`);
          return `  - ${level}: ${parts.join("") || "可用"}`;
        })
        .join("\n");

      lines.push(`【${r.platform}】${r.benefit.name}`);
      lines.push(`  ${r.benefit.description}`);
      lines.push(levelInfo);
      lines.push(`  ⏰ 兑换时间: ${r.benefit.redeem_time}`);
      if (r.benefit.limit) lines.push(`  ⚠️ 限制: ${r.benefit.limit}`);
      if (r.benefit.tips) lines.push(`  💡 提示: ${r.benefit.tips}`);
      lines.push("");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool: list_platform_benefits - 列出某平台全部权益
server.tool(
  "list_platform_benefits",
  "列出指定平台的所有会员权益",
  { platform_id: z.string().describe("平台ID，如 meituan, jd, taobao-88vip, ctrip, 12306, heytea, alipay, unionpay") },
  async ({ platform_id }) => {
    const platform = getPlatformBenefits(platform_id);

    if (!platform) {
      const allPlatforms = loadPlatforms();
      const ids = allPlatforms.map((p) => `${p.platform_id}(${p.platform})`).join(", ");
      return {
        content: [{ type: "text", text: `平台"${platform_id}"不存在。可用平台: ${ids}` }],
      };
    }

    const lines = [`📋 ${platform.platform} 会员权益一览\n`];
    lines.push(`会员等级: ${platform.levels.join(", ")}\n`);
    lines.push(`共 ${platform.benefits.length} 项权益：\n`);

    for (const b of platform.benefits) {
      const status = b.active ? "✅" : "❌";
      lines.push(`${status} ${b.name} [${b.category}]`);
      lines.push(`   ${b.description}`);
      lines.push(`   ⏰ ${b.redeem_time}`);
      if (b.limit) lines.push(`   ⚠️ ${b.limit}`);
      lines.push("");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool: get_my_benefits - 根据用户会员推荐权益
server.tool(
  "get_my_benefits",
  "根据用户拥有的会员，列出所有可用权益",
  {},
  async () => {
    const results = getMyBenefits();
    const user = loadUser();

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: "暂未配置任何会员信息。请先使用 update_membership 添加您的会员。" }],
      };
    }

    const lines = [`🎯 您的会员权益一览\n`];
    lines.push(`已配置会员: ${user.memberships.map((m) => `${m.platform_id}(${m.level})`).join(", ")}\n`);
    lines.push(`共 ${results.length} 项可用权益：\n`);

    // Group by category
    const categories = loadCategories();
    const grouped = new Map<string, typeof results>();

    for (const r of results) {
      const cat = r.benefit.category;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(r);
    }

    for (const [catId, items] of grouped) {
      const cat = categories.find((c) => c.id === catId);
      lines.push(`${cat?.icon || "📌"} ${cat?.name || catId}`);
      lines.push("─".repeat(30));

      for (const r of items) {
        const detail = r.benefit.level_details[r.level];
        const parts: string[] = [];
        if (detail?.times) parts.push(`${detail.times}次`);
        if (detail?.amount) parts.push(detail.amount);
        if (detail?.discount) parts.push(detail.discount);
        if (detail?.period) parts.push(`/${detail.period}`);
        if (detail?.note) parts.push(detail.note);

        lines.push(`  • ${r.platform} - ${r.benefit.name}`);
        lines.push(`    ${parts.join(" | ") || r.benefit.description}`);
        lines.push(`    ⏰ ${r.benefit.redeem_time}`);
        if (r.benefit.limit) lines.push(`    ⚠️ ${r.benefit.limit}`);
        if (r.benefit.tips) lines.push(`    💡 ${r.benefit.tips}`);
      }
      lines.push("");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool: compare_benefits - 跨平台对比同一权益
server.tool(
  "compare_benefits",
  "跨平台对比同一权益在不同平台的差异",
  { query: z.string().describe("权益关键词，如洁牙、体检等") },
  async ({ query }) => {
    const results = compareBenefitAcrossPlatforms(query);

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: `未找到与"${query}"可对比的权益。` }],
      };
    }

    const lines = [`📊 "${query}" 跨平台对比\n`];
    lines.push("| 平台 | 权益名称 | 等级 | 具体内容 | 兑换时间 | 限制 |");
    lines.push("|------|---------|------|---------|---------|------|");

    for (const r of results) {
      const detail = r.details as Record<string, unknown>;
      const parts: string[] = [];
      if (detail.times) parts.push(`${detail.times}次`);
      if (detail.amount) parts.push(String(detail.amount));
      if (detail.discount) parts.push(String(detail.discount));
      if (detail.period) parts.push(`/${detail.period}`);
      if (detail.note) parts.push(String(detail.note));

      lines.push(
        `| ${r.platform} | ${r.benefit.name} | ${r.level} | ${parts.join("") || "可用"} | ${r.benefit.redeem_time} | ${r.benefit.limit || "无"} |`
      );
    }

    lines.push("");
    lines.push("💡 建议: 优先使用您已拥有会员的平台权益。");

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool: add_benefit - 新增/更新权益
server.tool(
  "add_benefit",
  "新增或更新某个平台的权益信息",
  {
    platform_id: z.string().describe("平台ID"),
    benefit_id: z.string().describe("权益ID，如 meituan-dental-cleaning"),
    name: z.string().describe("权益名称"),
    category: z.string().describe("分类ID: health/dining/travel/shopping/entertainment/services"),
    description: z.string().describe("权益描述"),
    redeem_time: z.string().describe("兑换时间"),
    limit: z.string().optional().describe("限制说明"),
    tips: z.string().optional().describe("使用提示"),
    level_details_json: z
      .string()
      .describe('等级详情JSON，如 {"黑金会员":{"times":1,"period":"每月"}}'),
  },
  async ({ platform_id, benefit_id, name, category, description, redeem_time, limit, tips, level_details_json }) => {
    let level_details: Record<string, unknown>;
    try {
      level_details = JSON.parse(level_details_json);
    } catch {
      return {
        content: [{ type: "text", text: "level_details_json 格式错误，请提供有效的JSON。" }],
      };
    }

    const benefit: Benefit = {
      id: benefit_id,
      name,
      category,
      description,
      level_details: level_details as Benefit["level_details"],
      redeem_time,
      limit: limit || null,
      tips: tips || "",
      active: true,
      last_updated: new Date().toISOString().split("T")[0],
    };

    const result = addBenefit(platform_id, benefit);
    return { content: [{ type: "text", text: result.message }] };
  }
);

// Tool: update_membership - 更新用户会员状态
server.tool(
  "update_membership",
  "更新用户拥有的会员信息",
  {
    platform_id: z.string().describe("平台ID，如 meituan, jd, taobao-88vip"),
    level: z.string().describe("会员等级，如 黑金会员, PLUS, 88VIP"),
    since: z.string().optional().describe("开通日期，YYYY-MM-DD格式"),
    expires: z.string().optional().describe("到期日期，YYYY-MM-DD格式"),
  },
  async ({ platform_id, level, since, expires }) => {
    const result = updateMembership(platform_id, level, since, expires);
    return { content: [{ type: "text", text: result.message }] };
  }
);

// Tool: get_categories - 获取权益分类列表
server.tool(
  "get_categories",
  "获取所有权益分类及其关键词",
  {},
  async () => {
    const categories = loadCategories();
    const platforms = loadPlatforms();

    const lines = ["📂 权益分类列表\n"];

    for (const cat of categories) {
      // Count benefits in this category
      let count = 0;
      for (const p of platforms) {
        count += p.benefits.filter((b) => b.category === cat.id && b.active).length;
      }

      lines.push(`${cat.icon} ${cat.name} (${count}项权益)`);
      lines.push(`   关键词: ${cat.keywords.join(", ")}`);
      lines.push("");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool: get_expiring_soon - 即将到期的权益提醒
server.tool(
  "get_expiring_soon",
  "查看即将到期的会员权益提醒",
  {},
  async () => {
    const user = loadUser();
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiring = user.memberships.filter((m) => {
      if (!m.expires) return false;
      const expDate = new Date(m.expires);
      return expDate <= thirtyDaysLater && expDate >= now;
    });

    if (expiring.length === 0) {
      return {
        content: [{ type: "text", text: "✅ 暂无即将到期的会员（30天内）。" }],
      };
    }

    const lines = ["⚠️ 以下会员即将到期（30天内）：\n"];

    for (const m of expiring) {
      const daysLeft = Math.ceil((new Date(m.expires!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      lines.push(`⏰ ${m.platform_id} - ${m.level}`);
      lines.push(`   到期日: ${m.expires}`);
      lines.push(`   剩余: ${daysLeft} 天`);
      lines.push("");
    }

    lines.push("💡 建议: 及时续费以继续享受权益。");

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UDeal MCP Server started");
}

main().catch(console.error);
