# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

LuxeWay 悦途是一个基于 uni-app 框架开发的跨平台出行服务小程序，主要目标平台为微信小程序。项目采用 Vue 3 + TypeScript + Setup Script 语法。

**核心业务模式**：乘客发布用车需求 → 商家（车队/司机）报价 → 乘客选择报价完成订单。

## 目录结构

```
luxeway-app/
├── pages/
│   ├── index/              # 乘客首页
│   ├── passenger/          # 乘客端页面（发布需求、查看报价）
│   ├── provider/           # 商家端页面（工作台、报价、车队管理）
│   ├── order/              # 订单详情
│   └── mine/               # 个人中心
├── components/
│   └── CustomTabBar.vue    # 自定义底部导航栏
├── utils/
│   └── md5.js              # MD5 加密工具
├── manifest.json           # uni-app 应用配置
├── pages.json              # 页面路由配置
└── tsconfig.json           # TypeScript 配置
```

## 开发命令

### 开发调试

```bash
# 运行到微信小程序开发者工具
# 在 HBuilderX 中：运行 -> 运行到小程序模拟器 -> 微信开发者工具

# 编译小程序（命令行方式）
npm run dev:mp-weixin
```

### 生产构建

```bash
# 构建微信小程序
npm run build:mp-weixin
```

## 核心架构

### 双角色系统

项目基于 `userRole` 存储值实现双端角色切换：
- **passenger**：乘客端（默认）
- **provider**：商家/车队端

角色存储在 `uni.getStorageSync('userRole')`，应用启动时会检查角色并重定向到相应首页：
- 乘客 → `pages/index/index`
- 商家 → `pages/provider/workbench`

### 自定义 TabBar

使用 `CustomTabBar` 组件替代原生 tabBar，根据 `userRole` 动态显示不同的导航项：
- 乘客端：首页、我的
- 商家端：工作台、我的

组件接收 `current` prop 来标识当前激活状态。

### 地图集成

使用腾讯地图 WebService API 进行地址解析：
- 地图公开 Key 通过 `VITE_TENCENT_MAP_KEY` 注入；签名 SK 只能保存在服务端，禁止放入小程序。
- 使用 MD5 签名算法进行 API 认证
- 支持 GCJ-02 坐标系（火星坐标系）

### 订单流程

1. **乘客发布** (`pages/index/index.vue`)
   - 选择起点/终点
   - 选择时间范围（最早-最晚出发时间）
   - 填写人数和备注
   - 提交后跳转 `bid_list`

2. **商家报价** (`pages/provider/workbench` → `bid_input`)
   - 查看待接单列表
   - 点击报价跳转填写报价页面

3. **查看报价** (`pages/passenger/bid_list.vue`)
   - 乘客查看商家报价列表
   - 选择报价后跳转订单详情

4. **订单详情** (`pages/order/detail.vue`)
   - 展示行程详情和司机信息

## 条件编译

项目使用 uni-app 条件编译语法：
- `// #ifdef VUE3` / `// #endif`：Vue 3 环境专属代码
- `// #ifndef VUE3`：非 Vue 3 环境代码

## 页面配置

`pages.json` 中定义所有页面路由和导航栏配置：
- `navigationStyle: "custom"`：自定义导航栏（如首页）
- `enablePullDownRefresh: true`：启用下拉刷新（如工作台）

## 样式规范

- 使用 rpx 单位实现响应式布局（750rpx = 屏幕宽度）
- **Uber 极简黑白风格配色**：
  - 主色：`#000`（纯黑）
  - 辅助色：`#666`（深灰）
  - 背景：`#f5f5f5`（浅灰）
  - 进行中状态：`#3b82f6`（安全蓝）
- 圆角统一使用 `border-radius: 12rpx`（小元素）或 `48rpx`（大按钮）
- 组件化 CSS 作用域使用 `<style scoped>`
- **设计理念**：极简、功能导向、国际化、无多余装饰

## 依赖项

- `uni-icons`：图标组件库
- `uni-scss`：uni-app 样式库

---

## 行程规范文档

### 行程状态定义

行程（Demand）在整个生命周期中会经历以下状态：

| 状态码 | 状态名称 | 描述 | 用户可见 | 首页展示 |
|--------|----------|------|----------|----------|
| `PENDING` | 待发布 | 需求已创建但未正式发布 | ❌ | ❌ |
| `BIDDING` | 等待报价 | 已发布，等待商家报价 | ✅ | ✅ |
| `ACCEPTED` | 已确认 | 乘客已选择报价，等待出行 | ✅ | ✅ |
| `IN_PROGRESS` | 进行中 | 司机已接乘客，行程进行中 | ✅ | ✅ |
| `COMPLETED` | 已完成 | 行程结束，订单完成 | ✅ | ❌ |
| `CANCELLED` | 已取消 | 行程被取消 | ✅ | ❌ |

**首页展示规则**：只展示 `BIDDING`、`ACCEPTED`、`IN_PROGRESS` 三种状态，最多 3 条。

### 状态样式映射

