import { useEffect, useState } from 'react'
import { Store, Users, Car, DollarSign, TrendingUp, BarChart3 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { getStatistics, getMerchantRanking, getOrderCompletionStats } from '@/lib/api'

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

interface CompletionStats {
  COMPLETED: number
  CANCELLED: number
  BIDDING: number
  ACCEPTED: number
  IN_PROGRESS: number
  PENDING: number
  total: number
  completionRate: number
}

interface MerchantRankingItem {
  id: string
  company_name: string | null
  contact_name: string
  order_count: number
  rating_avg: number
}

export function Statistics() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null)
  const [ranking, setRanking] = useState<MerchantRankingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      try {
        const statsData = await getStatistics()
        setStats(statsData)

        const completionData = await getOrderCompletionStats()
        setCompletionStats(completionData)

        const rankingData = await getMerchantRanking(10)
        setRanking(rankingData)
      } catch {
        // The API helpers return safe fallback values; keep the statistics page mounted.
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
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>数据统计</h1>
          <p className='text-muted-foreground'>
            LuxeWay 平台运营数据分析
          </p>
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <>
            {/* 核心指标 */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>商家总数</CardTitle>
                  <Store className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats?.merchantCount || 0}</div>
                  <p className='text-xs text-muted-foreground'>
                    已通过审核
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
                    今日新增 {stats?.todayNewUsers || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>订单总数</CardTitle>
                  <Car className='h-4 w-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{stats?.completedOrders || 0}</div>
                  <p className='text-xs text-muted-foreground'>
                    进行中 {stats?.pendingOrders || 0}
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
                    已完成订单金额
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 订单完成率 */}
            <Card className='mb-6'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <BarChart3 className='h-5 w-5' />
                  订单完成率
                </CardTitle>
                <CardDescription>
                  总订单数：{completionStats?.total || 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm'>已完成</span>
                      <span className='text-sm font-medium'>{completionStats?.completionRate || 0}%</span>
                    </div>
                    <Progress value={completionStats?.completionRate || 0} className='h-2' />
                    <p className='text-xs text-muted-foreground mt-1'>{completionStats?.COMPLETED || 0} 个订单</p>
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm'>已取消</span>
                      <span className='text-sm font-medium'>
                        {completionStats?.total ? Math.round((completionStats.CANCELLED / completionStats.total) * 100) : 0}%
                      </span>
                    </div>
                    <Progress
                      value={completionStats?.total ? (completionStats.CANCELLED / completionStats.total) * 100 : 0}
                      className='h-2 bg-red-100 [&>div]:bg-red-500'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>{completionStats?.CANCELLED || 0} 个订单</p>
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm'>进行中</span>
                      <span className='text-sm font-medium'>
                        {completionStats?.total ? Math.round(((completionStats.BIDDING + completionStats.ACCEPTED + completionStats.IN_PROGRESS) / completionStats.total) * 100) : 0}%
                      </span>
                    </div>
                    <Progress
                      value={completionStats?.total ? ((completionStats.BIDDING + completionStats.ACCEPTED + completionStats.IN_PROGRESS) / completionStats.total) * 100 : 0}
                      className='h-2 bg-blue-100 [&>div]:bg-blue-500'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      {(completionStats?.BIDDING || 0) + (completionStats?.ACCEPTED || 0) + (completionStats?.IN_PROGRESS || 0)} 个订单
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 商家排行 */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5' />
                  商家活跃度排行
                </CardTitle>
                <CardDescription>
                  按订单数排名的前10名商家
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ranking.length === 0 ? (
                  <p className='text-muted-foreground text-center py-4'>暂无商家数据</p>
                ) : (
                  <div className='space-y-3'>
                    {ranking.map((merchant, index) => (
                      <div key={merchant.id} className='flex items-center justify-between py-2 border-b last:border-0'>
                        <div className='flex items-center gap-3'>
                          <Badge variant={index < 3 ? 'default' : 'outline'}>
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
