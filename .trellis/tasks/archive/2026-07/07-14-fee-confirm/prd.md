# feature: 费用录入与乘客确认

## Goal

到达目的地后商家录入费用明细；乘客确认留档后订单完成。

## Parent

`.trellis/tasks/07-14-miniprogram-feature-gap-audit/prd.md`

## Depends on

`07-14-fulfillment-advance`

## Requirements

* 商家录入 base（默认报价）/toll/parking/other；可一键无附加费
* 写 `order_fees`，`fulfillment_status=PENDING_FEE_CONFIRM`
* 乘客确认 → COMPLETED + confirmed_at；评价入口沿用现网

## Acceptance Criteria

* [ ] 费用可回看
* [ ] 确认后 status/fulfillment 均为 COMPLETED
* [ ] 无支付逻辑
