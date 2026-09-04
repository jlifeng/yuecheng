# 小程序主链路补全：指派司机 / 履约节点 / 费用确认 + 卫生清理

## Goal

在现有「发布 → 报价 → 选单 → 粗状态完成」闭环上，补齐**商用必需的履约主链路**：商家指派司机、细粒度履约节点、费用录入与乘客确认；并清理 mock 数据与无跳转死菜单，使产品观感与真实能力一致。

## What I already know

### 用户确认的 MVP 范围（2026-07-14）
1. **指派司机**（商家确认接单后）
2. **履约状态机**从 3 态扩展到关键节点
3. **商家费用录入 + 乘客费用确认**
4. **清理 mock 与死菜单**（优惠券、收入统计、设置、常用地址等无实现入口）

**本轮明确不包含**（原 Batch 0 第 4 项及 Batch 1 其余项）：
* 微信订阅消息 / 消息中心
* 发票上传/下载
* 异常报备
* 管理端用户/订单监管
* 等待计时自动计费（可作为节点字段预留，不做完整计时 UX）

### 已完成的核心闭环
* 登录、发布需求、报价、选单、粗状态订单、取消、评价
* 商家入驻审核、车队/司机表（`vehicles` / `drivers` 在 Supabase 有读写）
* `useOrderTimeline` 与 `yuecheng-api` 已按细粒度状态设计文案/领域模型，但**未接入小程序主路径**

### 架构约束
* 小程序主路径仍直连 **Supabase REST**
* 线上 demand 状态：`BIDDING | ACCEPTED | IN_PROGRESS | COMPLETED | CANCELLED`（+ PENDING）
* 设计态细粒度：`PENDING_ASSIGN → ASSIGNED → ON_THE_WAY → ARRIVED_PICKUP → WAITING_PASSENGER → PASSENGER_BOARDED → … → PENDING_FEE_CONFIRM → COMPLETED`
* 订单详情司机信息目前回退为商家联系人，车牌为空
* `passenger.ts` 残留 `mockBids` / `createMockTimeline` / `createMockFeeSummary`（部分未再引用或仅辅助）

## Assumptions (temporary)

* 单司机执行一单即可；V1 不支持一单多司机
* 车队长/商家管理员可指派；司机账号主要执行节点（若本轮时间紧，可先允许商家代点状态）
* 费用线下结算：确认仅做**留档**，不接支付
* 状态数据优先落在 Supabase（demands / 新表），不强制本轮接入 Nest

## Open Questions

* ~~下一阶段优先批次？~~ → 已确认：P0-1/2/3 + 卫生清理
* ~~履约状态落库方案？~~ → **Approach B**（`demands` 粗状态 + `fulfillment_status` / 事件 / 费用表）

## Requirements

### R1 指派司机
* 订单处于「已确认待指派」时，商家从本车队 `drivers` 列表选择司机（可选关联车辆）
* 指派后写入订单/需求关联字段（`assigned_driver_id`、可选 `assigned_vehicle_id`）
* 乘客订单详情展示真实司机姓名、电话、车牌（有则显示）
* 未指派前，商家侧引导「请先指派司机」，不可跳过直接进入过深履约（至少不可「完成行程」）

### R2 履约节点
至少支持以下商家/执行侧动作（文案可 Uber 极简）：
1. 已指派
2. 去接驾 / 出发
3. 到达上车点
4. 乘客已上车（行程中）
5. 到达目的地
6. 待确认费用
7. 已完成

* 乘客端订单详情时间线与状态文案随节点更新
* 非法跳转需拦截（不允许随意回退/跨多步，除取消）
* 保留取消：在「待费用确认」前允许按现有规则取消（或沿用 ACCEPTED/IN_PROGRESS 策略，实现时对齐现网）

### R3 费用录入与确认
* 商家在「到达目的地」后录入：基础车费（默认报价）、过路费、停车费、其他、备注；合计自动算
* 提交后状态 → 待乘客确认；乘客可确认留档
* 确认后 → 已完成（评价入口沿用现网 COMPLETED）
* 无附加费时可一键「无附加费提交」

### R4 卫生清理
* 删除或隐藏无实现的菜单：`优惠券`、`常用地址`、`设置`（乘客我的）、`我的报价`/`收入统计`/`设置`（商家我的，若无页）
* 管理端「用户管理/订单管理/数据统计」若仍占位：改为隐藏或统一「即将开放」且不假装可点进业务（优先隐藏死入口）
* 移除未使用 mock（`mockBids`、无用 mock timeline/fee）；订单费用不得用假数展示

## Acceptance Criteria

* [ ] 商家接受后的订单可指派本车队司机，乘客详情可见司机联系方式
* [ ] 商家可将订单从指派推进到到达目的地，每步状态乘客可见
* [ ] 商家录入费用后乘客可确认；确认后订单完成且费用明细可回看
* [ ] 状态非法流转有前端（及尽量 DB check/约束）拦截
* [ ] `demands.status` 粗状态与 `fulfillment_status` 映射一致（例如推进中 demand=IN_PROGRESS，费用待确认后 COMPLETED）
* [ ] 死菜单不再误导用户；无引用 mock 已清理
* [ ] 不引入在线支付

## Definition of Done

