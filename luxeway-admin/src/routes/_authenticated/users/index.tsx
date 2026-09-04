import z from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Users } from '@/features/users'
import { roles } from '@/features/users/data/data'

const usersSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  // Facet filters
  status: z
    .array(
      z.union([
        z.literal('active'),
        z.literal('inactive'),
        z.literal('invited'),
        z.literal('suspended'),
      ])
    )
    .optional()
    .catch([]),
  role: z
    .array(z.enum(roles.map((r) => r.value as (typeof roles)[number]['value'])))
    .optional()
    .catch([]),
  // Per-column text filter (example for username)
  username: z.string().optional().catch(''),
})

// 检查用户管理权限
function checkUserPermission(context: any) {
  const permissions = context.permissions || []
  const roles = context.roles || []

  const hasAdminRole = roles.some((r: { name: string }) => r.name === 'admin')
  const hasUserView = permissions.includes('user:view')

  if (!hasAdminRole && !hasUserView) {
    throw redirect({
      to: '/403',
      search: {
        message: '您没有用户管理权限',
      },
    })
  }
}

export const Route = createFileRoute('/_authenticated/users/')({
  beforeLoad: ({ context }) => checkUserPermission(context),
  validateSearch: usersSearchSchema,
  component: Users,
})
