import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Merchants } from '@/features/merchants'

const merchantsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(
      z.union([
        z.literal('pending'),
        z.literal('approved'),
        z.literal('rejected'),
      ])
    )
    .optional()
    .catch([]),
  search: z.string().optional().catch(''),
})

// 检查商家管理权限
function checkMerchantPermission(context: any) {
  const permissions = context.permissions || []
  const roles = context.roles || []

  // 管理员或有商家查看权限的用户可以访问
  const hasAdminRole = roles.some((r: { name: string }) => r.name === 'admin')
  const hasMerchantView = permissions.includes('merchant:view')

  if (!hasAdminRole && !hasMerchantView) {
    throw redirect({
      to: '/403',
      search: {
        message: '您没有商家管理权限',
      },
    })
  }
}

export const Route = createFileRoute('/_authenticated/merchants/')({
  beforeLoad: ({ context }) => checkMerchantPermission(context),
  validateSearch: merchantsSearchSchema,
  component: Merchants,
})