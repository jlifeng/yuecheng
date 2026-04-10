# Yuecheng V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个前期低成本、可真实商用的 `悦程 V1`，覆盖乘客端发单与比价、商家端报价与履约、平台后台审核监管、后端订单与发票留痕闭环。

**Architecture:** 保留现有 [luxeway-app](/mnt/k/myproject/Plain%20sailing/luxeway-app) 作为 uni-app 小程序前端，不做目录重命名；新增 `yuecheng-api` 作为 NestJS 单体后端，新增 `yuecheng-admin` 作为 Vue 3 Web 管理后台。后端按模块拆分为 `auth / merchant / demand / bid / order / invoice / incident / dictionaries`，先以单体架构跑通业务闭环，再预留后续拆分空间。

**Tech Stack:** uni-app (Vue 3 + TypeScript), NestJS, TypeScript, Prisma, MySQL, Redis, pnpm, Vitest, Vue 3, Vite, Element Plus

---

## 范围拆分与实施顺序

这份 spec 同时覆盖 4 个相对独立的子系统：

1. 小程序乘客端
2. 小程序商家端 / 司机受限模式
3. 平台管理后台
4. 后端与数据层

执行顺序固定为：

1. 先搭 `NestJS + Prisma` 后端骨架和核心状态机
2. 再做商家准入、需求单、报价单、订单接口
3. 然后接入乘客端主链路
4. 再接入商家端工作台、车队和履约
5. 最后补后台审核、监管、配置与端到端验收

## 目标文件结构

### 现有目录继续保留

- `luxeway-app/App.vue`
- `luxeway-app/main.js`
- `luxeway-app/pages.json`
- `luxeway-app/pages/index/index.vue`
- `luxeway-app/pages/passenger/post_demand.vue`
- `luxeway-app/pages/passenger/bid_list.vue`
- `luxeway-app/pages/order/detail.vue`
- `luxeway-app/pages/provider/workbench.vue`
- `luxeway-app/pages/provider/bid_input.vue`
- `luxeway-app/pages/provider/my_fleet/index.vue`
- `luxeway-app/pages/provider/driver_management/index.vue`
- `luxeway-app/utils/dataManager.ts`

### 小程序新增目录

- Create: `luxeway-app/package.json`
- Create: `luxeway-app/services/http.ts`
- Create: `luxeway-app/services/passenger.ts`
- Create: `luxeway-app/services/provider.ts`
- Create: `luxeway-app/services/common.ts`
- Create: `luxeway-app/types/demand.ts`
- Create: `luxeway-app/types/order.ts`
- Create: `luxeway-app/types/provider.ts`
- Create: `luxeway-app/stores/session.ts`
- Create: `luxeway-app/stores/order.ts`
- Create: `luxeway-app/composables/useDemandForm.ts`
- Create: `luxeway-app/composables/useOrderTimeline.ts`
- Create: `luxeway-app/tests/useDemandForm.spec.ts`
- Create: `luxeway-app/tests/useOrderTimeline.spec.ts`
- Create: `luxeway-app/tests/providerWorkbench.spec.ts`

### 后端新增目录

- Create: `yuecheng-api/package.json`
- Create: `yuecheng-api/tsconfig.json`
- Create: `yuecheng-api/nest-cli.json`
- Create: `yuecheng-api/prisma/schema.prisma`
- Create: `yuecheng-api/src/main.ts`
- Create: `yuecheng-api/src/app.module.ts`
- Create: `yuecheng-api/src/common/`
- Create: `yuecheng-api/src/modules/auth/`
- Create: `yuecheng-api/src/modules/merchant/`
- Create: `yuecheng-api/src/modules/demand/`
- Create: `yuecheng-api/src/modules/bid/`
- Create: `yuecheng-api/src/modules/order/`
- Create: `yuecheng-api/src/modules/invoice/`
- Create: `yuecheng-api/src/modules/incident/`
- Create: `yuecheng-api/src/modules/dictionaries/`
- Create: `yuecheng-api/test/`

