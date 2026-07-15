# chore: 清理 mock 与死菜单

## Goal

删除未使用 mock，隐藏无实现菜单入口，避免商用误导。

## Parent

`.trellis/tasks/07-14-miniprogram-feature-gap-audit/prd.md`

## Requirements

* 清理 `passenger.ts` 中无用 `mockBids` / mock timeline/fee
* 乘客我的：隐藏优惠券、常用地址、空设置
* 商家我的：隐藏无页的我的报价/收入统计/设置
* 管理端占位快捷入口：隐藏或明确不可用（优先隐藏）

## Acceptance Criteria

* [ ] 无假报价数据路径
* [ ] 死菜单不再可点进空白
