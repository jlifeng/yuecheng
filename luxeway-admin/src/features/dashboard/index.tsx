import { useEffect, useState } from 'react'
import { Store, Users, Car, DollarSign, AlertCircle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getStatistics, getPendingMerchantsCount, getMerchantRanking } from '@/lib/api'
import { usePermissions } from '@/stores/auth-store'

interface Stats {
  merchantCount: number
  userCount: number
  completedOrders: number
  pendingOrders: number
  totalRevenue: number
  pendingMerchants: number
  todayNewUsers: number
  todayNewOrders: number
}

interface MerchantRankingItem {
  id: string
  company_name: string | null
  contact_name: string
  order_count: number
  rating_avg: number
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [ranking, setRanking] = useState<MerchantRankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const permissions = usePermissions()

  useEffect(() => {
    async function loadStats() {
      try {
        const statsData = await getStatistics()
        setStats(statsData)

        // 只有有商家审核权限的用户才加载待审核数量
        if (permissions.hasPermission('merchant:approve') || permissions.isAdmin()) {
          const pending = await getPendingMerchantsCount()
          setPendingCount(pending)
        }

        const rankingData = await getMerchantRanking(5)
        setRanking(rankingData)
      } catch (error) {
        console.error('Failed to load statistics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>LuxeWay 管理后台</h1>
            <p className='text-muted-foreground'>
              悦途出行平台数据概览
            </p>
          </div>
          {(pendingCount > 0 && (permissions.hasPermission('merchant:approve') || permissions.isAdmin())) && (
            <Button variant='destructive' className='gap-2' onClick={() => window.location.href = '/merchants?status=pending'}>
              <AlertCircle className='h-4 w-4' />
              {pendingCount} 个商家待审核
            </Button>
          )}
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <>
            {/* 核心指标卡片 */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>商家总数</CardTitle>
                  <Store className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats?.merchantCount || 0}</div>
                  <p className='text-xs text-muted-foreground'>
                    已通过审核的商家
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>用户总数</CardTitle>
                  <Users className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats?.userCount || 0}</div>
                  <p className='text-xs text-muted-foreground'>
                    今日新增 {stats?.todayNewUsers || 0} 人
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>完成订单</CardTitle>
                  <Car className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats?.completedOrders || 0}</div>
                  <p className='text-xs text-muted-foreground'>
                    进行中 {stats?.pendingOrders || 0} 个
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>总收入</CardTitle>
                  <DollarSign className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>¥{stats?.totalRevenue?.toLocaleString() || 0}</div>
                  <p className='text-xs text-muted-foreground'>
                    已完成订单总金额
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 快捷入口 - 基于权限显示 */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6'>
              {(permissions.hasPermission('merchant:view') || permissions.isAdmin()) && (
                <Card className='cursor-pointer hover:border-primary' onClick={() => window.location.href = '/merchants'}>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Store className='h-5 w-5' />
                      商家管理
                    </CardTitle>
                    <CardDescription>审核商家、查看车队信息</CardDescription>
                  </CardHeader>
                </Card>
              )}
              {(permissions.hasPermission('user:view') || permissions.isAdmin()) && (
                <Card className='cursor-pointer hover:border-primary' onClick={() => window.location.href = '/users'}>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Users className='h-5 w-5' />
                      用户管理
                    </CardTitle>
                    <CardDescription>查看用户、修改角色</CardDescription>
                  </CardHeader>
                </Card>
              )}
              {(permissions.hasPermission('order:view') || permissions.isAdmin()) && (
                <Card className='cursor-pointer hover:border-primary' onClick={() => window.location.href = '/orders'}>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Car className='h-5 w-5' />
                      订单管理
                    </CardTitle>
                    <CardDescription>查看订单、处理异常</CardDescription>
                  </CardHeader>
                </Card>
              )}
              {(permissions.hasPermission('stats:view') || permissions.isAdmin()) && (
                <Card className='cursor-pointer hover:border-primary' onClick={() => window.location.href = '/statistics'}>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <TrendingUp className='h-5 w-5' />
                      数据统计
                    </CardTitle>
                    <CardDescription>平台数据分析</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>

            {/* 商家活跃度排行 */}
            <Card>
              <CardHeader>
                <CardTitle>商家活跃度排行</CardTitle>
                <CardDescription>按订单数排名的前5名商家</CardDescription>
              </CardHeader>
              <CardContent>
                {ranking.length === 0 ? (
                  <p className='text-muted-foreground text-center py-4'>暂无商家数据</p>
                ) : (
                  <div className='space-y-3'>
                    {ranking.map((merchant, index) => (
                      <div key={merchant.id} className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <Badge variant={index === 0 ? 'default' : 'outline'}>
                            {index + 1}
                          </Badge>
                          <div>
                            <p className='font-medium'>{merchant.company_name || merchant.contact_name}</p>
                            <p className='text-xs text-muted-foreground'>
                              评分 {merchant.rating_avg.toFixed(1)}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>{merchant.order_count} 订单</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Main>
    </>
  )
}