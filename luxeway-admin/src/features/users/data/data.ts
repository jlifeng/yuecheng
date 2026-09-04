import { Shield, Car, Users } from 'lucide-react'

// LuxeWay 用户角色
export const roles = [
  {
    label: '乘客',
    value: 'passenger',
    icon: Users,
  },
  {
    label: '车队负责人',
    value: 'merchant_owner',
    icon: Shield,
  },
  {
    label: '调度员',
    value: 'merchant_dispatcher',
    icon: Car,
  },
  {
    label: '司机',
    value: 'merchant_driver',
    icon: Car,
  },
  {
    label: '管理员',
    value: 'admin',
    icon: Shield,
  },
] as const

// 用户状态样式映射
export const callTypes = new Map<string, string>([
  ['passenger', 'bg-blue-100/30 text-blue-900 dark:text-blue-200 border-blue-200'],
  ['merchant_owner', 'bg-green-100/30 text-green-900 dark:text-green-200 border-green-200'],
  ['merchant_dispatcher', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['merchant_driver', 'bg-yellow-100/40 text-yellow-900 dark:text-yellow-100 border-yellow-300'],
  ['admin', 'bg-purple-100/30 text-purple-900 dark:text-purple-200 border-purple-200'],
])