* 小程序主路径可手测完整：选单 → 指派 → 节点推进 → 费用 → 完成 → 评价
* 相关类型/`useOrderTimeline` 与细粒度 `fulfillment_status` 对齐；既有单测更新且通过
* Supabase 迁移/SQL 说明写入任务笔记（表结构可复现）
* 不在本任务做发票/消息/异常/管理监管

## Technical Approach

### 状态模型（Approach B）

| 层 | 字段/表 | 职责 |
|----|---------|------|
| 撮合粗状态 | `demands.status` | 保持：`BIDDING / ACCEPTED / IN_PROGRESS / COMPLETED / CANCELLED` |
| 履约子状态 | `demands.fulfillment_status`（或独立 `orders` 表当前态） | `PENDING_ASSIGN → ASSIGNED → ON_THE_WAY → ARRIVED_PICKUP → (WAITING_PASSENGER 可选) → PASSENGER_BOARDED → ARRIVED_DESTINATION → PENDING_FEE_CONFIRM → COMPLETED` |
| 指派 | `demands.assigned_driver_id` / `assigned_vehicle_id` | 指向 `drivers` / `vehicles` |
| 事件日志 | `order_events` | 每次节点推进一条（type, actor, timestamp, note） |
| 费用 | `order_fees` | 一行/单：base/toll/parking/other/total + confirmed_at |

### 粗细映射（实现约定）
* 选单成功：`status=ACCEPTED`，`fulfillment_status=PENDING_ASSIGN`
* 指派完成：仍 `ACCEPTED` 或进入 `IN_PROGRESS`（推荐指派后保持 ACCEPTED，**首次「去接驾」再 `IN_PROGRESS`**）
* 去接驾～到达目的地：`status=IN_PROGRESS`
* 提交费用：`fulfillment_status=PENDING_FEE_CONFIRM`，`status` 仍 `IN_PROGRESS`
* 乘客确认费用：`status=COMPLETED` + `fulfillment_status=COMPLETED`
* 取消：`status=CANCELLED`，`fulfillment_status` 冻结为取消前最后一态或 `CANCELLED`

### 前端
* 商家 `order_detail`：指派 UI + 下一步动作按钮（按当前 fulfillment 显示唯一主操作）
* 乘客 `order/detail`：读 fulfillment + events 渲染时间线；费用确认 CTA
* services 增加 assign / advanceFulfillment / submitFees / confirmFees
* 清理 mine 死菜单与 passenger mock

### 数据迁移注意
* 历史 `ACCEPTED/IN_PROGRESS/COMPLETED` 订单：回填默认 `fulfillment_status`（ACCEPTED→PENDING_ASSIGN 或 ASSIGNED；IN_PROGRESS→PASSENGER_BOARDED 近似；COMPLETED→COMPLETED）

## Decision (ADR-lite)

**Context**: 盘点显示主链路在「选单后」过粗；需在速度与模型清晰度间选择落库方式。  
**Decision（范围）**: 实现批次 = 指派司机 + 履约节点 + 费用确认 + mock/死菜单清理。  
**Decision（技术）**: **Approach B** — `demands` 保持粗状态，增加 `fulfillment_status`、指派字段、`order_events`、`order_fees`。不接入 Nest 内存桩。  
**Consequences**: 列表/筛选仍可按粗状态；时间线与审计走事件表；实现比扩枚举略重，但避免 demand 状态爆炸，后续可平滑接到领域服务。

## Out of Scope (explicit)

* 在线支付、担保、分账
* 微信订阅消息 / 推送
* 发票、异常报备、完整等待计费 UX
* 管理端封禁/字典配置
* Nest 替换 Supabase 主路径
* 优惠券、收入统计、复杂经营报表
* 「车找人」独立交易模型

## Technical Notes

### 关键文件
* `luxeway-app/pages/provider/order_detail.vue` — 现仅 start/complete
* `luxeway-app/pages/order/detail.vue` — 乘客详情/评价/取消
* `luxeway-app/services/passenger.ts` / `provider.ts`
* `luxeway-app/composables/useOrderTimeline.ts`、`types/order.ts`
* `luxeway-app/pages/mine/mine.vue`、`pages/provider/mine.vue`
* `luxeway-app/pages/provider/fleet_manage.vue` — drivers/vehicles Supabase 读写样板
* 设计参考：`yuecheng-api/.../order-status.ts`、`order-timeline.service.ts`

### 历史盘点
* `.trellis/tasks/04-28-incomplete-features-audit/prd.md`

## Research References

* 仓库内规格与代码盘点（本轮未做外部竞品深研）

## Implementation Plan (small PRs)

* **PR1 数据与类型**：Supabase 字段/表 SQL + TS 类型 + 状态机映射工具函数 + 历史回填策略
* **PR2 指派司机**：商家选司机/车辆、写指派字段、乘客详情展示真实司机信息
* **PR3 履约推进**：商家节点按钮、写 `order_events`、同步粗状态、乘客时间线
* **PR4 费用确认**：商家录入 `order_fees`、乘客确认、完成订单
* **PR5 卫生清理**：删 mock、隐藏死菜单、文案与列表状态展示对齐

## Subtasks (proposed)

1. `schema-fulfillment-b` — DB + types + state machine helpers  
2. `assign-driver` — 指派流程  
3. `fulfillment-advance` — 节点推进 + 时间线  
4. `fee-confirm` — 费用录入/确认  
5. `ui-hygiene` — mock/死菜单清理