### 管理后台新增目录

- Create: `yuecheng-admin/package.json`
- Create: `yuecheng-admin/src/main.ts`
- Create: `yuecheng-admin/src/App.vue`
- Create: `yuecheng-admin/src/router/index.ts`
- Create: `yuecheng-admin/src/layouts/AdminLayout.vue`
- Create: `yuecheng-admin/src/views/review/MerchantReviewPage.vue`
- Create: `yuecheng-admin/src/views/regulation/IncidentPage.vue`
- Create: `yuecheng-admin/src/views/config/DictionaryPage.vue`
- Create: `yuecheng-admin/src/services/admin.ts`
- Create: `yuecheng-admin/src/tests/router.spec.ts`

## Task 1: 建立 NestJS 工程骨架与共享契约

**Files:**
- Create: `yuecheng-api/package.json`
- Create: `yuecheng-api/tsconfig.json`
- Create: `yuecheng-api/nest-cli.json`
- Create: `yuecheng-api/src/main.ts`
- Create: `yuecheng-api/src/app.module.ts`
- Create: `yuecheng-api/src/modules/order/domain/order-status.ts`
- Create: `yuecheng-api/test/order-status.spec.ts`
- Create: `luxeway-app/package.json`
- Create: `luxeway-app/types/demand.ts`
- Create: `luxeway-app/tests/useDemandForm.spec.ts`

- [ ] **Step 1: 先写最小失败测试，锁定共享状态与类型**

```ts
// yuecheng-api/test/order-status.spec.ts
import { describe, expect, it } from 'vitest'
import { OrderStatus } from '../src/modules/order/domain/order-status'

describe('OrderStatus', () => {
  it('should include waiting passenger status for business reception flow', () => {
    expect(OrderStatus.WAITING_PASSENGER).toBe('WAITING_PASSENGER')
  })
})
```

```ts
// luxeway-app/tests/useDemandForm.spec.ts
import { describe, expect, it } from 'vitest'
import type { DemandType } from '../types/demand'

describe('DemandType', () => {
  it('should restrict demand type to three v1 categories', () => {
    const values: DemandType[] = ['TRANSFER', 'CHARTER_DAY', 'MULTI_DAY']
    expect(values).toHaveLength(3)
  })
})
```

- [ ] **Step 2: 运行测试，确认当前工程还没有这些骨架**

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test order-status.spec.ts
```

Expected:

```text
No such file or directory
```

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/luxeway-app" && npm run test -- useDemandForm.spec.ts
```

Expected:

```text
npm ERR! Missing script: "test"
```

- [ ] **Step 3: 创建最小工程骨架与共享类型**

```json
// yuecheng-api/package.json
{
  "name": "yuecheng-api",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "test": "vitest run",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.2",
    "@nestjs/core": "^10.4.2",
    "@nestjs/platform-express": "^10.4.2",
    "@prisma/client": "^5.19.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.2",
    "prisma": "^5.19.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4",
    "vitest": "^2.1.1"
  }
}
```

```ts
// yuecheng-api/src/modules/order/domain/order-status.ts
export const OrderStatus = {
  PENDING_ASSIGN: 'PENDING_ASSIGN',
  ASSIGNED: 'ASSIGNED',
  ON_THE_WAY: 'ON_THE_WAY',
  ARRIVED_PICKUP: 'ARRIVED_PICKUP',
  WAITING_PASSENGER: 'WAITING_PASSENGER',
  PASSENGER_BOARDED: 'PASSENGER_BOARDED',
  ARRIVING_DESTINATION: 'ARRIVING_DESTINATION',
  ARRIVED_DESTINATION: 'ARRIVED_DESTINATION',
  PENDING_FEE_CONFIRM: 'PENDING_FEE_CONFIRM',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ABNORMAL_PROCESSING: 'ABNORMAL_PROCESSING'
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
```

