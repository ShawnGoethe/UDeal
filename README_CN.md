# UDeal 🎫

一站式会员权益管理工具，帮你不错过每一个羊毛。

## 功能特性

- 📋 **权益查询** - 浏览各平台会员权益，支持搜索、标签、平台多维度筛选
- 🤖 **AI 新增权益** - 使用 AI 自动生成权益数据，一键导入
- 👥 **用户管理** - 管理系统用户（管理员/供应商）
- 🔌 **API 接入** - 支持 CLI 命令和 System Prompt 两种方式接入 AI Agent

## 支持平台

淘宝88VIP、美团黑金、京东PLUS、喜茶、银联、12306、支付宝、携程

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 生产部署

```bash
npm run build
npm start
```

## 页面说明

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 权益浏览、搜索、筛选 |
| 管理后台 | `/admin` | 用户管理、权益管理、AI 新增权益 |

## API 接口

### 权益查询

```
GET /api/benefits              # 获取所有权益
GET /api/benefits?platform=meituan  # 按平台筛选
GET /api/benefits?type=free         # 按类型筛选
GET /api/benefits?tag=dental-cleaning  # 按标签筛选
GET /api/platforms             # 获取所有平台
GET /api/tags                  # 获取所有标签
```

### 管理接口

```
GET    /admin/users            # 获取用户列表
POST   /admin/users            # 新增用户
PUT    /admin/users/:id        # 更新用户
DELETE /admin/users/:id        # 删除用户

GET    /admin/benefits         # 获取权益列表
POST   /admin/benefits         # 新增权益
PUT    /admin/benefits/:id     # 更新权益
DELETE /admin/benefits/:id     # 删除权益
```

### AI 更新接口

```
GET  /api/updateBenefits/platforms   # 获取可更新平台
POST /api/updateBenefits             # 触发 AI 生成（SSE 流式）
POST /api/updateBenefits/confirm     # 确认提交权益
```

## 技术栈

- **后端**: NestJS + TypeScript
- **前端**: 原生 HTML/CSS/JS
- **数据**: JSON 文件存储

## 项目结构

```
UDeal/
├── data/                  # 数据文件
│   ├── platforms/         # 平台权益数据
│   ├── users.json         # 系统用户数据
│   ├── tags.json          # 标签数据
│   └── categories.json    # 分类数据
├── public/                # 静态页面
│   ├── index.html         # 首页
│   └── admin.html         # 管理后台
├── src/                   # 源代码
│   ├── admin/             # 管理模块
│   ├── benefits/          # 权益模块
│   ├── common/            # 公共类型
│   ├── data/              # 数据服务
│   ├── update/            # AI 更新模块
│   └── main.ts            # 入口文件
└── package.json
```

## License

MIT
