import { createFileRoute, redirect } from '@tanstack/react-router'
import { Statistics } from '@/features/statistics'

// 检查数据统计权限
function checkStatsPermission(context: any) {
  const permissions = context.permissions || []
  const roles = context.roles || []

  const hasAdminRole = roles.some((r: { name: string }) => r.name === 'admin')
  const hasStatsView = permissions.includes('stats:view')

  if (!hasAdminRole && !hasStatsView) {
    throw redirect({
      to: '/403',
      search: {
        message: '您没有数据统计查看权限',
      },
    })
  }
}

export const Route = createFileRoute('/_authenticated/statistics/')({
  beforeLoad: ({ context }) => checkStatsPermission(context),
  component: Statistics,
})