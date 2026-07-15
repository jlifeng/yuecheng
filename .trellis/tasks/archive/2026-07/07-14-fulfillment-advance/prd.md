# feature: 履约节点推进与时间线

## Goal

商家按状态机逐步推进履约节点，写入 `order_events` 并同步 `demands.status` 粗状态；乘客时间线实时反映。

## Parent

`.trellis/tasks/07-14-miniprogram-feature-gap-audit/prd.md`

## Depends on

`07-14-schema-fulfillment-b`、`07-14-assign-driver`

## Requirements

* 节点：ASSIGNED → ON_THE_WAY → ARRIVED_PICKUP → PASSENGER_BOARDED → ARRIVED_DESTINATION（再交给费用任务）
* 非法跳转拦截
* 乘客 `order/detail` 用 events + fulfillment 渲染时间线

## Acceptance Criteria

* [ ] 每步唯一主操作按钮
* [ ] 粗状态映射符合父 PRD
* [ ] 时间线与状态文案正确
