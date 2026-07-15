# schema: fulfillment B 数据与状态机

## Goal

为 Approach B 落地 Supabase schema、TypeScript 类型与履约状态机工具，供后续指派/推进/费用功能复用。

## Parent

`.trellis/tasks/07-14-miniprogram-feature-gap-audit/prd.md`（已确认）

## Requirements

* `demands` 增加：`fulfillment_status`、`assigned_driver_id`、`assigned_vehicle_id`（nullable FK）
* 新建 `order_events`（demand_id, type, actor_id, note, created_at…）
* 新建 `order_fees`（demand_id unique, base/toll/parking/other/waiting/total, submitted_at, confirmed_at, submitted_by…）
* TS：`FulfillmentStatus`、映射粗状态、合法转移 `canTransition` / `nextActions`
* 历史回填 SQL：按现有 `demands.status` 填默认 `fulfillment_status`
* 迁移文件放 `supabase/migrations/`

## Acceptance Criteria

* [ ] 迁移 SQL 可重复执行（IF NOT EXISTS / 安全 ALTER）
* [ ] 类型与状态机单测或至少纯函数可测
* [ ] 文档注释说明粗/细状态映射

## Out of Scope

* UI 指派/推进/费用页面（后续子任务）
