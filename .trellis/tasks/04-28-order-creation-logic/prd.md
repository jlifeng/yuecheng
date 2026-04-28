# 订单创建逻辑实现

## Goal

完善 `acceptBid` 功能，当乘客接受报价时：
1. 更新报价状态为 `ACCEPTED`
2. 更新需求状态为 `ACCEPTED`
3. 确保订单数据可被查询（通过 bids + demands 关联）

## Status: ✅ 已完成

## Requirements

- [x] 更新报价状态：`bids.status = 'ACCEPTED'`
- [x] 更新需求状态：`demands.status = 'ACCEPTED'`
- [x] 返回订单信息：包含 demand_id、bid_id

## 实现内容

**文件**: `luxeway-app/services/passenger.ts`

```typescript
export const acceptBid = async (bidId: string): Promise<{ orderId: string; demandId: string }> => {
  // 1. 查询报价信息获取 demand_id
  // 2. 更新 bids.status = 'ACCEPTED'
  // 3. 更新 demands.status = 'ACCEPTED'
  // 4. 返回 { orderId, demandId }
}
```

## Acceptance Criteria

- [x] 乘客点击"选择此报价"后，报价状态变为 ACCEPTED
- [x] 对应需求状态变为 ACCEPTED
- [x] 订单详情页可查询到完整订单信息
- [x] 商家工作台"进行中"列表显示该订单

## Technical Notes

- 使用分步更新（Supabase REST API 无事务）
- 添加了详细日志便于调试
- 错误处理：更新需求状态失败时提示数据可能不一致
