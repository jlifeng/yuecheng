# 始终显示角色切换 Tab

## Goal

让所有用户（包括纯乘客）都能看到"乘客/车主"角色切换 Tab，使新注册乘客能点击"车主"看到入驻引导并申请商家入驻。

## What I already know

* 角色 Tab 在 `pages/index/index.vue:4`，条件是 `v-if="isFleetMember"`
* `isFleetMember` 是 computed，检查用户是否有 merchant 角色
* 车主视图已有 `v-else` 分支显示"成为车主，开始接单赚钱"入驻引导（第 170 行）
* `switchRole` 函数已实现角色切换逻辑
* `currentRole` 默认值来自 `uni.getStorageSync('currentRole')` 或 `'passenger'`

## Requirements

* 角色 Tab 始终显示，不再受 `isFleetMember` 限制
* 点击"车主" Tab 时，非商家用户看到入驻引导
* 点击"乘客" Tab 时，回到乘客视图
* Tab 文案保持"乘客""车主"

## Acceptance Criteria

- [ ] 新注册乘客能看到"乘客/车主"角色 Tab
- [ ] 点击"车主"显示入驻引导卡片
- [ ] 点击"乘客"回到乘客首页
- [ ] 已有商家角色的用户行为不变

## Technical Approach

去掉 `v-if="isFleetMember"` 条件，角色 Tab 始终渲染。

## Out of Scope

* 入驻申请页面实现（已有 `goToRegister`）
* 商家工作台改造
