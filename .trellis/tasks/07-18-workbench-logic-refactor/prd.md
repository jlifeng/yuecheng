# 接单工作台逻辑重构

## Goal

重构接单工作台和订单流转逻辑：去掉司机指派环节，让司机自行接单；用户确认加入车队后拥有乘客+司机双角色；一个订单同一时间只允许一个人报价（除非报价被拒绝）。

## What I already know

### 用户需求（4 条）
1. **去掉司机指派**：当前流程是乘客接受报价 → PENDING_ASSIGN → 车管指派司机 ASSIGNED → ON_THE_WAY。用户要求去掉 PENDING_ASSIGN/ASSIGNED，报价人就是执行司机。
2. **双角色**：用户注册后是乘客，被添加到车队并确认后同时拥有乘客+司机双角色（不是替换）。
3. **司机自行接单**：确认加入车队后的司机可以在工作台看到待报价需求并报价接单。
4. **独占报价**：一个订单同一时间只允许一个人报价，除非该报价被拒绝。

### 当前代码现状
- **Fulfillment 状态机**（`utils/fulfillmentStateMachine.ts`）：
  - 主路径：PENDING_ASSIGN → ASSIGNED → ON_THE_WAY → ARRIVED_PICKUP → PASSENGER_BOARDED → ARRIVED_DESTINATION → PENDING_FEE_CONFIRM → COMPLETED
  - PENDING_ASSIGN → ASSIGNED 的 action 是 `ASSIGN_DRIVER`（指派司机）
  - 乘客接受报价时 `acceptBid()` 写入 `fulfillment_status: 'PENDING_ASSIGN'`
  - `advanceFulfillment()` 拒绝直接跳到 ASSIGNED/PENDING_FEE_CONFIRM/COMPLETED/CANCELLED（强制走专用流程）
  - 取消规则：PENDING_FEE_CONFIRM 之前可取消

- **报价系统**（`services/passenger.ts` + `services/provider.ts`）：
  - `submitBid()` 直接 POST 到 bids 表，无并发控制
  - `acceptBid()` 更新 bid status=ACCEPTED + demand status=ACCEPTED + fulfillment_status=PENDING_ASSIGN + accepted_provider_id
  - 当前允许多人对同一 demand 报价（bids 表无唯一约束限制）
  - **bid REJECTED 状态从未被写入**——输掉的报价永远停在 PENDING，没有拒绝机制
  - 工作台 `quoted` tab 不检测输掉的报价（其他商家中标后，原 PENDING 报价仍显示"已报价"）

- **角色系统**：
  - `accept-driver-invitation` 云函数把 `profiles.role` 从 passenger 改为 merchant_driver（**覆盖**而非追加）
  - RBAC 用 `user_roles` 表存多角色，但 `profiles.role` 只记一个
  - 工作台 `isDriverMode` 判定基于 `ProviderRole`（OWNER/DISPATCHER/DRIVER），与 RBAC 角色是两套体系
  - **DRIVER 角色在工作台不能报价**：`canQuoteDemand` 要求 `reviewStatus === 'approved'`，且 `goToBid` 被 `isDriverMode` 守卫拦截

- **订单详情**（`pages/provider/order_detail.vue`）：
  - 有司机指派 UI（`assignModal`：选择司机+车辆下拉框 + ASSIGN_DRIVER action）
  - `needsAssign` computed：fulfillment === PENDING_ASSIGN 或无 assignedDriverId 时为 true
  - `isAssignedDriver` computed：assignedDriver.userId === userProfile.id，是"去接驾"等操作的守卫
  - `primaryAction` 排除 ASSIGN_DRIVER/SUBMIT_FEES/CONFIRM_FEES 且要求 isAssignedDriver

- **工作台**（`pages/provider/workbench.vue`）：
  - 三 tab：待报价需求 / 已报价 / 进行中
  - DRIVER 角色 tab 标签不同："今日任务 / 当前订单 / 服务记录"
  - 待报价列表 `fetchPendingDemands` 客户端排除已报价的 demand

## Assumptions (temporary)

* "独占报价"指：一个 demand 在 BIDDING 状态下，只要有 PENDING 状态的 bid 存在，其他人不能再报价；只有该 bid 被拒绝（REJECTED）后，其他人才能报价
* 去掉指派后，报价人 = 执行司机，不需要 assigned_driver_id 字段
* 双角色在 UI 层面表现为：用户可以在首页切换乘客/司机视图（已有 currentRole 机制）
* 乘客拒绝 PENDING 报价是独占报价的必要配套——没有拒绝机制，其他司机永远报不了价
* 不需要预留指派扩展点——状态机只是代码，将来加回来很容易

## Open Questions

