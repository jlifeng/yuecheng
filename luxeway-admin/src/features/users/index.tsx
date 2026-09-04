import { useEffect, useState, useRef } from 'react'
import { Phone, Calendar, Store, Edit, Ban, Check, Search as SearchIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getUsers, updateUser, toggleUserStatus } from '@/lib/api'
import type { UserProfile } from '@/lib/supabase'
import { roles, callTypes } from './data/data'

interface UserWithMerchant extends UserProfile {
  merchant?: { id: string; company_name: string | null }
  roles?: Array<{ name: string; display_name: string }>
}

export function Users() {
  const [users, setUsers] = useState<UserWithMerchant[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // 编辑对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<UserWithMerchant | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNickname, setEditNickname] = useState('')
  const [editRoles, setEditRoles] = useState<string[]>([]) // 多角色
  const [editMainRole, setEditMainRole] = useState<string>('') // 主角色

  // 停用确认对话框
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [userToDisable, setUserToDisable] = useState<UserWithMerchant | null>(null)
  const [searchInputValue, setSearchInputValue] = useState('')

  const searchRef = useRef('')
  const roleRef = useRef('all')
  const loadingRef = useRef(false)
  const mountedRef = useRef(false)

  const loadData = async (page: number) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const result = await getUsers({
        role: roleRef.current === 'all' ? undefined : roleRef.current as any,
        search: searchRef.current,
        page,
        pageSize,
      })
      setUsers(result.data || [])
      setTotal(result.count || 0)
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to load users:', error)
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

  const handleRoleFilterChange = (value: string) => {
    roleRef.current = value
    loadData(1)
  }

  const handlePageChange = (page: number) => {
    loadData(page)
  }

  // 打开编辑对话框
  const openEditDialog = (user: UserWithMerchant) => {
    setUserToEdit(user)
    setEditName(user.name || '')
    setEditNickname(user.nickname || '')
    setEditPhone(user.phone || '')
    // 从 user.roles 或 profile.role 获取角色列表
    const userRoles = user.roles?.map(r => r.name) || [user.role]
    setEditRoles(userRoles)
    setEditMainRole(user.role) // 主角色
    setEditDialogOpen(true)
  }

  // 关闭编辑对话框时清理状态
  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open)
    if (!open) {
      setUserToEdit(null)
      setEditName('')
      setEditNickname('')
      setEditPhone('')
      setEditRoles([])
      setEditMainRole('')
    }
  }

  // 切换角色选择
  const toggleRole = (roleName: string) => {
    if (editRoles.includes(roleName)) {
      // 取消选择
      const newRoles = editRoles.filter(r => r !== roleName)
      setEditRoles(newRoles)
      // 如果取消的是主角色，切换到第一个剩余角色
      if (editMainRole === roleName && newRoles.length > 0) {
        setEditMainRole(newRoles[0])
      } else if (newRoles.length === 0) {
        setEditMainRole('')
      }
    } else {
      // 添加选择
      const newRoles = [...editRoles, roleName]
      setEditRoles(newRoles)
      // 如果没有主角色，设置为新添加的角色
      if (!editMainRole) {
        setEditMainRole(roleName)
      }
    }
  }

  // 设置主角色
  const setAsMainRole = (roleName: string) => {
    if (editRoles.includes(roleName)) {
      setEditMainRole(roleName)
    }
  }

  // 确认编辑
  const handleEditConfirm = async () => {
    if (!userToEdit || editRoles.length === 0 || !editMainRole) return

    try {
      await updateUser(userToEdit.id, {
        name: editName,
        phone: editPhone,
        role: editMainRole as any, // 更新主角色（触发器会自动同步到 user_roles）
      })
      handleEditDialogClose(false)
      loadData(currentPage)
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  // 打开停用确认对话框
  const openDisableDialog = (user: UserWithMerchant) => {
    setUserToDisable(user)
    setDisableDialogOpen(true)
  }

  // 确认停用/启用
  const handleDisableConfirm = async () => {
    if (!userToDisable) return

    try {
      await toggleUserStatus(userToDisable.id, !userToDisable.disabled)
      setDisableDialogOpen(false)
      setUserToDisable(null)
      loadData(currentPage)
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    }
  }

  const getRoleLabel = (role: string) => {
    const roleItem = roles.find(r => r.value === role)
    return roleItem?.label || role
  }

  const getRoleBadgeStyle = (role: string) => {
    return callTypes.get(role) || 'bg-gray-100 border-gray-200'
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>用户管理</h2>
          <p className='text-muted-foreground'>查看平台用户，修改角色权限</p>
        </div>

        {/* 筛选栏 */}
        <div className='flex gap-4 items-center'>
          <Select defaultValue='all' onValueChange={handleRoleFilterChange}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='选择角色' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部角色</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder='搜索用户姓名/手机号'
            value={searchInputValue}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            className='w-[300px]'
          />
          <Button onClick={handleSearch}>
            <SearchIcon className='h-4 w-4' />
          </Button>
        </div>

        {/* 用户表格 */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[150px]'>姓名</TableHead>
                <TableHead className='w-[150px]'>昵称</TableHead>
                <TableHead className='w-[150px]'>手机号</TableHead>
                <TableHead className='w-[180px]'>角色</TableHead>
                <TableHead className='w-[200px]'>所属商家</TableHead>
                <TableHead className='w-[100px]'>状态</TableHead>
                <TableHead className='w-[120px]'>注册时间</TableHead>
                <TableHead className='w-[120px]'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    <p className='text-muted-foreground'>加载中...</p>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    <p className='text-muted-foreground'>暂无用户数据</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className={user.disabled ? 'opacity-50' : ''}>
                    <TableCell>
                      <span>{user.name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span>{user.nickname || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Phone className='h-3 w-3 text-muted-foreground' />
                        {user.phone || '未绑定'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* 显示主角色徽章 */}
                      <Badge className={getRoleBadgeStyle(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      {/* 如果有多个角色，显示数量 */}
                      {user.roles && user.roles.length > 1 && (
                        <span className='ml-1 text-xs text-muted-foreground'>
                          +{user.roles.length - 1}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.merchant?.company_name ? (
                        <div className='flex items-center gap-1'>
                          <Store className='h-3 w-3 text-muted-foreground' />
                          {user.merchant.company_name}
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.disabled ? (
                        <Badge variant='destructive'>已停用</Badge>
                      ) : (
                        <Badge variant='outline' className='border-green-500 text-green-600'>正常</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Calendar className='h-3 w-3 text-muted-foreground' />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-1'>
                        <Button size='sm' variant='outline' onClick={() => openEditDialog(user)}>
                          <Edit className='h-3 w-3' />
                        </Button>
                        <Button
                          size='sm'
                          variant={user.disabled ? 'default' : 'destructive'}
                          onClick={() => openDisableDialog(user)}
                        >
                          {user.disabled ? <Check className='h-3 w-3' /> : <Ban className='h-3 w-3' />}
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

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户的基本信息和角色权限。用户可拥有多个角色。
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>姓名</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder='请输入姓名'
              />
            </div>
            <div>
              <label className='text-sm font-medium'>昵称（微信昵称，不可编辑）</label>
              <Input
                value={editNickname}
                disabled
                className='bg-muted cursor-not-allowed'
              />
            </div>
            <div>
              <label className='text-sm font-medium'>手机号</label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder='请输入手机号'
              />
            </div>
            <div>
              <label className='text-sm font-medium mb-2 block'>角色（可多选）</label>
              <div className='space-y-2'>
                {roles.map((role) => (
                  <div key={role.value} className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Checkbox
                        checked={editRoles.includes(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                      />
                      <span className='text-sm'>{role.label}</span>
                    </div>
                    {editRoles.includes(role.value) && (
                      <div className='flex items-center gap-2'>
                        {editMainRole === role.value ? (
                          <Badge variant='default' className='text-xs'>主角色</Badge>
                        ) : (
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-6 text-xs'
                            onClick={() => setAsMainRole(role.value)}
                          >
                            设为主角色
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {editRoles.length === 0 && (
                <p className='text-xs text-destructive'>请至少选择一个角色</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleEditConfirm}
              disabled={editRoles.length === 0 || !editMainRole}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 停用确认对话框 */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{userToDisable?.disabled ? '启用用户' : '停用用户'}</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDisable?.disabled
                ? '启用后该用户将恢复正常使用权限。确定要启用吗？'
                : '停用后该用户将无法登录和使用平台功能。确定要停用吗？'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableConfirm}
              className={userToDisable?.disabled ? '' : 'bg-destructive text-destructive-foreground'}
            >
              {userToDisable?.disabled ? '确认启用' : '确认停用'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}