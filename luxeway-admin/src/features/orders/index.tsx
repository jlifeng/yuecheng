import { useEffect, useState, useRef } from 'react'
import { MapPin, Clock, Users, Eye, Trash2, Search as SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { getDemands, deleteDemand } from '@/lib/api'
import type { Demand } from '@/lib/supabase'

interface DemandWithExtras extends Demand {
  passenger?: { id: string; name: string | null; nickname: string | null; phone: string | null }
  bids?: { count: number }[]
}

export function Orders() {
  const [orders, setOrders] = useState<DemandWithExtras[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const [searchInputValue, setSearchInputValue] = useState('')

  const searchRef = useRef('')
  const statusRef = useRef('all')
  const loadingRef = useRef(false)
  const mountedRef = useRef(false)

  const loadData = async (page: number) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const result = await getDemands({
        status: statusRef.current === 'all' ? undefined : statusRef.current as any,
        search: searchRef.current,
        page,
        pageSize,
      })
      setOrders(result.data || [])
      setTotal(result.count || 0)
      setCurrentPage(page)
    } catch {
      // Keep the existing data visible when a refresh fails.
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      loadData(1)
    }
  }, [])

  const handleSearch = () => {
    searchRef.current = searchInputValue
    loadData(1)
  }

  const handleSearchInputChange = (value: string) => {
    setSearchInputValue(value)
  }

  const handleStatusChange = (value: string) => {
    statusRef.current = value
    loadData(1)
  }

  const handlePageChange = (page: number) => {
    loadData(page)
  }

  // 打开删除确认对话框
  const openDeleteDialog = (orderId: string) => {
    setOrderToDelete(orderId)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return

    try {
      await deleteDemand(orderToDelete)
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
      loadData(currentPage)
    } catch {
      // The API helper reports the failure through its return path.
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BIDDING':
        return <Badge variant='outline'>等待报价</Badge>
      case 'ACCEPTED':
        return <Badge variant='secondary'>已确认</Badge>
      case 'IN_PROGRESS':
        return <Badge variant='default' className='bg-blue-600'>进行中</Badge>
      case 'COMPLETED':
        return <Badge variant='default' className='bg-green-600'>已完成</Badge>
      case 'CANCELLED':
        return <Badge variant='destructive'>已取消</Badge>
      case 'PENDING':
        return <Badge variant='outline'>待发布</Badge>
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>订单管理</h2>
          <p className='text-muted-foreground'>查看所有订单，处理异常情况</p>
        </div>

        {/* 筛选栏 */}
        <div className='flex gap-4 items-center'>
          <Select defaultValue='all' onValueChange={handleStatusChange}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='选择状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='BIDDING'>等待报价</SelectItem>
              <SelectItem value='ACCEPTED'>已确认</SelectItem>
              <SelectItem value='IN_PROGRESS'>进行中</SelectItem>
              <SelectItem value='COMPLETED'>已完成</SelectItem>
              <SelectItem value='CANCELLED'>已取消</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder='搜索地址关键词'
            value={searchInputValue}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            className='w-[300px]'
          />
          <Button onClick={handleSearch}>
            <SearchIcon className='h-4 w-4' />
          </Button>
        </div>

        {/* 订单表格 */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[80px]'>状态</TableHead>
                <TableHead className='w-[250px]'>路线</TableHead>
                <TableHead className='w-[120px]'>乘客</TableHead>
                <TableHead className='w-[180px]'>出发时间</TableHead>
                <TableHead className='w-[80px]'>人数</TableHead>
                <TableHead className='w-[80px]'>报价数</TableHead>
                <TableHead className='w-[120px]'>创建时间</TableHead>
                <TableHead className='w-[100px]'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    <p className='text-muted-foreground'>加载中...</p>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    <p className='text-muted-foreground'>暂无订单数据</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <MapPin className='h-3 w-3 text-muted-foreground' />
                        <span className='text-sm truncate max-w-[200px]'>
                          {order.start_address} → {order.end_address}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Users className='h-3 w-3 text-muted-foreground' />
                        {order.passenger?.name || order.passenger?.nickname || '未知'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Clock className='h-3 w-3 text-muted-foreground' />
                        <span className='text-sm'>
                          {formatTime(order.earliest_departure)}-{formatTime(order.latest_departure).split(' ')[1]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{order.passenger_count}</TableCell>
                    <TableCell>{order.bids?.[0]?.count || 0}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-1'>
                        <Button size='sm' variant='outline'>
                          <Eye className='h-3 w-3' />
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={() => openDeleteDialog(order.id)}
                        >
                          <Trash2 className='h-3 w-3' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between'>
            <p className='text-sm text-muted-foreground'>
              共 {total} 条记录，第 {currentPage} / {totalPages} 页
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href='#'
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) handlePageChange(currentPage - 1)
                    }}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href='#'
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(pageNum)
                        }}
                        isActive={currentPage === pageNum}
                        className='cursor-pointer'
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  )
                })}

                <PaginationItem>
                  <PaginationNext
                    href='#'
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < totalPages) handlePageChange(currentPage + 1)
                    }}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Main>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该订单，删除后无法恢复。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className='bg-destructive text-destructive-foreground'>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
