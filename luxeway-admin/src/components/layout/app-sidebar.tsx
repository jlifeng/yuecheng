import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData, getVisibleNavItems } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { AppTitle } from './app-title'
import { useAuthStore } from '@/stores/auth-store'
import { usePendingStore } from '@/stores/pending-store'
import { useEffect } from 'react'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { auth } = useAuthStore()
  const { merchantCount, refreshMerchantCount } = usePendingStore()

  // 初始化时获取待审核数量
  useEffect(() => {
    refreshMerchantCount()
  }, [refreshMerchantCount])

  // 根据用户权限过滤导航项，并动态设置 badge
  const visibleNavGroups = getVisibleNavItems(
    sidebarData.navGroups,
    auth.user?.permissions || [],
    auth.user?.roles || [],
    merchantCount
  )

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {visibleNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
