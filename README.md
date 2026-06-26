# UDeal - 会员权益 MCP Server

追踪和管理各平台会员权益，帮你薅尽每一根羊毛 🐑

## 支持平台

| 平台 | 会员等级 |
|------|---------|
| 美团 | 黑金会员、黑钻会员 |
| 京东 | PLUS |
| 淘宝 | 88VIP |
| 携程 | 黄金/铂金/钻石 |
| 12306 | 铁路会员 |
| 喜茶 | 喜茶星球 |
| 支付宝 | 会员等级 |
| 银联 | 钻石卡 |

## MCP Tools

| Tool | 功能 |
|------|------|
| `search_benefits` | 按关键词搜索权益 |
| `list_platform_benefits` | 列出某平台全部权益 |
| `get_my_benefits` | 根据用户会员推荐权益 |
| `compare_benefits` | 跨平台对比同一权益 |
| `add_benefit` | 新增/更新权益 |
| `update_membership` | 更新用户会员状态 |
| `get_categories` | 获取权益分类列表 |
| `get_expiring_soon` | 即将到期的权益提醒 |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 编译
npm run build

# 运行
npm start
```

## 配置 MCP

在 Claude Code 的 `.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "udeal": {
      "command": "node",
      "args": ["path/to/UDeal/dist/index.js"]
    }
  }
}
```

## 数据维护

权益数据存放在 `data/` 目录下的 JSON 文件中，可直接编辑更新：

- `data/platforms/*.json` - 各平台权益
- `data/categories.json` - 权益分类
- `data/user.json` - 用户会员信息

## License

MIT
