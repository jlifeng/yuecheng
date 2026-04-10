I'm using the writing-plans skill to create the implementation plan.

# Task 5: Passenger Layer Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以服务层 + 状态层 + 页面层的分层方式完成乘客端重构，让页面只关注 UI 与交互，业务逻辑移到可复用的 composable/service/store 中。
**Architecture:** 服务层封装 HTTP/业务 API，组合式逻辑 (useDemandForm/useOrderTimeline) 负责状态与 payload 组织，页面通过 store/composable 订阅状态并触发动作。
**Tech Stack:** Vue 3 + Composition API、TypeScript, UniApp 运行时, Vitest 作为测试框架。

---

### Task 1: 编写 useDemandForm 失败测试

**Files:**
- Modify: `luxeway-app/tests/useDemandForm.spec.ts`

- [ ] Step 1: 用 Vitest 编写验证 useDemandForm 的测试，确保暴露的 setter 与 toPayload 将表单状态归一化为 API 字段。示例代码：
    import { describe, expect, it } from 'vitest'
    import { useDemandForm } from '../composables/useDemandForm'

    describe('useDemandForm', () => {
      it('should normalize form data into a demand payload', () => {
        const { setStartLocation, setEndLocation, setPassengerCount, setRequirements, setDepartureWindow, toPayload } = useDemandForm()
        setStartLocation('起点')
        setEndLocation('终点')
        setPassengerCount(3)
        setRequirements('有大件')
        setDepartureWindow({ earliest: '2026-05-01T08:00:00', latest: '2026-05-01T12:00:00' })

        expect(toPayload()).toEqual({
          origin: '起点',
          destination: '终点',
          passengerCount: 3,
          requirements: '有大件',
          departureWindow: {
            earliest: '2026-05-01T08:00:00',
            latest: '2026-05-01T12:00:00'
          }
        })
      })
    })

- [ ] Step 2: 运行 `npm test -- tests/useDemandForm.spec.ts`，预期失败（模块或导出缺失）。命令输出示例：
    npm test -- tests/useDemandForm.spec.ts
    Expected: fail with "Cannot find module '../composables/useDemandForm'" or missing exports.

### Task 2: 实现 useDemandForm composable

**Files:**
- Create: `luxeway-app/composables/useDemandForm.ts`
- Use: `luxeway-app/pages/index/index.vue` 和 `luxeway-app/pages/passenger/post_demand.vue`

- [ ] Step 1: 编写 useDemandForm，提供可响应的 formState、setXXX 方法与 toPayload()，示例实现：
    import { reactive } from 'vue'

    type Window = { earliest: string; latest: string }

    export function useDemandForm() {
      const formState = reactive({
        startLocation: '',
        endLocation: '',
        passengerCount: 0,
        requirements: '',
        departureWindow: { earliest: '', latest: '' }
      })

      const setStartLocation = (value: string) => { formState.startLocation = value }
      const setEndLocation = (value: string) => { formState.endLocation = value }
      const setPassengerCount = (count: number) => { formState.passengerCount = count }
      const setRequirements = (value: string) => { formState.requirements = value }
      const setDepartureWindow = (window: Window) => {
        formState.departureWindow.earliest = window.earliest
        formState.departureWindow.latest = window.latest
      }

      const toPayload = () => ({
        origin: formState.startLocation,
        destination: formState.endLocation,
        passengerCount: formState.passengerCount,
        requirements: formState.requirements,
        departureWindow: { ...formState.departureWindow }
      })

      return {
        formState,
        setStartLocation,
        setEndLocation,
        setPassengerCount,
        setRequirements,
        setDepartureWindow,
        toPayload
      }
    }

- [ ] Step 2: 运行 `npm test -- tests/useDemandForm.spec.ts`，期望通过。
    npm test -- tests/useDemandForm.spec.ts
    Expected: pass all specs.

### Task 3: 编写 useOrderTimeline 失败测试

**Files:**
- Create: `luxeway-app/tests/useOrderTimeline.spec.ts`

