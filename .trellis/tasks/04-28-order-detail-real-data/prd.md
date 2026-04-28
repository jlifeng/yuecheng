# 订单详情页真实数据

## Goal

订单详情页从数据库加载真实数据，替换 Mock 数据。

## Status: ✅ 已完成

## Requirements

- [x] 修改 `fetchOrderDetail` 从数据库查询
- [x] 关联查询报价信息、商家信息
- [x] 生成订单时间线
- [x] 展示费用明细
- [x] 重构订单详情页 UI（Uber 风格）

## 实现内容

**文件**: `luxeway-app/services/passenger.ts`

```typescript
export const fetchOrderDetail = async (demandId: string): Promise<PassengerOrderDetail> => {
  // 1. 查询 demands 表获取需求信息
  // 2. 查询 bids 表获取已接受的报价
  // 3. 查询 merchants 表获取商家信息
  // 4. 构建订单详情返回
}
```

**文件**: `luxeway-app/pages/order/detail.vue`
- 重构为 Uber 极简黑白风格
- 展示行程信息、司机信息、时间线、费用明细

**文件**: `luxeway-app/types/order.ts`
- 更新类型定义，新增 `DemandStatus`、`PassengerTimelineItem` 等

## Acceptance Criteria

- [x] 订单详情页展示真实数据
- [x] 司机信息、行程信息、费用明细正确显示
- [x] 时间线根据订单状态动态生成
