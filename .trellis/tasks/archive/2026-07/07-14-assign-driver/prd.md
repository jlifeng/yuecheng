# feature: 指派司机

## Goal

商家在订单确认后从本车队选择司机（可选车辆），写入指派字段，乘客订单详情展示真实司机信息。

## Parent

`.trellis/tasks/07-14-miniprogram-feature-gap-audit/prd.md`

## Depends on

`07-14-schema-fulfillment-b`

## Requirements

* 商家订单详情：`PENDING_ASSIGN` 时展示司机列表并指派
* 写 `assigned_driver_id` / `assigned_vehicle_id`，`fulfillment_status=ASSIGNED`，记 `order_events`
* 乘客详情展示司机姓名、电话、车牌

## Acceptance Criteria

* [ ] 仅能指派本 merchant 下司机
* [ ] 未指派不能进入更深履约完成
* [ ] 乘客可见真实司机信息