- [ ] Step 1: 增加测试构造 useOrderTimeline 并验证 timeline 结构以及 feeSummary.total 字段，示例：
    import { describe, expect, it } from 'vitest'
    import { useOrderTimeline } from '../composables/useOrderTimeline'

    describe('useOrderTimeline', () => {
      it('normalizes timeline entries and fee summary', () => {
        const { setStatus, timeline, feeSummary } = useOrderTimeline()
        setStatus('FINISHED', 420)

        expect(timeline.value[0]).toHaveProperty('status', 'CONFIRMED')
        expect(feeSummary.value.total).toBe(420)
      })
    })

- [ ] Step 2: 运行 `npm test -- tests/useOrderTimeline.spec.ts`，预期因模块缺失或导出不完整而失败。
    npm test -- tests/useOrderTimeline.spec.ts
    Expected: fail for missing `useOrderTimeline`.

### Task 4: 实现 useOrderTimeline 与 order store

**Files:**
- Create: `luxeway-app/composables/useOrderTimeline.ts`
- Create: `luxeway-app/stores/order.ts`
- Use: `luxeway-app/pages/order/detail.vue`

- [ ] Step 1: 实现 useOrderTimeline 依赖 store，返回 timeline、feeSummary、setStatus，示例实现：
    import { computed } from 'vue'
    import { useOrderStore } from '../stores/order'

    const statusMap: Record<string, string> = {
      CONFIRMED: '订单确认中',
      ARRIVED: '司机已到达',
      WAITING: '司机等待',
      IN_PROGRESS: '行程中',
      FINISHED: '行程已完成'
    }

    export function useOrderTimeline() {
      const store = useOrderStore()
      const timeline = computed(() =>
        store.statusHistory.map(entry => ({ ...entry, label: statusMap[entry.status] || '未知状态' }))
      )
      const feeSummary = computed(() => ({ total: store.totalFee, status: store.currentStatus }))
      const setStatus = (status: string, totalFee = store.totalFee) => {
        store.currentStatus = status
        store.totalFee = totalFee
        store.statusHistory.push({ status, timestamp: Date.now() })
      }

      return { timeline, feeSummary, setStatus }
    }

- [ ] Step 2: 实现 order store
    import { reactive } from 'vue'

    const state = reactive({
      currentStatus: 'CONFIRMED',
      totalFee: 0,
      statusHistory: [{ status: 'CONFIRMED', timestamp: Date.now() }]
    })

    export function useOrderStore() {
      return state
    }

- [ ] Step 3: 运行 `npm test -- tests/useOrderTimeline.spec.ts`，期望通过。
    npm test -- tests/useOrderTimeline.spec.ts
    Expected: pass all specs.

### Task 5: 引入服务层并重构页面

**Files:**
- Create: `luxeway-app/services/http.ts`
- Create: `luxeway-app/services/passenger.ts`
- Modify: `luxeway-app/pages/index/index.vue`
- Modify: `luxeway-app/pages/passenger/post_demand.vue`
- Modify: `luxeway-app/pages/passenger/bid_list.vue`
- Modify: `luxeway-app/pages/order/detail.vue`

- [ ] Step 1: 实现 `services/http.ts` 与 `services/passenger.ts`，前者暴露 request<T>，后者包裹 publishDemand/fetchOngoingTrips，例如：
    export type HttpMethod = 'GET' | 'POST'
    export function request<T>(config: { method: HttpMethod; url: string; data?: unknown }) {
      return Promise.resolve({ data: null as unknown as T })
    }
    import { request } from './http'
    export function publishDemand(payload: unknown) {
      return request({ method: 'POST', url: '/api/demands', data: payload })
    }
    export function fetchOngoingTrips() {
      return request({ method: 'GET', url: '/api/demands/ongoing' })
    }

- [ ] Step 2: 页面调用 useDemandForm/useOrderTimeline/useOrderStore，并将原本的地图、picker、时间选择、 modal 逻辑拆分给 composable；bid_list 与 order/detail 仅呈现数据与事件。

- [ ] Step 3: 运行 `npm test`，确保所有 spec 通过。
    npm test
    Expected: pass (包含 useDemandForm 与 useOrderTimeline specs).

Plan complete and saved to `docs/superpowers/plans/2026-04-09-task5-passenger-layered.md`. Two execution options:
1. Subagent-Driven (recommended) - dispatch a fresh subagent per task with reviews.
2. Inline Execution - continue using executing-plans for batch updates with checkpoints.
Which approach?
