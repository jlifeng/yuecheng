# 悦途 (YueCheng) - 商务车接待平台

一个专注于商务车接待服务的供需对接平台，包含小程序端、管理后台和后端 API。

## 项目结构

```
├── luxeway-app/       # uni-app 小程序（乘客端 + 商家端）
├── yuecheng-admin/    # Vue 3 管理后台
├── yuecheng-api/      # NestJS 后端 API
└── docs/              # 项目文档
```

## 核心功能

### 乘客端
- 发布用车需求（出发地、目的地、时间、人数）
- 查看商家报价列表，比价选单
- 行程状态追踪
- 订单管理与评价

### 商家端
- 车队管理（队长/司机分级权限）
- 接单报价
- 行程执行状态更新
- 发票上传

### 平台管理后台
- 商家审核
- 订单监管
- 数据统计

## 技术栈

| 模块 | 技术栈 |
|------|--------|
| 小程序 | uni-app + Vue 3 + TypeScript |
| 管理后台 | Vue 3 + Vite |
| 后端 API | NestJS + TypeScript |
| 数据库 | PostgreSQL |
| 地图服务 | 腾讯地图 |

## 快速开始

### 小程序 (luxeway-app)

```bash
cd luxeway-app
npm install

# 开发调试 - 使用 HBuilderX 运行到微信开发者工具
# 或命令行：
npm run dev:mp-weixin

# 生产构建
npm run build:mp-weixin
```

### 管理后台 (yuecheng-admin)

```bash
cd yuecheng-admin
npm install
npm run dev
```

### 后端 API (yuecheng-api)

```bash
cd yuecheng-api
npm install
npm run start:dev
```

## 业务模式

**乘客发布需求 → 商家竞价/抢单 → 线下交易结算**

- 平台只做信息撮合，不涉及资金结算
- 费用线下结算，平台提供发票流转辅助功能

## 许可证

MIT