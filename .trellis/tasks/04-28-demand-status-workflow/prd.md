# 行程状态流转完善

## Goal

完善行程状态流转逻辑，确保各环节状态正确转换。

## Status: ✅ 已完成

## 状态流转定义

```
PENDING → BIDDING → ACCEPTED → IN_PROGRESS → COMPLETED
                  ↘ CANCELLED
```

| 状态 | 触发条件 | 说明 |
|------|----------|------|
| PENDING | 创建需求 | 需求已创建未发布 |
| BIDDING | 发布需求 | 等待商家报价 |
| ACCEPTED | 乘客选择报价 | 已确认订单 |
| IN_PROGRESS | 司机接乘客 | 行程进行中 |
| COMPLETED | 行程结束 | 订单完成 |
| CANCELLED | 取消订单 | 订单取消 |

## Requirements

- [x] acceptBid 更新 demand 状态为 ACCEPTED
- [x] 商家端"开始行程"功能（ACCEPTED → IN_PROGRESS）
- [x] 商家端"完成行程"功能（IN_PROGRESS → COMPLETED）
- [ ] 订单取消功能（Out of Scope）

## 实现内容

**新建文件**: `luxeway-app/pages/provider/order_detail.vue`
- 商家端订单详情页
- 展示乘客信息、行程信息、报价信息
- 操作按钮：开始行程、完成行程

**修改文件**: `luxeway-app/pages/provider/workbench.vue`
- 更新跳转逻辑，进行中订单跳转商家端订单详情

**修改文件**: `luxeway-app/pages.json`
- 添加 `pages/provider/order_detail` 路由

## Acceptance Criteria

- [x] 乘客选择报价后，需求状态变为 ACCEPTED
- [x] 商家开始行程后，状态变为 IN_PROGRESS
- [x] 行程完成后，状态变为 COMPLETED
- [x] 状态变更后，各端列表正确展示

## Out of Scope

- 订单取消功能（后续迭代）
