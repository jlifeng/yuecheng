import { useEffect, useState, useRef } from 'react'
import { Store, Phone, Calendar, Check, X, Eye, Ban, Search as SearchIcon } from 'lucide-react'
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
import { getMerchants, updateMerchantStatus, toggleMerchantStatus, approveMerchantWithRole } from '@/lib/api'
import { usePermissions } from '@/stores/auth-store'
import { usePendingStore } from '@/stores/pending-store'
import type { Merchant } from '@/lib/supabase'

interface MerchantWithStats extends Merchant {
  vehicles?: { count: number }[]
  drivers?: { count: number }[]
  owner?: { name: string | null; phone: string | null }
}

export function Merchants() {
  const permissions = usePermissions()
  const { refreshMerchantCount } = usePendingStore()

  const [merchants, setMerchants] = useState<MerchantWithStats[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // 停用确认对话框
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [merchantToDisable, setMerchantToDisable] = useState<MerchantWithStats | null>(null)
  const [searchInputValue, setSearchInputValue] = useState('')

  const searchRef = useRef('')
  const statusRef = useRef('all')
  const loadingRef = useRef(false)
  const mountedRef = useRef(false)

  const canApprove = permissions.hasPermission('merchant:approve') || permissions.isAdmin()

  const loadData = async (page: number) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const result = await getMerchants({
        status: statusRef.current === 'all' ? undefined : statusRef.current as any,
        search: searchRef.current,
        page,
        pageSize,
      })
      setMerchants(result.data || [])
      setTotal(result.count || 0)
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to load merchants:', error)
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

  const handleApprove = async (merchantId: string) => {
    try {
      await approveMerchantWithRole(merchantId)
      loadData(currentPage)
      refreshMerchantCount()
    } catch (error) {
      console.error('Failed to approve merchant:', error)
    }
  }

  const handleReject = async (merchantId: string) => {
    try {
      await updateMerchantStatus(merchantId, { review_status: 'rejected', review_note: '审核未通过' })
      loadData(currentPage)
      refreshMerchantCount()
    } catch (error) {
      console.error('Failed to reject merchant:', error)
    }
  }

  // 打开停用确认对话框
  const openDisableDialog = (merchant: MerchantWithStats) => {
    setMerchantToDisable(merchant)
    setDisableDialogOpen(true)
  }

  // 确认停用/启用
  const handleDisableConfirm = async () => {
    if (!merchantToDisable) return

    try {
      await toggleMerchantStatus(merchantToDisable.id, !merchantToDisable.disabled)
      setDisableDialogOpen(false)
      setMerchantToDisable(null)
      loadData(currentPage)
    } catch (error) {
      console.error('Failed to toggle merchant status:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant='default' className='bg-green-600'>已通过</Badge>
      case 'pending':
        return <Badge variant='outline' className='border-yellow-500 text-yellow-600'>待审核</Badge>
      case 'rejected':
        return <Badge variant='destructive'>已拒绝</Badge>
      default:
        return <Badge variant='outline'>{status}</Badge>
    }
  }

  const getMerchantTypeName = (type: string) => {
    return type === 'company' ? '企业车队' : '个人司机'
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
          <h2 className='text-2xl font-bold tracking-tight'>商家管理</h2>
          <p className='text-muted-foreground'>管理车队商家，审核申请，查看详情</p>
        </div>

        {/* 筛选栏 */}
        <div className='flex gap-4 items-center'>
          <Select defaultValue='all' onValueChange={handleStatusChange}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='选择状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='pending'>待审核</SelectItem>
              <SelectItem value='approved'>已通过</SelectItem>
              <SelectItem value='rejected'>已拒绝</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder='搜索商家名称/联系人/手机号'
            value={searchInputValue}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            className='w-[300px]'
          />
          <Button onClick={handleSearch}>
            <SearchIcon className='h-4 w-4' />
          </Button>
        </div>

        {/* 商家表格 */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[200px]'>商家名称</TableHead>
                <TableHead className='w-[100px]'>类型</TableHead>
                <TableHead className='w-[150px]'>联系电话</TableHead>
                <TableHead className='w-[80px]'>车辆数</TableHead>
                <TableHead className='w-[80px]'>司机数</TableHead>
                <TableHead className='w-[100px]'>审核状态</TableHead>
                <TableHead className='w-[80px]'>账号状态</TableHead>
                <TableHead className='w-[120px]'>注册时间</TableHead>
                <TableHead className='w-[150px]'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className='text-center py-8'>
                    <p className='text-muted-foreground'>加载中...</p>
                  </TableCell>
                </TableRow>
              ) : merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className='text-center py-8'>
                    <p className='text-muted-foreground'>暂无商家数据</p>
                  </TableCell>
                </TableRow>
              ) : (
                merchants.map((merchant) => (
                  <TableRow key={merchant.id} className={merchant.disabled ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Store className='h-4 w-4 text-muted-foreground' />
                        <span className='font-medium'>{merchant.company_name || merchant.contact_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getMerchantTypeName(merchant.type)}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Phone className='h-3 w-3 text-muted-foreground' />
                        {merchant.contact_phone}
                      </div>
                    </TableCell>
                    <TableCell>{merchant.vehicles?.[0]?.count || 0}</TableCell>
                    <TableCell>{merchant.drivers?.[0]?.count || 0}</TableCell>
                    <TableCell>{getStatusBadge(merchant.review_status)}</TableCell>
                    <TableCell>
                      {merchant.disabled ? (
                        <Badge variant='destructive'>已停用</Badge>
                      ) : (
                        <Badge variant='outline' className='border-green-500 text-green-600'>正常</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Calendar className='h-3 w-3 text-muted-foreground' />
                        {new Date(merchant.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-1'>
                        {merchant.review_status === 'pending' && canApprove && (
                          <>
                            <Button size='sm' variant='default' onClick={() => handleApprove(merchant.id)}>
                              <Check className='h-3 w-3' />
                            </Button>
                            <Button size='sm' variant='destructive' onClick={() => handleReject(merchant.id)}>
                              <X className='h-3 w-3' />
                            </Button>
                          </>
                        )}
                        <Button size='sm' variant='outline'>
                          <Eye className='h-3 w-3' />
                        </Button>
                        <Button
                          size='sm'
                          variant={merchant.disabled ? 'default' : 'destructive'}
                          onClick={() => openDisableDialog(merchant)}
                        >
                          {merchant.disabled ? <Check className='h-3 w-3' /> : <Ban className='h-3 w-3' />}
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

      {/* 停用确认对话框 */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{merchantToDisable?.disabled ? '启用商家' : '停用商家'}</AlertDialogTitle>
            <AlertDialogDescription>
              {merchantToDisable?.disabled
                ? '启用后该商家将恢复正常运营。确定要启用吗？'
                : '停用后该商家将无法接单和运营。确定要停用吗？'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableConfirm}
              className={merchantToDisable?.disabled ? '' : 'bg-destructive text-destructive-foreground'}
            >
              {merchantToDisable?.disabled ? '确认启用' : '确认停用'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}