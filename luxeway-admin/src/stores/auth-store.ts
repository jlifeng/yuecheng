import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'luxeway_admin_token'
const REFRESH_TOKEN = 'luxeway_refresh_token'
const USER_DATA = 'luxeway_user_data'

// 用户角色信息
interface UserRole {
  name: string
  display_name: string
}

// 用户信息（RBAC 版本）
interface AuthUser {
  id: string
  phone: string
  name: string | null
  nickname: string | null
  avatar_url: string | null
  merchant_id: string | null
  roles: UserRole[]
  primary_role: string
  display_role: 'passenger' | 'provider'
  permissions: string[]
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    refreshToken: string
    setAccessToken: (accessToken: string) => void
    setRefreshToken: (refreshToken: string) => void
    resetAccessToken: () => void
    reset: () => void
    isAuthenticated: boolean
    // RBAC 权限检查方法
    hasPermission: (permission: string) => boolean
    hasAnyPermission: (permissions: string[]) => boolean
    hasRole: (role: string) => boolean
    hasAnyRole: (roles: string[]) => boolean
    isAdmin: () => boolean
    isMerchant: () => boolean
    isPassenger: () => boolean
  }
}

// 从 cookie 加载用户数据
function loadUserFromStorage(): AuthUser | null {
  const userData = getCookie(USER_DATA)
  if (userData) {
    try {
      return JSON.parse(userData)
    } catch {
      return null
    }
  }
  return null
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const cookieState = getCookie(ACCESS_TOKEN)
  const refreshTokenCookie = getCookie(REFRESH_TOKEN)
  const initToken = cookieState ? JSON.parse(cookieState) : ''
  const initRefreshToken = refreshTokenCookie ? JSON.parse(refreshTokenCookie) : ''
  const initUser = loadUserFromStorage()

  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set((state) => {
          if (user) {
            setCookie(USER_DATA, JSON.stringify(user))
          } else {
            removeCookie(USER_DATA)
          }
          return {
            ...state,
            auth: { ...state.auth, user, isAuthenticated: !!user }
          }
        }),
      accessToken: initToken,
      refreshToken: initRefreshToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      setRefreshToken: (refreshToken) =>
        set((state) => {
          setCookie(REFRESH_TOKEN, JSON.stringify(refreshToken))
          return { ...state, auth: { ...state.auth, refreshToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          removeCookie(REFRESH_TOKEN)
          removeCookie(USER_DATA)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '', refreshToken: '', isAuthenticated: false },
          }
        }),
      isAuthenticated: !!initToken && !!initUser,

      // RBAC 权限检查方法
      hasPermission: (permission: string) => {
        const user = get().auth.user
        return user?.permissions?.includes(permission) ?? false
      },

      hasAnyPermission: (permissions: string[]) => {
        const user = get().auth.user
        if (!user?.permissions) return false
        return permissions.some(p => user.permissions.includes(p))
      },

      hasRole: (role: string) => {
        const user = get().auth.user
        return user?.roles?.some(r => r.name === role) ?? false
      },

      hasAnyRole: (roles: string[]) => {
        const user = get().auth.user
        if (!user?.roles) return false
        return roles.some(r => user.roles.some(ur => ur.name === r))
      },

      isAdmin: () => get().auth.hasRole('admin'),

      isMerchant: () => get().auth.hasAnyRole(['merchant_owner', 'merchant_dispatcher', 'merchant_driver']),

      isPassenger: () => get().auth.hasRole('passenger'),
    },
  }
})

// 导出便捷的权限检查 hook
export function usePermissions() {
  const { auth } = useAuthStore()
  return {
    hasPermission: auth.hasPermission,
    hasAnyPermission: auth.hasAnyPermission,
    hasRole: auth.hasRole,
    hasAnyRole: auth.hasAnyRole,
    isAdmin: auth.isAdmin,
    isMerchant: auth.isMerchant,
    isPassenger: auth.isPassenger,
    permissions: auth.user?.permissions ?? [],
    roles: auth.user?.roles ?? [],
  }
}