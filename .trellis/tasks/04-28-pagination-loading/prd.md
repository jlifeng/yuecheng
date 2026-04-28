# 分页加载功能

## Goal

为列表页面添加分页加载功能，提升用户体验和数据加载效率。

## Status: ✅ 已完成

## 需要分页的页面

### 商家端
- [x] `pages/provider/workbench.vue` - 待报价需求列表
- [x] `pages/provider/orders.vue` - 我的订单列表

### 乘客端
- [x] `pages/passenger/orders.vue` - 我的订单列表

### 服务层改造
- [x] `services/provider.ts` - fetchPendingDemands 支持分页
- [x] `services/provider.ts` - fetchQuotedBids 支持分页
- [x] `services/provider.ts` - fetchOngoingOrders 支持分页
- [x] `services/provider.ts` - fetchMerchantOrders 支持分页
- [x] `services/passenger.ts` - fetchMyOrders 支持分页

## 实现内容

### 分页参数
```typescript
// 服务层函数签名
export const fetchPendingDemands = async (
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: any[]; hasMore: boolean }>
```

### 页面实现
- 使用 `scroll-view` 组件的 `@scrolltolower` 事件触发加载
- 维护 `page` 和 `hasMore` 状态
- 防止重复加载（loading 状态控制）

## Acceptance Criteria

- [x] 商家端工作台支持分页加载
- [x] 商家端订单列表支持分页加载
- [x] 乘客端订单列表支持分页加载
- [x] 加载状态提示
- [x] 没有更多数据提示

## Technical Notes

- Supabase REST API 使用 `offset` 和 `limit` 参数实现分页
- 小程序使用 `scroll-view` 组件的 `@scrolltolower` 事件触发加载
- 注意防抖处理，避免重复请求
- pageSize 默认为 20 条
