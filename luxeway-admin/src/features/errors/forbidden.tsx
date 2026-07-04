import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function ForbiddenError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  const search = useSearch({ from: '/(errors)/403' })
  const message = search.message || '您没有查看此资源的权限'

  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>403</h1>
        <span className='font-medium'>访问受限</span>
        <p className='text-center text-muted-foreground'>
          {message} <br />
          如需帮助请联系管理员。
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            返回上一页
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>回到首页</Button>
        </div>
      </div>
    </div>
  )
}