```typescript
const statusClassMap: Record<string, string> = {
  'PENDING': 'status-pending',     // 灰色 #999
  'BIDDING': 'status-bidding',     // 黑色 #000
  'ACCEPTED': 'status-accepted',   // 黑色 #000
  'IN_PROGRESS': 'status-active',  // 安全蓝 #3b82f6
  'COMPLETED': 'status-done',      // 灰色 #999
  'CANCELLED': 'status-cancelled'  // 灰色 #999
}
```

**Uber 风格特点**：状态圆点简洁，进行中状态使用蓝色区分，其他状态统一使用黑/灰色。

### 数据结构

#### Demand（行程需求）

```typescript
interface Demand {
  id: string                    // UUID
  passenger_id: string          // 乘客用户ID
  type: 'TRANSFER' | 'CHARTER_DAY' | 'MULTI_DAY'  // 行程类型
  start_address: string         // 起点地址
  end_address: string           // 终点地址
  earliest_departure: string    // 最早出发时间 ISO格式
  latest_departure: string      // 最晚出发时间 ISO格式
  passenger_count: number       // 乘车人数
  requirements: string | null   // 备注要求
  status: DemandStatus          // 当前状态
  created_at: string            // 创建时间
}
```

#### Bid（报价）

```typescript
interface Bid {
  id: string                    // UUID
  demand_id: string             // 关联的需求ID
  provider_id: string           // 报价商家ID
  merchant_id: string           // 商家所属车队ID
  price: number                 // 报价金额
  car_model: string | null      // 车型
  car_image: string | null      // 车辆图片URL
  message: string | null        // 报价说明
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  created_at: string            // 报价时间
}
```

### API 接口

#### Supabase REST API 基础配置

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// 请求头配置
const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'  // POST时返回插入的数据
}
```

#### 乘客端接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/rest/v1/demands` | POST | 发布行程需求 |
| `/rest/v1/demands?passenger_id=eq.{userId}` | GET | 获取我的行程列表 |
| `/rest/v1/bids?demand_id=eq.{demandId}` | GET | 获取指定行程的报价列表 |
| `/rest/v1/bids?id=eq.{bidId}` | PATCH | 接受报价（更新状态为ACCEPTED） |

#### 商家端接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/rest/v1/demands?status=eq.BIDDING` | GET | 获取待报价需求列表 |
| `/rest/v1/bids` | POST | 提交报价 |
| `/rest/v1/bids?provider_id=eq.{userId}` | GET | 获取我的报价列表 |
| `/rest/v1/merchants?id=eq.{merchantId}` | GET | 获取商家信息 |

### 页面流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                         乘客端流程                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  首页(index)                                                        │
│    ├─ 选择起点/终点                                                  │
│    ├─ 选择时间范围                                                   │
│    ├─ 选择行程类型                                                   │
│    └─ 点击"确认发布行程" → submitDemand()                            │
│         │                                                           │
│         ↓                                                           │
│  报价列表(bid_list)                                                  │
│    ├─ 展示行程详情                                                   │
│    ├─ 展示商家报价列表                                               │
│    └─ 点击报价 → uni.showModal确认                                   │
│         │                                                           │
│         ↓                                                           │
│  订单详情(order/detail)                                              │
│    └─ 展示订单状态、司机信息、费用明细                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         商家端流程                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  工作台(workbench)                                                   │
│    ├─ 展示待报价需求列表                                             │
│    ├─ 城市筛选                                                       │
│    └─ 点击需求 → goToBid()                                           │
│         │                                                           │
│         ↓                                                           │
│  报价页面(bid_input)                                                 │
│    ├─ 展示需求详情                                                   │
│    ├─ 选择车辆                                                       │
│    ├─ 输入报价金额                                                   │
│    └─ 点击"确认报价" → submitBid()                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Token 刷新机制

当 API 返回 401 错误（JWT expired）时，自动刷新 token：

```typescript
// services/wechatAuth.ts
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = uni.getStorageSync('refreshToken')
  const res = await uni.request({
    url: `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    method: 'POST',
    data: { refresh_token: refreshToken },
    header: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
  })
  // 更新存储的 accessToken 和 refreshToken
}
```

刷新失败时，清除登录状态并提示用户重新登录。

### 设计规范

#### 配色系统（Uber 极简黑白风格）

```css
/* 主色系 - 黑白灰 */
--uber-black: #000         /* 主色 - 纯黑 */
--uber-gray-dark: #333     /* 深灰文字 */
--uber-gray: #666          /* 辅助灰色 */
--uber-gray-light: #999    /* 浅灰提示 */
--uber-bg: #f5f5f5         /* 背景色 */
--uber-divider: #e0e0e0    /* 分割线 */

