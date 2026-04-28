/**
 * RBAC 权限检查工具
 * 用于小程序端的权限验证
 */

// 权限常量定义
export const PERMISSIONS = {
  // 商家管理
  MERCHANT_VIEW: 'merchant:view',
  MERCHANT_CREATE: 'merchant:create',
  MERCHANT_EDIT: 'merchant:edit',
  MERCHANT_APPROVE: 'merchant:approve',
  MERCHANT_DISABLE: 'merchant:disable',

  // 用户管理
  USER_VIEW: 'user:view',
  USER_EDIT: 'user:edit',
  USER_ASSIGN_ROLE: 'user:assign_role',

  // 订单管理
  ORDER_VIEW: 'order:view',
  ORDER_CANCEL: 'order:cancel',
  ORDER_EDIT: 'order:edit',

  // 车队管理
  FLEET_VIEW: 'fleet:view',
  FLEET_CREATE: 'fleet:create',
  FLEET_EDIT: 'fleet:edit',

  // 报价管理
  BID_CREATE: 'bid:create',
  BID_VIEW: 'bid:view',
  BID_ACCEPT: 'bid:accept',

  // 需求管理
  DEMAND_CREATE: 'demand:create',
  DEMAND_VIEW: 'demand:view',

  // 统计查看
  STATS_VIEW: 'stats:view',
} as const

// 角色常量定义
export const ROLES = {
  ADMIN: 'admin',
  MERCHANT_OWNER: 'merchant_owner',
  MERCHANT_DISPATCHER: 'merchant_dispatcher',
  MERCHANT_DRIVER: 'merchant_driver',
  PASSENGER: 'passenger',
} as const

/**
 * 获取当前用户权限列表
 */
export function getUserPermissions(): string[] {
  return uni.getStorageSync('userPermissions') || []
}

/**
 * 获取当前用户角色列表
 */
export function getUserRoles(): Array<{ name: string; display_name: string }> {
  return uni.getStorageSync('userRoles') || []
}

/**
 * 检查用户是否拥有指定权限
 * @param permission 权限名称
 */
export function hasPermission(permission: string): boolean {
  const permissions = getUserPermissions()
  return permissions.includes(permission)
}

/**
 * 检查用户是否拥有任意一个指定权限
 * @param permissions 权限列表
 */
export function hasAnyPermission(permissions: string[]): boolean {
  const userPermissions = getUserPermissions()
  return permissions.some(p => userPermissions.includes(p))
}

/**
 * 检查用户是否拥有全部指定权限
 * @param permissions 权限列表
 */
export function hasAllPermissions(permissions: string[]): boolean {
  const userPermissions = getUserPermissions()
  return permissions.every(p => userPermissions.includes(p))
}

/**
 * 检查用户是否拥有指定角色
 * @param roleName 角色名称
 */
export function hasRole(roleName: string): boolean {
  const roles = getUserRoles()
  return roles.some(r => r.name === roleName)
}

/**
 * 检查用户是否拥有任意一个指定角色
 * @param roleNames 角色名称列表
 */
export function hasAnyRole(roleNames: string[]): boolean {
  const roles = getUserRoles()
  return roleNames.some(name => roles.some(r => r.name === name))
}

/**
 * 获取用户的主角色
 */
export function getPrimaryRole(): string {
  const userProfile = uni.getStorageSync('userProfile')
  return userProfile?.primary_role || 'passenger'
}

/**
 * 获取用户的显示角色（用于决定跳转哪个端）
 */
export function getDisplayRole(): 'passenger' | 'provider' {
  const userProfile = uni.getStorageSync('userProfile')
  return userProfile?.display_role || 'passenger'
}

/**
 * 检查是否是管理员
 */
export function isAdmin(): boolean {
  return hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.MERCHANT_APPROVE)
}

/**
 * 检查是否是商家（包括车队所有者、调度员、司机）
 */
export function isMerchant(): boolean {
  return hasAnyRole([
    ROLES.MERCHANT_OWNER,
    ROLES.MERCHANT_DISPATCHER,
    ROLES.MERCHANT_DRIVER
  ])
}

/**
 * 检查是否是乘客
 */
export function isPassenger(): boolean {
  return hasRole(ROLES.PASSENGER)
}

/**
 * 检查是否是车队所有者
 */
export function isMerchantOwner(): boolean {
  return hasRole(ROLES.MERCHANT_OWNER)
}

/**
 * 检查是否是司机
 */
export function isDriver(): boolean {
  return hasRole(ROLES.MERCHANT_DRIVER)
}

/**
 * 权限检查失败时的统一提示
 * @param message 自定义提示消息
 */
export function showPermissionDenied(message?: string): void {
  uni.showModal({
    title: '权限不足',
    content: message || '您没有执行此操作的权限',
    showCancel: false
  })
}

/**
 * 检查权限并在失败时提示
 * @param permission 权限名称
 * @param message 自定义提示消息
 * @returns 是否有权限
 */
export function requirePermission(permission: string, message?: string): boolean {
  if (!hasPermission(permission)) {
    showPermissionDenied(message)
    return false
  }
  return true
}

/**
 * 检查角色并在失败时提示
 * @param roleName 角色名称
 * @param message 自定义提示消息
 * @returns 是否有角色
 */
export function requireRole(roleName: string, message?: string): boolean {
  if (!hasRole(roleName)) {
    showPermissionDenied(message)
    return false
  }
  return true
}