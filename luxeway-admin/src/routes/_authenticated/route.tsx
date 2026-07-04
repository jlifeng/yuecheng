import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { getCookie } from '@/lib/cookies'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    // 检查是否已登录
    const token = getCookie('luxeway_admin_token')
    const userData = getCookie('luxeway_user_data')

    if (!token || !userData) {
      // 未登录，跳转到登录页
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: window.location.pathname,
        },
      })
    }

    // 解析用户数据
    try {
      const user = JSON.parse(userData)
      return {
        user,
        permissions: user.permissions || [],
        roles: user.roles || [],
      }
    } catch {
      // 解析失败，跳转到登录页
      throw redirect({
        to: '/sign-in',
      })
    }
  },
  component: AuthenticatedLayout,
})