/* 状态色 */
--uber-active: #3b82f6     /* 进行中状态 - 安全蓝 */
```

#### 关键 UI 元素

| 元素 | 样式 |
|------|------|
| 地图 | 占屏幕 1/3 高度（33vh），与内容区域一起滚动 |
| 角色切换 Tab | 固定在顶部，滚动时自动隐藏，白色半透明背景 + 黑色选中状态 |
| 定位按钮 | 白色圆形悬浮按钮（fixed定位），带阴影 |
| 底部卡片 | 白色背景，与地图一起在 scroll-view 中滚动 |
| 起终点输入 | 统一黑色圆点，灰色输入框背景 `#f5f5f5` |
| 行程类型 | 灰色背景，选中时黑色背景 + 白色文字 |
| 时间抽屉 | 从底部弹出，根据行程类型显示不同的选择方式 |
| 步进器 | 黑色边框按钮 + 中间数值显示 |
| 确认按钮 | 大号黑色圆角按钮（`height: 96rpx; border-radius: 48rpx; background: #000`） |
| 行程卡片 | 浅灰背景 `#f5f5f5` + 16rpx 圆角，卡片间距 16rpx |
| 状态徽章 | 状态文字 + 背景色，黑色/蓝色区分状态 |

#### 行程卡片设计规范

首页"进行中的行程"采用卡片形式展示，每个卡片包含：

```
┌─────────────────────────────────────┐
│  [等待报价]                    →    │  ← 状态徽章 + 右箭头
│  ● 前往 武汉天河机场                 │  ← 路线信息（小圆点 + 目的地）
│    4月11日 14:00-14:15              │  ← 时间信息
└─────────────────────────────────────┘
```

**卡片结构**：
```css
.trip-card {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.trip-status-badge {
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  color: #fff;
}

/* 状态徽章颜色 */
.status-bidding { background: #000; }      /* 等待报价 - 黑色 */
.status-accepted { background: #000; }     /* 已确认 - 黑色 */
.status-active { background: #3b82f6; }    /* 进行中 - 蓝色 */
```

**设计要点**：
- 卡片使用浅灰背景，与白色内容区形成层次感
- 状态徽章醒目，方便用户快速识别行程状态
- 路线信息简洁：小圆点 + 目的地文字
- 整体极简，无多余装饰

#### 滚动交互设计

首页采用整体滚动模式：
- 使用 `scroll-view` 包裹地图和内容区域
- 向下滚动超过 50px 时，顶部角色 Tab 自动隐藏
- 向上滚动或回到顶部时，角色 Tab 重新显示
- 过渡动画使用 `opacity + transform` 实现

```typescript
// 滚动处理
const onPageScroll = (e: any) => {
  const scrollTop = e.detail.scrollTop
  // 向下滚动 > 50px 隐藏 Tab
  if (scrollTop > 50 && scrollTop > lastScrollTop) {
    isTabHidden = true
  }
  // 向上滚动或回到顶部显示 Tab
  if (scrollTop < 30 || scrollTop < lastScrollTop - 10) {
    isTabHidden = false
  }
}
```

#### 动态导航栏标题

根据页面内容动态修改导航栏标题，使用 `uni.setNavigationBarTitle()`：

```typescript
onLoad(async (options: any) => {
  if (options?.demandId) {
    // 查看报价详情
    uni.setNavigationBarTitle({ title: '查看报价' })
    // 加载报价数据...
  } else {
    // 显示行程列表
    uni.setNavigationBarTitle({ title: '我的行程' })
    // 加载行程列表...
  }
})
```

**应用场景**：
- 同一个页面根据 URL 参数展示不同内容
- 页面内容切换时标题需要相应变化
- `pages.json` 中设置默认标题，代码中动态修改

#### 页面跳转最佳实践

**优先使用页面跳转而非页面内状态切换**，让导航栏返回按钮自然工作：

```typescript
// ✅ 推荐：使用页面跳转
const viewDemandDetail = (demand: any) => {
  if (demand.status === 'BIDDING') {
    // 跳转到报价详情页面，导航栏自动显示返回按钮
    uni.navigateTo({ url: `/pages/passenger/bid_list?demandId=${demand.id}` })
  } else {
    uni.navigateTo({ url: `/pages/order/detail?demandId=${demand.id}` })
  }
}

// ❌ 不推荐：页面内状态切换 + 手写返回按钮
const viewDemandDetail = (demand: any) => {
  currentDemand.value = demand  // 状态切换
  // 需要手动实现返回逻辑，增加复杂度
}
```

**优点**：
- 导航栏返回按钮自动工作，无需手动实现
- 页面状态独立，逻辑清晰
- 符合小程序原生交互习惯

#### 设计理念

- **极简**：无多余装饰，功能导向
- **国际化**：黑白配色，专业感强
- **全屏地图**：最大化地理信息展示
- **悬浮卡片**：底部白色卡片从地图上浮起
- **大号按钮**：操作按钮足够大，方便点击

### 文件关键位置

| 功能 | 文件路径 |
|------|----------|
| 乘客首页 | `pages/index/index.vue` |
| 报价列表 | `pages/passenger/bid_list.vue` |
| 商家工作台 | `pages/provider/workbench.vue` |
| 报价输入 | `pages/provider/bid_input.vue` |
| 乘客服务 | `services/passenger.ts` |
| 商家服务 | `services/provider.ts` |
| 微信登录 | `services/wechatAuth.ts` |
| 类型定义 | `types/provider.ts` |
