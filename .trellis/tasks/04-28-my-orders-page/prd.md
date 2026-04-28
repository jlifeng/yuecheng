# 我的订单页面

## Goal

创建商家端和乘客端的历史订单页面，展示已完成/已取消的订单列表。

## Status: ✅ 已完成

## Requirements

### 乘客端
- [x] 创建 `pages/passenger/orders.vue` 订单列表页
- [x] 展示历史行程（状态为 COMPLETED、CANCELLED、ACCEPTED、IN_PROGRESS）
- [x] 点击订单跳转订单详情

### 商家端
- [x] 创建 `pages/provider/orders.vue` 订单列表页
- [x] 展示历史订单（通过 bids 关联查询已接受的报价）
- [x] 点击订单跳转商家端订单详情

### 服务层
- [x] `services/passenger.ts` 添加 `fetchMyOrders` 函数
- [x] `services/provider.ts` 添加 `fetchMerchantOrders` 函数

### 入口配置
- [x] 乘客端 `mine/mine.vue` 添加「我的订单」入口
- [x] 商家端 `provider/mine.vue` 添加「我的订单」入口
- [x] `pages.json` 添加路由配置

## 实现内容

### 新建文件

**`pages/passenger/orders.vue`**
- 乘客订单列表页
- 展示 ACCEPTED、IN_PROGRESS、COMPLETED、CANCELLED 状态的订单
- 点击跳转 `/pages/order/detail`

**`pages/provider/orders.vue`**
- 商家订单列表页
- 展示已接受的报价对应的订单
- 点击跳转 `/pages/provider/order_detail`

### 修改文件

**`services/passenger.ts`**
- 新增 `fetchMyOrders()` 函数
- 查询用户所有订单，关联 bids 表获取价格

**`services/provider.ts`**
- 新增 `fetchMerchantOrders()` 函数
- 查询商家已接受的报价，关联 demands 表

**`pages/mine/mine.vue`**
- 更新 `goToOrders()` 跳转到 `/pages/passenger/orders`

**`pages/provider/mine.vue`**
- 新增 `goToOrders()` 函数
- 更新菜单项为「我的订单」

**`pages.json`**
- 添加 `pages/passenger/orders` 路由
- 添加 `pages/provider/orders` 路由

## Acceptance Criteria

- [x] 乘客可以查看历史订单列表
- [x] 商家可以查看历史订单列表
- [x] 订单按时间倒序排列
- [x] 点击订单跳转详情页
- [x] 空状态提示

## Technical Notes

- 复用现有的订单详情页
- 状态徽章颜色：COMPLETED(灰), CANCELLED(灰), ACCEPTED(黑), IN_PROGRESS(蓝)
- 分页加载后续实现
