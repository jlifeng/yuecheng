# 评价系统

## Goal

实现订单评价功能，允许乘客对已完成的订单进行评分和评价。

## Status: ✅ 已完成

## Requirements

### 功能点
- [x] 乘客端订单详情页添加评价入口
- [x] 评价弹窗（星级 + 标签 + 文字评价）
- [x] 评价数据存储
- [x] 商家评分更新

### 评价内容
- 星级评分（1-5星）
- 评价标签（准时、服务好、车况好等）
- 文字评价（可选）

## 实现内容

### 数据库
- 创建 `reviews` 表存储评价数据
- 为 `merchants` 表添加 `rating_avg` 和 `rating_count` 字段
- 配置 RLS 策略

### 服务层
**`services/passenger.ts`**
- 新增 `submitReview(demandId, merchantId, rating, tags, comment)` 函数
- 新增 `checkReviewExists(demandId)` 函数
- 新增 `updateMerchantRating(merchantId)` 内部函数

### 页面
**`pages/order/detail.vue`**
- 已完成订单显示「评价订单」按钮
- 点击弹出评价弹窗
- 星级选择（1-5星）
- 标签多选
- 文字评价输入
- 提交后更新状态

### 评价标签
- 准时到达
- 服务态度好
- 车况良好
- 驾驶平稳
- 路线合理
- 价格公道

## Acceptance Criteria

- [x] 乘客可对已完成订单评价
- [x] 评价包含星级和可选标签
- [x] 评价后商家评分更新
- [x] 已评价订单不再显示评价入口

## Technical Notes

- 评价为一次性操作，不可修改
- 商家评分采用简单平均
- `reviews` 表设置 `UNIQUE(demand_id)` 保证每个订单只能评价一次