```json
// luxeway-app/package.json
{
  "name": "luxeway-app",
  "private": true,
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.1.1"
  }
}
```

```ts
// luxeway-app/types/demand.ts
export type DemandType = 'TRANSFER' | 'CHARTER_DAY' | 'MULTI_DAY'
```

- [ ] **Step 4: 再跑测试，确认骨架稳定**

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test order-status.spec.ts
```

Expected:

```text
1 passed
```

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/luxeway-app" && npm run test -- useDemandForm.spec.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 5: 提交骨架检查点**

```bash
git -C "/mnt/k/myproject/Plain sailing" add yuecheng-api luxeway-app/package.json luxeway-app/types/demand.ts luxeway-app/tests/useDemandForm.spec.ts
git -C "/mnt/k/myproject/Plain sailing" commit -m "chore: bootstrap yuecheng nestjs workspace"
```

## Task 2: 实现商家入驻、审核与基础字典后端

**Files:**
- Create: `yuecheng-api/src/modules/merchant/domain/merchant-review-status.ts`
- Create: `yuecheng-api/src/modules/merchant/dto/merchant-apply.dto.ts`
- Create: `yuecheng-api/src/modules/merchant/merchant.service.ts`
- Create: `yuecheng-api/src/modules/merchant/merchant.controller.ts`
- Create: `yuecheng-api/src/modules/dictionaries/dictionaries.controller.ts`
- Create: `yuecheng-api/test/merchant.service.spec.ts`

- [ ] **Step 1: 先写失败测试，锁定“未审核不能报价”的业务规则**

```ts
// yuecheng-api/test/merchant.service.spec.ts
import { describe, expect, it } from 'vitest'
import { MerchantService } from '../src/modules/merchant/merchant.service'

