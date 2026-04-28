# 订单取消功能

## Goal

实现订单取消功能，允许乘客和商家在特定条件下取消订单。

## Status: ✅ 已完成

## Requirements

### 取消规则
- **乘客端**：
  - `ACCEPTED` 状态：可直接取消
  - `IN_PROGRESS` 状态：需协商取消（联系商家）
- **商家端**：
  - `ACCEPTED` 状态：可取消（需说明原因）
  - `IN_PROGRESS` 状态：不可取消（需联系平台）

### 功能点
- [x] 乘客端订单详情页添加取消按钮
- [x] 商家端订单详情页添加取消按钮
- [x] 取消原因选择
- [x] 取消确认弹窗
- [x] 更新订单状态为 `CANCELLED`

## 实现内容

### 服务层
**`services/passenger.ts`**
- 新增 `cancelOrder(demandId, reason)` 函数

**`services/provider.ts`**
- 新增 `merchantCancelOrder(demandId, reason)` 函数
- 验证订单归属和状态

### 页面
**`pages/order/detail.vue`**（乘客端）
- 添加取消按钮（仅 ACCEPTED 状态显示）
- 取消原因选择弹窗
- 取消成功后刷新页面

**`pages/provider/order_detail.vue`**（商家端）
- 添加取消按钮（与开始行程并排）
- 取消原因选择弹窗（商家专用原因）

### 取消原因
**乘客端**：
- 行程有变
- 找不到司机
- 等待时间过长
- 价格不合理
- 其他原因

**商家端**：
- 乘客取消行程
- 车辆故障
- 无法联系乘客
- 其他原因

## Acceptance Criteria

- [x] 乘客可在 ACCEPTED 状态取消订单
- [x] 商家可在 ACCEPTED 状态取消订单
- [x] 取消需选择原因
- [x] 取消后状态变为 CANCELLED
- [x] 取消后订单不在进行中列表显示

## Technical Notes

- 取消操作记录原因到 demands.notes 字段
- 商家取消时验证订单归属
