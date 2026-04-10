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
- KEY 和 SK 存在 `pages/index/index.vue:274` 中
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
- 常用颜色：
  - 主色：`#1e2023`（深灰黑）
  - 强调色：`#ff5f00`（橙色）
  - 成功色：`#3cb371`（绿色）
- 圆角统一使用 `border-radius: 12px`（卡片）或 `20px`（弹窗）
- 组件化 CSS 作用域使用 `<style scoped>`

## 依赖项

- `uni-icons`：图标组件库
- `uni-scss`：uni-app 样式库
