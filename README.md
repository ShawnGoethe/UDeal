# UDeal - 会员权益查询工具

聚合多平台会员权益，统一查询、搜索、对比。支持 REST API 和 MCP 协议，可接入 AI 助手。

## 功能特性

- 🔍 **权益搜索** — 关键词 + 标签/平台/类型筛选
- 📋 **平台权益** — 按平台列出所有权益
- 👤 **我的权益** — 根据持有的会员自动匹配可用权益
- ⚖️ **跨平台对比** — 同类权益跨平台对比
- ✏️ **数据管理** — 新增权益、更新会员信息
- 🔔 **到期提醒** — 查看 30 天内即将到期的会员
- 🌐 **可视化主页** — 内置 Web 界面，直观浏览权益
- 🔌 **MCP 协议** — 支持 Claude Desktop 等 AI 工具接入

## 已收录平台

| 平台 | 等级 | 说明 |
|------|------|------|
| 美团 | 普通 → 黑钻 | 洁牙、光子嫩肤、保洁、充电宝、生日礼、美发、机场快速通道、芒果视频 |
| 淘宝 88VIP | 88VIP | — |
| 京东 PLUS | PLUS | — |
| 携程 | — | — |
| 银联 | — | — |
| 12306 | — | — |
| 支付宝 | — | — |
| 喜茶 | — | — |

## 技术栈

- **框架:** NestJS 11
- **协议:** REST API + MCP (FastMCP)
- **数据:** JSON 文件存储
- **语言:** TypeScript

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务（无缓存，修改数据后立即生效）
npm run dev

# 启动 MCP stdio 模式
npm run dev:stdio
```

开发服务默认端口 `3001`，可通过 `MCP_PORT` 环境变量修改。

### 生产构建

```bash
npm run build
npm start
```

启动后：
- 主页: `http://localhost:3000`
- API: `http://localhost:3000/api/benefits`
- MCP: `http://localhost:3001/mcp`

## 部署到 Render

本项目已配置 `render.yaml`，支持一键部署：

1. **Fork 或 Push** 代码到 GitHub
2. 登录 [render.com](https://render.com)，连接 GitHub 仓库
3. **New → Blueprint** → 选择仓库，Render 自动读取 `render.yaml`
4. 点击 **Apply** 完成部署

**自动部署：** push 到 `main` 分支会自动触发重新构建和部署。

> ⚠️ 免费层容器休眠后文件会恢复到部署时的状态，通过 API 写入的数据不会持久化。

## 部署到 Cloudflare Pages（纯静态）

如果只需要展示页面（不需要 MCP/API），可以部署到 Cloudflare Pages，完全免费、无限请求：

```bash
# 构建静态页面（数据嵌入 HTML）
npm run build:static

# 输出目录: dist-site/index.html
```

**部署步骤：**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. 选择 **Pages** → **Upload assets**
3. 上传 `dist-site/` 目录
4. 完成，分配 `xxx.pages.dev` 域名

**自动部署（GitHub 集成）：**

1. 在 Cloudflare Pages 中 **Connect to Git**
2. 选择 GitHub 仓库 `ShawnGoethe/UDeal`
3. 配置：
   - **Build command:** `npm run build:static`
   - **Build output directory:** `dist-site`
4. 以后 push 到 `main` 自动部署

> ⚠️ 纯静态版本数据在构建时冻结，更新数据需重新构建部署（push 代码即可触发）。

## HTTP API

基础路径: `/api/benefits`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取所有分类 |
| GET | `/api/tags` | 获取所有标签 |
| GET | `/api/platforms` | 获取所有平台 |
| GET | `/api/platforms/:id` | 获取某平台权益 |
| GET | `/api/benefits` | 查询权益（支持 tag/platform/type 筛选） |
| GET | `/api/benefits/search?q=xxx` | 搜索权益 |
| GET | `/api/benefits/my` | 获取用户可用权益 |
| GET | `/api/benefits/:id` | 获取单个权益详情 |

### 示例

```bash
# 搜索洁牙权益
curl "http://localhost:3001/api/benefits/search?q=洁牙"

# 筛选美团免费权益
curl "http://localhost:3001/api/benefits?platform=meituan&type=free"

# 查看我的权益
curl "http://localhost:3001/api/benefits/my"

# 组合筛选
curl "http://localhost:3001/api/benefits?tag=dental-cleaning&type=free"
```

## MCP Tools

| 工具 | 说明 |
|------|------|
| `search_benefits` | 搜索权益，支持 tag/platform/type 筛选 |
| `list_platform_benefits` | 列出某平台全部权益 |
| `get_my_benefits` | 根据用户会员推荐权益 |
| `compare_benefits` | 跨平台对比同一权益 |
| `add_benefit` | 新增/更新权益 |
| `update_membership` | 更新用户会员状态 |
| `get_categories` | 获取分类和标签 |
| `get_expiring_soon` | 即将到期的权益提醒 |

### MCP 配置

**HTTP Stream 模式（推荐，支持远程）：**

```json
{
  "mcpServers": {
    "udeal": {
      "url": "https://your-app.onrender.com/mcp"
    }
  }
}
```

**Stdio 模式（本地）：**

```json
{
  "mcpServers": {
    "udeal": {
      "command": "node",
      "args": ["path/to/UDeal/dist/mcp/stdio.js"]
    }
  }
}
```

## 开发与生产环境差异

| | 开发 (`npm run dev`) | 生产 (`npm start`) |
|---|---|---|
| NODE_ENV | `development` | `production` |
| 缓存 | 每次查询清缓存，实时读磁盘 | 内存缓存，写操作后清除 |
| 热更新 | 修改 JSON 文件后立即生效 | 需重启服务 |

## 项目结构

```
UDeal/
├── data/                        # 数据文件
│   ├── platforms/               # 各平台权益数据
│   ├── categories.json          # 分类定义
│   ├── tags.json                # 标签定义
│   └── user.json                # 用户会员信息
├── src/
│   ├── main.ts                  # 入口
│   ├── app.module.ts            # 根模块
│   ├── common/types.ts          # 类型定义
│   ├── data/                    # 数据层（读写 + 缓存）
│   │   ├── loader.service.ts
│   │   └── writer.service.ts
│   ├── benefits/                # 权益模块
│   │   ├── benefits.controller.ts
│   │   └── benefits.service.ts
│   ├── platforms/               # 平台模块
│   ├── categories/              # 分类模块
│   ├── home/                    # 主页
│   └── mcp/                     # MCP Server
│       ├── mcp.service.ts
│       └── stdio.ts
├── render.yaml                  # Render 部署配置
└── package.json
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | HTTP 服务端口 |
| `MCP_PORT` | 3001 | MCP 服务端口 |
| `NODE_ENV` | — | `production` 启用缓存，其他值禁用缓存 |

## TODO

### ✅ 已完成

- [x] 项目初始化
- [x] 项目静态搭建（Cloudflare Pages 部署）

### 📋 待做

- [ ] 补充多平台数据（银联、支付宝、喜茶、携程、12306 等）
- [ ] MCP 接入（Claude Desktop 等 AI 工具对接）
- [ ] 智能化添加新优惠（自然语言 / 图片 / 小红书链接解析）
- [ ] 智能过期提醒 + 智能标记已使用次数

## License

MIT
