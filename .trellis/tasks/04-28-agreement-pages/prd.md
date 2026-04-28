# 协议页面

## Goal

创建用户协议和隐私政策页面，满足小程序审核要求。

## Status: ✅ 已完成

## Requirements

### 页面
- [x] 创建 `pages/common/agreement.vue` 通用协议页面
- [x] 支持通过参数区分协议类型（用户协议/隐私政策）
- [x] 添加路由配置

### 功能
- [x] 登录页勾选协议
- [x] 我的页面查看协议入口

### 内容
- [x] 用户协议：服务条款、使用规范、免责声明
- [x] 隐私政策：信息收集、信息使用、信息保护

## 实现内容

### 新建文件
**`pages/common/agreement.vue`**
- 通用协议页面
- 通过 URL 参数 `type` 区分用户协议/隐私政策
- 使用 scroll-view 实现内容滚动

### 修改文件
**`pages.json`**
- 添加 `pages/common/agreement` 路由

**`pages/login/index.vue`**
- 更新 `showAgreement` 跳转到协议页面

**`pages/mine/mine.vue`**
- 添加用户协议、隐私政策入口
- 添加 `goToAgreement` 函数

## Acceptance Criteria

- [x] 登录页可勾选协议
- [x] 点击协议文字跳转对应页面
- [x] 协议内容正确展示
- [x] 返回按钮正常工作

## Technical Notes

- 使用原生文本渲染，无需富文本组件
- 协议内容直接嵌入页面，后续可改为远程加载
- 页面支持 scroll-view 滚动