describe('MerchantService', () => {
  it('should block bid when merchant is not approved', () => {
    const service = new MerchantService()

    expect(() => service.assertBidAllowed('PENDING')).toThrowError('MERCHANT_NOT_APPROVED')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test merchant.service.spec.ts
```

Expected:

```text
Failed to resolve import ../src/modules/merchant/merchant.service
```

- [ ] **Step 3: 实现商家审核状态、申请接口和字典接口**

```ts
// yuecheng-api/src/modules/merchant/domain/merchant-review-status.ts
export type MerchantReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
```

```ts
// yuecheng-api/src/modules/merchant/merchant.service.ts
import { Injectable } from '@nestjs/common'
import type { MerchantReviewStatus } from './domain/merchant-review-status'

@Injectable()
export class MerchantService {
  assertBidAllowed(status: MerchantReviewStatus) {
    if (status !== 'APPROVED') {
      throw new Error('MERCHANT_NOT_APPROVED')
    }
  }
}
```

```ts
// yuecheng-api/src/modules/dictionaries/dictionaries.controller.ts
import { Controller, Get } from '@nestjs/common'

@Controller('/api/common/dictionaries')
export class DictionariesController {
  @Get('/vehicle-types')
  vehicleTypes() {
    return [
      { code: 'GL8', name: '别克GL8' },
      { code: 'ALPHARD', name: '丰田阿尔法' }
    ]
  }
}
```

- [ ] **Step 4: 跑测试并做接口 smoke test**

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test merchant.service.spec.ts
```

Expected:

```text
1 passed
```

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm dev
```

Expected:

```text
Nest application successfully started
```

- [ ] **Step 5: 提交商家准入检查点**

```bash
git -C "/mnt/k/myproject/Plain sailing" add yuecheng-api/src/modules/merchant yuecheng-api/src/modules/dictionaries yuecheng-api/test/merchant.service.spec.ts
git -C "/mnt/k/myproject/Plain sailing" commit -m "feat: add merchant onboarding and dictionary apis"
```

## Task 3: 实现需求单、报价单与选单成单后端

**Files:**
- Create: `yuecheng-api/src/modules/demand/domain/demand-type.ts`
- Create: `yuecheng-api/src/modules/demand/domain/demand-status.ts`
- Create: `yuecheng-api/src/modules/demand/demand.service.ts`
- Create: `yuecheng-api/src/modules/demand/demand.controller.ts`
- Create: `yuecheng-api/src/modules/bid/bid.service.ts`
- Create: `yuecheng-api/src/modules/bid/bid.controller.ts`
- Create: `yuecheng-api/src/modules/order/order.service.ts`
- Create: `yuecheng-api/test/order.service.spec.ts`

- [ ] **Step 1: 写失败测试，锁定“选中一个报价后生成订单并关闭其他报价”**

```ts
// yuecheng-api/test/order.service.spec.ts
import { describe, expect, it } from 'vitest'
import { OrderService } from '../src/modules/order/order.service'

describe('OrderService', () => {
  it('should create order and close other bids when one bid is selected', () => {
    const service = new OrderService()

    const result = service.selectBid(
      'demand-1',
      [
        { bidId: 'bid-1', merchantId: 'merchant-1', price: 880 },
        { bidId: 'bid-2', merchantId: 'merchant-2', price: 960 }
      ],
      'bid-1'
    )

    expect(result.orderStatus).toBe('PENDING_ASSIGN')
    expect(result.closedBidIds).toEqual(['bid-2'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test order.service.spec.ts
```

Expected:

```text
Failed to resolve import ../src/modules/order/order.service
```

- [ ] **Step 3: 实现需求单、报价单和选单服务**

```ts
// yuecheng-api/src/modules/demand/domain/demand-type.ts
export type DemandType = 'TRANSFER' | 'CHARTER_DAY' | 'MULTI_DAY'
```

```ts
// yuecheng-api/src/modules/order/order.service.ts
import { Injectable } from '@nestjs/common'
import { OrderStatus } from './domain/order-status'

@Injectable()
export class OrderService {
  selectBid(
    demandId: string,
    bids: Array<{ bidId: string; merchantId: string; price: number }>,
    selectedBidId: string
  ) {
    const closedBidIds = bids
      .map((item) => item.bidId)
      .filter((bidId) => bidId !== selectedBidId)

    return {
      demandId,
      selectedBidId,
      orderStatus: OrderStatus.PENDING_ASSIGN,
      closedBidIds
    }
  }
}
```

- [ ] **Step 4: 跑测试，确认订单主干建立**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test order.service.spec.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 5: 提交需求单与报价主链路**

```bash
git -C "/mnt/k/myproject/Plain sailing" add yuecheng-api/src/modules/demand yuecheng-api/src/modules/bid yuecheng-api/src/modules/order yuecheng-api/test/order.service.spec.ts
git -C "/mnt/k/myproject/Plain sailing" commit -m "feat: add demand bid and order selection flow"
```

## Task 4: 实现履约状态机、费用明细、发票与异常后端

**Files:**
- Create: `yuecheng-api/src/modules/order/order-timeline.service.ts`
- Create: `yuecheng-api/src/modules/order/order-timeline.controller.ts`
- Create: `yuecheng-api/src/modules/invoice/invoice.controller.ts`
- Create: `yuecheng-api/src/modules/incident/incident.controller.ts`
- Create: `yuecheng-api/test/order-timeline.service.spec.ts`

- [ ] **Step 1: 写失败测试，锁定“等待时长由开始/结束节点自动计算”**

```ts
// yuecheng-api/test/order-timeline.service.spec.ts
import { describe, expect, it } from 'vitest'
import { OrderTimelineService } from '../src/modules/order/order-timeline.service'

describe('OrderTimelineService', () => {
  it('should calculate waiting minutes from timeline events', () => {
    const service = new OrderTimelineService()

    const waitingMinutes = service.calculateWaitingMinutes(
      new Date('2026-04-08T09:00:00+08:00'),
      new Date('2026-04-08T09:18:00+08:00')
    )

    expect(waitingMinutes).toBe(18)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test order-timeline.service.spec.ts
```

Expected:

```text
Failed to resolve import ../src/modules/order/order-timeline.service
```

- [ ] **Step 3: 实现履约时间线、费用汇总、发票和异常接口**

```ts
// yuecheng-api/src/modules/order/order-timeline.service.ts
import { Injectable } from '@nestjs/common'

@Injectable()
export class OrderTimelineService {
  calculateWaitingMinutes(waitingStart: Date, waitingEnd: Date) {
    return Math.floor((waitingEnd.getTime() - waitingStart.getTime()) / 60000)
  }

  calculateFinalAmount(basePrice: number, waitingFee: number, tollFee: number, parkingFee: number, extraFee: number) {
    return basePrice + waitingFee + tollFee + parkingFee + extraFee
  }
}
```

```ts
// yuecheng-api/src/modules/invoice/invoice.controller.ts
import { Controller, Post } from '@nestjs/common'

@Controller('/api/invoices')
export class InvoiceController {
  @Post('/upload')
  upload() {
    return { status: 'UPLOADED' }
  }
}
```

```ts
// yuecheng-api/src/modules/incident/incident.controller.ts
import { Body, Controller, Post } from '@nestjs/common'

@Controller('/api/incidents')
export class IncidentController {
  @Post()
  create(@Body() body: { type: string }) {
    return { status: 'RECORDED', type: body.type }
  }
}
```

- [ ] **Step 4: 跑测试和接口 smoke test**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test order-timeline.service.spec.ts
```

Expected:

```text
1 passed
```

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test
```

Expected:

```text
all tests passed
```

- [ ] **Step 5: 提交履约与收尾能力**

```bash
git -C "/mnt/k/myproject/Plain sailing" add yuecheng-api/src/modules/order yuecheng-api/src/modules/invoice yuecheng-api/src/modules/incident yuecheng-api/test/order-timeline.service.spec.ts
git -C "/mnt/k/myproject/Plain sailing" commit -m "feat: add order timeline fee invoice and incident flow"
```

## Task 5: 重构乘客端为“服务层 + 状态层 + 页面层”

**Files:**
- Modify: `luxeway-app/pages/index/index.vue`
- Modify: `luxeway-app/pages/passenger/post_demand.vue`
- Modify: `luxeway-app/pages/passenger/bid_list.vue`
- Modify: `luxeway-app/pages/order/detail.vue`
- Create: `luxeway-app/services/http.ts`
- Create: `luxeway-app/services/passenger.ts`
- Create: `luxeway-app/composables/useDemandForm.ts`
- Create: `luxeway-app/composables/useOrderTimeline.ts`
- Create: `luxeway-app/stores/order.ts`
- Create: `luxeway-app/tests/useDemandForm.spec.ts`
- Create: `luxeway-app/tests/useOrderTimeline.spec.ts`

- [ ] **Step 1: 写失败测试，锁定需求表单 payload 与订单时间线展示**

```ts
import { describe, expect, it } from 'vitest'
import { buildDemandPayload } from '../composables/useDemandForm'

describe('buildDemandPayload', () => {
  it('should convert transfer form state into api payload', () => {
    const payload = buildDemandPayload({
      type: 'TRANSFER',
      startAddress: '武汉天河机场',
      endAddress: '光谷希尔顿酒店',
      passengerCount: 2
    })

    expect(payload.type).toBe('TRANSFER')
    expect(payload.passengerCount).toBe(2)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/mnt/k/myproject/Plain sailing/luxeway-app" && npm run test -- useDemandForm.spec.ts
```

Expected:

```text
Failed to resolve import ../composables/useDemandForm
```

- [ ] **Step 3: 抽离 composable 和服务层，页面只保留 UI 与交互**

```ts
// luxeway-app/composables/useDemandForm.ts
import type { DemandType } from '../types/demand'

export interface DemandFormState {
  type: DemandType
  startAddress: string
  endAddress: string
  passengerCount: number
}

export function buildDemandPayload(state: DemandFormState) {
  return {
    type: state.type,
    startAddress: state.startAddress,
    endAddress: state.endAddress,
    passengerCount: state.passengerCount
  }
}
```

```ts
// luxeway-app/services/passenger.ts
import { buildDemandPayload, type DemandFormState } from '../composables/useDemandForm'

export function createPassengerService(request: (url: string, data?: unknown) => Promise<unknown>) {
  return {
    submitDemand(form: DemandFormState) {
      return request('/api/passenger/demands', buildDemandPayload(form))
    }
  }
}
```

- [ ] **Step 4: 跑测试并手工验证乘客主链路页面**

```bash
cd "/mnt/k/myproject/Plain sailing/luxeway-app" && npm run test -- useDemandForm.spec.ts useOrderTimeline.spec.ts
```

Expected:

```text
2 passed
```

Manual:

```text
在微信开发者工具中验证：首页可选三类主单型，发布后进入报价列表，订单详情可看到时间线和费用确认入口
```

- [ ] **Step 5: 提交乘客端重构**

```bash
git -C "/mnt/k/myproject/Plain sailing" add luxeway-app/pages/index/index.vue luxeway-app/pages/passenger/post_demand.vue luxeway-app/pages/passenger/bid_list.vue luxeway-app/pages/order/detail.vue luxeway-app/services luxeway-app/composables luxeway-app/stores luxeway-app/tests
git -C "/mnt/k/myproject/Plain sailing" commit -m "feat: refactor passenger app flow around services and stores"
```

## Task 6: 重构商家端工作台、车队与司机受限模式

**Files:**
- Modify: `luxeway-app/pages/provider/workbench.vue`
- Modify: `luxeway-app/pages/provider/bid_input.vue`
- Modify: `luxeway-app/pages/provider/my_fleet/index.vue`
- Modify: `luxeway-app/pages/provider/driver_management/index.vue`
- Modify: `luxeway-app/utils/dataManager.ts`
- Create: `luxeway-app/services/provider.ts`
- Create: `luxeway-app/types/provider.ts`
- Create: `luxeway-app/tests/providerWorkbench.spec.ts`

- [ ] **Step 1: 写失败测试，锁定“未审核商家不能报价”和“司机模式看不到经营入口”**

```ts
import { describe, expect, it } from 'vitest'
import { canQuoteDemand, visibleMenusForRole } from '../types/provider'

describe('provider access rules', () => {
  it('should block quote action when merchant review is pending', () => {
    expect(canQuoteDemand('PENDING')).toBe(false)
  })

  it('should expose task-only menus for driver mode', () => {
    expect(visibleMenusForRole('DRIVER')).toEqual(['TASKS', 'CURRENT_ORDER', 'PROFILE'])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/mnt/k/myproject/Plain sailing/luxeway-app" && npm run test -- providerWorkbench.spec.ts
```

Expected:

```text
Failed to resolve import ../types/provider
```

- [ ] **Step 3: 实现商家端权限模型与工作台服务**

```ts
// luxeway-app/types/provider.ts
export type MerchantReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ProviderRole = 'OWNER' | 'DISPATCHER' | 'DRIVER'

export function canQuoteDemand(status: MerchantReviewStatus) {
  return status === 'APPROVED'
}

export function visibleMenusForRole(role: ProviderRole) {
  if (role === 'DRIVER') {
    return ['TASKS', 'CURRENT_ORDER', 'PROFILE']
  }
  return ['WORKBENCH', 'ORDERS', 'FLEET', 'PROFILE']
}
```

```ts
// luxeway-app/services/provider.ts
export function createProviderService(request: (url: string, data?: unknown) => Promise<unknown>) {
  return {
    fetchWorkbench() {
      return request('/api/provider/workbench')
    },
    submitBid(payload: unknown) {
      return request('/api/provider/bids', payload)
    }
  }
}
```

- [ ] **Step 4: 跑测试并手工验证商家端**

```bash
cd "/mnt/k/myproject/Plain sailing/luxeway-app" && npm run test -- providerWorkbench.spec.ts
```

Expected:

```text
2 passed
```

Manual:

```text
在商家模式下验证：工作台可看待报价需求、已报价、进行中；车队页可维护车辆司机；司机模式只能看到任务页，不出现车队和报价入口
```

- [ ] **Step 5: 提交商家端与司机模式**

```bash
git -C "/mnt/k/myproject/Plain sailing" add luxeway-app/pages/provider/workbench.vue luxeway-app/pages/provider/bid_input.vue luxeway-app/pages/provider/my_fleet/index.vue luxeway-app/pages/provider/driver_management/index.vue luxeway-app/services/provider.ts luxeway-app/types/provider.ts luxeway-app/utils/dataManager.ts luxeway-app/tests/providerWorkbench.spec.ts
git -C "/mnt/k/myproject/Plain sailing" commit -m "feat: add provider workbench fleet and driver access rules"
```

## Task 7: 实现平台管理后台审核、监管与配置

**Files:**
- Create: `yuecheng-admin/src/main.ts`
- Create: `yuecheng-admin/src/App.vue`
- Create: `yuecheng-admin/src/router/index.ts`
- Create: `yuecheng-admin/src/layouts/AdminLayout.vue`
- Create: `yuecheng-admin/src/views/review/MerchantReviewPage.vue`
- Create: `yuecheng-admin/src/views/regulation/IncidentPage.vue`
- Create: `yuecheng-admin/src/views/config/DictionaryPage.vue`
- Create: `yuecheng-admin/src/services/admin.ts`
- Create: `yuecheng-admin/src/tests/router.spec.ts`

- [ ] **Step 1: 写失败测试，锁定后台最小导航结构**

```ts
import { describe, expect, it } from 'vitest'
import { adminRoutes } from '../router'

describe('adminRoutes', () => {
  it('should expose review regulation and config pages', () => {
    expect(adminRoutes.map(route => route.name)).toEqual([
      'merchant-review',
      'incident-regulation',
      'dictionary-config'
    ])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-admin" && npm run test -- router.spec.ts
```

Expected:

```text
No such file or directory
```

- [ ] **Step 3: 搭建后台最小壳、路由和页面**

```json
// yuecheng-admin/package.json
{
  "name": "yuecheng-admin",
  "private": true,
  "scripts": {
    "dev": "vite",
    "test": "vitest run"
  },
  "dependencies": {
    "vue": "^3.5.12",
    "vue-router": "^4.4.5",
    "element-plus": "^2.8.4"
  },
  "devDependencies": {
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  }
}
```

```ts
// yuecheng-admin/src/router/index.ts
export const adminRoutes = [
  { path: '/review/merchants', name: 'merchant-review' },
  { path: '/regulation/incidents', name: 'incident-regulation' },
  { path: '/config/dictionaries', name: 'dictionary-config' }
]
```

- [ ] **Step 4: 跑测试并启动后台**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-admin" && npm run test -- router.spec.ts
```

Expected:

```text
1 passed
```

Run:

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-admin" && npm run dev
```

Expected:

```text
VITE v5 ready in
```

- [ ] **Step 5: 提交后台壳工程**

```bash
git -C "/mnt/k/myproject/Plain sailing" add yuecheng-admin
git -C "/mnt/k/myproject/Plain sailing" commit -m "feat: add admin review regulation and config shell"
```

## Task 8: 联调、验收与上线前检查

**Files:**
- Create: `doc/2026-04-08-yuecheng-v1-acceptance-checklist.md`
- Create: `yuecheng-api/test/v1-acceptance-flow.spec.ts`

- [ ] **Step 1: 写失败测试，锁定完整主链路验收**

```ts
import { describe, expect, it } from 'vitest'
import { AcceptanceFlowResult } from './v1-acceptance-flow-result'

describe('AcceptanceFlowResult', () => {
  it('should complete full v1 flow', () => {
    const result = new AcceptanceFlowResult(true, true, true, true, true, true, true)

    expect(result.allPassed()).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test v1-acceptance-flow.spec.ts
```

Expected:

```text
Failed to resolve import ./v1-acceptance-flow-result
```

- [ ] **Step 3: 建立验收清单、端到端测试骨架和发布检查项**

```ts
// yuecheng-api/test/v1-acceptance-flow-result.ts
export class AcceptanceFlowResult {
  constructor(
    private readonly merchantOnboardingPassed: boolean,
    private readonly demandPublishPassed: boolean,
    private readonly bidSelectionPassed: boolean,
    private readonly orderTimelinePassed: boolean,
    private readonly feeConfirmPassed: boolean,
    private readonly invoicePassed: boolean,
    private readonly incidentPassed: boolean
  ) {}

  allPassed() {
    return this.merchantOnboardingPassed
      && this.demandPublishPassed
      && this.bidSelectionPassed
      && this.orderTimelinePassed
      && this.feeConfirmPassed
      && this.invoicePassed
      && this.incidentPassed
  }
}
```

```md
# 悦程 V1 验收清单

- [ ] 商家入驻申请并审核通过
- [ ] 乘客发布三类主单型需求
- [ ] 多商家可提交报价并完成选单
- [ ] 订单进入等待中状态并自动计算等待时长
- [ ] 商家录入费用明细并自动汇总
- [ ] 商家上传发票、乘客下载发票
- [ ] 异常报备可在后台留痕处理
```

- [ ] **Step 4: 跑全量测试并做三端联调**

```bash
cd "/mnt/k/myproject/Plain sailing/yuecheng-api" && pnpm test
cd "/mnt/k/myproject/Plain sailing/luxeway-app" && npm run test
cd "/mnt/k/myproject/Plain sailing/yuecheng-admin" && npm run test
```

Expected:

```text
all tests passed
```

Manual:

```text
完成一次“商家入驻 -> 乘客发单 -> 商家报价 -> 乘客选单 -> 指派司机 -> 等待中 -> 费用确认 -> 上传发票 -> 异常报备”的全链路联调
```

- [ ] **Step 5: 提交验收和发布检查点**

```bash
git -C "/mnt/k/myproject/Plain sailing" add doc/2026-04-08-yuecheng-v1-acceptance-checklist.md yuecheng-api/test
git -C "/mnt/k/myproject/Plain sailing" commit -m "test: add v1 acceptance checklist and end-to-end coverage"
```

## 自检结论

### Spec 覆盖检查

- 商家准入与审核：Task 2、Task 7
- 三类主单型需求：Task 3、Task 5
- 多商家报价与选单：Task 3、Task 5、Task 6
- 履约细粒度状态与等待时长：Task 4、Task 6
- 费用明细、发票、异常：Task 4、Task 8
- 平台后台审核、监管、配置：Task 7

### 计划结构检查

- 未发现计划禁用占位词
- 每个任务都给出目标文件、失败测试、命令和预期输出
- 后续任务中使用的核心名字与前文保持一致：`DemandType`、`OrderStatus`、`WAITING_PASSENGER`、`MerchantReviewStatus`

### 执行建议

- 先执行 Task 1 到 Task 4，把 NestJS 后端主链路跑通
- 再并行执行 Task 5、Task 6、Task 7
- 最后执行 Task 8 做联调验收
