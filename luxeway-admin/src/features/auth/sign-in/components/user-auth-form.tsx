import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { setRefreshToken } from '@/lib/token-refresh'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  account: z
    .string()
    .min(1, '请输入账号或手机号'),
  password: z
    .string()
    .min(1, '请输入密码')
    .min(6, '密码至少6个字符'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const search = useSearch({ from: '/(auth)/sign-in' })
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      // 调用 phone-login 云函数（支持手机号或账号名）
      const response = await fetch(`${SUPABASE_URL}/functions/v1/phone-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          account: data.account,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '登录失败')
      }

      // 设置用户和访问令牌（RBAC 版本）
      auth.setUser({
        id: result.user.id,
        phone: result.user.phone,
        name: result.user.name,
        nickname: result.user.nickname,
        avatar_url: result.user.avatar_url,
        merchant_id: result.user.merchant_id,
        roles: result.user.roles,
        primary_role: result.user.primary_role,
        display_role: result.user.display_role,
        permissions: result.user.permissions,
      })
      auth.setAccessToken(result.session.access_token)

      // 存储 refresh token
      if (result.session.refresh_token) {
        setRefreshToken(result.session.refresh_token)
      }

      toast.success(`欢迎回来，${result.user.name || result.user.roles[0]?.display_name || data.account}!`)

      // 重定向到目标页面或首页
      const targetPath = (search as any)?.redirect || '/'
      navigate({ to: targetPath, replace: true })
    } catch (error: any) {
      toast.error(error.message || '登录失败，请检查账号和密码')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='account'
          render={({ field }) => (
            <FormItem>
              <FormLabel>账号 / 手机号</FormLabel>
              <FormControl>
                <Input placeholder='请输入账号或手机号' type='text' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          登录
        </Button>

        <p className='text-center text-sm text-muted-foreground'>
          LuxeWay 管理后台 · 仅限管理员访问
        </p>
      </form>
    </Form>
  )
}