* ~~独占报价的"拒绝"由谁操作？~~ → 乘客拒绝（独占报价的必要配套）
* ~~acceptBid 后 fulfillment_status 设为什么？~~ → 保留 PENDING_ASSIGN（含义从"待指派"变为"待出发"），跳过 ASSIGNED，司机点"去接驾"后 → ON_THE_WAY

## Decision (ADR-lite)

**Context**: 去掉司机指派后，需要决定 acceptBid 后 fulfillment 直接进入什么状态
**Decision**: 保留 PENDING_ASSIGN，跳过 ASSIGNED。PENDING_ASSIGN 含义从"待指派司机"变为"待出发"。状态机删除 ASSIGNED 状态和 ASSIGN_DRIVER action。PENDING_ASSIGN 的下一步直接是 ON_THE_WAY（START_PICKUP action）。
**Consequences**: 改动最小（状态名不变，只是删除中间态）；PENDING_ASSIGN 名称有轻微误导但文案可以覆盖；保留了一个缓冲态让司机有时间准备出发

## Requirements (evolving)

1. 去掉司机指派环节：删除 ASSIGNED 状态和 ASSIGN_DRIVER action；PENDING_ASSIGN 含义变为"待出发"，下一步直接是 ON_THE_WAY
2. 乘客接受报价后，报价人即为执行司机，fulfillment 进入 PENDING_ASSIGN（待出发），司机点"去接驾"后进入 ON_THE_WAY
3. 用户确认加入车队后，同时拥有乘客和司机角色（profiles.role 保留 passenger，RBAC user_roles 追加 merchant_driver）
4. 司机可在工作台自行报价接单（去掉 isDriverMode 对报价的拦截）
5. 一个 demand 同一时间只允许一个 PENDING bid；已有 PENDING bid 时不允许其他人报价；bid 被拒绝后其他人可报价
6. 乘客可拒绝 PENDING 报价（独占报价的必要配套，拒绝后其他司机可报价）

## Acceptance Criteria (evolving)

- [ ] 乘客接受报价后，demand.fulfillment_status = PENDING_ASSIGN（含义"待出发"），不经过 ASSIGNED
- [ ] 订单详情页无"指派司机"UI，报价人自动成为执行司机（assigned_driver_id = bid.provider_id 对应的 drivers.id）
- [ ] "去接驾"按钮对报价人（即执行司机）可见，PENDING_ASSIGN 状态下即可点击
- [ ] 用户确认加入车队后，profiles.role 仍为 passenger，但 user_roles 包含 merchant_driver
- [ ] 工作台对已确认的司机可见待报价需求，且司机可以报价
- [ ] 同一 demand 有 PENDING bid 时，其他人无法再报价（前端拦截 + 后端约束）
- [ ] PENDING bid 被拒绝后，其他人可以报价
- [ ] 乘客端可拒绝 PENDING 报价（新增 rejectBid 操作）

## Definition of Done

* 前端页面逻辑修改完成（工作台、订单详情、报价流程）
* 状态机代码更新（去掉 PENDING_ASSIGN/ASSIGNED 或调整转换）
* 独占报价约束实现（前端 + 数据库层）
* 双角色逻辑验证
* 云函数部署（如有新增/修改）
* 手动端到端测试通过

## Out of Scope (explicit)

* 多车队精确匹配（bind-phone 云函数按 merchant_id 回填，当前只取第一条）
* 微信手机号组件（个人开发者无法使用，已改手输）
* 管理员后台相关改动

## Technical Notes

### 关键文件
- `luxeway-app/utils/fulfillmentStateMachine.ts` — 状态机定义
- `luxeway-app/utils/fulfillmentStatusCopy.ts` — 状态文案
- `luxeway-app/services/passenger.ts` — acceptBid() 写入 PENDING_ASSIGN
- `luxeway-app/services/provider.ts` — submitBid() 无并发控制
- `luxeway-app/pages/provider/workbench.vue` — 工作台
- `luxeway-app/pages/provider/order_detail.vue` — 订单详情（含指派 UI）
- `luxeway-app/pages/provider/bid_input.vue` — 报价输入页
- `supabase/functions/accept-driver-invitation/index.ts` — 司机确认加入
- `supabase/migrations/20260714_fulfillment_approach_b.sql` — fulfillment schema

### 状态机改动方向
当前：PENDING_ASSIGN → ASSIGNED(指派司机) → ON_THE_WAY(去接驾) → ...
目标：PENDING_ASSIGN(待出发) → ON_THE_WAY(去接驾) → ...（删除 ASSIGNED 状态和 ASSIGN_DRIVER action）
PENDING_ASSIGN 文案从"待指派"改为"待出发"；coarse mapping 不变（PENDING_ASSIGN → ACCEPTED）

### 独占报价实现方向
- 前端：submitBid 前先查该 demand 是否已有 PENDING bid，有则拦截
- 后端：数据库层加约束（RLS policy 或 trigger）防止并发写入
