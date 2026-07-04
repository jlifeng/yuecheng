import {
  LayoutDashboard,
  Store,
  Users,
  Car,
  BarChart3,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: '管理员',
    email: 'admin@luxeway.com',
    avatar: '/avatars/admin.jpg',
  },
  navGroups: [
    {
      title: '管理',
      items: [
        {
          title: '仪表盘',
          url: '/',
          icon: LayoutDashboard,
          // 仪表盘所有人可见
        },
        {
          title: '商家管理',
          url: '/merchants',
          icon: Store,
          permission: 'merchant:view',
        },
        {
          title: '用户管理',
          url: '/users',
          icon: Users,
          permission: 'user:view',
        },
        {
          title: '订单管理',
          url: '/orders',
          icon: Car,
          permission: 'order:view',
        },
        {
          title: '数据统计',
          url: '/statistics',
          icon: BarChart3,
          permission: 'stats:view',
        },
      ],
    },
  ],
}

// 获取用户可见的导航项
export function getVisibleNavItems(
  navGroups: typeof sidebarData.navGroups,
  permissions: string[],
  roles: Array<{ name: string }>,
  pendingMerchantCount: number = 0
) {
  const isAdmin = roles.some(r => r.name === 'admin')

  return navGroups.map(group => ({
    ...group,
    items: group.items.map(item => {
      // 如果是商家管理，动态设置 badge
      if (item.url === '/merchants' && pendingMerchantCount > 0) {
        return { ...item, badge: pendingMerchantCount.toString() }
      }
      // 其他项删除静态 badge（商家管理的静态 badge 也要删除）
      if (item.url === '/merchants') {
        return { ...item, badge: undefined }
      }
      return item
    }).filter(item => {
      // 如果是管理员，显示所有
      if (isAdmin) return true

      // 如果没有设置权限要求，默认可见
      if (!item.permission) return true

      // 检查是否有所需权限
      return permissions.includes(item.permission)
    }),
  })).filter(group => group.items.length > 0)
}