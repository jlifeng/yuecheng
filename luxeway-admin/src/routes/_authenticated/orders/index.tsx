import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Orders } from '@/features/orders'

const ordersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(
      z.union([
        z.literal('PENDING'),
        z.literal('BIDDING'),
        z.literal('ACCEPTED'),
        z.literal('IN_PROGRESS'),
        z.literal('COMPLETED'),
        z.literal('CANCELLED'),
      ])
    )
    .optional()
    .catch([]),
  search: z.string().optional().catch(''),
})

// 检查订单管理权限
function checkOrderPermission(context: any) {
  const permissions = context.permissions || []
  const roles = context.roles || []

  const hasAdminRole = roles.some((r: { name: string }) => r.name === 'admin')
  const hasOrderView = permissions.includes('order:view')

  if (!hasAdminRole && !hasOrderView) {
    throw redirect({
      to: '/403',
      search: {
        message: '您没有订单管理权限',
      },
    })
  }
}

export const Route = createFileRoute('/_authenticated/orders/')({
  beforeLoad: ({ context }) => checkOrderPermission(context),
  validateSearch: ordersSearchSchema,
  component: Orders,
})