# State Management

> How state is managed in the LuxeWay mini-program (uni-app + Vue 3).

---

## Overview

- UI state lives in component-level `ref` / `computed` (Setup Script). There is **no global store** (no Pinia/Vuex) — cross-page data is re-fetched via Supabase REST on each page `onLoad` / `onShow`.
- Session/identity is persisted in `uni.getStorageSync`: `accessToken`, `refreshToken`, `userId`, `userRole`, `userInfo`, `userProfile`, `userRoles`, `userPermissions`. Read these at the service layer, not deep in components.
- Server state is **not cached** — pages treat each load as authoritative. Derived display state (status copy, timeline, fee summary) is computed from the loaded payload via pure utils.

## State Categories

- **Local UI state**: `ref` in `<script setup>` (loading flags, modal visibility, form inputs).
- **Session state**: `uni.getStorageSync` keys above; mutated only via auth services (`wechatAuth.ts`, `dataManager.ts`).
- **Server state**: fetched into a `ref<any>` on page load; never assumed fresh across navigations.
- **Derived state**: `computed` from a loaded detail `ref`, often delegating to pure utils (`fulfillmentStateMachine.ts`, `fulfillmentStatusCopy.ts`, `useOrderTimeline.ts`).

## Pure utils over mixed concerns

- Keep transition/copy logic in pure functions under `utils/`, **testable without uni-app**. Example: `getPrimaryNextAction(fulfillment)`, `canTransition(from, to)`, `mapOrderFeeToSummary(fee)`.
- Components consume these via `computed`; components should NOT inline status maps or fee math.
- New status/flow: add a util + a vitest spec (`tests/<name>.spec.ts`) next to existing specs.

## When to Use Global State

- Not yet warranted. Promote to a store only when ≥2 unrelated pages must react to the same live mutation (none today). Until then, re-fetching on navigation is the convention.

## Common Mistakes

- Caching order detail across pages and assuming the fulfillment node didn't advance — always re-fetch on `onLoad`.
- Showing mock fallback data when a Supabase read returns empty (e.g. displaying a merchant contact as the driver). Return an explicit "待指派" state instead of a fake value.
- Mutating `userInfo` in storage without going through the session manager.
