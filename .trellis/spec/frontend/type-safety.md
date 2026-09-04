# Type Safety

> Type patterns in the LuxeWay mini-program (TypeScript + uni-app).

---

## Overview

- TypeScript with `@/types/*` for shared domain types (`order.ts`, `demand.ts`, `provider.ts`). Use `import type` for type-only imports.
- The full `tsc --noEmit` is currently blocked by missing ambient mini-program typings (`@dcloudio/types`, `mini-types`, `miniprogram-api-typings`). Use `--skipLibCheck` for a meaningful check; do not "fix" it by deleting real types.

## Type Organization

- Shared domain types → `luxeway-app/types/<domain>.ts`.
- Status enums as string-literal unions + a `const` mirror object: e.g. `FulfillmentStatus` union and `FULFILLMENT_STATUS = {...} as const satisfies Record<string, FulfillmentStatus>` in `utils/fulfillmentStateMachine.ts`.
- DB row shapes use camelCase client types (`OrderFee`, `OrderEvent`) with a mapper function; do not leak snake_case into the UI layer.

## Status enums: two layers (Approach B)

- `DemandStatus` (coarse, on `demands.status`): BIDDING / ACCEPTED / IN_PROGRESS / COMPLETED / CANCELLED (+ PENDING).
- `FulfillmentStatus` (fine, on `demands.fulfillment_status`): PENDING_ASSIGN → ASSIGNED → ON_THE_WAY → ARRIVED_PICKUP → (WAITING_PASSENGER?) → PASSENGER_BOARDED → (ARRIVING_DESTINATION?) → ARRIVED_DESTINATION → PENDING_FEE_CONFIRM → COMPLETED (+ CANCELLED, ABNORMAL_PROCESSING).
- The mapping between layers lives in `getDemandStatusForFulfillment`. **Never** write a fine node directly to `demands.status` and never write a coarse status into `fulfillment_status`.

## Validation

- Runtime validation is manual at the service boundary (e.g. `toNonNegNumber` for fees, ownership checks before assignment). Reject invalid input with a thrown `Error` whose message is user-facing (`'报价提交失败'`), then surface via `uni.showToast`.
- No Zod/Yup in V1. Keep validators as small pure functions so they stay testable.

## Common Patterns

- `as const satisfies Record<string, T>` for status maps (gives both literal type + value object).
- Mappers for DB↔UI shape (`mapOrderFeeToSummary`).
- Optional fields marked `?` with explicit `| null` where the DB allows NULL.

## Forbidden Patterns

- `any` for new return types — use `unknown` then narrow, or a real interface. Existing `any` in services is legacy; do not expand it.
- Hardcoding a status string in a component instead of importing from the status map.
- Treating the coarse and fine status enums as interchangeable.
